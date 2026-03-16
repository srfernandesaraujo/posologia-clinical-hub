import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, Legend, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "qsar-simplificado";

const SERIES = [
  { id: "sulfonamides", name: "Sulfonamidas", a: -0.8, b: 1.5, c: 2.5, logPoptimal: 0.94 },
  { id: "barbiturates", name: "Barbitúricos", a: -0.6, b: 1.2, c: 2.0, logPoptimal: 1.0 },
  { id: "phenols", name: "Fenóis (desinfetantes)", a: -0.3, b: 1.0, c: 1.5, logPoptimal: 1.67 },
];

interface QSARCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; series: string; context: string };
  scenario: string; initialSeries: string; initialLogP: number; initialSigma: number;
  expectedOptimalLogPRange: [number, number]; clinicalTip: string;
}

const BUILT_IN_CASES: QSARCase[] = [
  {
    title: "Sulfonamidas – Equação de Hansch Original",
    difficulty: "Fácil",
    patient: { name: "Hansch 1964", series: "Sulfonamidas", context: "Antibacterianos" },
    scenario: "Hansch demonstrou que a atividade antibacteriana das sulfonamidas segue uma relação parabólica com logP. Encontre o logP ótimo (ponto máximo da parábola).",
    initialSeries: "sulfonamides", initialLogP: 1.0, initialSigma: 0,
    expectedOptimalLogPRange: [0.7, 1.2],
    clinicalTip: "A equação de Hansch parabólica: log(1/C) = a(logP)² + b(logP) + c mostra que existe um logP ótimo para absorção + distribuição. Muito lipofílico = sequestro em gordura.",
  },
  {
    title: "Barbitúricos – Atividade Hipnótica e logP",
    difficulty: "Médio",
    patient: { name: "Estudo Clássico", series: "Barbitúricos", context: "Hipnóticos/sedativos" },
    scenario: "A atividade hipnótica dos barbitúricos correlaciona-se com logP (penetração da BHE). Analise como substituintes que aumentam logP afetam a latência do sono.",
    initialSeries: "barbiturates", initialLogP: 1.5, initialSigma: 0.3,
    expectedOptimalLogPRange: [0.8, 1.2],
    clinicalTip: "Barbitúricos com logP mais alto cruzam a BHE mais rapidamente (tiopental: logP ~2.8, onset <30s). Mas logP muito alto prolonga a duração por redistribuição lenta do tecido adiposo.",
  },
  {
    title: "QSAR Multivariado – σ Hammett e Atividade",
    difficulty: "Difícil",
    patient: { name: "Drug Design Avançado", series: "Sulfonamidas", context: "Análise multi-paramétrica" },
    scenario: "Além de logP, o parâmetro σ de Hammett (efeito eletrônico) influencia a atividade. Explore a equação: log(1/C) = a(logP)² + b(logP) + ρσ + c. Ajuste ambos os descritores.",
    initialSeries: "sulfonamides", initialLogP: 0.5, initialSigma: -0.5,
    expectedOptimalLogPRange: [0.7, 1.2],
    clinicalTip: "O σ de Hammett mede o efeito eletrônico: σ>0 = retirador de elétrons (NO₂, CF₃), σ<0 = doador (NH₂, OCH₃). Em sulfonamidas, substituintes retiradores aumentam a acidez (↑pKa⁻) e a interação com DHPS.",
  },
];

function computeQSAR(seriesId: string, logP: number, sigma: number) {
  const series = SERIES.find(s => s.id === seriesId) || SERIES[0];
  const rho = 0.8; // Hammett reaction constant
  const activity = series.a * logP * logP + series.b * logP + rho * sigma + series.c;
  
  const curveData = [];
  for (let lp = -1; lp <= 5; lp += 0.1) {
    const act = series.a * lp * lp + series.b * lp + rho * sigma + series.c;
    curveData.push({ logP: Math.round(lp * 10) / 10, activity: Math.round(act * 1000) / 1000 });
  }

  const optimalLogP = -series.b / (2 * series.a);
  const maxActivity = series.a * optimalLogP * optimalLogP + series.b * optimalLogP + rho * sigma + series.c;

  // Generate scatter points (simulated congeners)
  const scatterData = [];
  for (let i = 0; i < 12; i++) {
    const lp = -0.5 + i * 0.5 + (Math.random() - 0.5) * 0.3;
    const noise = (Math.random() - 0.5) * 0.4;
    const act = series.a * lp * lp + series.b * lp + rho * sigma + series.c + noise;
    scatterData.push({ logP: Math.round(lp * 100) / 100, activity: Math.round(act * 100) / 100 });
  }

  return {
    activity: Math.round(activity * 1000) / 1000,
    optimalLogP: Math.round(optimalLogP * 100) / 100,
    maxActivity: Math.round(maxActivity * 1000) / 1000,
    curveData,
    scatterData,
    r2: 0.87 + sigma * 0.02,
  };
}

export default function SimuladorQSAR() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<QSARCase | null>(null);
  const [seriesId, setSeriesId] = useState("sulfonamides");
  const [logP, setLogP] = useState(1.0);
  const [sigma, setSigma] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialSeries: cd.initialSeries ?? "sulfonamides", initialLogP: cd.initialLogP ?? 1.0, initialSigma: cd.initialSigma ?? 0, expectedOptimalLogPRange: cd.expectedOptimalLogPRange ?? [0.7, 1.2], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setSeriesId(activeCase.initialSeries); setLogP(activeCase.initialLogP); setSigma(activeCase.initialSigma); }
  }, [activeCase]);

  const result = useMemo(() => computeQSAR(seriesId, logP, sigma), [seriesId, logP, sigma]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = logP >= activeCase.expectedOptimalLogPRange[0] && logP <= activeCase.expectedOptimalLogPRange[1];
    submitResults({ score: ok ? 100 : 40, actions: { seriesId, logP, sigma, activity: result.activity, optimalLogP: result.optimalLogP } });
  }, [activeCase, logP, seriesId, sigma, result, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialSeries: c.initialSeries ?? "sulfonamides", initialLogP: c.initialLogP ?? 1.0, initialSigma: c.initialSigma ?? 0, expectedOptimalLogPRange: c.expectedOptimalLogPRange ?? [0.7, 1.2], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">QSAR Simplificado (Hansch)</h1>
            <p className="text-muted-foreground">Equações de Hansch: logP, σ Hammett e correlação com atividade biológica.</p>
            <AdminPromptViewer toolSlug="sim-qsar-simplificado" toolName="QSAR Simplificado" toolType="simulator" prompt={getNativePrompt("sim-qsar-simplificado") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos de Estudo</CardTitle></CardHeader>
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Descritores Moleculares</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Série Congênere</label>
              <Select value={seriesId} onValueChange={setSeriesId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERIES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">logP (lipofilia)</label><span className="text-sm font-bold">{logP}</span></div><Slider value={[logP * 10 + 10]} onValueChange={([v]) => setLogP((v - 10) / 10)} min={0} max={60} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">σ Hammett (efeito eletrônico)</label><span className="text-sm font-bold">{sigma.toFixed(1)}</span></div><Slider value={[(sigma + 1) * 50]} onValueChange={([v]) => setSigma(v / 50 - 1)} min={0} max={100} step={5} /><p className="text-xs text-muted-foreground mt-1">σ&lt;0: doador (NH₂, OCH₃) | σ&gt;0: retirador (NO₂, CF₃)</p></div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados QSAR</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 text-center"><p className="text-xs text-muted-foreground">log(1/C) – Atividade</p><p className="text-2xl font-bold">{result.activity}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">logP ótimo</p><p className="text-2xl font-bold">{result.optimalLogP}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Atividade Máxima</p><p className="text-xl font-bold">{result.maxActivity}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">R²</p><p className="text-xl font-bold">{result.r2.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parábola de Hansch: log(1/C) vs logP</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={result.curveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="logP" label={{ value: "logP", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis label={{ value: "log(1/C)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <ReferenceLine x={result.optimalLogP} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `logP₀=${result.optimalLogP}`, fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="activity" name="Atividade predita" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ seriesId, logP, sigma, activity: result.activity, optimalLogP: result.optimalLogP }} />
    </div>
  );
}
