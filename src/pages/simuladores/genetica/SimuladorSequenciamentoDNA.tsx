import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye } from "lucide-react";
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

const SLUG = "sequenciamento-dna";

interface SeqCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  method: "sanger" | "ngs" | "both";
  sequence: string;
  variantPosition: number;
  variantBase: string;
  expectedQuality: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: SeqCase[] = [
  {
    title: "Detecção de Mutação BRCA1 (Sanger)",
    difficulty: "Fácil",
    patient: { name: "Carla Mendes", age: 38, weight: 62, diagnosis: "Histórico familiar de câncer de mama" },
    scenario: "Paciente com histórico familiar forte. Sequenciamento Sanger do éxon 11 do gene BRCA1 para detecção de mutação pontual conhecida.",
    method: "sanger",
    sequence: "ATGCTAGCCTAAGTGCAATCG",
    variantPosition: 12,
    variantBase: "T",
    expectedQuality: [30, 50],
    clinicalTip: "O sequenciamento Sanger utiliza dideoxinucleotídeos (ddNTPs) marcados com fluorescência. Cada terminador gera um fragmento de tamanho específico, separado por eletroforese capilar. Quality scores (Phred) ≥20 indicam acurácia ≥99%.",
  },
  {
    title: "Painel Genômico Tumoral (NGS)",
    difficulty: "Médio",
    patient: { name: "Roberto Alves", age: 55, weight: 78, diagnosis: "Adenocarcinoma de pulmão estágio IIIA" },
    scenario: "NGS de painel com 50 genes associados a câncer. Avalie a cobertura de leitura e identifique variantes com frequência alélica significativa.",
    method: "ngs",
    sequence: "GCTAGCTTGAACCTGCAATCGGTAACCTAGG",
    variantPosition: 18,
    variantBase: "A",
    expectedQuality: [25, 40],
    clinicalTip: "NGS (Next-Generation Sequencing) gera milhões de reads curtos em paralelo. A profundidade de cobertura (coverage depth) indica quantas vezes cada base foi lida. Cobertura ≥100x é recomendada para detecção de variantes somáticas em tumores.",
  },
  {
    title: "Comparação Sanger vs NGS — Fibrose Cística",
    difficulty: "Difícil",
    patient: { name: "Lucas Pereira", age: 2, weight: 12, diagnosis: "Suspeita de fibrose cística (triagem neonatal alterada)" },
    scenario: "Compare as duas metodologias para análise do gene CFTR. Sanger focado no éxon 10 (ΔF508) e NGS cobrindo todos os 27 éxons.",
    method: "both",
    sequence: "TTGGTGGTGAATCGATCCTAATCGAATCG",
    variantPosition: 8,
    variantBase: "C",
    expectedQuality: [28, 45],
    clinicalTip: "A mutação ΔF508 (deleção de 3 pb no éxon 10) é a mais comum na fibrose cística (~70% dos alelos). Sanger é gold standard para confirmação de variantes específicas, enquanto NGS permite triagem abrangente de todas as variantes do CFTR.",
  },
];

function computeSequencing(
  method: "sanger" | "ngs" | "both",
  coverage: number,
  readLength: number,
  errorRate: number,
  sequence: string,
  variantPos: number
) {
  const seqLen = sequence.length;
  const sangerReadLen = Math.min(readLength, 900);
  const ngsReadLen = Math.min(readLength, 300);

  // Phred quality score: Q = -10 * log10(errorRate)
  const phredScore = errorRate > 0 ? Math.round(-10 * Math.log10(errorRate / 100)) : 50;

  // Sanger metrics
  const sangerCoverage = method !== "ngs" ? Math.min(sangerReadLen / seqLen, 1) * 100 : 0;
  const sangerAccuracy = method !== "ngs" ? Math.max(0, 100 - errorRate * 2) : 0;

  // NGS metrics
  const ngsCoverage = method !== "sanger" ? coverage : 0;
  const ngsAccuracy = method !== "sanger" ? Math.max(0, 100 - errorRate) : 0;
  const totalReads = method !== "sanger" ? Math.round(coverage * seqLen / ngsReadLen) : 0;

  // Variant detection confidence
  const variantReads = method !== "sanger" ? Math.round(coverage * 0.48) : 0;
  const variantFreq = method !== "sanger" ? (variantReads / coverage * 100) : 0;
  const sangerVariantDetected = method !== "ngs" && variantPos < sangerReadLen;

  // Generate electropherogram-like data
  const electropherogram = Array.from(sequence).map((base, i) => {
    const q = phredScore + Math.round((Math.random() - 0.5) * 10);
    return {
      pos: i + 1,
      base,
      quality: Math.max(5, Math.min(50, q)),
      isVariant: i === variantPos,
      A: base === "A" ? 800 + Math.random() * 200 : Math.random() * 100,
      T: base === "T" ? 800 + Math.random() * 200 : Math.random() * 100,
      G: base === "G" ? 800 + Math.random() * 200 : Math.random() * 100,
      C: base === "C" ? 800 + Math.random() * 200 : Math.random() * 100,
    };
  });

  return {
    phredScore,
    sangerCoverage: +sangerCoverage.toFixed(0),
    sangerAccuracy: +sangerAccuracy.toFixed(1),
    ngsCoverage,
    ngsAccuracy: +ngsAccuracy.toFixed(1),
    totalReads,
    variantReads,
    variantFreq: +variantFreq.toFixed(1),
    sangerVariantDetected,
    electropherogram,
  };
}

export default function SimuladorSequenciamentoDNA() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<SeqCase | null>(null);
  const [coverage, setCoverage] = useState(100);
  const [readLength, setReadLength] = useState(150);
  const [errorRate, setErrorRate] = useState(1);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, method: cd.method ?? "both",
        sequence: cd.sequence ?? "ATGCTAGCCTAAGTGCAATCG", variantPosition: cd.variantPosition ?? 12,
        variantBase: cd.variantBase ?? "T", expectedQuality: cd.expectedQuality ?? [25, 45],
        clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setCoverage(100); setReadLength(150); setErrorRate(1);
      setHistory([]); setTime(0); setRunning(false);
    }
  }, [activeCase]);

  useEffect(() => {
    if (!running || !activeCase) return;
    const interval = setInterval(() => {
      setTime(t => {
        const newT = t + 1;
        const out = computeSequencing(activeCase.method, coverage, readLength, errorRate, activeCase.sequence, activeCase.variantPosition);
        setHistory(prev => [...prev.slice(-59), { time: newT, phred: out.phredScore, coverage: out.ngsCoverage, accuracy: out.ngsAccuracy || out.sangerAccuracy }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, coverage, readLength, errorRate, activeCase]);

  const outputs = useMemo(() => {
    if (!activeCase) return null;
    return computeSequencing(activeCase.method, coverage, readLength, errorRate, activeCase.sequence, activeCase.variantPosition);
  }, [activeCase, coverage, readLength, errorRate]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted || !outputs) return 0;
    const qOk = outputs.phredScore >= activeCase.expectedQuality[0] && outputs.phredScore <= activeCase.expectedQuality[1];
    const s = Math.round(qOk ? 100 : Math.max(0, 100 - Math.abs(outputs.phredScore - (activeCase.expectedQuality[0] + activeCase.expectedQuality[1]) / 2) * 3));
    setRunning(false);
    setLastScore(s);
    submitResults({ score: s, actions: { coverage, readLength, errorRate, phredScore: outputs.phredScore } });
    return s;
  }, [activeCase, outputs, coverage, readLength, errorRate, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, method: c.method ?? "both",
      sequence: c.sequence ?? "ATGCTAGCCTAAGTGCAATCG", variantPosition: c.variantPosition ?? 12,
      variantBase: c.variantBase ?? "T", expectedQuality: c.expectedQuality ?? [25, 45],
      clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Sequenciamento de DNA</h1>
            <p className="text-muted-foreground">Compare Sanger vs NGS: eletroferogramas, quality scores e cobertura.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Sequenciamento de DNA" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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

  const qualityBarData = outputs ? outputs.electropherogram.map(e => ({
    pos: e.pos,
    quality: e.quality,
    fill: e.isVariant ? "hsl(var(--destructive))" : e.quality >= 30 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
  })) : [];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? goBack : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{activeCase.method === "sanger" ? "Sanger" : activeCase.method === "ngs" ? "NGS" : "Sanger + NGS"}</Badge>
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
          <CardHeader><CardTitle className="text-base">Parâmetros de Sequenciamento</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {activeCase.method !== "sanger" && (
              <div>
                <div className="flex justify-between mb-2"><label className="text-sm font-medium">Cobertura (Coverage Depth)</label><span className="text-sm font-bold">{coverage}x</span></div>
                <Slider value={[coverage]} onValueChange={([v]) => setCoverage(v)} min={10} max={500} step={10} />
              </div>
            )}
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Comprimento de Leitura (Read Length)</label><span className="text-sm font-bold">{readLength} bp</span></div>
              <Slider value={[readLength]} onValueChange={([v]) => setReadLength(v)} min={50} max={900} step={50} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Taxa de Erro (%)</label><span className="text-sm font-bold">{errorRate}%</span></div>
              <Slider value={[errorRate]} onValueChange={([v]) => setErrorRate(v)} min={0.1} max={10} step={0.1} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
              {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Métricas de Qualidade</CardTitle></CardHeader>
          <CardContent>
            {outputs && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Phred Score</p>
                    <p className="text-2xl font-bold">{outputs.phredScore}</p>
                    <p className="text-xs text-muted-foreground">Q</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">{activeCase.method === "sanger" ? "Cobertura Sanger" : "Cobertura NGS"}</p>
                    <p className="text-2xl font-bold">{activeCase.method === "sanger" ? outputs.sangerCoverage : outputs.ngsCoverage}{ activeCase.method === "sanger" ? "%" : "x"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Acurácia</p>
                    <p className="text-2xl font-bold">{activeCase.method === "sanger" ? outputs.sangerAccuracy : outputs.ngsAccuracy}%</p>
                  </div>
                </div>
                <p className="text-xs font-medium mb-2">Quality Score por Posição</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={qualityBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="pos" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 50]} stroke="hsl(var(--muted-foreground))" label={{ value: "Phred Q", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="quality" name="Quality Score" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {outputs && activeCase.method !== "sanger" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Detecção de Variante (NGS)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Total Reads</p>
                <p className="text-xl font-bold">{outputs.totalReads}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Reads Variante</p>
                <p className="text-xl font-bold">{outputs.variantReads}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Freq. Alélica</p>
                <p className="text-xl font-bold">{outputs.variantFreq}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" label={{ value: "Tempo (s)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="phred" name="Phred Score" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="accuracy" name="Acurácia (%)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
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
        challengeSet={{ title: "Desafio: Sequenciamento de DNA", description: "Teste seus conhecimentos sobre sequenciamento", challenges: [] }}
        simulatorState={{ coverage, readLength, errorRate, phredScore: outputs?.phredScore }}
        onComplete={() => setChallengeCompleted(true)}
      />

      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
