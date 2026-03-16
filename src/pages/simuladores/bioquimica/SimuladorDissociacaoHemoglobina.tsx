import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Droplets } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getDissociacaoHemoglobinaChallenges } from "@/data/simulatorChallenges";

const SLUG = "dissociacao-hemoglobina";

interface HbCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialPH: number; initialPCO2: number; initialTemp: number; initialBPG: number;
  expectedP50: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: HbCase[] = [
  {
    title: "Exercício Intenso",
    difficulty: "Fácil",
    patient: { name: "Pedro Alves", age: 25, weight: 72, diagnosis: "Atleta durante exercício intenso" },
    scenario: "Durante exercício, o pH cai, CO₂ e temperatura aumentam, e 2,3-BPG sobe. Observe o desvio da curva para a direita (maior libertação de O₂ nos tecidos).",
    initialPH: 7.25, initialPCO2: 55, initialTemp: 39, initialBPG: 7,
    expectedP50: [30, 40],
    clinicalTip: "O desvio para a direita facilita a descarga de O₂ nos tecidos metabolicamente ativos. É uma adaptação fisiológica ao exercício.",
  },
  {
    title: "Intoxicação por CO",
    difficulty: "Difícil",
    patient: { name: "Luísa Martins", age: 35, weight: 58, diagnosis: "Intoxicação por monóxido de carbono" },
    scenario: "O CO liga-se à Hb com afinidade 200x superior ao O₂. Mesmo com parâmetros normais, a curva desloca-se para a esquerda. Ajuste para pH alcalino e observe o efeito.",
    initialPH: 7.50, initialPCO2: 30, initialTemp: 37, initialBPG: 3,
    expectedP50: [18, 24],
    clinicalTip: "A carboxihemoglobina não só ocupa sítios de ligação mas também aumenta a afinidade dos restantes hemes pelo O₂ (desvio esquerdo), agravando a hipóxia tecidual.",
  },
  {
    title: "Anemia Falciforme",
    difficulty: "Médio",
    patient: { name: "Carlos Santos", age: 18, weight: 65, diagnosis: "Doença falciforme (HbS)" },
    scenario: "A HbS tem menor afinidade pelo O₂ (P50 mais elevado). Simule condições de acidose moderada e observe a curva desviada para a direita.",
    initialPH: 7.32, initialPCO2: 48, initialTemp: 37.5, initialBPG: 6,
    expectedP50: [28, 36],
    clinicalTip: "A HbS polimeriza em condições de desoxigenação, formando fibras que deformam o eritrócito. O aumento de 2,3-BPG agrava a falciformação.",
  },
];

function hillEquation(pO2: number, p50: number, n: number): number {
  return Math.pow(pO2, n) / (Math.pow(p50, n) + Math.pow(pO2, n)) * 100;
}

function computeP50(pH: number, pCO2: number, temp: number, bpg: number): number {
  // Base P50 = 26.6 mmHg
  let p50 = 26.6;
  // Bohr effect: ΔpH from 7.40
  p50 *= Math.pow(10, -0.48 * (pH - 7.40));
  // CO2 effect
  p50 *= 1 + (pCO2 - 40) * 0.003;
  // Temperature effect
  p50 *= 1 + (temp - 37) * 0.05;
  // 2,3-BPG effect
  p50 *= 1 + (bpg - 5) * 0.04;
  return Math.max(10, Math.min(50, +p50.toFixed(1)));
}

function generateCurveData(p50: number) {
  const points = [];
  for (let pO2 = 0; pO2 <= 120; pO2 += 2) {
    const hbSat = hillEquation(pO2, p50, 2.8);
    const mbSat = hillEquation(pO2, p50 * 0.1, 1); // Myoglobin: hyperbolic, P50 ~2.6
    points.push({ pO2, hb: +hbSat.toFixed(1), mb: +mbSat.toFixed(1) });
  }
  return points;
}

export default function SimuladorDissociacaoHemoglobina() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<HbCase | null>(null);
  const [pH, setPH] = useState(7.40);
  const [pCO2, setPCO2] = useState(40);
  const [temp, setTemp] = useState(37);
  const [bpg, setBPG] = useState(5);
  const [running, setRunning] = useState(false);
  const [p50History, setP50History] = useState<any[]>([]);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialPH: cd.initialPH ?? 7.40, initialPCO2: cd.initialPCO2 ?? 40, initialTemp: cd.initialTemp ?? 37, initialBPG: cd.initialBPG ?? 5,
        expectedP50: cd.expectedP50 ?? [24, 28], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setPH(activeCase.initialPH); setPCO2(activeCase.initialPCO2);
      setTemp(activeCase.initialTemp); setBPG(activeCase.initialBPG);
      setRunning(false); setP50History([]); setTime(0);
    }
  }, [activeCase]);

  const p50 = useMemo(() => computeP50(pH, pCO2, temp, bpg), [pH, pCO2, temp, bpg]);
  const curveData = useMemo(() => generateCurveData(p50), [p50]);
  const normalCurve = useMemo(() => generateCurveData(26.6), []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime(t => {
        const newT = t + 1;
        setP50History(prev => [...prev.slice(-59), { time: newT, p50, pH, pCO2, temp, bpg }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, p50, pH, pCO2, temp, bpg]);

  const shift = p50 > 28 ? "Direita ➡️" : p50 < 25 ? "⬅️ Esquerda" : "Normal";

  const handleFinish = useCallback(() => {
    if (!activeCase) return;
    setRunning(false);
    const ok = p50 >= activeCase.expectedP50[0] && p50 <= activeCase.expectedP50[1];
    const s = ok ? 100 : Math.max(0, 100 - Math.abs(p50 - (activeCase.expectedP50[0] + activeCase.expectedP50[1]) / 2) * 8);
    if (submitted) return;
    submitResults({ score: Math.round(s), actions: { pH, pCO2, temp, bpg, p50 } });
  }, [activeCase, p50, pH, pCO2, temp, bpg, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialPH: c.initialPH ?? 7.40, initialPCO2: c.initialPCO2 ?? 40, initialTemp: c.initialTemp ?? 37, initialBPG: c.initialBPG ?? 5,
      expectedP50: c.expectedP50 ?? [24, 28], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Dissociação da Hemoglobina</h1>
            <p className="text-muted-foreground">Curva de saturação O₂, efeito Bohr, mioglobina e moduladores alostéricos.</p>
            <AdminPromptViewer toolSlug="sim-dissociacao-hemoglobina" toolName="Dissociação da Hemoglobina" toolType="simulator" prompt={getNativePrompt("sim-dissociacao-hemoglobina") || ""} />
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
          <CardHeader><CardTitle className="text-base">Moduladores</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "pH", value: pH, set: setPH, min: 6.8, max: 7.8, step: 0.01, unit: "" },
              { label: "pCO₂", value: pCO2, set: setPCO2, min: 15, max: 80, step: 1, unit: "mmHg" },
              { label: "Temperatura", value: temp, set: setTemp, min: 33, max: 42, step: 0.5, unit: "°C" },
              { label: "2,3-BPG", value: bpg, set: setBPG, min: 0, max: 15, step: 0.5, unit: "mmol/L" },
            ].map(({ label, value, set, min, max, step, unit }) => (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">{label}</label>
                  <span className="text-sm font-bold">{value} {unit}</span>
                </div>
                <Slider value={[value]} onValueChange={([v]) => set(v)} min={min} max={max} step={step} />
              </div>
            ))}
            <div className="flex gap-2">
              <div className="flex-1 p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">P50</p>
                <p className="text-2xl font-bold">{p50}</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Desvio</p>
                <p className="text-lg font-bold">{shift}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <Button variant="outline" onClick={handleFinish} disabled={(!running && p50History.length === 0) || submitted}>Finalizar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Curva de Dissociação</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="pO2" type="number" domain={[0, 120]} label={{ value: "pO₂ (mmHg)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} label={{ value: "Saturação (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine x={p50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: `P50=${p50}`, position: "top" }} />
                <Line data={normalCurve} dataKey="hb" name="Hb Normal (ref)" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                <Line data={curveData} dataKey="hb" name="Hemoglobina" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2.5} />
                <Line data={curveData} dataKey="mb" name="Mioglobina" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {p50History.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={p50History}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (s)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="p50" name="P50 (mmHg)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pH" name="pH" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
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
        challengeSet={getDissociacaoHemoglobinaChallenges()}
        simulatorState={{ pH, pCO2, temp, bpg, p50 }}
      />
    </div>
  );
}
