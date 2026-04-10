import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "metabolismo-farmacos";

const PRODRUGS = [
  { id: "enalapril", name: "Enalapril → Enalaprilato", enzyme: "Esterases hepáticas", phase: "Fase I (Hidrólise)", ka: 0.5, kConvert: 0.15, kElim: 0.08 },
  { id: "clopidogrel", name: "Clopidogrel → Metabólito ativo", enzyme: "CYP2C19 + CYP3A4", phase: "Fase I (Oxidação, 2 etapas)", ka: 0.8, kConvert: 0.06, kElim: 0.12 },
  { id: "codeina", name: "Codeína → Morfina", enzyme: "CYP2D6", phase: "Fase I (O-desmetilação)", ka: 0.6, kConvert: 0.1, kElim: 0.15 },
  { id: "valaciclovir", name: "Valaciclovir → Aciclovir", enzyme: "Valaciclovir hidrolase", phase: "Fase I (Hidrólise)", ka: 1.0, kConvert: 0.3, kElim: 0.05 },
];

interface MetabCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; drug: string; context: string };
  scenario: string; initialProdrug: string; initialCypActivity: number;
  expectedActiveRange: [number, number]; clinicalTip: string;
}

const BUILT_IN_CASES: MetabCase[] = [
  {
    title: "Enalapril – Ativação por Esterases Hepáticas",
    difficulty: "Fácil",
    patient: { name: "Paciente Hipertenso", drug: "Enalapril", context: "IECA pró-fármaco" },
    scenario: "O enalapril é um pró-fármaco éster que é hidrolisado por esterases hepáticas em enalaprilato (forma ativa). Simule a cinética de ativação e observe como a função hepática afeta a conversão.",
    initialProdrug: "enalapril", initialCypActivity: 100,
    expectedActiveRange: [40, 70],
    clinicalTip: "Em pacientes com insuficiência hepática, a conversão de enalapril em enalaprilato pode ser reduzida. Nestes casos, lisinopril (não é pró-fármaco) é preferível.",
  },
  {
    title: "Clopidogrel – Ativação CYP2C19 e Polimorfismo",
    difficulty: "Médio",
    patient: { name: "Paciente Pós-stent", drug: "Clopidogrel", context: "Antiplaquetário" },
    scenario: "O clopidogrel requer ativação em 2 etapas por CYP2C19 e CYP3A4. Metabolizadores lentos (*2/*2) têm ativação reduzida. Simule o impacto do polimorfismo na concentração do metabólito ativo.",
    initialProdrug: "clopidogrel", initialCypActivity: 50,
    expectedActiveRange: [15, 35],
    clinicalTip: "Metabolizadores lentos CYP2C19 têm risco aumentado de eventos cardiovasculares com clopidogrel. Prasugrel ou ticagrelor são alternativas (não dependem de CYP2C19).",
  },
  {
    title: "Codeína → Morfina – CYP2D6 e Ultra-rápidos",
    difficulty: "Difícil",
    patient: { name: "Paciente Pediátrico", drug: "Codeína", context: "Analgésico opioide" },
    scenario: "A codeína é um pró-fármaco que depende do CYP2D6 para gerar morfina. Metabolizadores ultra-rápidos podem ter toxicidade fatal, especialmente em crianças. Simule o cenário de ultra-metabolização.",
    initialProdrug: "codeina", initialCypActivity: 200,
    expectedActiveRange: [60, 90],
    clinicalTip: "A FDA contraindica codeína em <12 anos e após amigdalectomia/adenoidectomia em <18 anos. Metabolizadores ultra-rápidos CYP2D6 podem atingir níveis letais de morfina.",
  },
];

function computeMetabolism(prodrugId: string, cypActivity: number) {
  const pd = PRODRUGS.find(p => p.id === prodrugId) || PRODRUGS[0];
  const cypFactor = cypActivity / 100;
  const kc = pd.kConvert * cypFactor;
  const points = [];
  for (let t = 0; t <= 24; t += 0.5) {
    const prodrug = 100 * Math.exp(-pd.ka * t);
    const active = (100 * kc / (pd.kElim - pd.ka + kc)) * (Math.exp(-(pd.ka) * t) - Math.exp(-(pd.kElim + kc) * t));
    const metabolite = Math.max(0, 100 - prodrug - Math.max(0, active));
    points.push({ hour: t, profarmaco: Math.round(Math.max(0, prodrug) * 10) / 10, ativo: Math.round(Math.max(0, active) * 10) / 10, metabolito: Math.round(Math.max(0, metabolite) * 10) / 10 });
  }
  const peakActive = Math.max(...points.map(p => p.ativo));
  const tMax = points.find(p => p.ativo === peakActive)?.hour || 0;
  return { points, peakActive: Math.round(peakActive * 10) / 10, tMax };
}

export default function SimuladorMetabolismo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<MetabCase | null>(null);
  const [prodrugId, setProdrugId] = useState("enalapril");
  const [cypActivity, setCypActivity] = useState(100);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialProdrug: cd.initialProdrug ?? "enalapril", initialCypActivity: cd.initialCypActivity ?? 100, expectedActiveRange: cd.expectedActiveRange ?? [30, 70], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setProdrugId(activeCase.initialProdrug); setCypActivity(activeCase.initialCypActivity); }
  }, [activeCase]);

  const { points, peakActive, tMax } = useMemo(() => computeMetabolism(prodrugId, cypActivity), [prodrugId, cypActivity]);
  const selectedPD = PRODRUGS.find(p => p.id === prodrugId) || PRODRUGS[0];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = peakActive >= activeCase.expectedActiveRange[0] && peakActive <= activeCase.expectedActiveRange[1];
    const s = ok ? 100 : 30;
    submitResults({ score: s, actions: { prodrugId, cypActivity, peakActive, tMax } });
    return s;
  }, [activeCase, peakActive, tMax, prodrugId, cypActivity, submitted, submitResults]);

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

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialProdrug: c.initialProdrug ?? "enalapril", initialCypActivity: c.initialCypActivity ?? 100, expectedActiveRange: c.expectedActiveRange ?? [30, 70], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    if (isVirtualRoom) return <div className="p-8 text-center text-muted-foreground">Carregando caso da sala virtual...</div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Metabolismo de Fármacos e Pró-Fármacos</h1>
            <p className="text-muted-foreground">Cinética de ativação de pró-fármacos e impacto de CYP450.</p>
            <AdminPromptViewer toolSlug="sim-metabolismo-farmacos" toolName="Metabolismo de Fármacos" toolType="simulator" prompt={getNativePrompt("sim-metabolismo-farmacos") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos de Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />)}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
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
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Fármaco:</strong> {selectedPD.name}</p>
        <p className="text-sm"><strong>Enzima:</strong> {selectedPD.enzyme} | <strong>Fase:</strong> {selectedPD.phase}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Metabólicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Pró-fármaco</label>
              <Select value={prodrugId} onValueChange={setProdrugId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODRUGS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Atividade CYP (%)</label><span className="text-sm font-bold">{cypActivity}%</span></div><Slider value={[cypActivity]} onValueChange={([v]) => setCypActivity(v)} min={10} max={300} step={10} /><p className="text-xs text-muted-foreground mt-1">&lt;50%: Metabolizador Lento | 100%: Normal | &gt;150%: Ultra-rápido</p></div>
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {isVirtualRoom && showFeedbackVR && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
                <p className="text-xs text-muted-foreground">Redirecionando em 15s...</p>
              </div>
            )}
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar Caso</Button>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Cmax Ativo</p><p className="text-2xl font-bold">{peakActive}%</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Tmax</p><p className="text-xl font-bold">{tMax}h</p></div>
              <div className={`p-3 rounded-lg text-center ${cypActivity < 50 ? 'bg-destructive/10' : cypActivity > 150 ? 'bg-amber-500/10' : 'bg-primary/10'}`}><p className="text-xs text-muted-foreground">Fenótipo</p><p className="text-sm font-bold">{cypActivity < 50 ? "Lento" : cypActivity > 150 ? "Ultra-rápido" : "Normal"}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cinética Pró-fármaco → Ativo → Metabólito (h)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" label={{ value: "Horas", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 110]} label={{ value: "Concentração (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area type="monotone" dataKey="profarmaco" name="Pró-fármaco" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} />
              <Area type="monotone" dataKey="ativo" name="Fármaco Ativo" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              <Area type="monotone" dataKey="metabolito" name="Metabólito Inativo" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ prodrugId, cypActivity, peakActive, tMax }} onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }} />
    </div>
  );
}
