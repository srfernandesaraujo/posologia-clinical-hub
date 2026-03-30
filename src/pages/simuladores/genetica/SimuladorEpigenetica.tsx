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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";

const SLUG = "epigenetica";

interface EpiCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  gene: string;
  initialMethylation: number;
  initialAcetylation: number;
  expectedExpression: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: EpiCase[] = [
  {
    title: "Silenciamento de Gene Supressor Tumoral (p16)",
    difficulty: "Médio",
    patient: { name: "Fernanda Lima", age: 52, weight: 65, diagnosis: "Carcinoma de cólon — análise epigenética" },
    scenario: "O gene p16 (CDKN2A) está hipermetilado na região promotora, levando ao silenciamento epigenético. Ajuste a metilação e a acetilação para entender o impacto na expressão gênica.",
    gene: "CDKN2A (p16)",
    initialMethylation: 85,
    initialAcetylation: 15,
    expectedExpression: [0, 20],
    clinicalTip: "A hipermetilação de ilhas CpG no promotor de genes supressores tumorais é um dos mecanismos epigenéticos mais comuns no câncer. Agentes desmetilantes (azacitidina, decitabina) podem restaurar a expressão gênica e são usados em neoplasias hematológicas.",
  },
  {
    title: "Imprinting Genômico — Síndrome de Prader-Willi",
    difficulty: "Difícil",
    patient: { name: "Marcos Jr.", age: 4, weight: 22, diagnosis: "Hipotonia neonatal, hiperfagia e atraso do desenvolvimento" },
    scenario: "Perda de expressão de genes paternos na região 15q11-13 por metilação do alelo paterno. O alelo materno já é normalmente silenciado por imprinting.",
    gene: "Região 15q11-13 (SNRPN)",
    initialMethylation: 95,
    initialAcetylation: 5,
    expectedExpression: [0, 10],
    clinicalTip: "O imprinting genômico resulta em expressão monoalélica dependente da origem parental. Na Síndrome de Prader-Willi, os genes paternos na região 15q11-13 estão ausentes ou silenciados, enquanto os maternos são normalmente metilados (imprinted).",
  },
  {
    title: "Expressão Gênica Normal — Regulação Fisiológica",
    difficulty: "Fácil",
    patient: { name: "Laura Santos", age: 25, weight: 58, diagnosis: "Controle saudável — estudo epigenético" },
    scenario: "Gene housekeeping (GAPDH) com baixa metilação e alta acetilação — cromatina aberta e expressão constitutiva. Explore como os modificadores epigenéticos afetam a expressão.",
    gene: "GAPDH (Housekeeping)",
    initialMethylation: 10,
    initialAcetylation: 80,
    expectedExpression: [70, 100],
    clinicalTip: "Genes housekeeping como GAPDH mantêm promotores hipometilados e histonas hiperacetiladas (cromatina aberta/eucromatina). A acetilação de H3K27 e H3K9 marca promotores ativos, enquanto a metilação de H3K27me3 marca repressão.",
  },
];

function computeEpigenetics(methylation: number, acetylation: number) {
  const methFactor = 1 - methylation / 100;
  const acetFactor = acetylation / 100;
  const expression = Math.round(methFactor * 60 + acetFactor * 40);
  const chromatinState = methylation > 60 ? "Heterocromatina (Fechada)" : methylation > 30 ? "Parcialmente Condensada" : "Eucromatina (Aberta)";
  const dnmtActivity = Math.round(methylation * 0.8);
  const hatActivity = Math.round(acetylation * 0.9);
  const hdacActivity = Math.round((100 - acetylation) * 0.7);

  const geneData = [
    { name: "Metilação CpG", value: methylation, fill: "hsl(var(--destructive))" },
    { name: "Acetilação H3", value: acetylation, fill: "hsl(var(--primary))" },
    { name: "Expressão", value: expression, fill: expression > 50 ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" },
  ];

  const enzymeData = [
    { name: "DNMT", value: dnmtActivity },
    { name: "HAT", value: hatActivity },
    { name: "HDAC", value: hdacActivity },
    { name: "TET", value: Math.round((100 - methylation) * 0.6) },
  ];

  return { expression, chromatinState, geneData, enzymeData };
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

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, gene: cd.gene ?? "",
        initialMethylation: cd.initialMethylation ?? 50, initialAcetylation: cd.initialAcetylation ?? 50,
        expectedExpression: cd.expectedExpression ?? [30, 70], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setMethylation(activeCase.initialMethylation);
      setAcetylation(activeCase.initialAcetylation);
    }
  }, [activeCase]);

  const outputs = useMemo(() => computeEpigenetics(methylation, acetylation), [methylation, acetylation]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const exprOk = outputs.expression >= activeCase.expectedExpression[0] && outputs.expression <= activeCase.expectedExpression[1];
    const s = Math.round(exprOk ? 100 : Math.max(0, 100 - Math.abs(outputs.expression - (activeCase.expectedExpression[0] + activeCase.expectedExpression[1]) / 2) * 2));
    setLastScore(s);
    submitResults({ score: s, actions: { methylation, acetylation, expression: outputs.expression } });
    return s;
  }, [activeCase, outputs, methylation, acetylation, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, gene: c.gene ?? "",
      initialMethylation: c.initialMethylation ?? 50, initialAcetylation: c.initialAcetylation ?? 50,
      expectedExpression: c.expectedExpression ?? [30, 70], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Epigenética e Regulação Gênica</h1>
            <p className="text-muted-foreground">Metilação de DNA, acetilação de histonas e impacto na expressão gênica.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Epigenética" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
            </Button>
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Gene:</strong> {activeCase.gene}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Modificações Epigenéticas</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Metilação CpG (%)</label><span className="text-sm font-bold">{methylation}%</span></div>
              <Slider value={[methylation]} onValueChange={([v]) => setMethylation(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">↑ Metilação = ↓ Expressão (silenciamento)</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Acetilação de Histonas H3 (%)</label><span className="text-sm font-bold">{acetylation}%</span></div>
              <Slider value={[acetylation]} onValueChange={([v]) => setAcetylation(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">↑ Acetilação = ↑ Expressão (cromatina aberta)</p>
            </div>

            {/* Chromatin visualization */}
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

            <div className="flex gap-2">
              {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className={`p-4 rounded-lg text-center ${outputs.expression > 50 ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
                <p className="text-xs text-muted-foreground">Expressão Gênica</p>
                <p className="text-4xl font-bold">{outputs.expression}%</p>
                <p className="text-xs">{outputs.expression > 70 ? "🟢 Ativa" : outputs.expression > 30 ? "🟡 Reduzida" : "🔴 Silenciada"}</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={outputs.geneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" name="%" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <p className="text-xs font-medium mt-4 mb-2">Atividade Enzimática</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={outputs.enzymeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" name="Atividade (%)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={{ title: "Desafio: Epigenética", description: "Teste seus conhecimentos sobre regulação epigenética", challenges: [] }}
        simulatorState={{ methylation, acetylation, expression: outputs.expression }}
        onComplete={() => setChallengeCompleted(true)}
      />

      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
