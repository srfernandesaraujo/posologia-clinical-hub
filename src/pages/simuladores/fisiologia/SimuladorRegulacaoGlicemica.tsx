import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Droplets } from "lucide-react";
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
import { getRegulacaoGlicemicaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "regulacao-glicemica";

interface GlycemicCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialCarbIntake: number;
  initialInsulinSensitivity: number;
  initialPancreaticFunction: number;
  expectedGlycemia: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: GlycemicCase[] = [
  {
    title: "Diabetes Mellitus Tipo 2 – Resistência à Insulina",
    difficulty: "Médio",
    patient: { name: "José Silva", age: 58, weight: 95, diagnosis: "DM2 com resistência à insulina" },
    scenario: "Paciente obeso com DM2 há 8 anos. Simule a baixa sensibilidade à insulina e observe a hiperglicemia pós-prandial.",
    initialCarbIntake: 70, initialInsulinSensitivity: 25, initialPancreaticFunction: 60,
    expectedGlycemia: [180, 280],
    clinicalTip: "Na resistência à insulina, os receptores GLUT4 são deslocados para compartimentos intracelulares, reduzindo a captação muscular de glicose em até 50%.",
  },
  {
    title: "Diabetes Mellitus Tipo 1 – Deficiência Absoluta",
    difficulty: "Fácil",
    patient: { name: "Laura Mendes", age: 14, weight: 48, diagnosis: "DM1 – diagnóstico recente" },
    scenario: "Adolescente com destruição autoimune das células β. Observe o efeito da função pancreática quase nula.",
    initialCarbIntake: 50, initialInsulinSensitivity: 80, initialPancreaticFunction: 5,
    expectedGlycemia: [250, 400],
    clinicalTip: "No DM1, a destruição das células β leva à deficiência absoluta de insulina. Sem insulina exógena, a glicose não é captada e ocorre cetoacidose.",
  },
  {
    title: "Indivíduo Saudável – Homeostase Normal",
    difficulty: "Fácil",
    patient: { name: "Marcos Oliveira", age: 30, weight: 72, diagnosis: "Saudável – check-up" },
    scenario: "Observe como o pâncreas saudável e sensibilidade normal à insulina mantêm a glicemia em faixa fisiológica.",
    initialCarbIntake: 50, initialInsulinSensitivity: 80, initialPancreaticFunction: 95,
    expectedGlycemia: [70, 140],
    clinicalTip: "Em jejum, a glicemia é mantida entre 70-100 mg/dL pela produção hepática basal de glicose, regulada pela relação insulina/glucagon.",
  },
];

function computeGlycemic(carbIntake: number, insulinSensitivity: number, pancreaticFunction: number) {
  const carb = carbIntake / 100;
  const sens = insulinSensitivity / 100;
  const panc = pancreaticFunction / 100;

  // Insulin secretion depends on pancreatic function and carb stimulus
  const insulinSecretion = Math.max(0, Math.min(100, Math.round(panc * 100 * (0.3 + 0.7 * carb))));
  
  // Effective insulin action = secretion × sensitivity
  const effectiveInsulin = (insulinSecretion / 100) * sens;
  
  // Muscle uptake proportional to effective insulin
  const muscleUptake = Math.max(0, Math.min(100, Math.round(effectiveInsulin * 80 + 10)));
  
  // Hepatic glucose output (suppressed by insulin)
  const hepaticOutput = Math.max(5, Math.min(100, Math.round(60 - effectiveInsulin * 50)));
  
  // Blood glucose: rises with carb intake and hepatic output, falls with muscle uptake
  const glycemia = Math.max(40, Math.min(500, Math.round(
    90 + carb * 200 + hepaticOutput * 1.5 - muscleUptake * 2.5
  )));

  // Insulinemia (µU/mL)
  const insulinemia = Math.max(0, Math.min(200, Math.round(insulinSecretion * 1.5)));

  return { glycemia, insulinemia, insulinSecretion, muscleUptake, hepaticOutput };
}

export default function SimuladorRegulacaoGlicemica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<GlycemicCase | null>(null);
  const [carbIntake, setCarbIntake] = useState(50);
  const [insulinSensitivity, setInsulinSensitivity] = useState(80);
  const [pancreaticFunction, setPancreaticFunction] = useState(95);
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
        initialCarbIntake: cd.initialCarbIntake ?? 50, initialInsulinSensitivity: cd.initialInsulinSensitivity ?? 80,
        initialPancreaticFunction: cd.initialPancreaticFunction ?? 95,
        expectedGlycemia: cd.expectedGlycemia ?? [70, 140], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setCarbIntake(activeCase.initialCarbIntake);
      setInsulinSensitivity(activeCase.initialInsulinSensitivity);
      setPancreaticFunction(activeCase.initialPancreaticFunction);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime((t) => {
        const newT = t + 1;
        const outputs = computeGlycemic(carbIntake, insulinSensitivity, pancreaticFunction);
        setHistory((prev) => [...prev.slice(-59), { time: newT, ...outputs }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, carbIntake, insulinSensitivity, pancreaticFunction]);

  const outputs = computeGlycemic(carbIntake, insulinSensitivity, pancreaticFunction);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const inRange = outputs.glycemia >= activeCase.expectedGlycemia[0] && outputs.glycemia <= activeCase.expectedGlycemia[1];
    const s = Math.round(inRange ? 100 : Math.max(0, 100 - Math.abs(outputs.glycemia - (activeCase.expectedGlycemia[0] + activeCase.expectedGlycemia[1]) / 2) / 2));
    setRunning(false);
    if (!submitted) submitResults({ score: s, actions: buildSimulatorDecisions("regulacao-glicemica", [
        { label: "Glycemia", userChoice: String(outputs.glycemia), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" }
      ]) });
    return s;
  }, [activeCase, outputs, carbIntake, insulinSensitivity, pancreaticFunction, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialCarbIntake: c.initialCarbIntake ?? 50, initialInsulinSensitivity: c.initialInsulinSensitivity ?? 80,
      initialPancreaticFunction: c.initialPancreaticFunction ?? 95,
      expectedGlycemia: c.expectedGlycemia ?? [70, 140], clinicalTip: c.clinicalTip ?? "",
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

  if (!activeCase) {
    if (isVirtualRoom) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Regulação Glicêmica</h1>
            <p className="text-muted-foreground">Modele a interação entre ingestão de carboidratos, secreção de insulina e captação muscular de glicose.</p>
            <AdminPromptViewer toolSlug="sim-regulacao-glicemica" toolName="Regulação Glicêmica" toolType="simulator" prompt={getNativePrompt("sim-regulacao-glicemica") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
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
          <CardHeader><CardTitle className="text-base">Controles Metabólicos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Ingestão de Carboidratos</label><span className="text-sm font-bold">{carbIntake}%</span></div>
              <Slider value={[carbIntake]} onValueChange={([v]) => setCarbIntake(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">0% = jejum prolongado · 100% = refeição rica em carboidratos</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-primary">Sensibilidade à Insulina</label><span className="text-sm font-bold text-primary">{insulinSensitivity}%</span></div>
              <Slider value={[insulinSensitivity]} onValueChange={([v]) => setInsulinSensitivity(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">Baixa = resistência à insulina (DM2) · Alta = normal</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Função Pancreática (β)</label><span className="text-sm font-bold text-destructive">{pancreaticFunction}%</span></div>
              <Slider value={[pancreaticFunction]} onValueChange={([v]) => setPancreaticFunction(v)} min={0} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">0% = destruição total das células β (DM1) · 100% = função preservada</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={handleFinish} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Metabólicos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Glicemia", value: outputs.glycemia, unit: "mg/dL", alert: outputs.glycemia > 180 || outputs.glycemia < 70 },
                { label: "Insulinemia", value: outputs.insulinemia, unit: "µU/mL", alert: false },
                { label: "Captação Muscular", value: outputs.muscleUptake, unit: "%", alert: outputs.muscleUptake < 30 },
                { label: "Produção Hepática", value: outputs.hepaticOutput, unit: "%", alert: outputs.hepaticOutput > 60 },
              ].map((p) => (
                <div key={p.label} className={`p-3 rounded-lg text-center ${p.alert ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className={`text-2xl font-bold ${p.alert ? "text-destructive" : ""}`}>{p.value}</p>
                  <p className="text-xs text-muted-foreground">{p.unit}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 rounded bg-muted text-xs text-muted-foreground">
              {outputs.glycemia < 70 && "⚠️ Hipoglicemia! Risco de neuroglicopenia."}
              {outputs.glycemia >= 70 && outputs.glycemia <= 140 && "✅ Glicemia em faixa fisiológica normal."}
              {outputs.glycemia > 140 && outputs.glycemia <= 200 && "⚠️ Intolerância à glicose (pré-diabetes)."}
              {outputs.glycemia > 200 && "🔴 Hiperglicemia franca – compatível com diabetes."}
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
                <Line type="monotone" dataKey="glycemia" name="Glicemia (mg/dL)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="insulinemia" name="Insulinemia (µU/mL)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="muscleUptake" name="Captação Muscular (%)" stroke="hsl(var(--accent-foreground))" dot={false} strokeWidth={2} />
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
        challengeSet={getRegulacaoGlicemicaChallenges()}
        simulatorState={{ carbIntake, insulinSensitivity, pancreaticFunction }}
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
