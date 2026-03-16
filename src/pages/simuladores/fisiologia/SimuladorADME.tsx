import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
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
import { getADMEChallenges } from "@/data/simulatorChallenges";

const SLUG = "compartimentos-adme";

interface ADMECase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialBioavailability: number;
  initialVd: number;
  initialClearance: number;
  initialKa: number;
  initialFirstPass: boolean;
  expectedCmax: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: ADMECase[] = [
  {
    title: "Paracetamol Oral – Farmacocinética Normal",
    difficulty: "Fácil",
    patient: { name: "Ana Souza", age: 35, weight: 70, diagnosis: "Cefaleia tensional" },
    scenario: "Paciente recebe paracetamol 1g VO. Observe a absorção, pico plasmático e eliminação. Avalie o impacto do metabolismo de primeira passagem.",
    initialBioavailability: 85, initialVd: 50, initialClearance: 20, initialKa: 70, initialFirstPass: true,
    expectedCmax: [10, 25],
    clinicalTip: "O paracetamol tem biodisponibilidade oral de ~85% devido ao metabolismo de primeira passagem hepática. O pico plasmático ocorre em 30-60 minutos.",
  },
  {
    title: "Lidocaína IV – Alta Extração Hepática",
    difficulty: "Médio",
    patient: { name: "Carlos Pereira", age: 60, weight: 85, diagnosis: "Arritmia ventricular" },
    scenario: "Compare a administração oral (alta primeira passagem) versus IV (100% biodisponibilidade) da lidocaína.",
    initialBioavailability: 35, initialVd: 80, initialClearance: 40, initialKa: 50, initialFirstPass: true,
    expectedCmax: [5, 15],
    clinicalTip: "A lidocaína tem extração hepática de ~70%, tornando a via oral impraticável. Por isso é administrada exclusivamente por via IV ou tópica.",
  },
  {
    title: "Digoxina – Alto Volume de Distribuição",
    difficulty: "Difícil",
    patient: { name: "Irene Martins", age: 78, weight: 55, diagnosis: "ICC com FA de alta resposta" },
    scenario: "A digoxina tem Vd muito elevado (~500L). Observe como isso afeta o pico plasmático e o tempo de meia-vida.",
    initialBioavailability: 70, initialVd: 95, initialClearance: 10, initialKa: 40, initialFirstPass: false,
    expectedCmax: [1, 5],
    clinicalTip: "O alto Vd da digoxina (~7 L/kg) indica extensa distribuição tecidual. A concentração plasmática é baixa apesar de grande quantidade total no corpo.",
  },
];

function generatePKCurve(bioavailability: number, vd: number, clearance: number, ka: number, firstPass: boolean) {
  const F = (bioavailability / 100) * (firstPass ? 0.85 : 1.0);
  const Vd = 10 + (vd / 100) * 490; // 10-500 L
  const CL = 1 + (clearance / 100) * 49; // 1-50 L/h
  const Ka = 0.5 + (ka / 100) * 4.5; // 0.5-5.0 /h
  const Ke = CL / Vd;
  const dose = 1000; // mg

  const points: any[] = [];
  let cmax = 0;
  let tmax = 0;

  for (let t = 0; t <= 24; t += 0.25) {
    // One-compartment oral model: C = (F*D*Ka)/(Vd*(Ka-Ke)) * (e^(-Ke*t) - e^(-Ka*t))
    const denom = Vd * (Ka - Ke);
    const cp = denom !== 0
      ? (F * dose * Ka / denom) * (Math.exp(-Ke * t) - Math.exp(-Ka * t))
      : 0;

    const concentration = Math.max(0, cp);
    
    // Amount in gut
    const gutAmount = dose * F * Math.exp(-Ka * t);
    
    // Amount in body
    const bodyAmount = concentration * Vd;
    
    // Amount eliminated
    const eliminatedAmount = dose * F - gutAmount - bodyAmount;

    if (concentration > cmax) { cmax = concentration; tmax = t; }

    points.push({
      time: parseFloat(t.toFixed(1)),
      concentration: parseFloat(concentration.toFixed(2)),
      gut: parseFloat(Math.max(0, gutAmount).toFixed(1)),
      body: parseFloat(Math.max(0, bodyAmount).toFixed(1)),
      eliminated: parseFloat(Math.max(0, eliminatedAmount).toFixed(1)),
    });
  }

  const halfLife = Ke > 0 ? parseFloat((0.693 / Ke).toFixed(1)) : Infinity;

  return { points, cmax: parseFloat(cmax.toFixed(2)), tmax: parseFloat(tmax.toFixed(1)), halfLife, Vd: parseFloat(Vd.toFixed(0)), CL: parseFloat(CL.toFixed(1)), F: parseFloat((F * 100).toFixed(0)) };
}

export default function SimuladorADME() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<ADMECase | null>(null);
  const [bioavailability, setBioavailability] = useState(85);
  const [vd, setVd] = useState(50);
  const [clearance, setClearance] = useState(20);
  const [ka, setKa] = useState(70);
  const [firstPass, setFirstPass] = useState(true);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialBioavailability: cd.initialBioavailability ?? 85, initialVd: cd.initialVd ?? 50,
        initialClearance: cd.initialClearance ?? 20, initialKa: cd.initialKa ?? 70, initialFirstPass: cd.initialFirstPass ?? true,
        expectedCmax: cd.expectedCmax ?? [5, 30], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setBioavailability(activeCase.initialBioavailability);
      setVd(activeCase.initialVd);
      setClearance(activeCase.initialClearance);
      setKa(activeCase.initialKa);
      setFirstPass(activeCase.initialFirstPass);
    }
  }, [activeCase]);

  const pk = generatePKCurve(bioavailability, vd, clearance, ka, firstPass);

  const handleFinish = useCallback(() => {
    if (!activeCase) return;
    const inRange = pk.cmax >= activeCase.expectedCmax[0] && pk.cmax <= activeCase.expectedCmax[1];
    const s = inRange ? 100 : Math.max(0, 100 - Math.abs(pk.cmax - (activeCase.expectedCmax[0] + activeCase.expectedCmax[1]) / 2) * 3);
    if (submitted) return;
    submitResults({ score: Math.round(s), actions: { bioavailability, vd, clearance, ka, firstPass, cmax: pk.cmax, tmax: pk.tmax } });
  }, [activeCase, pk, bioavailability, vd, clearance, ka, firstPass, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialBioavailability: c.initialBioavailability ?? 85, initialVd: c.initialVd ?? 50,
      initialClearance: c.initialClearance ?? 20, initialKa: c.initialKa ?? 70, initialFirstPass: c.initialFirstPass ?? true,
      expectedCmax: c.expectedCmax ?? [5, 30], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Compartimentos ADME</h1>
            <p className="text-muted-foreground">Modelo farmacocinético de absorção, distribuição, metabolismo e excreção.</p>
            <AdminPromptViewer toolSlug="sim-adme" toolName="ADME" toolType="simulator" prompt={getNativePrompt("sim-adme") || ""} />
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
          <CardHeader><CardTitle className="text-base">Parâmetros Farmacocinéticos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Biodisponibilidade (F)</label><span className="text-sm font-bold">{bioavailability}%</span></div>
              <Slider value={[bioavailability]} onValueChange={([v]) => setBioavailability(v)} min={5} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">Fração absorvida que atinge a circulação sistêmica</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-primary">Volume de Distribuição (Vd)</label><span className="text-sm font-bold text-primary">{vd}%</span></div>
              <Slider value={[vd]} onValueChange={([v]) => setVd(v)} min={1} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">Baixo = restrito ao plasma · Alto = extensa distribuição tecidual ({pk.Vd} L)</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">Clearance (CL)</label><span className="text-sm font-bold text-destructive">{clearance}%</span></div>
              <Slider value={[clearance]} onValueChange={([v]) => setClearance(v)} min={1} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">Capacidade de eliminação ({pk.CL} L/h)</p>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Constante de Absorção (Ka)</label><span className="text-sm font-bold">{ka}%</span></div>
              <Slider value={[ka]} onValueChange={([v]) => setKa(v)} min={1} max={100} step={1} />
              <p className="text-xs text-muted-foreground mt-1">Velocidade de absorção gastrintestinal</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div><p className="text-sm font-medium">Metabolismo de 1ª Passagem</p><p className="text-xs text-muted-foreground">Extração hepática pré-sistêmica</p></div>
              <Switch checked={firstPass} onCheckedChange={setFirstPass} />
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Avaliação</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Derivados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">Cmax</p>
                <p className="text-2xl font-bold">{pk.cmax}</p>
                <p className="text-xs text-muted-foreground">mg/L</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">Tmax</p>
                <p className="text-2xl font-bold">{pk.tmax}</p>
                <p className="text-xs text-muted-foreground">h</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">t½</p>
                <p className="text-2xl font-bold">{pk.halfLife}</p>
                <p className="text-xs text-muted-foreground">h</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">F efetiva</p>
                <p className="text-2xl font-bold">{pk.F}%</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={pk.points.filter((_, i) => i % 2 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" label={{ value: "h", position: "insideBottomRight" }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Area type="monotone" dataKey="gut" name="TGI (mg)" stackId="1" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" />
                <Area type="monotone" dataKey="body" name="Corpo (mg)" stackId="1" fill="hsl(var(--accent-foreground) / 0.3)" stroke="hsl(var(--accent-foreground))" />
                <Area type="monotone" dataKey="eliminated" name="Eliminado (mg)" stackId="1" fill="hsl(var(--muted-foreground) / 0.3)" stroke="hsl(var(--muted-foreground))" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Curva Concentração Plasmática × Tempo</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pk.points.filter((_, i) => i % 2 === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis label={{ value: "Cp (mg/L)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="concentration" name="Cp (mg/L)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getADMEChallenges()}
        simulatorState={{ bioavailability, vd, clearance, ka }}
      />
    </div>
  );
}
