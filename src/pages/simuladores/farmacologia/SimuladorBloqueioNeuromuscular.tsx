import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
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
import { getBloqueioNeuromuscularChallenges } from "@/data/simulatorChallenges";

const SLUG = "bloqueio-neuromuscular";

interface BNMCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  expectedAgent: string;
  expectedReversal: string;
  clinicalTip: string;
}

const BUILT_IN_CASES: BNMCase[] = [
  { title: "Intubação de Sequência Rápida – Succinilcolina", difficulty: "Médio", patient: { name: "Rafael Lima", age: 42, weight: 85, diagnosis: "Estômago cheio – ISR para cirurgia de emergência" }, scenario: "A succinilcolina (despolarizante) tem onset ultracurto (~60s) e duração breve (~6 min). Observe fasciculações iniciais seguidas de bloqueio flácido.", expectedAgent: "despolarizante", expectedReversal: "nenhum", clinicalTip: "Succinilcolina: único despolarizante em uso clínico. CI: hipercalemia, queimaduras extensas, miopatias, déficit de pseudocolinesterase. Causa fasciculações → bloqueio fase I." },
  { title: "Rocurônio + Sugammadex", difficulty: "Médio", patient: { name: "Ana Beatriz", age: 35, weight: 62, diagnosis: "Cirurgia laparoscópica – relaxamento prolongado" }, scenario: "O rocurônio (não-despolarizante) bloqueia competitivamente os receptores nicotínicos na placa motora. O sugammadex o encapsula para reversão imediata.", expectedAgent: "nao-despolarizante", expectedReversal: "sugammadex", clinicalTip: "Sugammadex encapsula rocurônio/vecurônio em proporção 1:1, revertendo bloqueio profundo em <3 min. Alternativa: neostigmina (apenas bloqueio superficial, TOF ≥2)." },
  { title: "Bloqueio Residual Pós-operatório", difficulty: "Difícil", patient: { name: "José Antônio", age: 70, weight: 72, diagnosis: "Curarização residual na sala de recuperação" }, scenario: "TOF ratio <0.9 indica bloqueio residual. Reverta com neostigmina + atropina ou sugammadex conforme a profundidade do bloqueio.", expectedAgent: "nao-despolarizante", expectedReversal: "neostigmina", clinicalTip: "Bloqueio residual (TOF <0.9) aumenta risco de aspiração e hipóxia. Neostigmina só é eficaz com TOF ≥2 contagens. Para bloqueio profundo, usar sugammadex." },
];

function generateNMBCurve(agent: string, agentDose: number, reversal: string, reversalDose: number) {
  const points = [];
  const isDepo = agent === "despolarizante";
  const onset = isDepo ? 1 : 3;
  const duration = isDepo ? 8 : 45;
  const peak = agentDose;

  for (let t = 0; t <= 60; t += 1) {
    let twitch;
    if (t < onset) {
      twitch = 100 - (peak * t / onset);
    } else if (t < onset + duration) {
      const elapsed = t - onset;
      const recovery = isDepo ? elapsed / duration : (elapsed / duration) ** 2;
      twitch = (100 - peak) + peak * recovery;
    } else {
      twitch = 100;
    }

    // Fasciculations for depolarizing (brief spike)
    let fasciculation = 0;
    if (isDepo && t >= 0.3 && t <= 1) fasciculation = 30 * agentDose / 100;

    // Reversal effect
    if (reversal !== "nenhum" && reversalDose > 0 && t > 10) {
      const reversalEffect = reversal === "sugammadex" ? 0.95 : 0.6;
      const reversalOnset = reversal === "sugammadex" ? 2 : 8;
      const timeSinceReversal = t - 10;
      if (timeSinceReversal > 0) {
        const factor = Math.min(1, timeSinceReversal / reversalOnset) * reversalEffect * (reversalDose / 100);
        twitch = twitch + (100 - twitch) * factor;
      }
    }

    points.push({ time: t, twitch: Math.round(Math.min(100, Math.max(0, twitch)) * 10) / 10, fasciculation: Math.round(fasciculation * 10) / 10 });
  }
  return points;
}

export default function SimuladorBloqueioNeuromuscular() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<BNMCase | null>(null);
  const [agent, setAgent] = useState<"despolarizante" | "nao-despolarizante">("nao-despolarizante");
  const [agentDose, setAgentDose] = useState(80);
  const [reversal, setReversal] = useState<"nenhum" | "neostigmina" | "sugammadex">("nenhum");
  const [reversalDose, setReversalDose] = useState(80);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, expectedAgent: cd.expectedAgent ?? "nao-despolarizante", expectedReversal: cd.expectedReversal ?? "nenhum", clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setAgent("nao-despolarizante"); setAgentDose(80); setReversal("nenhum"); setReversalDose(80); } }, [activeCase]);

  const points = useMemo(() => generateNMBCurve(agent, agentDose, reversal, reversalDose), [agent, agentDose, reversal, reversalDose]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const agentOk = agent === activeCase.expectedAgent;
    const reversalOk = reversal === activeCase.expectedReversal;
    const s = (agentOk ? 50 : 0) + (reversalOk ? 50 : 0);
    submitResults({ score: s, actions: { agent, agentDose, reversal, reversalDose } });
    return s;
  }, [activeCase, agent, agentDose, reversal, reversalDose, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedAgent: c.expectedAgent ?? "nao-despolarizante", expectedReversal: c.expectedReversal ?? "nenhum", clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Bloqueio Neuromuscular</h1>
            <p className="text-muted-foreground">Simule bloqueadores despolarizantes vs não-despolarizantes na junção neuromuscular e suas reversões.</p>
            <AdminPromptViewer toolSlug="sim-bloqueio-neuromuscular" toolName="Bloqueio Neuromuscular" toolType="simulator" prompt={getNativePrompt("sim-bloqueio-neuromuscular") || ""} />
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
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Agente e Reversão</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Tipo de Bloqueador</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAgent("despolarizante")} className={`p-3 rounded-lg border text-xs font-medium ${agent === "despolarizante" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>Despolarizante<br /><span className="text-[10px] opacity-70">(Succinilcolina)</span></button>
                <button onClick={() => setAgent("nao-despolarizante")} className={`p-3 rounded-lg border text-xs font-medium ${agent === "nao-despolarizante" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>Não-Despolarizante<br /><span className="text-[10px] opacity-70">(Rocurônio)</span></button>
              </div>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose do Bloqueador</label><span className="text-sm font-bold">{agentDose}%</span></div><Slider value={[agentDose]} onValueChange={([v]) => setAgentDose(v)} min={20} max={100} step={5} /></div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Agente de Reversão</p>
              {(["nenhum", "neostigmina", "sugammadex"] as const).map(r => (
                <button key={r} onClick={() => setReversal(r)} className={`w-full text-left p-2 rounded text-sm ${reversal === r ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{r === "nenhum" ? "Nenhum" : r === "neostigmina" ? "Neostigmina + Atropina" : "Sugammadex"}</button>
              ))}
              {reversal !== "nenhum" && (<div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose de Reversão</label><span className="text-sm font-bold">{reversalDose}%</span></div><Slider value={[reversalDose]} onValueChange={([v]) => setReversalDose(v)} min={20} max={100} step={5} /></div>)}
            </div>
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={() => handleFinish()} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Monitorização TOF (Train-of-Four)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (min)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 110]} label={{ value: "Twitch (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine y={90} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "TOF≥0.9", fill: "hsl(var(--chart-3))" }} />
                <Line type="monotone" dataKey="twitch" name="Twitch (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                {agent === "despolarizante" && <Line type="monotone" dataKey="fasciculation" name="Fasciculação" stroke="hsl(var(--destructive))" dot={false} strokeWidth={1} strokeDasharray="3 3" />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getBloqueioNeuromuscularChallenges()} simulatorState={{ agent, reversal }} />
    </div>
  );
}
