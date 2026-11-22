import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulatorCasePicker, SimulatorWorkspace, PatientCard } from "@/components/simulators/shell/SimulatorShell";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Eye } from "lucide-react";
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
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

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
  { title: "Intubação de Sequência Rápida – Succinilcolina", difficulty: "Médio", patient: { name: "Rafael Lima", age: 42, weight: 85, diagnosis: "Estômago cheio – ISR para cirurgia de emergência" }, scenario: "A succinilcolina (despolarizante) tem onset ultracurto (~60s) e duração breve (~8-10 min). Observe fasciculações iniciais seguidas de bloqueio flácido.", expectedAgent: "despolarizante", expectedReversal: "nenhum", clinicalTip: "Succinilcolina: único despolarizante em uso clínico. CI: hipercalemia, queimaduras extensas, miopatias, déficit de pseudocolinesterase. Causa fasciculações → bloqueio fase I." },
  { title: "Rocurônio + Sugammadex", difficulty: "Médio", patient: { name: "Ana Beatriz", age: 35, weight: 62, diagnosis: "Cirurgia laparoscópica – relaxamento prolongado" }, scenario: "O rocurônio (não-despolarizante) bloqueia competitivamente os receptores nicotínicos na placa motora. O sugammadex o encapsula para reversão imediata.", expectedAgent: "nao-despolarizante", expectedReversal: "sugammadex", clinicalTip: "Sugammadex encapsula rocurônio/vecurônio em proporção 1:1, revertendo bloqueio profundo em <3 min. Alternativa: neostigmina (apenas bloqueio superficial, TOF ≥2)." },
  { title: "Bloqueio Residual Pós-operatório", difficulty: "Difícil", patient: { name: "José Antônio", age: 70, weight: 72, diagnosis: "Curarização residual na sala de recuperação" }, scenario: "TOF ratio <0.9, mas com pelo menos 2 contagens visíveis no monitor (bloqueio superficial, não profundo). Nessa profundidade, a neostigmina é eficaz para reverter o bloqueio residual.", expectedAgent: "nao-despolarizante", expectedReversal: "neostigmina", clinicalTip: "Bloqueio residual (TOF <0.9) aumenta risco de aspiração e hipóxia. Neostigmina só é eficaz com TOF ≥2 contagens — nesse caso, adequada. Para bloqueio profundo (sem contagens), a neostigmina não funciona e deve-se usar sugammadex." },
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

    // Fasciculations for depolarizing: visible spike in the first ~2 min
    let fasciculation = 0;
    if (isDepo && t >= 0 && t <= 2) {
      const intensity = agentDose / 100;
      if (t === 0) fasciculation = 15 * intensity;
      else if (t === 1) fasciculation = 40 * intensity;
      else if (t === 2) fasciculation = 10 * intensity;
    }

    // Reversal effect - works for BOTH depolarizing and non-depolarizing
    if (reversal !== "nenhum" && reversalDose > 0 && t > 5) {
      const timeSinceReversal = t - 5;
      if (isDepo) {
        // For depolarizing: neostigmina worsens phase I block (increases ACh at depolarized junction)
        // sugammadex has no effect on succinilcolina (only encapsulates steroidal NMBAs)
        if (reversal === "neostigmina") {
          // Neostigmina inhibits AChE → more ACh → prolongs/deepens depolarizing block
          const worsenOnset = Math.min(1, timeSinceReversal / 4);
          const doseEffect = reversalDose / 100;
          // Significantly deepen the block: reduce twitch by up to 60% at full dose
          const worsenFactor = worsenOnset * 0.6 * doseEffect;
          twitch = twitch * (1 - worsenFactor);
          // Also delay spontaneous recovery proportionally to dose
          if (twitch > 0 && t < onset + duration * (1 + 0.5 * doseEffect)) {
            const delayPenalty = Math.max(0, 1 - (t - onset) / (duration * (1 + 0.5 * doseEffect)));
            twitch = Math.min(twitch, (100 - peak) + peak * (1 - delayPenalty));
          }
        }
        // Sugammadex: no pharmacological effect on succinylcholine (not a steroidal NMBA)
      } else {
        // Non-depolarizing: both agents help
        const reversalEffect = reversal === "sugammadex" ? 0.95 : 0.6;
        const reversalOnset = reversal === "sugammadex" ? 2 : 8;
        if (timeSinceReversal > 0) {
          const factor = Math.min(1, timeSinceReversal / reversalOnset) * reversalEffect * (reversalDose / 100);
          twitch = twitch + (100 - twitch) * factor;
        }
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
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

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
    setLastScore(s);
    submitResults({ score: s, actions: { agent, agentDose, reversal, reversalDose } });
    return s;
  }, [activeCase, agent, agentDose, reversal, reversalDose, submitted, submitResults]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); const cs = sessionStorage.getItem("challengeScore"); if (cs) setLastScore(Number(cs)); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedAgent: c.expectedAgent ?? "nao-despolarizante", expectedReversal: c.expectedReversal ?? "nenhum", clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <SimulatorCasePicker
        slug={SLUG}
        title="Bloqueio Neuromuscular"
        description="Simule bloqueadores despolarizantes vs não-despolarizantes na junção neuromuscular e suas reversões."
        onBack={() => navigate(isRoom ? "/sala" : "/simuladores")}
        actions={<AdminPromptViewer toolSlug="sim-bloqueio-neuromuscular" toolName="Bloqueio Neuromuscular" toolType="simulator" prompt={getNativePrompt("sim-bloqueio-neuromuscular") || ""} />}
        banner={<ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />}
        footer={!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="w-full gap-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar caso com IA</Button>}
      >
        {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
        {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
          <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
        ))}
      </SimulatorCasePicker>
    );
  }

  return (
    <SimulatorWorkspace
      slug={SLUG}
      simulatorName="Bloqueio Neuromuscular"
      caseTitle={activeCase.title}
      difficulty={activeCase.difficulty}
      onBack={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}
      banners={<>
        {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
        <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      </>}
      patient={
        <PatientCard name={activeCase.patient.name} age={activeCase.patient.age} weight={activeCase.patient.weight} scenario={activeCase.scenario} />
      }
      stage={<>
        <Card>
          <CardHeader><CardTitle className="text-base">Recuperação da Placa Motora (Twitch Único)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Amplitude de um twitch isolado ao longo do tempo — não representa o fade entre os 4 estímulos do TOF ratio real (T4/T1).</p>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (min)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 110]} label={{ value: "Twitch (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine y={90} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "Recuperação ≥90%", fill: "hsl(var(--chart-3))" }} />
                <Line type="monotone" dataKey="twitch" name="Twitch (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                {agent === "despolarizante" && <Line type="monotone" dataKey="fasciculation" name="Fasciculação" stroke="hsl(var(--destructive))" dot={false} strokeWidth={1} strokeDasharray="3 3" />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      </>}
      controls={
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
            
          </CardContent>
        </Card>
      }
      challenge={<SimulatorChallengeMode challengeSet={getBloqueioNeuromuscularChallenges()} simulatorState={{ agent, reversal, agentDose, reversalDose }} onComplete={() => setChallengeCompleted(true)} />}
      footer={isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-status-ok" : lastScore >= 50 ? "text-status-warn" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    />
  );
}
