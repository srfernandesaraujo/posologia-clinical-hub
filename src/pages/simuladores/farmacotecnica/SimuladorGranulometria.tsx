import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Send, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getGranulometriaChallenges } from "@/data/simulatorChallenges";

const SLUG = "granulometria";

interface GranCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; context: string };
  scenario: string;
  initialMean: number; initialSpread: number;
  expectedD50Range: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: GranCase[] = [
  {
    title: "Lactose para Compressão Direta",
    difficulty: "Fácil",
    patient: { name: "CQ Indústria", product: "Lactose spray-dried", context: "Excipiente para compressão direta" },
    scenario: "A lactose spray-dried deve ter D50 entre 100-200 µm para boa fluidez. Analise a distribuição granulométrica e determine D10, D50, D90 e span.",
    initialMean: 150, initialSpread: 30,
    expectedD50Range: [100, 200],
    clinicalTip: "Partículas muito finas (<50 µm) pioram a fluidez; muito grossas (>300 µm) prejudicam a uniformidade de conteúdo. D50 ideal: 100-200 µm.",
  },
  {
    title: "Inalador de Pó Seco – Partículas Finas",
    difficulty: "Médio",
    patient: { name: "P&D Inalatório", product: "DPI budesonida", context: "Fração de partículas respiráveis" },
    scenario: "Para deposição pulmonar, partículas devem ter 1-5 µm. Ajuste a moagem para maximizar a fração respirável (FPF). D50 alvo: 3-5 µm.",
    initialMean: 20, initialSpread: 15,
    expectedD50Range: [3, 5],
    clinicalTip: "FPF (fração de partículas finas <5 µm) determina a eficácia do DPI. Partículas >5 µm se depositam na orofaringe. <1 µm são exaladas.",
  },
  {
    title: "Suspensão Oral – Controle de Sedimentação",
    difficulty: "Difícil",
    patient: { name: "Formulação", product: "Suspensão de sulfametoxazol", context: "Otimização do tamanho de partícula para reduzir sedimentação" },
    scenario: "Partículas menores reduzem a velocidade de sedimentação (lei de Stokes). Encontre o equilíbrio entre fácil ressuspensão e baixa sedimentação.",
    initialMean: 50, initialSpread: 25,
    expectedD50Range: [10, 30],
    clinicalTip: "Lei de Stokes: v = (2r²Δρg)/(9η). Reduzir r (tamanho), aumentar η (viscosidade) ou reduzir Δρ diminui a sedimentação.",
  },
];

function computeDistribution(mean: number, spread: number) {
  const sizes = [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
  const histogram: { size: string; frequency: number; cumulative: number }[] = [];
  let totalFreq = 0;

  // Log-normal distribution
  const logMean = Math.log(mean);
  const logSD = spread / 100 * 2;

  const rawFreqs = sizes.map(s => {
    const logS = Math.log(s);
    return Math.exp(-Math.pow(logS - logMean, 2) / (2 * logSD * logSD)) / (s * logSD);
  });
  const sumFreq = rawFreqs.reduce((a, b) => a + b, 0);

  let cumul = 0;
  sizes.forEach((s, i) => {
    const freq = Math.round((rawFreqs[i] / sumFreq) * 100 * 10) / 10;
    cumul += freq;
    histogram.push({ size: `${s}µm`, frequency: freq, cumulative: Math.min(100, Math.round(cumul * 10) / 10) });
  });

  // Compute D10, D50, D90 from cumulative
  const findDx = (target: number) => {
    for (let i = 0; i < histogram.length; i++) {
      if (histogram[i].cumulative >= target) return sizes[i];
    }
    return sizes[sizes.length - 1];
  };
  const d10 = findDx(10);
  const d50 = findDx(50);
  const d90 = findDx(90);
  const span = d50 > 0 ? Math.round(((d90 - d10) / d50) * 100) / 100 : 0;

  return { histogram, d10, d50, d90, span };
}

export default function SimuladorGranulometria() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<GranCase | null>(null);
  const [mean, setMean] = useState(150);
  const [spread, setSpread] = useState(30);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialMean: cd.initialMean ?? 150, initialSpread: cd.initialSpread ?? 30, expectedD50Range: cd.expectedD50Range ?? [100, 200], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setMean(activeCase.initialMean); setSpread(activeCase.initialSpread); }
  }, [activeCase]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const { histogram, d10, d50, d90, span } = useMemo(() => computeDistribution(mean, spread), [mean, spread]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = d50 >= activeCase.expectedD50Range[0] && d50 <= activeCase.expectedD50Range[1];
    const score = ok ? 100 : 30;
    setLastScore(score);
    submitResults({ score, actions: { mean, spread, d10, d50, d90, span } });
  }, [activeCase, d50, mean, spread, d10, d90, span, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialMean: c.initialMean ?? 150, initialSpread: c.initialSpread ?? 30, expectedD50Range: c.expectedD50Range ?? [100, 200], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Granulometria e Distribuição de Partículas</h1>
            <p className="text-muted-foreground">Histograma, curva acumulativa, D10, D50, D90 e span.</p>
            <AdminPromptViewer toolSlug="sim-granulometria" toolName="Granulometria" toolType="simulator" prompt={getNativePrompt("sim-granulometria") || ""} />
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
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
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
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Produto:</strong> {activeCase.patient.product}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros de Moagem</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Tamanho Médio (µm)</label><span className="text-sm font-bold">{mean} µm</span></div><Slider value={[mean]} onValueChange={([v]) => setMean(v)} min={1} max={500} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dispersão (%)</label><span className="text-sm font-bold">{spread}%</span></div><Slider value={[spread]} onValueChange={([v]) => setSpread(v)} min={5} max={80} step={5} /></div>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">D10</p><p className="text-lg font-bold">{d10} µm</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">D50</p><p className="text-lg font-bold">{d50} µm</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">D90</p><p className="text-lg font-bold">{d90} µm</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Span</p><p className="text-lg font-bold">{span}</p></div>
            </div>
            {isVirtualRoom ? (
              !submitted ? (
                <Button onClick={handleFinish} className="w-full gap-2"><Send className="h-4 w-4" /> Enviar Resultados</Button>
              ) : !showFeedback ? (
                <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                  <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
                  <p className="text-xs text-muted-foreground">D50: {d50} µm | Faixa esperada: {activeCase?.expectedD50Range?.[0]}–{activeCase?.expectedD50Range?.[1]} µm</p>
                </div>
              )
            ) : (
              <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
            )}
            {isVirtualRoom && submitted && <p className="text-xs text-center text-muted-foreground mt-2">Resultados enviados ✓ — Redirecionando em 15s...</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição Granulométrica</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="size" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" label={{ value: "Freq. (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: "Acum. (%)", angle: 90, position: "insideRight" }} stroke="hsl(var(--chart-2))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar yAxisId="left" dataKey="frequency" fill="hsl(var(--primary))" name="Frequência (%)" />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" name="Acumulativa (%)" dot={false} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getGranulometriaChallenges()} simulatorState={{ mean, spread, d50 }} />
    </div>
  );
}
