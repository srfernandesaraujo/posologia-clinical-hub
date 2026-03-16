import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, ArrowDown, ArrowUp } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getGlicoliseGliconeogeneseChallenges } from "@/data/simulatorChallenges";

const SLUG = "glicolise-gliconeogenese";

interface GlyCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialFed: boolean;
  initialInsulin: number;
  initialGlucagon: number;
  expectedFlux: string; // "glycolysis" | "gluconeogenesis"
  clinicalTip: string;
}

const BUILT_IN_CASES: GlyCase[] = [
  {
    title: "Estado Pós-Prandial",
    difficulty: "Fácil",
    patient: { name: "Rita Oliveira", age: 30, weight: 60, diagnosis: "Refeição rica em hidratos de carbono" },
    scenario: "Após uma refeição, a insulina predomina sobre o glucagon. Observe como a glicólise é ativada e a gliconeogénese inibida.",
    initialFed: true, initialInsulin: 80, initialGlucagon: 20, expectedFlux: "glycolysis",
    clinicalTip: "A insulina ativa a fosfofrutoquinase-2 (PFK-2), que produz frutose-2,6-bisfosfato, um potente ativador alostérico da PFK-1. Simultaneamente inibe a PEPCK.",
  },
  {
    title: "Jejum Prolongado (48h)",
    difficulty: "Médio",
    patient: { name: "Manuel Ferreira", age: 55, weight: 85, diagnosis: "Jejum terapêutico" },
    scenario: "Após 48h de jejum, o glucagon domina. O fígado produz glicose via gliconeogénese a partir de lactato, alanina e glicerol.",
    initialFed: false, initialInsulin: 15, initialGlucagon: 85, expectedFlux: "gluconeogenesis",
    clinicalTip: "O glucagon ativa a PKA via cAMP, que fosforila a PFK-2/FBPase-2 bifuncional, reduzindo F2,6BP e inibindo a glicólise. A PEPCK e G6Pase são induzidas.",
  },
  {
    title: "Diabetes Tipo 2 Descompensada",
    difficulty: "Difícil",
    patient: { name: "Jorge Mendes", age: 62, weight: 95, diagnosis: "DM2 com resistência à insulina grave" },
    scenario: "Apesar de insulina elevada, a resistência impede a sua ação. O fígado mantém gliconeogénese ativa, contribuindo para hiperglicemia.",
    initialFed: true, initialInsulin: 90, initialGlucagon: 40, expectedFlux: "gluconeogenesis",
    clinicalTip: "Na resistência à insulina hepática, a sinalização via IRS/PI3K está comprometida, mantendo a expressão de PEPCK e G6Pase. A metformina atua reduzindo a gliconeogénese hepática via AMPK.",
  },
];

interface EnzymeState {
  name: string;
  pathway: "glycolysis" | "gluconeogenesis" | "both";
  activity: number;
  phosphorylated: boolean;
  key: boolean;
}

function computeMetabolism(insulin: number, glucagon: number, fed: boolean, insulinResistance: boolean) {
  const ins = insulinResistance ? insulin * 0.2 : insulin;
  const ratio = ins / Math.max(1, glucagon);
  const glycolysisFlux = Math.min(100, Math.max(0, ratio * 30 + (fed ? 20 : -10)));
  const gluconeogenesisFlux = Math.min(100, Math.max(0, (1 / Math.max(0.1, ratio)) * 25 + (!fed ? 20 : -10)));

  const enzymes: EnzymeState[] = [
    { name: "Glucoquinase", pathway: "glycolysis", activity: Math.min(100, ins * 0.8 + (fed ? 20 : 0)), phosphorylated: false, key: true },
    { name: "PFK-1", pathway: "glycolysis", activity: glycolysisFlux, phosphorylated: false, key: true },
    { name: "Piruvato Quinase", pathway: "glycolysis", activity: glycolysisFlux * 0.9, phosphorylated: glucagon > 50, key: true },
    { name: "Piruvato Carboxilase", pathway: "gluconeogenesis", activity: gluconeogenesisFlux * 0.8, phosphorylated: false, key: true },
    { name: "PEPCK", pathway: "gluconeogenesis", activity: gluconeogenesisFlux, phosphorylated: false, key: true },
    { name: "F1,6-Bifosfatase", pathway: "gluconeogenesis", activity: gluconeogenesisFlux * 0.85, phosphorylated: false, key: true },
    { name: "G6Pase", pathway: "gluconeogenesis", activity: gluconeogenesisFlux * 0.9, phosphorylated: false, key: true },
  ];

  const f26bp = Math.max(0, Math.min(30, ins * 0.2 - glucagon * 0.1 + (fed ? 10 : -5)));
  const bloodGlucose = Math.max(40, Math.min(400, 100 + gluconeogenesisFlux * 1.5 - glycolysisFlux * 0.8 + (fed ? 40 : -20)));
  const dominantPathway = glycolysisFlux > gluconeogenesisFlux ? "glycolysis" : "gluconeogenesis";

  return { glycolysisFlux: +glycolysisFlux.toFixed(0), gluconeogenesisFlux: +gluconeogenesisFlux.toFixed(0), enzymes, f26bp: +f26bp.toFixed(1), bloodGlucose: +bloodGlucose.toFixed(0), dominantPathway };
}

export default function SimuladorGlicoliseGliconeogenese() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<GlyCase | null>(null);
  const [fed, setFed] = useState(true);
  const [insulin, setInsulin] = useState(60);
  const [glucagon, setGlucagon] = useState(30);
  const [insulinResistance, setInsulinResistance] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, initialFed: cd.initialFed ?? true,
        initialInsulin: cd.initialInsulin ?? 60, initialGlucagon: cd.initialGlucagon ?? 30,
        expectedFlux: cd.expectedFlux ?? "glycolysis", clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setFed(activeCase.initialFed); setInsulin(activeCase.initialInsulin);
      setGlucagon(activeCase.initialGlucagon); setInsulinResistance(false);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  const outputs = useMemo(() => computeMetabolism(insulin, glucagon, fed, insulinResistance), [insulin, glucagon, fed, insulinResistance]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime(t => {
        const newT = t + 1;
        setHistory(prev => [...prev.slice(-59), { time: newT, gly: outputs.glycolysisFlux, gng: outputs.gluconeogenesisFlux, glucose: outputs.bloodGlucose }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, outputs]);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    setRunning(false);
    const ok = outputs.dominantPathway === activeCase.expectedFlux;
    const s = ok ? 100 : 30;
    if (!submitted) submitResults({ score: s, actions: { insulin, glucagon, fed, insulinResistance, dominantPathway: outputs.dominantPathway } });
    return s;
  }, [activeCase, outputs, insulin, glucagon, fed, insulinResistance, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, initialFed: c.initialFed ?? true,
      initialInsulin: c.initialInsulin ?? 60, initialGlucagon: c.initialGlucagon ?? 30,
      expectedFlux: c.expectedFlux ?? "glycolysis", clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Glicólise vs. Gliconeogénese</h1>
            <p className="text-muted-foreground">Regulação do metabolismo hepático dos hidratos de carbono.</p>
            <AdminPromptViewer toolSlug="sim-glicolise-gliconeogenese" toolName="Glicólise vs Gliconeogênese" toolType="simulator" prompt={getNativePrompt("sim-glicolise-gliconeogenese") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
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

  const enzymeBarData = outputs.enzymes.map(e => ({
    name: e.name,
    activity: e.activity,
    fill: e.pathway === "glycolysis" ? "hsl(var(--primary))" : "hsl(var(--destructive))",
  }));

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
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
          <CardHeader><CardTitle className="text-base">Controlos Hormonais</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Switch checked={fed} onCheckedChange={setFed} />
              <span className="text-sm font-medium">{fed ? "🍽️ Alimentado (Insulina)" : "⏰ Jejum (Glucagon)"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={insulinResistance} onCheckedChange={setInsulinResistance} />
              <span className="text-sm font-medium text-orange-500">Resistência à Insulina</span>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-primary">Insulina</label><span className="text-sm font-bold">{insulin}%</span></div>
              <Slider value={[insulin]} onValueChange={([v]) => setInsulin(v)} min={0} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Glucagon</label><span className="text-sm font-bold">{glucagon}%</span></div>
              <Slider value={[glucagon]} onValueChange={([v]) => setGlucagon(v)} min={0} max={100} step={1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Glicemia</p>
                <p className="text-2xl font-bold">{outputs.bloodGlucose}</p>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">F2,6BP</p>
                <p className="text-2xl font-bold">{outputs.f26bp}</p>
                <p className="text-xs text-muted-foreground">µM</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={() => handleFinish()} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fluxo Metabólico</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <ArrowDown className={`h-8 w-8 mx-auto ${outputs.dominantPathway === "glycolysis" ? "text-primary" : "text-muted-foreground/30"}`} />
                <p className="text-sm font-semibold mt-1">Glicólise</p>
                <p className="text-2xl font-bold text-primary">{outputs.glycolysisFlux}%</p>
              </div>
              <div className="text-center">
                <ArrowUp className={`h-8 w-8 mx-auto ${outputs.dominantPathway === "gluconeogenesis" ? "text-destructive" : "text-muted-foreground/30"}`} />
                <p className="text-sm font-semibold mt-1">Gliconeogénese</p>
                <p className="text-2xl font-bold text-destructive">{outputs.gluconeogenesisFlux}%</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={enzymeBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                {outputs.enzymes.filter(e => e.pathway === "glycolysis").length > 0 && (
                  <Bar dataKey="activity" name="Atividade (%)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (s)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="gly" name="Glicólise (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="gng" name="Gliconeogénese (%)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="glucose" name="Glicemia (mg/dL)" stroke="hsl(var(--foreground))" dot={false} strokeWidth={2} />
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
        challengeSet={getGlicoliseGliconeogeneseChallenges()}
        simulatorState={{ fed, insulin, glucagon, insulinResistance }}
      />
    </div>
  );
}
