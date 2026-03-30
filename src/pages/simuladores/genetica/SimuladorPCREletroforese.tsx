import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
import { getPCREletroforeseChallenges } from "@/data/simulatorChallenges";

const SLUG = "pcr-eletroforese";

interface PCRCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; targetGene: string;
  primerFwd: string; primerRev: string; tmFwd: number; tmRev: number;
  amplicon: number; expectedBands: number[]; ladderBands: number[];
  clinicalTip: string;
}

const BUILT_IN_CASES: PCRCase[] = [
  { title: "HPV por PCR Convencional", difficulty: "Fácil", patient: { name: "Juliana Costa", age: 28, weight: 58, diagnosis: "Citologia ASCUS" }, scenario: "PCR para HPV alto risco (16/18). Ajuste ciclos e temperatura, observe gel e amplificação simultaneamente.", targetGene: "HPV L1", primerFwd: "5'-CGTCCMARRGGAWACTGATC-3'", primerRev: "5'-GCMCAGGGWCATAAYAATGG-3'", tmFwd: 56, tmRev: 54, amplicon: 450, expectedBands: [450], ladderBands: [100, 200, 300, 400, 500, 600, 800, 1000], clinicalTip: "Annealing deve ser 3-5°C abaixo da menor Tm. Bandas inespecíficas = temperatura muito baixa." },
  { title: "PCR Multiplex — Distrofia de Duchenne", difficulty: "Médio", patient: { name: "Rafael Souza", age: 5, weight: 18, diagnosis: "Fraqueza muscular progressiva" }, scenario: "PCR multiplex com 6 primers para deleções no gene DMD. Ausência de banda = deleção do éxon.", targetGene: "DMD (Distrofina)", primerFwd: "Multiplex (6 pares)", primerRev: "Multiplex (6 pares)", tmFwd: 58, tmRev: 58, amplicon: 0, expectedBands: [150, 250, 350, 550, 700], ladderBands: [100, 200, 300, 400, 500, 600, 700, 800, 1000], clinicalTip: "Deleções no DMD = 65% dos casos de Duchenne. Na multiplex, banda ausente = éxon deletado." },
  { title: "RT-qPCR para SARS-CoV-2", difficulty: "Difícil", patient: { name: "Carlos Mendes", age: 52, weight: 82, diagnosis: "Síndrome gripal com dispneia" }, scenario: "RT-PCR tempo real. Analise Ct e correlacione com carga viral.", targetGene: "SARS-CoV-2 (N/RdRp)", primerFwd: "CDC/OMS", primerRev: "CDC/OMS", tmFwd: 60, tmRev: 60, amplicon: 120, expectedBands: [120], ladderBands: [50, 100, 150, 200, 300, 400, 500], clinicalTip: "Ct < 25 = alta carga. Ct 25-30 = moderada. Ct > 35 = inconclusivo. RNase P valida extração." },
];

function computePCR(annealingTemp: number, tmFwd: number, tmRev: number, cycles: number, mgCl2: number) {
  const optAnnealing = Math.min(tmFwd, tmRev) - 4;
  const tempDiff = Math.abs(annealingTemp - optAnnealing);
  const specificity = Math.max(0, 100 - tempDiff * 12);
  const mgFactor = mgCl2 >= 1.0 && mgCl2 <= 3.0 ? 1 : mgCl2 < 1.0 ? mgCl2 / 1.0 : 1 - (mgCl2 - 3.0) * 0.2;
  const yield_ = Math.min(100, cycles * 3.2 * (1 - tempDiff / 25) * mgFactor);
  const nonSpecific = annealingTemp < optAnnealing - 3 ? Math.min(80, (optAnnealing - annealingTemp) * 15) : 0;
  const primerDimer = cycles > 35 ? Math.min(50, (cycles - 35) * 10) : 0;
  const ct = specificity > 40 ? Math.round(12 + (100 - yield_) * 0.25 + tempDiff * 0.8) : null;

  const ampCurve = Array.from({ length: 40 }, (_, c) => {
    const cyc = c + 1;
    const plateau = yield_ * 0.95;
    const amp = plateau * (1 / (1 + Math.exp(-0.6 * (cyc - cycles * 0.55))));
    return { cycle: cyc, amplification: Math.round(amp * 10) / 10 };
  });

  return { specificity: Math.round(specificity), yield: Math.round(Math.max(0, yield_)), nonSpecific: Math.round(nonSpecific), primerDimer: Math.round(primerDimer), ampCurve, ct };
}

export default function SimuladorPCREletroforese() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<PCRCase | null>(null);
  const [annealingTemp, setAnnealingTemp] = useState(55);
  const [cycles, setCycles] = useState(30);
  const [mgCl2, setMgCl2] = useState(1.5);
  const [running, setRunning] = useState(false);
  const [animCycle, setAnimCycle] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, targetGene: cd.targetGene ?? "", primerFwd: cd.primerFwd ?? "", primerRev: cd.primerRev ?? "", tmFwd: cd.tmFwd ?? 58, tmRev: cd.tmRev ?? 58, amplicon: cd.amplicon ?? 300, expectedBands: cd.expectedBands ?? [300], ladderBands: cd.ladderBands ?? [100,200,300,400,500,600,800,1000], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => { if (activeCase) { setAnnealingTemp(activeCase.tmFwd - 4); setCycles(30); setMgCl2(1.5); setAnimCycle(0); setRunning(false); } }, [activeCase]);

  // Animated cycle progression
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setAnimCycle(c => {
        if (c >= 40) { setRunning(false); return 40; }
        return c + 1;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [running]);

  const outputs = useMemo(() => activeCase ? computePCR(annealingTemp, activeCase.tmFwd, activeCase.tmRev, cycles, mgCl2) : null, [activeCase, annealingTemp, cycles, mgCl2]);

  // Animated amplification data (only show up to current cycle)
  const animAmpCurve = useMemo(() => outputs ? outputs.ampCurve.slice(0, animCycle) : [], [outputs, animCycle]);

  // Gel migration factor based on animation progress
  const gelProgress = Math.min(1, animCycle / 30);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted || !outputs) return 0;
    const s = Math.round(outputs.specificity * 0.6 + Math.min(outputs.yield, 100) * 0.4);
    setRunning(false); setLastScore(s);
    submitResults({ score: s, actions: { annealingTemp, cycles, mgCl2, specificity: outputs.specificity, yield: outputs.yield } });
    return s;
  }, [activeCase, outputs, annealingTemp, cycles, mgCl2, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, targetGene: c.targetGene ?? "", primerFwd: c.primerFwd ?? "", primerRev: c.primerRev ?? "", tmFwd: c.tmFwd ?? 58, tmRev: c.tmRev ?? 58, amplicon: c.amplicon ?? 300, expectedBands: c.expectedBands ?? [300], ladderBands: c.ladderBands ?? [100,200,300,400,500,600,800,1000], clinicalTip: c.clinicalTip ?? "" });
  };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">PCR e Eletroforese em Gel</h1>
            <p className="text-muted-foreground">Ciclos térmicos, primers e visualização de bandas em gel.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="PCR e Eletroforese" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
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

  const maxBand = Math.max(...activeCase.ladderBands);

  // Gel bands with animation
  const gelBands = outputs && gelProgress > 0.2 ? (() => {
    const bands: { pos: number; intensity: number; label: string }[] = [];
    if (outputs.specificity > 25) {
      activeCase.expectedBands.forEach(bp => {
        bands.push({ pos: (1 - bp / maxBand) * 80 * gelProgress + 10, intensity: outputs.yield * gelProgress, label: `${bp} bp` });
      });
    }
    if (outputs.nonSpecific > 10) {
      bands.push({ pos: (15 + Math.random() * 20) * gelProgress + 10, intensity: outputs.nonSpecific * gelProgress * 0.7, label: "Inesp." });
    }
    if (outputs.primerDimer > 10) {
      bands.push({ pos: 85 * gelProgress + 5, intensity: outputs.primerDimer * gelProgress, label: "Dímero" });
    }
    return bands;
  })() : [];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? goBack : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Gene-alvo:</strong> {activeCase.targetGene}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-muted text-xs"><strong>Fwd:</strong> {activeCase.primerFwd} (Tm={activeCase.tmFwd}°C)</div>
            <div className="p-2 rounded bg-muted text-xs"><strong>Rev:</strong> {activeCase.primerRev} (Tm={activeCase.tmRev}°C)</div>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ciclo Térmico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-1"><label className="text-sm font-medium">Temp. Annealing</label><span className="text-sm font-bold">{annealingTemp}°C</span></div>
            <Slider value={[annealingTemp]} onValueChange={([v]) => setAnnealingTemp(v)} min={40} max={72} step={1} />
            <p className="text-xs text-muted-foreground">Ideal: {Math.min(activeCase.tmFwd, activeCase.tmRev) - 4}°C</p>
          </div>
          <div>
            <div className="flex justify-between mb-1"><label className="text-sm font-medium">Ciclos</label><span className="text-sm font-bold">{cycles}</span></div>
            <Slider value={[cycles]} onValueChange={([v]) => setCycles(v)} min={15} max={45} step={1} />
          </div>
          <div>
            <div className="flex justify-between mb-1"><label className="text-sm font-medium">MgCl₂</label><span className="text-sm font-bold">{mgCl2} mM</span></div>
            <Slider value={[mgCl2]} onValueChange={([v]) => setMgCl2(v)} min={0.5} max={4} step={0.25} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-muted text-center"><p className="text-xs text-muted-foreground">Especif.</p><p className={`font-bold ${(outputs?.specificity ?? 0) >= 80 ? "text-green-600" : "text-destructive"}`}>{outputs?.specificity}%</p></div>
            <div className="p-2 rounded bg-muted text-center"><p className="text-xs text-muted-foreground">Rendim.</p><p className={`font-bold ${(outputs?.yield ?? 0) >= 60 ? "text-green-600" : "text-yellow-600"}`}>{outputs?.yield}%</p></div>
            <div className="p-2 rounded bg-muted text-center"><p className="text-xs text-muted-foreground">Ct</p><p className="font-bold">{outputs?.ct ?? "—"}</p></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { if (animCycle >= 40) setAnimCycle(0); setRunning(!running); }} className="flex-1 gap-2">
              {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> {animCycle >= 40 ? "Reiniciar" : "Iniciar PCR"}</>}
            </Button>
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Amplification curve + Gel side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Curva de Amplificação (Ciclo {animCycle}/40)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={animAmpCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="cycle" domain={[1, 40]} stroke="hsl(var(--muted-foreground))" label={{ value: "Ciclo", position: "insideBottom", offset: -5 }} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" label={{ value: "Amplificação (%)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="amplification" name="Amplificação" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gel de Agarose</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-14 relative bg-gray-900 dark:bg-gray-950 rounded-md" style={{ height: 280 }}>
                <p className="text-[8px] text-center text-gray-400 pt-1">M</p>
                {activeCase.ladderBands.map((bp, i) => (
                  <div key={i} className="absolute left-1 right-1 h-1 bg-gray-300 rounded-full" style={{ top: `${(1 - bp / maxBand) * 80 + 10}%` }}>
                    <span className="absolute -right-8 text-[7px] text-muted-foreground whitespace-nowrap">{bp}</span>
                  </div>
                ))}
              </div>
              <div className="w-20 relative bg-gray-900 dark:bg-gray-950 rounded-md" style={{ height: 280 }}>
                <p className="text-[8px] text-center text-gray-400 pt-1">Amostra</p>
                {gelBands.map((band, i) => (
                  <div key={i} className="absolute left-2 right-2 h-2 rounded-full transition-all duration-300"
                    style={{ top: `${band.pos}%`, backgroundColor: `rgba(0, 255, 100, ${band.intensity / 120})`, boxShadow: `0 0 ${band.intensity / 8}px rgba(0, 255, 100, ${band.intensity / 150})` }}>
                    <span className="absolute -right-12 text-[7px] text-muted-foreground whitespace-nowrap">{band.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent>
      </Card>

      <SimulatorChallengeMode challengeSet={getPCREletroforeseChallenges()} simulatorState={{ annealingTemp, cycles, mgCl2, specificity: outputs?.specificity, yield: outputs?.yield }} onComplete={() => setChallengeCompleted(true)} />

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2">
          <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
          <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando em 15s...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-destructive"}`}>{lastScore}%</div></div>
          <p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p>
        </div>
      ))}
    </div>
  );
}
