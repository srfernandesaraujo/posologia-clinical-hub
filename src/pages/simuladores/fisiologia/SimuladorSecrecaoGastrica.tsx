import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getSecrecaoGastricaChallenges } from "@/data/simulatorChallenges";

const SLUG = "secrecao-gastrica";

interface GastricCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialHistamine: boolean;
  initialAcetylcholine: boolean;
  initialGastrin: boolean;
  initialBlockPPI: boolean;
  initialBlockH2: boolean;
  initialBlockAnticholinergic: boolean;
  expectedPH: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: GastricCase[] = [
  {
    title: "Úlcera Péptica – Tratamento com IBP",
    difficulty: "Fácil",
    patient: { name: "Roberto Alves", age: 52, weight: 78, diagnosis: "Úlcera duodenal H. pylori+" },
    scenario: "Paciente com úlcera duodenal ativa. Observe o efeito do bloqueio da bomba de prótons sobre a secreção ácida.",
    initialHistamine: true, initialAcetylcholine: true, initialGastrin: true,
    initialBlockPPI: false, initialBlockH2: false, initialBlockAnticholinergic: false,
    expectedPH: [4, 7],
    clinicalTip: "Os IBPs bloqueiam irreversivelmente a H⁺/K⁺-ATPase, reduzindo a secreção ácida em até 95%. São mais eficazes que anti-H2 pois atuam na via final comum.",
  },
  {
    title: "DRGE – Bloqueio com Anti-H2",
    difficulty: "Médio",
    patient: { name: "Cláudia Ferreira", age: 45, weight: 68, diagnosis: "DRGE grau B de Los Angeles" },
    scenario: "Paciente com refluxo gastroesofágico. Compare o efeito do bloqueio H2 isolado versus IBP.",
    initialHistamine: true, initialAcetylcholine: true, initialGastrin: true,
    initialBlockPPI: false, initialBlockH2: false, initialBlockAnticholinergic: false,
    expectedPH: [3, 5],
    clinicalTip: "Anti-H2 (ranitidina, famotidina) bloqueiam apenas a via da histamina. A gastrina e a acetilcolina ainda estimulam a bomba de prótons por vias alternativas.",
  },
  {
    title: "Síndrome de Zollinger-Ellison",
    difficulty: "Difícil",
    patient: { name: "Marcos Lima", age: 48, weight: 82, diagnosis: "Gastrinoma pancreático" },
    scenario: "Paciente com hipersecreção ácida severa por gastrinoma. Observe como a hipergastrinemia estimula a secreção mesmo com bloqueios parciais.",
    initialHistamine: true, initialAcetylcholine: true, initialGastrin: true,
    initialBlockPPI: false, initialBlockH2: false, initialBlockAnticholinergic: false,
    expectedPH: [4, 7],
    clinicalTip: "No Zollinger-Ellison, níveis suprafisiológicos de gastrina estimulam massivamente as células ECL (histamina) e diretamente as células parietais. Apenas IBPs em dose alta controlam o pH.",
  },
];

function computeGastricSecretion(
  histamine: boolean, acetylcholine: boolean, gastrin: boolean,
  blockPPI: boolean, blockH2: boolean, blockAnticholinergic: boolean
) {
  // Each pathway contributes to proton pump stimulation
  const histamineStim = histamine && !blockH2 ? 0.50 : 0;
  const achStim = acetylcholine && !blockAnticholinergic ? 0.25 : 0;
  const gastrinStim = gastrin ? 0.25 : 0; // gastrin also stimulates ECL → histamine
  const gastrinViaECL = gastrin && !blockH2 ? 0.15 : 0;

  let totalStimulation = histamineStim + achStim + gastrinStim + gastrinViaECL;
  totalStimulation = Math.min(1, totalStimulation);

  // PPI blocks the final proton pump
  const pumpActivity = blockPPI ? totalStimulation * 0.05 : totalStimulation;

  // H+ secretion rate (mEq/h) — basal ~2-5, max ~25-40
  const hSecretionRate = Math.round(2 + pumpActivity * 38);

  // pH inversely related to secretion
  const pH = Math.max(1, Math.min(7, parseFloat((7 - pumpActivity * 5.5).toFixed(1))));

  // Individual pathway contributions (for visualization)
  const pathways = {
    histamineContrib: Math.round((histamineStim + gastrinViaECL) * 100),
    achContrib: Math.round(achStim * 100),
    gastrinContrib: Math.round(gastrinStim * 100),
  };

  return { hSecretionRate, pH, pumpActivity: Math.round(pumpActivity * 100), ...pathways };
}

export default function SimuladorSecrecaoGastrica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<GastricCase | null>(null);
  const [histamine, setHistamine] = useState(true);
  const [acetylcholine, setAcetylcholine] = useState(true);
  const [gastrin, setGastrin] = useState(true);
  const [blockPPI, setBlockPPI] = useState(false);
  const [blockH2, setBlockH2] = useState(false);
  const [blockAnticholinergic, setBlockAnticholinergic] = useState(false);
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
        initialHistamine: cd.initialHistamine ?? true, initialAcetylcholine: cd.initialAcetylcholine ?? true,
        initialGastrin: cd.initialGastrin ?? true, initialBlockPPI: cd.initialBlockPPI ?? false,
        initialBlockH2: cd.initialBlockH2 ?? false, initialBlockAnticholinergic: cd.initialBlockAnticholinergic ?? false,
        expectedPH: cd.expectedPH ?? [4, 7], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setHistamine(activeCase.initialHistamine);
      setAcetylcholine(activeCase.initialAcetylcholine);
      setGastrin(activeCase.initialGastrin);
      setBlockPPI(activeCase.initialBlockPPI);
      setBlockH2(activeCase.initialBlockH2);
      setBlockAnticholinergic(activeCase.initialBlockAnticholinergic);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime((t) => {
        const newT = t + 1;
        const outputs = computeGastricSecretion(histamine, acetylcholine, gastrin, blockPPI, blockH2, blockAnticholinergic);
        setHistory((prev) => [...prev.slice(-59), { time: newT, ...outputs }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, histamine, acetylcholine, gastrin, blockPPI, blockH2, blockAnticholinergic]);

  const outputs = computeGastricSecretion(histamine, acetylcholine, gastrin, blockPPI, blockH2, blockAnticholinergic);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const inRange = outputs.pH >= activeCase.expectedPH[0] && outputs.pH <= activeCase.expectedPH[1];
    const s = Math.round(inRange ? 100 : Math.max(0, 100 - Math.abs(outputs.pH - (activeCase.expectedPH[0] + activeCase.expectedPH[1]) / 2) * 20));
    setRunning(false);
    if (!submitted) submitResults({ score: s, actions: { histamine, acetylcholine, gastrin, blockPPI, blockH2, blockAnticholinergic, pH: outputs.pH } });
    return s;
  }, [activeCase, outputs, histamine, acetylcholine, gastrin, blockPPI, blockH2, blockAnticholinergic, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialHistamine: c.initialHistamine ?? true, initialAcetylcholine: c.initialAcetylcholine ?? true,
      initialGastrin: c.initialGastrin ?? true, initialBlockPPI: c.initialBlockPPI ?? false,
      initialBlockH2: c.initialBlockH2 ?? false, initialBlockAnticholinergic: c.initialBlockAnticholinergic ?? false,
      expectedPH: c.expectedPH ?? [4, 7], clinicalTip: c.clinicalTip ?? "",
    });
  };

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      const score = handleFinish();
      setLastScore(typeof score === 'number' ? score : 0);
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
            <h1 className="text-2xl font-bold">Secreção Ácida Gástrica</h1>
            <p className="text-muted-foreground">Explore as vias de estimulação da célula parietal e os mecanismos de bloqueio farmacológico.</p>
            <AdminPromptViewer toolSlug="sim-secrecao-gastrica" toolName="Secreção Gástrica" toolType="simulator" prompt={getNativePrompt("sim-secrecao-gastrica") || ""} />
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
          <CardHeader><CardTitle className="text-base">Vias de Estimulação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agonistas (Receptores)</p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div><p className="text-sm font-medium">Histamina (H2)</p><p className="text-xs text-muted-foreground">Via adenilato ciclase → AMPc</p></div>
                <Switch checked={histamine} onCheckedChange={setHistamine} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div><p className="text-sm font-medium">Acetilcolina (M3)</p><p className="text-xs text-muted-foreground">Via fosfolipase C → Ca²⁺</p></div>
                <Switch checked={acetylcholine} onCheckedChange={setAcetylcholine} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div><p className="text-sm font-medium">Gastrina (CCK-B)</p><p className="text-xs text-muted-foreground">Direto + via ECL (histamina)</p></div>
                <Switch checked={gastrin} onCheckedChange={setGastrin} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloqueadores Farmacológicos</p>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div><p className="text-sm font-medium">IBP (Omeprazol)</p><p className="text-xs text-muted-foreground">Bloqueio irreversível da H⁺/K⁺-ATPase</p></div>
                <Switch checked={blockPPI} onCheckedChange={setBlockPPI} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div><p className="text-sm font-medium">Anti-H2 (Ranitidina)</p><p className="text-xs text-muted-foreground">Bloqueio competitivo do receptor H2</p></div>
                <Switch checked={blockH2} onCheckedChange={setBlockH2} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div><p className="text-sm font-medium">Anticolinérgico (Pirenzepina)</p><p className="text-xs text-muted-foreground">Bloqueio seletivo M1/M3</p></div>
                <Switch checked={blockAnticholinergic} onCheckedChange={setBlockAnticholinergic} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} disabled={!running && history.length === 0} onSubmit={handleFinish} fallbackLabel="Finalizar" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Gástricos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-3 rounded-lg text-center ${outputs.pH < 2 ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                <p className="text-xs text-muted-foreground">pH Gástrico</p>
                <p className={`text-3xl font-bold ${outputs.pH < 2 ? "text-destructive" : outputs.pH >= 4 ? "text-green-600" : ""}`}>{outputs.pH}</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">Secreção H⁺</p>
                <p className="text-3xl font-bold">{outputs.hSecretionRate}</p>
                <p className="text-xs text-muted-foreground">mEq/h</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">Atividade da Bomba</p>
                <p className="text-2xl font-bold">{outputs.pumpActivity}%</p>
              </div>
              <div className="p-3 rounded-lg text-center bg-muted">
                <p className="text-xs text-muted-foreground">Via Dominante</p>
                <p className="text-sm font-bold">
                  {outputs.histamineContrib >= outputs.achContrib && outputs.histamineContrib >= outputs.gastrinContrib ? "Histamina" :
                   outputs.achContrib >= outputs.gastrinContrib ? "ACh" : "Gastrina"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Contribuição por Via</p>
              {[
                { label: "Histamina (H2 + ECL)", value: outputs.histamineContrib, color: "bg-primary" },
                { label: "Acetilcolina (M3)", value: outputs.achContrib, color: "bg-green-500" },
                { label: "Gastrina (CCK-B)", value: outputs.gastrinContrib, color: "bg-amber-500" },
              ].map((v) => (
                <div key={v.label}>
                  <div className="flex justify-between text-xs mb-1"><span>{v.label}</span><span>{v.value}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${v.color} rounded-full transition-all`} style={{ width: `${v.value}%` }} />
                  </div>
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
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="pH" name="pH Gástrico" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="hSecretionRate" name="Secreção H⁺ (mEq/h)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
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
        challengeSet={getSecrecaoGastricaChallenges()}
        simulatorState={{}}
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
