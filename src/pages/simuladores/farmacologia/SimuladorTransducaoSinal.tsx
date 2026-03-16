import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
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
import { getTransducaoSinalChallenges } from "@/data/simulatorChallenges";

const SLUG = "transducao-sinal";

type ReceptorType = "gpcr-gs" | "gpcr-gi" | "gpcr-gq" | "tirosina-quinase" | "ionotropico" | "nuclear";

const RECEPTOR_INFO: Record<ReceptorType, { name: string; cascade: string[]; effector: string }> = {
  "gpcr-gs": { name: "GPCR – Gs", cascade: ["Ligante → Receptor", "Gs → Adenilato Ciclase ↑", "↑ AMPc", "PKA ativa", "Fosforilação de alvos"], effector: "↑ AMPc → PKA" },
  "gpcr-gi": { name: "GPCR – Gi", cascade: ["Ligante → Receptor", "Gi → Adenilato Ciclase ↓", "↓ AMPc", "PKA inibida", "↓ Fosforilação"], effector: "↓ AMPc → ↓ PKA" },
  "gpcr-gq": { name: "GPCR – Gq", cascade: ["Ligante → Receptor", "Gq → Fosfolipase C", "PIP₂ → IP₃ + DAG", "IP₃ → ↑ Ca²⁺ intracelular", "DAG → PKC ativa"], effector: "IP₃/DAG → Ca²⁺ + PKC" },
  "tirosina-quinase": { name: "Receptor Tirosina Quinase", cascade: ["Ligante → Dimerização", "Autofosforilação (Tyr)", "Ras → Raf → MEK → ERK", "JAK → STAT (paralelo)", "Transcrição gênica"], effector: "MAPK / JAK-STAT" },
  "ionotropico": { name: "Receptor Ionotrópico", cascade: ["Ligante → Canal abre", "Fluxo iônico (Na⁺/Ca²⁺/Cl⁻)", "Despolarização ou Hiperpolarização", "Efeito celular rápido", "ms de latência"], effector: "Fluxo iônico direto" },
  "nuclear": { name: "Receptor Nuclear", cascade: ["Ligante lipossolúvel → Citoplasma", "Liga ao receptor nuclear", "Complexo → Núcleo", "Liga ao elemento responsivo (HRE)", "Transcrição gênica (horas)"], effector: "Transcrição gênica" },
};

interface TSCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  targetReceptor: ReceptorType;
  expectedBlockStep: number;
  clinicalTip: string;
}

const BUILT_IN_CASES: TSCase[] = [
  { title: "Salbutamol e β2-adrenérgicos (Gs)", difficulty: "Fácil", patient: { name: "Maria Souza", age: 35, weight: 62, diagnosis: "Asma aguda em uso de salbutamol" }, scenario: "O salbutamol ativa receptores β2 (GPCR-Gs) no músculo liso brônquico. Selecione o receptor correto e observe a cascata AMPc → PKA → relaxamento.", targetReceptor: "gpcr-gs", expectedBlockStep: -1, clinicalTip: "β2-agonistas ativam Gs → ↑AMPc → PKA → relaxamento do músculo liso brônquico. Uso crônico pode causar dessensibilização por fosforilação do receptor (GRK/β-arrestina)." },
  { title: "Atropina e receptores M3 (Gq)", difficulty: "Médio", patient: { name: "João Almeida", age: 68, weight: 75, diagnosis: "Bradicardia sinusal em bloqueio pré-operatório" }, scenario: "A atropina bloqueia receptores muscarínicos M3 (GPCR-Gq). Selecione o receptor correto e aplique um bloqueio na etapa da Fosfolipase C.", targetReceptor: "gpcr-gq", expectedBlockStep: 1, clinicalTip: "A atropina bloqueia M3 (Gq-acoplado), impedindo a ativação de PLC → IP₃/DAG. No coração, bloqueia M2 (Gi) → desinibição → taquicardia." },
  { title: "Insulina e Receptor Tirosina Quinase", difficulty: "Médio", patient: { name: "Fernando Costa", age: 55, weight: 95, diagnosis: "Diabetes tipo 2 – resistência à insulina" }, scenario: "A insulina ativa receptores tirosina quinase. Na resistência insulínica, a via IRS/PI3K/Akt está prejudicada. Selecione o receptor correto.", targetReceptor: "tirosina-quinase", expectedBlockStep: 2, clinicalTip: "Na resistência insulínica, a fosforilação em serina (em vez de tirosina) no IRS-1 bloqueia a via PI3K/Akt, reduzindo a translocação de GLUT4." },
];

export default function SimuladorTransducaoSinal() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<TSCase | null>(null);
  const [selectedReceptor, setSelectedReceptor] = useState<ReceptorType>("gpcr-gs");
  const [agonistConc, setAgonistConc] = useState(80);
  const [blockStep, setBlockStep] = useState(-1); // -1 = no block
  const [blockIntensity, setBlockIntensity] = useState(80);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, targetReceptor: cd.targetReceptor ?? "gpcr-gs", expectedBlockStep: cd.expectedBlockStep ?? -1, clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setSelectedReceptor(activeCase.targetReceptor); setAgonistConc(80); setBlockStep(-1); setBlockIntensity(80); } }, [activeCase]);

  const cascadeData = useMemo(() => {
    const info = RECEPTOR_INFO[selectedReceptor];
    return info.cascade.map((step, i) => {
      let activity = agonistConc;
      if (blockStep >= 0 && i >= blockStep) activity = Math.max(0, activity * (1 - blockIntensity / 100));
      return { step: `Etapa ${i + 1}`, name: step, activity: Math.round(activity) };
    });
  }, [selectedReceptor, agonistConc, blockStep, blockIntensity]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const receptorOk = selectedReceptor === activeCase.targetReceptor;
    const blockOk = activeCase.expectedBlockStep < 0 ? blockStep < 0 : blockStep === activeCase.expectedBlockStep;
    const s = (receptorOk ? 60 : 0) + (blockOk ? 40 : 0);
    setLastScore(s);
    submitResults({ score: s, actions: { selectedReceptor, agonistConc, blockStep, blockIntensity } });
    return s;
  }, [activeCase, selectedReceptor, blockStep, agonistConc, blockIntensity, submitted, submitResults]);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, targetReceptor: c.targetReceptor ?? "gpcr-gs", expectedBlockStep: c.expectedBlockStep ?? -1, clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Transdução de Sinal</h1>
            <p className="text-muted-foreground">Visualize cascatas intracelulares (GPCR, tirosina quinase, ionotrópico, nuclear) e bloqueios farmacológicos.</p>
            <AdminPromptViewer toolSlug="sim-transducao-sinal" toolName="Transdução de Sinal" toolType="simulator" prompt={getNativePrompt("sim-transducao-sinal") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const info = RECEPTOR_INFO[selectedReceptor];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receptor e Fármaco</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RECEPTOR_INFO) as ReceptorType[]).map(r => (
                <button key={r} onClick={() => setSelectedReceptor(r)} className={`p-2 rounded-lg border text-xs font-medium transition-colors ${selectedReceptor === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{RECEPTOR_INFO[r].name}</button>
              ))}
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">[Agonista]</label><span className="text-sm font-bold">{agonistConc}%</span></div><Slider value={[agonistConc]} onValueChange={([v]) => setAgonistConc(v)} min={0} max={100} step={5} /></div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Bloqueio Farmacológico</p>
              <div className="space-y-1">
                <button onClick={() => setBlockStep(-1)} className={`w-full text-left text-xs p-2 rounded ${blockStep < 0 ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>Nenhum bloqueio</button>
                {info.cascade.map((_, i) => (
                  <button key={i} onClick={() => setBlockStep(i)} className={`w-full text-left text-xs p-2 rounded ${blockStep === i ? "bg-destructive/10 text-destructive" : "hover:bg-muted"}`}>Bloquear etapa {i + 1}</button>
                ))}
              </div>
              {blockStep >= 0 && (<div><div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Intensidade do bloqueio</label><span className="text-sm font-bold text-destructive">{blockIntensity}%</span></div><Slider value={[blockIntensity]} onValueChange={([v]) => setBlockIntensity(v)} min={0} max={100} step={5} /></div>)}
            </div>
            
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cascata: {info.name}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Efetor final: {info.effector}</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cascadeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="step" width={60} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: number, _: string, entry: any) => [`${v}% – ${entry.payload.name}`, "Atividade"]} />
                <Bar dataKey="activity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getTransducaoSinalChallenges()} simulatorState={{ selectedReceptor, blockStep }} onComplete={() => setChallengeCompleted(true)} />
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
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
