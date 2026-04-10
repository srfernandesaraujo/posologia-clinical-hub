import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getSequenciamentoDNAChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "sequenciamento-dna";

const BASE_COLORS: Record<string, string> = { A: "#22c55e", T: "#ef4444", G: "#3b82f6", C: "#eab308" };

interface SeqCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  method: "sanger" | "ngs" | "both";
  sequence: string;
  primerFwd: string;
  primerRev: string;
  tmPrimer: number;
  variantPosition: number;
  variantBase: string;
  expectedFragmentSizes: number[];
  clinicalTip: string;
}

const BUILT_IN_CASES: SeqCase[] = [
  {
    title: "Detecção de Mutação BRCA1 (Sanger)",
    difficulty: "Fácil",
    patient: { name: "Carla Mendes", age: 38, weight: 62, diagnosis: "Histórico familiar de câncer de mama" },
    scenario: "Sequenciamento Sanger do éxon 11 do gene BRCA1. Escolha os primers adequados, ajuste a temperatura de annealing e interprete o eletroferograma para detectar a mutação pontual.",
    method: "sanger",
    sequence: "ATGCTAGCCTAAGTGCAATCGATCCTGAACTTGAC",
    primerFwd: "5'-ATGCTAGCCTAAGT-3'",
    primerRev: "5'-GTCAAGTTCAGGATC-3'",
    tmPrimer: 56,
    variantPosition: 12,
    variantBase: "T",
    expectedFragmentSizes: [450],
    clinicalTip: "O sequenciamento Sanger utiliza dideoxinucleotídeos (ddNTPs) marcados com fluorescência. Cada terminador gera um fragmento de tamanho específico. No eletroferograma, a posição da variante mostra dois picos sobrepostos (heterozigoto). Quality scores Phred ≥20 indicam acurácia ≥99%.",
  },
  {
    title: "Painel Genômico Tumoral (NGS)",
    difficulty: "Médio",
    patient: { name: "Roberto Alves", age: 55, weight: 78, diagnosis: "Adenocarcinoma de pulmão estágio IIIA" },
    scenario: "NGS de painel com 50 genes. Ajuste cobertura e comprimento de read para otimizar a detecção de variantes somáticas com baixa frequência alélica.",
    method: "ngs",
    sequence: "GCTAGCTTGAACCTGCAATCGGTAACCTAGGCTATGC",
    primerFwd: "Library prep (fragmentação)",
    primerRev: "Library prep (adaptadores)",
    tmPrimer: 60,
    variantPosition: 18,
    variantBase: "A",
    expectedFragmentSizes: [150, 250, 350],
    clinicalTip: "NGS gera milhões de reads curtos em paralelo. Cobertura ≥100x é recomendada para variantes germinativas; ≥500x para somáticas em tumores. A frequência alélica variante (VAF) indica a proporção de reads com a mutação.",
  },
  {
    title: "Comparação Sanger vs NGS — Fibrose Cística",
    difficulty: "Difícil",
    patient: { name: "Lucas Pereira", age: 2, weight: 12, diagnosis: "Suspeita de fibrose cística" },
    scenario: "Compare Sanger (focado no éxon 10, ΔF508) com NGS (todos os 27 éxons do CFTR). Interprete os eletroferogramas e identifique qual técnica é mais adequada.",
    method: "both",
    sequence: "TTGGTGGTGAATCGATCCTAATCGAATCGCCTTGGA",
    primerFwd: "5'-TTGGTGGTGAATCG-3'",
    primerRev: "5'-TCCAAGGCGATTCG-3'",
    tmPrimer: 58,
    variantPosition: 8,
    variantBase: "C",
    expectedFragmentSizes: [120, 250, 450],
    clinicalTip: "A mutação ΔF508 (deleção de 3 pb no éxon 10) é a mais comum na FC (~70%). Sanger é gold standard para confirmação; NGS permite triagem abrangente. No eletroferograma, deleções geram sobreposição de picos a partir do ponto da deleção.",
  },
];

function generateElectropherogram(sequence: string, variantPos: number, variantBase: string, annealingTemp: number, tmPrimer: number, animProgress: number) {
  const tempDiff = Math.abs(annealingTemp - (tmPrimer - 4));
  const noiseLevel = Math.min(0.6, tempDiff * 0.08);
  const maxPos = Math.min(sequence.length, Math.floor(animProgress * sequence.length));

  return Array.from(sequence).slice(0, maxPos).map((base, i) => {
    const isVariant = i === variantPos;
    const baseSignal = 900 + Math.random() * 100;
    const noise = noiseLevel * baseSignal;
    const entry: Record<string, any> = {
      pos: i + 1,
      base,
      quality: Math.max(5, Math.min(50, Math.round(40 - tempDiff * 3 + (Math.random() - 0.5) * 8))),
    };
    for (const b of ["A", "T", "G", "C"]) {
      if (isVariant && b === variantBase) {
        entry[b] = baseSignal * 0.45;
      } else if (b === base) {
        entry[b] = isVariant ? baseSignal * 0.45 : baseSignal;
      } else {
        entry[b] = Math.random() * noise * 80;
      }
    }
    return entry;
  });
}

export default function SimuladorSequenciamentoDNA() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<SeqCase | null>(null);
  const [annealingTemp, setAnnealingTemp] = useState(54);
  const [coverage, setCoverage] = useState(100);
  const [readLength, setReadLength] = useState(150);
  const [running, setRunning] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
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
        sequence: cd.sequence ?? "ATGCTAGCCTAAGTGCAATCG", primerFwd: cd.primerFwd ?? "", primerRev: cd.primerRev ?? "",
        tmPrimer: cd.tmPrimer ?? 56, variantPosition: cd.variantPosition ?? 12,
        variantBase: cd.variantBase ?? "T", expectedFragmentSizes: cd.expectedFragmentSizes ?? [450],
        clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setAnnealingTemp(activeCase.tmPrimer - 4);
      setCoverage(100); setReadLength(150);
      setAnimProgress(0); setRunning(false);
    }
  }, [activeCase]);

  // Animation loop
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setAnimProgress(p => {
        if (p >= 1) { setRunning(false); return 1; }
        return Math.min(1, p + 0.02);
      });
    }, 80);
    return () => clearInterval(interval);
  }, [running]);

  const electropherogram = useMemo(() => {
    if (!activeCase) return [];
    return generateElectropherogram(activeCase.sequence, activeCase.variantPosition, activeCase.variantBase, annealingTemp, activeCase.tmPrimer, animProgress);
  }, [activeCase, annealingTemp, animProgress]);

  const specificity = useMemo(() => {
    if (!activeCase) return 0;
    const optAnnealing = activeCase.tmPrimer - 4;
    const diff = Math.abs(annealingTemp - optAnnealing);
    return Math.max(0, Math.round(100 - diff * 8));
  }, [activeCase, annealingTemp]);

  const avgQuality = useMemo(() => {
    if (electropherogram.length === 0) return 0;
    return Math.round(electropherogram.reduce((s, e) => s + e.quality, 0) / electropherogram.length);
  }, [electropherogram]);

  // Fragment size gel data
  const gelFragments = useMemo(() => {
    if (!activeCase || animProgress < 0.3) return [];
    const fragments = activeCase.expectedFragmentSizes.map(size => ({
      size,
      intensity: Math.min(100, specificity * 0.9 + Math.random() * 10),
      label: `${size} bp`,
    }));
    if (specificity < 50) {
      fragments.push({ size: 80, intensity: 30, label: "Inesp." });
    }
    return fragments;
  }, [activeCase, specificity, animProgress]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const qScore = Math.round(specificity * 0.5 + avgQuality * 0.5);
    const s = Math.min(100, Math.max(0, qScore));
    setRunning(false);
    setLastScore(s);
    submitResults({ score: s, actions: { annealingTemp, coverage, readLength, specificity, avgQuality } });
    return s;
  }, [activeCase, specificity, avgQuality, annealingTemp, coverage, readLength, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, method: c.method ?? "both",
      sequence: c.sequence ?? "ATGCTAGCCTAAGTGCAATCG", primerFwd: c.primerFwd ?? "",
      primerRev: c.primerRev ?? "", tmPrimer: c.tmPrimer ?? 56,
      variantPosition: c.variantPosition ?? 12, variantBase: c.variantBase ?? "T",
      expectedFragmentSizes: c.expectedFragmentSizes ?? [450], clinicalTip: c.clinicalTip ?? "",
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
            <p className="text-muted-foreground">Eletroferogramas, primers, fragmentos e quality scores.</p>
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

  const maxFragSize = Math.max(...(activeCase.expectedFragmentSizes || [500]), 1000);

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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2 rounded bg-muted text-xs"><strong>Primer Fwd:</strong> {activeCase.primerFwd}</div>
            <div className="p-2 rounded bg-muted text-xs"><strong>Primer Rev:</strong> {activeCase.primerRev} <span className="text-muted-foreground">(Tm≈{activeCase.tmPrimer}°C)</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Parâmetros de Sequenciamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2"><label className="text-sm font-medium">Temperatura de Annealing</label><span className="text-sm font-bold">{annealingTemp}°C</span></div>
            <Slider value={[annealingTemp]} onValueChange={([v]) => { setAnnealingTemp(v); setAnimProgress(0); }} min={40} max={72} step={1} />
            <p className="text-xs text-muted-foreground mt-1">Ideal: Tm - 4°C = {activeCase.tmPrimer - 4}°C</p>
          </div>
          {activeCase.method !== "sanger" && (
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Cobertura (Coverage)</label><span className="text-sm font-bold">{coverage}x</span></div>
              <Slider value={[coverage]} onValueChange={([v]) => setCoverage(v)} min={10} max={500} step={10} />
            </div>
          )}
          <div>
            <div className="flex justify-between mb-2"><label className="text-sm font-medium">Read Length</label><span className="text-sm font-bold">{readLength} bp</span></div>
            <Slider value={[readLength]} onValueChange={([v]) => setReadLength(v)} min={50} max={900} step={50} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 rounded bg-muted text-center">
              <p className="text-xs text-muted-foreground">Especificidade</p>
              <p className={`text-xl font-bold ${specificity >= 80 ? "text-green-600" : specificity >= 50 ? "text-yellow-600" : "text-destructive"}`}>{specificity}%</p>
            </div>
            <div className="p-2 rounded bg-muted text-center">
              <p className="text-xs text-muted-foreground">Phred Médio</p>
              <p className={`text-xl font-bold ${avgQuality >= 30 ? "text-green-600" : avgQuality >= 20 ? "text-yellow-600" : "text-destructive"}`}>Q{avgQuality}</p>
            </div>
            <div className="p-2 rounded bg-muted text-center">
              <p className="text-xs text-muted-foreground">Progresso</p>
              <p className="text-xl font-bold">{Math.round(animProgress * 100)}%</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { if (animProgress >= 1) setAnimProgress(0); setRunning(!running); }} className="flex-1 gap-2">
              {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> {animProgress >= 1 ? "Reiniciar" : "Iniciar Sequenciamento"}</>}
            </Button>
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted || animProgress < 0.5} className="flex-1">Finalizar</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Electropherogram */}
      {electropherogram.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Eletroferograma</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={electropherogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="pos" stroke="hsl(var(--muted-foreground))" label={{ value: "Posição (bp)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Intensidade (RFU)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="A" name="A" stroke="#22c55e" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="T" name="T" stroke="#ef4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="G" name="G" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="C" name="C" stroke="#eab308" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1 mt-2">
              {electropherogram.map((e, i) => (
                <span key={i} className={`px-1 text-xs font-mono font-bold rounded ${e.pos - 1 === activeCase.variantPosition ? "ring-2 ring-destructive bg-destructive/20" : ""}`}
                  style={{ color: BASE_COLORS[e.base] || "inherit" }}>
                  {e.base}
                </span>
              ))}
            </div>
            {animProgress >= 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                📍 Posição {activeCase.variantPosition + 1}: {activeCase.sequence[activeCase.variantPosition]} → {activeCase.variantBase}
                {" "}(dois picos sobrepostos = heterozigoto)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gel + Quality side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Gel de Eletroforese Capilar</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {/* Ladder */}
              <div className="w-14 relative bg-gray-900 dark:bg-gray-950 rounded-md" style={{ height: 280 }}>
                <p className="text-[8px] text-center text-gray-400 pt-1">Ladder</p>
                {[100, 200, 300, 400, 500, 600, 800, 1000].map((bp, i) => (
                  <div key={i} className="absolute left-1 right-1 h-1 bg-gray-300 rounded-full" style={{ top: `${(1 - bp / maxFragSize) * 80 + 10}%` }}>
                    <span className="absolute -right-8 text-[7px] text-muted-foreground whitespace-nowrap">{bp}</span>
                  </div>
                ))}
              </div>
              {/* Sample */}
              <div className="w-20 relative bg-gray-900 dark:bg-gray-950 rounded-md" style={{ height: 280 }}>
                <p className="text-[8px] text-center text-gray-400 pt-1">Amostra</p>
                {gelFragments.map((frag, i) => (
                  <div key={i} className="absolute left-2 right-2 h-2 rounded-full transition-all duration-500"
                    style={{
                      top: `${(1 - frag.size / maxFragSize) * 80 + 10}%`,
                      backgroundColor: `rgba(0, 255, 100, ${frag.intensity / 120})`,
                      boxShadow: `0 0 ${frag.intensity / 8}px rgba(0, 255, 100, ${frag.intensity / 150})`,
                    }}>
                    <span className="absolute -right-12 text-[7px] text-muted-foreground whitespace-nowrap">{frag.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {activeCase.expectedFragmentSizes.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{s} bp</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quality Score por Posição</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={electropherogram.map(e => ({
                pos: e.pos,
                quality: e.quality,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="pos" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 50]} stroke="hsl(var(--muted-foreground))" label={{ value: "Phred Q", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="quality" name="Q Score" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              <span>🟢 Q≥30: Excelente</span>
              <span>🟡 Q20-29: Aceitável</span>
              <span>🔴 Q&lt;20: Ruim</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getSequenciamentoDNAChallenges()}
        simulatorState={{ annealingTemp, coverage, readLength, specificity, avgQuality }}
        onComplete={() => setChallengeCompleted(true)}
      />

      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom" : "⚠️ Revise"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
