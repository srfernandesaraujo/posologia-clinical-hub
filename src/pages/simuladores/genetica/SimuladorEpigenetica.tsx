import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getEpigeneticaChallenges } from "@/data/simulatorChallenges";

const SLUG = "epigenetica";

interface EpiCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; gene: string;
  initialMethylation: number; initialAcetylation: number;
  expectedExpression: [number, number]; clinicalTip: string;
}

const BUILT_IN_CASES: EpiCase[] = [
  { title: "Silenciamento de p16 (Tumor)", difficulty: "Médio", patient: { name: "Fernanda Lima", age: 52, weight: 65, diagnosis: "Carcinoma de cólon" }, scenario: "Gene p16 (CDKN2A) hipermetilado. Ajuste metilação e acetilação para entender o impacto na expressão.", gene: "CDKN2A (p16)", initialMethylation: 85, initialAcetylation: 15, expectedExpression: [0, 20], clinicalTip: "Hipermetilação de promotores supressores é mecanismo epigenético comum no câncer. Azacitidina e decitabina são agentes desmetilantes usados em neoplasias hematológicas." },
  { title: "Imprinting — Prader-Willi", difficulty: "Difícil", patient: { name: "Marcos Jr.", age: 4, weight: 22, diagnosis: "Hipotonia, hiperfagia" }, scenario: "Perda de expressão de genes paternos 15q11-13 por metilação. Simule o efeito.", gene: "SNRPN (15q11-13)", initialMethylation: 95, initialAcetylation: 5, expectedExpression: [0, 10], clinicalTip: "Imprinting: expressão monoalélica dependente da origem parental. Prader-Willi = perda da contribuição paterna." },
  { title: "Gene Housekeeping — GAPDH", difficulty: "Fácil", patient: { name: "Laura Santos", age: 25, weight: 58, diagnosis: "Controle saudável" }, scenario: "GAPDH com baixa metilação e alta acetilação = expressão constitutiva. Explore os efeitos.", gene: "GAPDH", initialMethylation: 10, initialAcetylation: 80, expectedExpression: [70, 100], clinicalTip: "Housekeeping: promotores hipometilados + histonas hiperacetiladas (eucromatina). H3K4me3 e H3K27ac marcam promotores ativos." },
];

function computeEpigenetics(methylation: number, acetylation: number) {
  const expression = Math.round((1 - methylation / 100) * 60 + (acetylation / 100) * 40);
  const chromatinState = methylation > 60 ? "Heterocromatina (Fechada)" : methylation > 30 ? "Parcialmente Condensada" : "Eucromatina (Aberta)";
  const dnmt = Math.round(methylation * 0.8);
  const hat = Math.round(acetylation * 0.9);
  const hdac = Math.round((100 - acetylation) * 0.7);
  const tet = Math.round((100 - methylation) * 0.6);

  // Time series for expression dynamics
  const timeSeries = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    expression: Math.max(0, Math.min(100, expression + Math.round(Math.sin(h * 0.5) * 5 + (Math.random() - 0.5) * 3))),
    mRNA: Math.max(0, Math.min(100, expression * 0.9 + Math.round(Math.sin(h * 0.3) * 8))),
  }));

  return { expression, chromatinState, dnmt, hat, hdac, tet, timeSeries, geneData: [
    { name: "Metilação", value: methylation, fill: "hsl(var(--destructive))" },
    { name: "Acetilação", value: acetylation, fill: "hsl(var(--chart-1))" },
    { name: "Expressão", value: expression, fill: expression > 50 ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" },
  ], enzymeData: [
    { name: "DNMT", value: dnmt }, { name: "HAT", value: hat }, { name: "HDAC", value: hdac }, { name: "TET", value: tet },
  ]};
}

export default function SimuladorEpigenetica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<EpiCase | null>(null);
  const [methylation, setMethylation] = useState(50);
  const [acetylation, setAcetylation] = useState(50);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, gene: cd.gene ?? "", initialMethylation: cd.initialMethylation ?? 50, initialAcetylation: cd.initialAcetylation ?? 50, expectedExpression: cd.expectedExpression ?? [30, 70], clinicalTip: cd.clinicalTip ?? "" }); }
  }, [virtualRoomCase]);

  useEffect(() => { if (activeCase) { setMethylation(activeCase.initialMethylation); setAcetylation(activeCase.initialAcetylation); } }, [activeCase]);

  const outputs = useMemo(() => computeEpigenetics(methylation, acetylation), [methylation, acetylation]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = outputs.expression >= activeCase.expectedExpression[0] && outputs.expression <= activeCase.expectedExpression[1];
    const s = Math.round(ok ? 100 : Math.max(0, 100 - Math.abs(outputs.expression - (activeCase.expectedExpression[0] + activeCase.expectedExpression[1]) / 2) * 2));
    setLastScore(s);
    submitResults({ score: s, actions: { methylation, acetylation, expression: outputs.expression } });
    return s;
  }, [activeCase, outputs, methylation, acetylation, submitted, submitResults]);

  const loadAICase = (c: any) => { setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, gene: c.gene ?? "", initialMethylation: c.initialMethylation ?? 50, initialAcetylation: c.initialAcetylation ?? 50, expectedExpression: c.expectedExpression ?? [30, 70], clinicalTip: c.clinicalTip ?? "" }); };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Epigenética e Regulação Gênica</h1>
            <p className="text-muted-foreground">Metilação, acetilação e impacto na expressão gênica.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Epigenética" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (<AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? goBack : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Gene:</strong> {activeCase.gene}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Modificações Epigenéticas</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Metilação CpG</label><span className="text-sm font-bold">{methylation}%</span></div>
              <Slider value={[methylation]} onValueChange={([v]) => setMethylation(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">↑ Metilação = ↓ Expressão</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Acetilação H3</label><span className="text-sm font-bold">{acetylation}%</span></div>
              <Slider value={[acetylation]} onValueChange={([v]) => setAcetylation(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">↑ Acetilação = ↑ Expressão</p>
            </div>
            <div className="p-4 rounded-lg border text-center">
              <div className="flex justify-center gap-1 mb-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border ${methylation > i * 10 ? "bg-destructive border-destructive" : "bg-muted border-border"}`} />
                    <div className={`w-4 h-5 rounded-sm mt-0.5 ${acetylation > i * 10 ? "bg-primary" : "bg-muted"}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium">{outputs.chromatinState}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${outputs.expression > 50 ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
              <p className="text-xs text-muted-foreground">Expressão Gênica</p>
              <p className="text-4xl font-bold">{outputs.expression}%</p>
              <p className="text-xs">{outputs.expression > 70 ? "🟢 Ativa" : outputs.expression > 30 ? "🟡 Reduzida" : "🔴 Silenciada"}</p>
            </div>
            {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar</Button>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Expressão ao Longo do Tempo</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={outputs.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" label={{ value: "Horas", position: "insideBottom", offset: -5 }} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" label={{ value: "Nível (%)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="expression" name="Proteína" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="mRNA" name="mRNA" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Atividade Enzimática</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={outputs.enzymeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Atividade (%)" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent>
      </Card>

      <SimulatorChallengeMode challengeSet={getEpigeneticaChallenges()} simulatorState={{ methylation, acetylation, expression: outputs.expression }} onComplete={() => setChallengeCompleted(true)} />

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ) : (
        <div className="space-y-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-destructive"}`}>{lastScore}%</div></div><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ))}
    </div>
  );
}
