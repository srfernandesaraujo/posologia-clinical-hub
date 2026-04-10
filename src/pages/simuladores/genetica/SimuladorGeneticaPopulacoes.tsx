import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye, Play, Pause } from "lucide-react";
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
import { getGeneticaPopulacoesChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "genetica-populacoes";

interface PopCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; initialP: number; populationSize: number;
  selectionCoeff: number; generations: number; enableDrift: boolean;
  expectedEquilibrium: boolean; clinicalTip: string;
}

const BUILT_IN_CASES: PopCase[] = [
  { title: "Equilíbrio HW — Fibrose Cística", difficulty: "Fácil", patient: { name: "Estudo Populacional", age: 0, weight: 0, diagnosis: "Frequência de portadores de FC na Europa" }, scenario: "q = 0.02. Calcule frequências genotípicas e verifique a proporção de portadores (2pq).", initialP: 0.98, populationSize: 10000, selectionCoeff: 0, generations: 50, enableDrift: false, expectedEquilibrium: true, clinicalTip: "HW: p² + 2pq + q² = 1. Com q=0.02: q²=0.04% afetados, 2pq≈3.9% portadores. 5 condições: sem seleção/mutação/migração, pop grande, panmixia." },
  { title: "Seleção contra Homozigotos", difficulty: "Médio", patient: { name: "Estudo Evolutivo", age: 0, weight: 0, diagnosis: "Eliminação de alelo deletério" }, scenario: "Doença recessiva letal (s=1.0). Observe como q diminui lentamente.", initialP: 0.7, populationSize: 5000, selectionCoeff: 1.0, generations: 100, enableDrift: false, expectedEquilibrium: false, clinicalTip: "Seleção contra aa é ineficiente para alelos raros: portadores (Aa) são protegidos. q(t) = q₀/(1 + t·q₀)." },
  { title: "Deriva Genética — Pop. Pequena", difficulty: "Difícil", patient: { name: "Efeito Fundador", age: 0, weight: 0, diagnosis: "Comunidade isolada" }, scenario: "100 fundadores com p=0.5. Deriva pode fixar/eliminar alelos. Compare com pop de 10.000.", initialP: 0.5, populationSize: 100, selectionCoeff: 0, generations: 200, enableDrift: true, expectedEquilibrium: false, clinicalTip: "Deriva genética: mais intensa em pop pequenas. Efeito fundador: Tay-Sachs (Ashkenazi), porfiria (Afrikâners). σ² = pq(1-(1-1/2N)ᵗ)." },
];

function simulatePopulation(p0: number, n: number, s: number, gens: number, drift: boolean) {
  const data: { gen: number; p: number; q: number; pp: number; pq2: number; qq: number }[] = [];
  let p = p0;
  for (let g = 0; g <= gens; g++) {
    const q = 1 - p;
    data.push({ gen: g, p: +p.toFixed(4), q: +q.toFixed(4), pp: +(p*p*100).toFixed(2), pq2: +(2*p*q*100).toFixed(2), qq: +(q*q*100).toFixed(2) });
    if (g < gens) {
      if (s > 0) {
        const pp_ = p*p, pq_ = 2*p*q, qq_ = q*q;
        const wBar = pp_ + pq_ + qq_*(1-s);
        if (wBar > 0) p = (pp_ + 0.5*pq_) / wBar;
      }
      if (drift && n < 10000) {
        const draws = 2*n;
        let succ = 0;
        for (let d = 0; d < draws; d++) if (Math.random() < p) succ++;
        p = succ / draws;
      }
      p = Math.max(0.0001, Math.min(0.9999, p));
    }
  }
  return data;
}

export default function SimuladorGeneticaPopulacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<PopCase | null>(null);
  const [pFreq, setPFreq] = useState(0.5);
  const [popSize, setPopSize] = useState(1000);
  const [selection, setSelection] = useState(0);
  const [generations, setGenerations] = useState(50);
  const [driftEnabled, setDriftEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [animGen, setAnimGen] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialP: cd.initialP ?? 0.5, populationSize: cd.populationSize ?? 1000, selectionCoeff: cd.selectionCoeff ?? 0, generations: cd.generations ?? 50, enableDrift: cd.enableDrift ?? false, expectedEquilibrium: cd.expectedEquilibrium ?? true, clinicalTip: cd.clinicalTip ?? "" }); }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setPFreq(activeCase.initialP); setPopSize(activeCase.populationSize); setSelection(activeCase.selectionCoeff); setGenerations(activeCase.generations); setDriftEnabled(activeCase.enableDrift); setAnimGen(0); setRunning(false); }
  }, [activeCase]);

  const fullSimData = useMemo(() => simulatePopulation(pFreq, popSize, selection, generations, driftEnabled), [pFreq, popSize, selection, generations, driftEnabled]);

  // Animation
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setAnimGen(g => {
        if (g >= fullSimData.length - 1) { setRunning(false); return fullSimData.length - 1; }
        return g + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [running, fullSimData.length]);

  const animData = fullSimData.slice(0, animGen + 1);
  const currentState = animData[animData.length - 1];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const last = fullSimData[fullSimData.length - 1];
    const isEq = Math.abs(last.p - pFreq) < 0.05;
    const s = activeCase.expectedEquilibrium === isEq ? 100 : 40;
    setLastScore(s);
    submitResults({ score: s, actions: buildSimulatorDecisions("genetica-populacoes", [
        { label: "Finalp", userChoice: String(last.p), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" }
      ]) });
    return s;
  }, [activeCase, fullSimData, pFreq, popSize, selection, generations, driftEnabled, submitted, submitResults]);

  const loadAICase = (c: any) => { setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialP: c.initialP ?? 0.5, populationSize: c.populationSize ?? 1000, selectionCoeff: c.selectionCoeff ?? 0, generations: c.generations ?? 50, enableDrift: c.enableDrift ?? false, expectedEquilibrium: c.expectedEquilibrium ?? true, clinicalTip: c.clinicalTip ?? "" }); };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Genética de Populações (Hardy-Weinberg)</h1>
            <p className="text-muted-foreground">Frequências alélicas, seleção e deriva genética.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Genética de Populações" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (<AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />))}
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

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? goBack : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Populacionais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">p (A)</label><span className="text-sm font-bold">{pFreq.toFixed(2)} (q={(1-pFreq).toFixed(2)})</span></div>
              <Slider value={[pFreq*100]} onValueChange={([v]) => { setPFreq(v/100); setAnimGen(0); }} min={1} max={99} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Pop. (N)</label><span className="text-sm font-bold">{popSize}</span></div>
              <Slider value={[popSize]} onValueChange={([v]) => { setPopSize(v); setAnimGen(0); }} min={20} max={10000} step={20} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Seleção (s) contra aa</label><span className="text-sm font-bold">{selection.toFixed(2)}</span></div>
              <Slider value={[selection*100]} onValueChange={([v]) => { setSelection(v/100); setAnimGen(0); }} min={0} max={100} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Gerações</label><span className="text-sm font-bold">{generations}</span></div>
              <Slider value={[generations]} onValueChange={([v]) => { setGenerations(v); setAnimGen(0); }} min={10} max={500} step={10} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={driftEnabled} onCheckedChange={v => { setDriftEnabled(v); setAnimGen(0); }} />
              <span className="text-sm font-medium">Deriva Genética</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { if (animGen >= fullSimData.length - 1) setAnimGen(0); setRunning(!running); }} className="flex-1 gap-2">
                {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> {animGen >= fullSimData.length - 1 ? "Reiniciar" : "Iniciar Simulação"}</>}
              </Button>
              {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Frequências Genotípicas (Geração {animGen})</CardTitle></CardHeader>
          <CardContent>
            {currentState && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">AA (p²)</p><p className="text-2xl font-bold">{currentState.pp}%</p></div>
                  <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Aa (2pq)</p><p className="text-2xl font-bold">{currentState.pq2}%</p></div>
                  <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">aa (q²)</p><p className="text-2xl font-bold">{currentState.qq}%</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">p final</p><p className="text-xl font-bold">{currentState.p}</p></div>
                  <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">q final</p><p className="text-xl font-bold">{currentState.q}</p></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Frequência Alélica ao Longo das Gerações</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={animData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="gen" stroke="hsl(var(--muted-foreground))" label={{ value: "Geração", position: "insideBottom", offset: -5 }} />
              <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" label={{ value: "Frequência", angle: -90, position: "insideLeft" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="p" name="p (A)" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="q" name="q (a)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent>
      </Card>

      <SimulatorChallengeMode challengeSet={getGeneticaPopulacoesChallenges()} simulatorState={{ pFreq, popSize, selection, generations, driftEnabled, finalP: currentState?.p }} onComplete={() => setChallengeCompleted(true)} />

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ) : (
        <div className="space-y-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-destructive"}`}>{lastScore}%</div></div><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ))}
    </div>
  );
}
