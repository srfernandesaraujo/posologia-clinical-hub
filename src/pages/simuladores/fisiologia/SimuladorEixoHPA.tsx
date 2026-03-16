import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Shield } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getEixoHPAChallenges } from "@/data/simulatorChallenges";

const SLUG = "eixo-hpa";

interface HPACase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialStress: number;
  initialExogenousCortisol: number;
  expectedCortisol: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: HPACase[] = [
  {
    title: "Supressão Adrenal por Corticoide Exógeno",
    difficulty: "Médio",
    patient: { name: "Maria Fernanda", age: 52, weight: 78, diagnosis: "Uso crônico de prednisona 20 mg/dia há 6 meses" },
    scenario: "Paciente em corticoterapia crônica. Observe como o cortisol exógeno suprime CRH e ACTH pelo feedback negativo, levando à atrofia adrenal.",
    initialStress: 10, initialExogenousCortisol: 80,
    expectedCortisol: [2, 8],
    clinicalTip: "O uso crônico de glicocorticoides suprime o eixo HPA. A retirada abrupta pode causar insuficiência adrenal aguda (crise addisoniana).",
  },
  {
    title: "Resposta ao Estresse Agudo",
    difficulty: "Fácil",
    patient: { name: "Pedro Alves", age: 35, weight: 80, diagnosis: "Pós-operatório de cirurgia abdominal" },
    scenario: "Paciente em estresse cirúrgico. Observe a ativação fisiológica do eixo HPA com elevação de CRH → ACTH → Cortisol.",
    initialStress: 85, initialExogenousCortisol: 0,
    expectedCortisol: [25, 50],
    clinicalTip: "No estresse agudo, o cortisol pode elevar-se 2-5x acima do basal. Essa resposta é essencial para manter a pressão arterial e mobilizar energia.",
  },
  {
    title: "Síndrome de Cushing Endógena",
    difficulty: "Difícil",
    patient: { name: "Cláudia Martins", age: 42, weight: 92, diagnosis: "Adenoma hipofisário secretor de ACTH (Doença de Cushing)" },
    scenario: "Hipersecreção autônoma de ACTH que não responde ao feedback negativo. Observe os níveis cronicamente elevados de cortisol.",
    initialStress: 30, initialExogenousCortisol: 0,
    expectedCortisol: [30, 60],
    clinicalTip: "Na doença de Cushing, o adenoma hipofisário secreta ACTH de forma autônoma, escapando parcialmente do feedback negativo do cortisol.",
  },
];

function computeHPA(stress: number, exogenousCortisol: number) {
  const str = stress / 100;
  const exo = exogenousCortisol / 100;

  // CRH: stimulated by stress, suppressed by total cortisol (endogenous + exogenous)
  const totalCortisolEffect = exo * 0.8; // exogenous suppression
  const crh = Math.max(0, Math.min(100, Math.round((30 + str * 70) * (1 - totalCortisolEffect))));

  // ACTH: driven by CRH, suppressed by cortisol
  const acth = Math.max(0, Math.min(100, Math.round(crh * 0.85 * (1 - exo * 0.6))));

  // Endogenous cortisol: driven by ACTH
  const endogenousCortisol = Math.max(0, Math.min(60, Math.round(acth * 0.55)));

  // Total cortisol (endogenous + exogenous equivalent in µg/dL)
  const totalCortisol = Math.max(0, Math.min(80, Math.round(endogenousCortisol + exo * 30)));

  // Adrenal size (atrophies with chronic suppression)
  const adrenalSize = Math.max(20, Math.min(100, Math.round(50 + acth * 0.5 - exo * 30)));

  return { crh, acth, endogenousCortisol, totalCortisol, adrenalSize };
}

export default function SimuladorEixoHPA() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<HPACase | null>(null);
  const [stress, setStress] = useState(30);
  const [exogenousCortisol, setExogenousCortisol] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialStress: cd.initialStress ?? 30, initialExogenousCortisol: cd.initialExogenousCortisol ?? 0,
        expectedCortisol: cd.expectedCortisol ?? [5, 25], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setStress(activeCase.initialStress);
      setExogenousCortisol(activeCase.initialExogenousCortisol);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime((t) => {
        const newT = t + 1;
        const outputs = computeHPA(stress, exogenousCortisol);
        setHistory((prev) => [...prev.slice(-59), { time: newT, ...outputs }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, stress, exogenousCortisol]);

  const outputs = computeHPA(stress, exogenousCortisol);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const inRange = outputs.totalCortisol >= activeCase.expectedCortisol[0] && outputs.totalCortisol <= activeCase.expectedCortisol[1];
    const s = Math.round(inRange ? 100 : Math.max(0, 100 - Math.abs(outputs.totalCortisol - (activeCase.expectedCortisol[0] + activeCase.expectedCortisol[1]) / 2) * 2));
    setRunning(false);
    if (!submitted) submitResults({ score: s, actions: { stress, exogenousCortisol, totalCortisol: outputs.totalCortisol } });
    return s;
  }, [activeCase, outputs, stress, exogenousCortisol, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialStress: c.initialStress ?? 30, initialExogenousCortisol: c.initialExogenousCortisol ?? 0,
      expectedCortisol: c.expectedCortisol ?? [5, 25], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Eixo Hipotálamo-Hipófise-Adrenal</h1>
            <p className="text-muted-foreground">Simule o mecanismo de feedback negativo do eixo HPA com estresse e corticoides exógenos.</p>
            <AdminPromptViewer toolSlug="sim-eixo-hpa" toolName="Eixo HPA" toolType="simulator" prompt={getNativePrompt("sim-eixo-hpa") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar Caso com IA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && (
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Controles do Eixo HPA</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Nível de Estresse</label><span className="text-sm font-bold text-destructive">{stress}%</span></div>
              <Slider value={[stress]} onValueChange={([v]) => setStress(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">0% = repouso · 100% = estresse cirúrgico/trauma</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-primary">Corticoide Exógeno</label><span className="text-sm font-bold text-primary">{exogenousCortisol}%</span></div>
              <Slider value={[exogenousCortisol]} onValueChange={([v]) => setExogenousCortisol(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">0% = nenhum · 100% = dose suprafisiológica (ex: prednisona 60 mg/dia)</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={handleFinish} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cascata Hormonal</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Visual cascade */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-full p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground">Hipotálamo → CRH</p>
                  <p className="text-2xl font-bold">{outputs.crh}<span className="text-sm font-normal ml-1">%</span></p>
                </div>
                <span className="text-lg">↓</span>
                <div className="w-full p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground">Hipófise Anterior → ACTH</p>
                  <p className="text-2xl font-bold">{outputs.acth}<span className="text-sm font-normal ml-1">%</span></p>
                </div>
                <span className="text-lg">↓</span>
                <div className={`w-full p-3 rounded-lg text-center ${outputs.totalCortisol > 40 ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                  <p className="text-xs text-muted-foreground">Córtex Adrenal → Cortisol Total</p>
                  <p className={`text-2xl font-bold ${outputs.totalCortisol > 40 ? "text-destructive" : ""}`}>{outputs.totalCortisol}<span className="text-sm font-normal ml-1">µg/dL</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2 rounded bg-muted text-center">
                  <p className="text-xs text-muted-foreground">Cortisol Endógeno</p>
                  <p className="text-lg font-bold">{outputs.endogenousCortisol} <span className="text-xs">µg/dL</span></p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="text-xs text-muted-foreground">Tamanho Adrenal</p>
                  <p className={`text-lg font-bold ${outputs.adrenalSize < 40 ? "text-destructive" : ""}`}>{outputs.adrenalSize}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (s)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="crh" name="CRH (%)" stroke="hsl(var(--accent-foreground))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="acth" name="ACTH (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="totalCortisol" name="Cortisol (µg/dL)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getEixoHPAChallenges()}
        simulatorState={{ stress, exogenousCortisol }}
      />
    </div>
  );
}
