import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Brain } from "lucide-react";
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
import { getSNAChallenges } from "@/data/simulatorChallenges";

const SLUG = "sna";

interface SNACase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialSympathetic: number;
  initialParasympathetic: number;
  expectedFC: [number, number];
  expectedPAS: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: SNACase[] = [
  {
    title: "Bradicardia Vagal",
    difficulty: "Fácil",
    patient: { name: "Carlos Mendes", age: 72, weight: 78, diagnosis: "Síncope vasovagal recorrente" },
    scenario: "Paciente idoso com episódios de síncope. Simule a predominância parassimpática e observe o efeito na FC e PA.",
    initialSympathetic: 20, initialParasympathetic: 80,
    expectedFC: [40, 55], expectedPAS: [85, 100],
    clinicalTip: "O tônus vagal excessivo reduz a FC via receptores muscarínicos M2 no nó SA, diminuindo a corrente If (funny current).",
  },
  {
    title: "Tempestade Adrenérgica",
    difficulty: "Médio",
    patient: { name: "Fernanda Lopes", age: 34, weight: 62, diagnosis: "Feocromocitoma" },
    scenario: "Crise hipertensiva por descarga simpática maciça. Observe os efeitos da hiperativação simpática.",
    initialSympathetic: 95, initialParasympathetic: 10,
    expectedFC: [130, 160], expectedPAS: [180, 220],
    clinicalTip: "A ativação α1 causa vasoconstrição arteriolar; a ativação β1 aumenta FC e contratilidade. No feocromocitoma, usar α-bloqueio antes de β-bloqueio.",
  },
  {
    title: "Equilíbrio Autonômico Normal",
    difficulty: "Fácil",
    patient: { name: "Ana Rodrigues", age: 28, weight: 65, diagnosis: "Check-up de rotina" },
    scenario: "Paciente saudável em repouso. Explore como o equilíbrio simpático-parassimpático mantém a homeostase.",
    initialSympathetic: 40, initialParasympathetic: 50,
    expectedFC: [60, 80], expectedPAS: [110, 130],
    clinicalTip: "Em repouso, o tônus parassimpático predomina sobre o simpático, mantendo a FC entre 60-80 bpm.",
  },
];

function computeOutputs(sympathetic: number, parasympathetic: number) {
  const sym = sympathetic / 100;
  const para = parasympathetic / 100;
  const balance = sym - para;
  const fc = Math.max(30, Math.min(200, Math.round(70 + balance * 60 + sym * 20 - para * 15)));
  const pas = Math.max(60, Math.min(250, Math.round(120 + balance * 50 + sym * 15)));
  const pad = Math.max(40, Math.min(150, Math.round(80 + balance * 20 + sym * 8)));
  const pupilDiameter = Math.max(1.5, Math.min(8, +(3.5 + sym * 4 - para * 1.5).toFixed(1)));
  const giMotility = Math.max(0, Math.min(100, Math.round(50 + para * 40 - sym * 30)));
  return { fc, pas, pad, pupilDiameter, giMotility };
}

export default function SimuladorSNA() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<SNACase | null>(null);
  const [sympathetic, setSympathetic] = useState(40);
  const [parasympathetic, setParasympathetic] = useState(50);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialSympathetic: cd.initialSympathetic ?? 40, initialParasympathetic: cd.initialParasympathetic ?? 50,
        expectedFC: cd.expectedFC ?? [60, 80], expectedPAS: cd.expectedPAS ?? [110, 130], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSympathetic(activeCase.initialSympathetic);
      setParasympathetic(activeCase.initialParasympathetic);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime((t) => {
        const newT = t + 1;
        const outputs = computeOutputs(sympathetic, parasympathetic);
        setHistory((prev) => [...prev.slice(-59), { time: newT, ...outputs }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, sympathetic, parasympathetic]);

  const outputs = computeOutputs(sympathetic, parasympathetic);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const fcOk = outputs.fc >= activeCase.expectedFC[0] && outputs.fc <= activeCase.expectedFC[1];
    const pasOk = outputs.pas >= activeCase.expectedPAS[0] && outputs.pas <= activeCase.expectedPAS[1];
    const s = (fcOk ? 50 : 0) + (pasOk ? 50 : 0);
    setRunning(false);
    if (!submitted) submitResults({ score: s, actions: { sympathetic, parasympathetic, fc: outputs.fc, pas: outputs.pas } });
    return s;
  }, [activeCase, outputs, sympathetic, parasympathetic, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialSympathetic: c.initialSympathetic ?? 40, initialParasympathetic: c.initialParasympathetic ?? 50,
      expectedFC: c.expectedFC ?? [60, 80], expectedPAS: c.expectedPAS ?? [110, 130], clinicalTip: c.clinicalTip ?? "",
    });
  };

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

  // Dashboard
  if (!activeCase) {
    if (isVirtualRoom) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Sistema Nervoso Autônomo</h1>
            <p className="text-muted-foreground">Manipule o tônus simpático e parassimpático e observe alterações fisiológicas em tempo real.</p>
            <AdminPromptViewer toolSlug="sim-sna" toolName="Sistema Nervoso Autônomo" toolType="simulator" prompt={getNativePrompt("sim-sna") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && (
              <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Caso com IA
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && (
        <ExamFeedbackOverlay
          score={examFeedback.score}
          simulatorSlug={SLUG}
          caseTitle={examFeedback.caseTitle}
          examProgress={examProgress!}
          onProceed={proceedToNext}
          isFinalActivity={examFeedback.isFinalActivity}
        />
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
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
          <CardHeader><CardTitle className="text-base">Controles Autonômicos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Tônus Simpático</label><span className="text-sm font-bold text-destructive">{sympathetic}%</span></div>
              <Slider value={[sympathetic]} onValueChange={([v]) => setSympathetic(v)} min={0} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-primary">Tônus Parassimpático</label><span className="text-sm font-bold text-primary">{parasympathetic}%</span></div>
              <Slider value={[parasympathetic]} onValueChange={([v]) => setParasympathetic(v)} min={0} max={100} step={1} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={handleFinish} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Fisiológicos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "FC", value: outputs.fc, unit: "bpm" },
                { label: "PA", value: `${outputs.pas}/${outputs.pad}`, unit: "mmHg" },
                { label: "Pupila", value: outputs.pupilDiameter, unit: "mm" },
                { label: "Motilidade GI", value: outputs.giMotility, unit: "%" },
              ].map((p) => (
                <div key={p.label} className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-2xl font-bold">{p.value}</p>
                  <p className="text-xs text-muted-foreground">{p.unit}</p>
                </div>
              ))}
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
                <YAxis label={{ value: "Valor", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="fc" name="FC (bpm)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pas" name="PAS (mmHg)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="giMotility" name="Motilidade GI (%)" stroke="hsl(var(--accent-foreground))" dot={false} strokeWidth={2} />
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
        challengeSet={getSNAChallenges()}
        simulatorState={{ sympathetic, parasympathetic, fc: outputs.fc, pas: outputs.pas, pad: outputs.pad, giMotility: outputs.giMotility }}
        onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }}
      />

      {isVirtualRoom && submitted && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setShowFeedback(!showFeedback)}>
              {showFeedback ? "Ocultar Resultados" : "Mostrar Resultados"}
            </Button>
            {showFeedback && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm font-semibold">Pontuação: {lastScore}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
