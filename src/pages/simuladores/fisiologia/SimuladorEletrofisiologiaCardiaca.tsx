import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Heart } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getEletrofisiologiaCardiacaChallenges } from "@/data/simulatorChallenges";

const SLUG = "eletrofisiologia-cardiaca";

interface EletroCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; diagnosis: string };
  scenario: string;
  initialNa: number;
  initialK: number;
  initialCa: number;
  cellType: "ventricular" | "nodal";
  expectedPhase: string;
  clinicalTip: string;
}

const BUILT_IN_CASES: EletroCase[] = [
  {
    title: "Bloqueio de Canal de Sódio (Classe I)",
    difficulty: "Médio",
    patient: { name: "Roberto Alves", age: 58, diagnosis: "Taquicardia ventricular" },
    scenario: "Simule o efeito de um antiarrítmico Classe Ia (procainamida) reduzindo a condutância de Na⁺.",
    initialNa: 40, initialK: 100, initialCa: 100, cellType: "ventricular",
    expectedPhase: "Fase 0 alargada",
    clinicalTip: "Antiarrítmicos Classe I bloqueiam canais de Na⁺ rápidos. Classe Ia (procainamida) também prolonga a repolarização.",
  },
  {
    title: "Bloqueador de Canal de Cálcio (Classe IV)",
    difficulty: "Fácil",
    patient: { name: "Mariana Costa", age: 45, diagnosis: "Fibrilação atrial com RVR" },
    scenario: "Simule verapamil em célula nodal SA. Reduza a condutância de Ca²⁺ e observe a redução da automaticidade.",
    initialNa: 100, initialK: 100, initialCa: 40, cellType: "nodal",
    expectedPhase: "Fase 0 nodal reduzida",
    clinicalTip: "Nas células nodais, a fase 0 depende de correntes de Ca²⁺ (não de Na⁺). Bloqueadores de Ca²⁺ reduzem a condução AV.",
  },
  {
    title: "Hipercalemia e Repolarização",
    difficulty: "Difícil",
    patient: { name: "José Ferreira", age: 67, diagnosis: "IRC com K⁺ = 7.2 mEq/L" },
    scenario: "Simule hipercalemia aumentando a condutância de K⁺. Observe o encurtamento do potencial de ação.",
    initialNa: 100, initialK: 150, initialCa: 100, cellType: "ventricular",
    expectedPhase: "Repolarização acelerada",
    clinicalTip: "Hipercalemia eleva o potencial de repouso, inativa canais de Na⁺ e encurta o PA. ECG: ondas T apiculadas, alargamento QRS.",
  },
];

function generateActionPotential(na: number, k: number, ca: number, cellType: "ventricular" | "nodal") {
  const naNorm = na / 100;
  const kNorm = k / 100;
  const caNorm = ca / 100;
  const points: { ms: number; mV: number }[] = [];

  if (cellType === "ventricular") {
    const restingPotential = -90 + (kNorm - 1) * 20;
    const peakPhase0 = restingPotential + naNorm * 120;
    const plateauLevel = peakPhase0 * 0.2 + caNorm * 15;
    const apDuration = 250 * (1 + (1 - kNorm) * 0.5);

    for (let t = 0; t <= 400; t += 2) {
      let mV: number;
      const upstroke = 10 / Math.max(0.1, naNorm);
      if (t < 5) mV = restingPotential;
      else if (t < 5 + upstroke) mV = restingPotential + (peakPhase0 - restingPotential) * ((t - 5) / upstroke);
      else if (t < 20) mV = peakPhase0 - (peakPhase0 - plateauLevel) * Math.min(1, (t - 5 - upstroke) / Math.max(1, 15 - upstroke));
      else if (t < 20 + apDuration * 0.6) mV = plateauLevel - ((t - 20) / (apDuration * 0.6)) * 5;
      else if (t < 20 + apDuration) { const p = (t - 20 - apDuration * 0.6) / (apDuration * 0.4); mV = (plateauLevel - 5) + (restingPotential - plateauLevel + 5) * p; }
      else mV = restingPotential;
      points.push({ ms: t, mV: Math.round(mV * 10) / 10 });
    }
  } else {
    const restingPotential = -60 + (kNorm - 1) * 15;
    const threshold = -40;
    const peak = restingPotential + caNorm * 60;

    for (let t = 0; t <= 400; t += 2) {
      let mV: number;
      const upstroke = 20 / Math.max(0.1, caNorm);
      if (t < 30) mV = restingPotential + ((threshold - restingPotential) * t) / 30;
      else if (t < 30 + upstroke) mV = threshold + (peak - threshold) * ((t - 30) / upstroke);
      else if (t < 250) { const p = (t - 30 - upstroke) / (220 - upstroke); mV = peak + (restingPotential - peak) * Math.pow(Math.min(1, p), 0.8); }
      else mV = restingPotential;
      points.push({ ms: t, mV: Math.round(mV * 10) / 10 });
    }
  }
  return points;
}

export default function SimuladorEletrofisiologiaCardiaca() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<EletroCase | null>(null);
  const [na, setNa] = useState(100);
  const [k, setK] = useState(100);
  const [ca, setCa] = useState(100);
  const [cellType, setCellType] = useState<"ventricular" | "nodal">("ventricular");

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialNa: cd.initialNa ?? 100, initialK: cd.initialK ?? 100, initialCa: cd.initialCa ?? 100,
        cellType: cd.cellType ?? "ventricular", expectedPhase: cd.expectedPhase ?? "", clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setNa(activeCase.initialNa); setK(activeCase.initialK); setCa(activeCase.initialCa); setCellType(activeCase.cellType); }
  }, [activeCase]);

  const apData = useMemo(() => generateActionPotential(na, k, ca, cellType), [na, k, ca, cellType]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = 80;
    submitResults({ score: s, actions: { na, k, ca, cellType } });
    return s;
  }, [activeCase, na, k, ca, cellType, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialNa: c.initialNa ?? 100, initialK: c.initialK ?? 100, initialCa: c.initialCa ?? 100,
      cellType: c.cellType ?? "ventricular", expectedPhase: c.expectedPhase ?? "", clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Eletrofisiologia Cardíaca</h1>
            <p className="text-muted-foreground">Manipule canais iônicos e observe o potencial de ação cardíaco.</p>
            <AdminPromptViewer toolSlug="sim-eletrofisiologia-cardiaca" toolName="Eletrofisiologia Cardíaca" toolType="simulator" prompt={getNativePrompt("sim-eletrofisiologia-cardiaca") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Canais Iônicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tipo celular</label>
              <div className="flex items-center gap-2 text-sm">
                <span className={cellType === "ventricular" ? "font-bold" : "text-muted-foreground"}>Ventricular</span>
                <Switch checked={cellType === "nodal"} onCheckedChange={(v) => setCellType(v ? "nodal" : "ventricular")} />
                <span className={cellType === "nodal" ? "font-bold" : "text-muted-foreground"}>Nodal SA</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Condutância Na⁺</label><span className="text-sm font-bold">{na}%</span></div>
              <Slider value={[na]} onValueChange={([v]) => setNa(v)} min={0} max={150} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Condutância K⁺</label><span className="text-sm font-bold">{k}%</span></div>
              <Slider value={[k]} onValueChange={([v]) => setK(v)} min={0} max={200} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Condutância Ca²⁺</label><span className="text-sm font-bold">{ca}%</span></div>
              <Slider value={[ca]} onValueChange={([v]) => setCa(v)} min={0} max={150} step={5} />
            </div>
            <Button onClick={handleFinish} className="w-full" disabled={submitted}>Finalizar Caso</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Potencial de Ação — {cellType === "ventricular" ? "Miócito Ventricular" : "Célula Nodal SA"}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={apData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ms" label={{ value: "Tempo (ms)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[-100, 60]} label={{ value: "mV", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="mV" name="Potencial (mV)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2.5} />
              </LineChart>
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
        challengeSet={getEletrofisiologiaCardiacaChallenges()}
        simulatorState={{ na, k, ca }}
      />
    </div>
  );
}
