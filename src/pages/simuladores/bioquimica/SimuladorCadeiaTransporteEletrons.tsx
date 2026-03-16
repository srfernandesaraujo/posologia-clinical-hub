import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Flame } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCadeiaTransporteEletronsChallenges } from "@/data/simulatorChallenges";

const SLUG = "cadeia-eletrons";

interface ETCCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialNADH: number;
  initialFADH2: number;
  inhibitors: { rotenone: boolean; antimycinA: boolean; cyanide: boolean; dnp: boolean };
  expectedATP: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: ETCCase[] = [
  {
    title: "Intoxicação por Cianeto",
    difficulty: "Difícil",
    patient: { name: "João Silva", age: 45, weight: 80, diagnosis: "Intoxicação por cianeto em incêndio industrial" },
    scenario: "Paciente exposto a fumaça em incêndio. O cianeto bloqueia o Complexo IV. Observe a paralisação completa da cadeia.",
    initialNADH: 80, initialFADH2: 60,
    inhibitors: { rotenone: false, antimycinA: false, cyanide: true, dnp: false },
    expectedATP: [0, 5],
    clinicalTip: "O cianeto liga-se ao Fe³⁺ do citocromo a3 (Complexo IV), impedindo a transferência de elétrons ao O₂. Tratamento: hidroxocobalamina ou nitrito de sódio + tiossulfato.",
  },
  {
    title: "Desacoplamento por DNP",
    difficulty: "Médio",
    patient: { name: "Maria Fernandes", age: 28, weight: 55, diagnosis: "Uso ilícito de dinitrofenol para emagrecimento" },
    scenario: "Paciente tomou DNP para perda de peso. O DNP dissipa o gradiente de prótons sem bloquear a cadeia. Observe o consumo de O₂ mantido mas ATP reduzido.",
    initialNADH: 70, initialFADH2: 50,
    inhibitors: { rotenone: false, antimycinA: false, cyanide: false, dnp: true },
    expectedATP: [5, 20],
    clinicalTip: "Desacopladores como DNP transportam H⁺ pela membrana interna, dissipando o gradiente. A energia é liberada como calor (hipertermia). A cadeia continua a funcionar mas não há síntese de ATP.",
  },
  {
    title: "Metabolismo Aeróbio Normal",
    difficulty: "Fácil",
    patient: { name: "Ana Costa", age: 22, weight: 62, diagnosis: "Fisiologia normal" },
    scenario: "Explore a cadeia de transporte de elétrons em condições normais. Ajuste NADH e FADH2 e observe a produção de ATP.",
    initialNADH: 60, initialFADH2: 40,
    inhibitors: { rotenone: false, antimycinA: false, cyanide: false, dnp: false },
    expectedATP: [25, 38],
    clinicalTip: "Cada NADH gera ~2.5 ATP e cada FADH2 ~1.5 ATP via fosforilação oxidativa. O rendimento total da glicose é ~30-32 ATP.",
  },
];

function computeETC(nadh: number, fadh2: number, inhibitors: { rotenone: boolean; antimycinA: boolean; cyanide: boolean; dnp: boolean }) {
  const n = nadh / 100;
  const f = fadh2 / 100;

  // Complex activities (0-1)
  let c1 = inhibitors.rotenone ? 0 : n;
  let c2 = inhibitors.rotenone ? f : (n * 0.6 + f); // FADH2 enters at Complex II
  c2 = Math.min(c2, 1);
  let c3 = inhibitors.antimycinA ? 0 : Math.min(c1 * 0.8 + c2 * 0.5, 1);
  let c4 = inhibitors.cyanide ? 0 : c3 * 0.9;

  // If chain is blocked downstream, upstream complexes back up
  if (inhibitors.antimycinA) {
    c3 = 0;
    c4 = 0;
    c1 = inhibitors.rotenone ? 0 : n * 0.2;
  }

  if (inhibitors.cyanide) {
    c4 = 0;
    c3 = 0;
    c1 = inhibitors.rotenone ? 0 : n * 0.1;
  }

  // Proton gradient (must be calculated after inhibitor effects)
  const pumpedProtons = (c1 * 4 + c3 * 4 + c4 * 2); // H+ per electron pair
  const uncoupling = inhibitors.dnp ? 0.85 : 0;
  const gradient = Math.max(0, pumpedProtons * (1 - uncoupling));

  // ATP synthesis
  const atpRate = gradient * 3.5; // ATP per unit time
  const o2Consumption = c4 > 0 ? (c1 + c2 * 0.5) * 50 : 0;

  return {
    complex1: +(c1 * 100).toFixed(0),
    complex2: +(c2 * 100).toFixed(0),
    complex3: +(c3 * 100).toFixed(0),
    complex4: +(c4 * 100).toFixed(0),
    gradient: +gradient.toFixed(1),
    atpRate: +atpRate.toFixed(1),
    o2Consumption: +o2Consumption.toFixed(0),
  };
}

export default function SimuladorCadeiaTransporteEletrons() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<ETCCase | null>(null);
  const [nadh, setNadh] = useState(60);
  const [fadh2, setFadh2] = useState(40);
  const [inhibitors, setInhibitors] = useState({ rotenone: false, antimycinA: false, cyanide: false, dnp: false });
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, initialNADH: cd.initialNADH ?? 60, initialFADH2: cd.initialFADH2 ?? 40,
        inhibitors: cd.inhibitors ?? { rotenone: false, antimycinA: false, cyanide: false, dnp: false },
        expectedATP: cd.expectedATP ?? [20, 38], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setNadh(activeCase.initialNADH);
      setFadh2(activeCase.initialFADH2);
      setInhibitors(activeCase.inhibitors);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime((t) => {
        const newT = t + 1;
        const out = computeETC(nadh, fadh2, inhibitors);
        setHistory((prev) => [...prev.slice(-59), { time: newT, ...out }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, nadh, fadh2, inhibitors]);

  const outputs = computeETC(nadh, fadh2, inhibitors);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const atpOk = outputs.atpRate >= activeCase.expectedATP[0] && outputs.atpRate <= activeCase.expectedATP[1];
    const s = Math.round(atpOk ? 100 : Math.max(0, 100 - Math.abs(outputs.atpRate - (activeCase.expectedATP[0] + activeCase.expectedATP[1]) / 2) * 5));
    setRunning(false);
    if (!submitted) submitResults({ score: s, actions: { nadh, fadh2, inhibitors, atpRate: outputs.atpRate } });
    return s;
  }, [activeCase, outputs, nadh, fadh2, inhibitors, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, initialNADH: c.initialNADH ?? 60, initialFADH2: c.initialFADH2 ?? 40,
      inhibitors: c.inhibitors ?? { rotenone: false, antimycinA: false, cyanide: false, dnp: false },
      expectedATP: c.expectedATP ?? [20, 38], clinicalTip: c.clinicalTip ?? "",
    });
  };

  const toggleInhibitor = (key: keyof typeof inhibitors) => setInhibitors(prev => ({ ...prev, [key]: !prev[key] }));

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cadeia de Transporte de Elétrons</h1>
            <p className="text-muted-foreground">Fosforilação oxidativa, inibidores de complexos e desacopladores.</p>
            <AdminPromptViewer toolSlug="sim-cadeia-transporte-eletrons" toolName="Cadeia de Transporte de Elétrons" toolType="simulator" prompt={getNativePrompt("sim-cadeia-transporte-eletrons") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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

  const complexBarData = [
    { name: "Complexo I", activity: outputs.complex1 },
    { name: "Complexo II", activity: outputs.complex2 },
    { name: "Complexo III", activity: outputs.complex3 },
    { name: "Complexo IV", activity: outputs.complex4 },
  ];

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
          <CardHeader><CardTitle className="text-base">Substratos & Inibidores</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">NADH</label><span className="text-sm font-bold">{nadh}%</span></div>
              <Slider value={[nadh]} onValueChange={([v]) => setNadh(v)} min={0} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">FADH₂</label><span className="text-sm font-bold">{fadh2}%</span></div>
              <Slider value={[fadh2]} onValueChange={([v]) => setFadh2(v)} min={0} max={100} step={1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "rotenone" as const, label: "Rotenona (CI)", color: "text-destructive" },
                { key: "antimycinA" as const, label: "Antimicina A (CIII)", color: "text-orange-500" },
                { key: "cyanide" as const, label: "Cianeto (CIV)", color: "text-destructive" },
                { key: "dnp" as const, label: "DNP (Desacoplador)", color: "text-yellow-600" },
              ]).map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={inhibitors[key]} onCheckedChange={() => toggleInhibitor(key)} />
                  <span className={`text-xs font-medium ${color}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={() => handleFinish()} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Outputs Mitocondriais</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Gradiente H⁺", value: outputs.gradient, unit: "ΔpH" },
                { label: "ATP/s", value: outputs.atpRate, unit: "mol/s" },
                { label: "Consumo O₂", value: outputs.o2Consumption, unit: "%" },
              ].map((p) => (
                <div key={p.label} className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-2xl font-bold">{p.value}</p>
                  <p className="text-xs text-muted-foreground">{p.unit}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={complexBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="activity" name="Atividade (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                <Line type="monotone" dataKey="atpRate" name="ATP (mol/s)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="gradient" name="Gradiente H⁺" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="o2Consumption" name="Consumo O₂ (%)" stroke="hsl(var(--foreground))" dot={false} strokeWidth={2} />
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
        challengeSet={getCadeiaTransporteEletronsChallenges()}
        simulatorState={{ nadh, fadh2, ...inhibitors, atpRate: outputs.atpRate }}
      />
    </div>
  );
}
