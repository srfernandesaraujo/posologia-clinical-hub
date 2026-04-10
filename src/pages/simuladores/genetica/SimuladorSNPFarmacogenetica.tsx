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
import { getSNPFarmacogeneticaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "snp-farmacogenetica";

type Phenotype = "UM" | "EM" | "IM" | "PM";

interface SNPCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  gene: string;
  snpId: string;
  allele1: string;
  allele2: string;
  expectedPhenotype: Phenotype;
  drug: string;
  standardDoseMg: number;
  snpSequence: string;
  snpPosition: number;
  clinicalTip: string;
}

const PHENOTYPE_LABELS: Record<Phenotype, string> = { UM: "Metabolizador Ultrarrápido", EM: "Metabolizador Extensivo (Normal)", IM: "Metabolizador Intermediário", PM: "Metabolizador Lento" };

const BUILT_IN_CASES: SNPCase[] = [
  {
    title: "CYP2D6 e Codeína — Metabolizador Ultrarrápido",
    difficulty: "Difícil",
    patient: { name: "Paulo Freitas", age: 42, weight: 75, diagnosis: "Dor pós-operatória — prescrição de codeína" },
    scenario: "Paciente com duplicação do gene CYP2D6. Analise o eletroferograma do SNP e correlacione com a curva farmacocinética.",
    gene: "CYP2D6", snpId: "rs3892097", allele1: "*1", allele2: "*1xN",
    expectedPhenotype: "UM", drug: "Codeína", standardDoseMg: 30,
    snpSequence: "ATGCCTGAACTTGACGGTAACCTG", snpPosition: 8,
    clinicalTip: "Metabolizadores ultrarrápidos CYP2D6 convertem codeína em morfina mais rapidamente, com risco de depressão respiratória. Alternativa: analgésicos não metabolizados pelo CYP2D6.",
  },
  {
    title: "CYP2C19 e Clopidogrel — Metabolizador Lento",
    difficulty: "Médio",
    patient: { name: "Maria Santos", age: 65, weight: 68, diagnosis: "Pós-stent coronariano — clopidogrel" },
    scenario: "Genótipo CYP2C19 *2/*2. Observe no eletroferograma o SNP homozigoto e interprete o impacto na ativação do pró-fármaco.",
    gene: "CYP2C19", snpId: "rs4244285", allele1: "*2", allele2: "*2",
    expectedPhenotype: "PM", drug: "Clopidogrel", standardDoseMg: 75,
    snpSequence: "GCTAGCTTGAACCTGCAATCGGTAA", snpPosition: 11,
    clinicalTip: "PMs CYP2C19 não ativam clopidogrel, aumentando risco de trombose de stent. Alternativas: ticagrelor ou prasugrel.",
  },
  {
    title: "VKORC1 e Varfarina — Sensibilidade Aumentada",
    difficulty: "Fácil",
    patient: { name: "Ana Oliveira", age: 55, weight: 60, diagnosis: "FA — anticoagulação com varfarina" },
    scenario: "SNP rs9923231 (VKORC1 -1639G>A, genótipo A/A). Observe o eletroferograma monoalélico e correlacione com a dose reduzida necessária.",
    gene: "VKORC1", snpId: "rs9923231", allele1: "A", allele2: "A",
    expectedPhenotype: "PM", drug: "Varfarina", standardDoseMg: 5,
    snpSequence: "TTGGTGGTAAATCGATCCTAATCGA", snpPosition: 9,
    clinicalTip: "VKORC1 -1639G>A reduz a expressão da enzima. Genótipo A/A requer ~50% menos varfarina (2-3 mg/dia).",
  },
];

function computePK(phenotype: Phenotype, doseMg: number) {
  const cl: Record<Phenotype, number> = { UM: 2.5, EM: 1.0, IM: 0.5, PM: 0.2 };
  const f: Record<Phenotype, number> = { PM: 0.3, IM: 0.6, EM: 1.0, UM: 1.5 };
  const ka = 1.2;
  const ke = 0.1 * cl[phenotype];
  const vd = 250;
  return Array.from({ length: 25 }, (_, t) => ({
    time: t,
    cp: Math.max(0, +((f[phenotype] * doseMg / vd) * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t)) * 1000).toFixed(2)),
  }));
}

function generateSNPElectropherogram(sequence: string, snpPos: number, isHeterozygous: boolean, progress: number) {
  const maxPos = Math.min(sequence.length, Math.floor(progress * sequence.length));
  return Array.from(sequence).slice(0, maxPos).map((base, i) => {
    const isSNP = i === snpPos;
    const signal = 800 + Math.random() * 200;
    const entry: Record<string, any> = { pos: i + 1, base };
    for (const b of ["A", "T", "G", "C"]) {
      if (isSNP && isHeterozygous) {
        const altBase = base === "G" ? "A" : base === "A" ? "G" : base === "C" ? "T" : "C";
        entry[b] = b === base ? signal * 0.5 : b === altBase ? signal * 0.45 : Math.random() * 40;
      } else {
        entry[b] = b === base ? signal : Math.random() * 40;
      }
    }
    return entry;
  });
}

function getDoseAdjustment(phenotype: Phenotype, standardDose: number) {
  const map: Record<Phenotype, { adjustedDose: number; recommendation: string }> = {
    UM: { adjustedDose: Math.round(standardDose * 0.5), recommendation: "Reduzir dose ou trocar fármaco — risco de toxicidade" },
    EM: { adjustedDose: standardDose, recommendation: "Dose padrão adequada" },
    IM: { adjustedDose: Math.round(standardDose * 0.75), recommendation: "Considerar redução de 25%" },
    PM: { adjustedDose: Math.round(standardDose * 0.5), recommendation: "Trocar para alternativa ou reduzir 50%" },
  };
  return map[phenotype];
}

export default function SimuladorSNPFarmacogenetica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<SNPCase | null>(null);
  const [selectedPhenotype, setSelectedPhenotype] = useState<Phenotype>("EM");
  const [doseAdjust, setDoseAdjust] = useState(100);
  const [running, setRunning] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); }
  }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, gene: cd.gene ?? "CYP2D6", snpId: cd.snpId ?? "",
        allele1: cd.allele1 ?? "*1", allele2: cd.allele2 ?? "*1", expectedPhenotype: cd.expectedPhenotype ?? "EM",
        drug: cd.drug ?? "", standardDoseMg: cd.standardDoseMg ?? 30, snpSequence: cd.snpSequence ?? "ATGCCTGAACTTGAC",
        snpPosition: cd.snpPosition ?? 8, clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => { if (activeCase) { setSelectedPhenotype("EM"); setDoseAdjust(100); setAnimProgress(0); setRunning(false); } }, [activeCase]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setAnimProgress(p => { if (p >= 1) { setRunning(false); return 1; } return Math.min(1, p + 0.025); });
    }, 60);
    return () => clearInterval(interval);
  }, [running]);

  const isHeterozygous = activeCase ? activeCase.allele1 !== activeCase.allele2 : false;

  const electropherogram = useMemo(() => {
    if (!activeCase) return [];
    return generateSNPElectropherogram(activeCase.snpSequence || "", activeCase.snpPosition || 0, isHeterozygous, animProgress);
  }, [activeCase, animProgress, isHeterozygous]);

  const pkData = useMemo(() => {
    if (!activeCase) return [];
    return computePK(selectedPhenotype, activeCase.standardDoseMg * (doseAdjust / 100));
  }, [activeCase, selectedPhenotype, doseAdjust]);

  const adjustment = useMemo(() => activeCase ? getDoseAdjustment(selectedPhenotype, activeCase.standardDoseMg) : null, [activeCase, selectedPhenotype]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = selectedPhenotype === activeCase.expectedPhenotype ? 100 : 30;
    setLastScore(s);
    submitResults({ score: s, actions: { selectedPhenotype, doseAdjust } });
    return s;
  }, [activeCase, selectedPhenotype, doseAdjust, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, gene: c.gene ?? "CYP2D6", snpId: c.snpId ?? "",
      allele1: c.allele1 ?? "*1", allele2: c.allele2 ?? "*1", expectedPhenotype: c.expectedPhenotype ?? "EM",
      drug: c.drug ?? "", standardDoseMg: c.standardDoseMg ?? 50, snpSequence: c.snpSequence ?? "ATGCCTGAACTTGAC",
      snpPosition: c.snpPosition ?? 8, clinicalTip: c.clinicalTip ?? "",
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
            <h1 className="text-2xl font-bold">SNPs e Farmacogenética</h1>
            <p className="text-muted-foreground">Polimorfismos CYP450, VKORC1 e DPYD — genótipo, fenótipo e ajuste de dose.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="SNPs e Farmacogenética" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div className="p-2 rounded bg-muted text-center text-xs"><strong>Gene:</strong> {activeCase.gene}</div>
            <div className="p-2 rounded bg-muted text-center text-xs"><strong>SNP:</strong> {activeCase.snpId}</div>
            <div className="p-2 rounded bg-muted text-center text-xs"><strong>Alelos:</strong> {activeCase.allele1}/{activeCase.allele2}</div>
            <div className="p-2 rounded bg-muted text-center text-xs"><strong>Fármaco:</strong> {activeCase.drug}</div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button + Electropherogram */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Eletroferograma — Genotipagem do SNP</CardTitle>
            <Button size="sm" onClick={() => { if (animProgress >= 1) setAnimProgress(0); setRunning(!running); }} className="gap-1">
              {running ? <><Pause className="h-3 w-3" /> Pausar</> : <><Play className="h-3 w-3" /> {animProgress >= 1 ? "Reiniciar" : "Iniciar Corrida"}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {electropherogram.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={electropherogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="pos" stroke="hsl(var(--muted-foreground))" label={{ value: "Posição (bp)", position: "insideBottom", offset: -5 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "RFU", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="A" name="A" stroke="#22c55e" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="T" name="T" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="G" name="G" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="C" name="C" stroke="#eab308" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {animProgress >= 1 && (
                <p className="text-xs text-muted-foreground mt-2">
                  📍 Posição {(activeCase.snpPosition || 0) + 1}: {isHeterozygous ? "Dois picos sobrepostos = Heterozigoto" : "Pico único = Homozigoto"}
                </p>
              )}
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Clique em "Iniciar Corrida" para visualizar o eletroferograma
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phenotype selection + PK curve side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Classificação do Fenótipo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["UM", "EM", "IM", "PM"] as Phenotype[]).map(p => (
                <Button key={p} variant={selectedPhenotype === p ? "default" : "outline"} size="sm" onClick={() => setSelectedPhenotype(p)} className="text-xs">
                  {p} — {PHENOTYPE_LABELS[p].split(" ")[1]}
                </Button>
              ))}
            </div>
            {adjustment && (
              <div className="p-3 rounded-lg border">
                <p className="text-sm"><strong>Fenótipo:</strong> {PHENOTYPE_LABELS[selectedPhenotype]}</p>
                <p className="text-xs text-muted-foreground mt-1">{adjustment.recommendation}</p>
                <p className="text-xs mt-1"><strong>Dose sugerida:</strong> {adjustment.adjustedDose} mg</p>
              </div>
            )}
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Ajuste de Dose</label><span className="text-sm font-bold">{doseAdjust}% ({Math.round(activeCase.standardDoseMg * doseAdjust / 100)} mg)</span></div>
              <Slider value={[doseAdjust]} onValueChange={([v]) => setDoseAdjust(v)} min={25} max={200} step={5} />
            </div>
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar</Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Curva Cp×t — Dose Ajustada ({selectedPhenotype})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={pkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Cp (ng/mL)", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="cp" name="Cp (ng/mL)" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
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
        challengeSet={getSNPFarmacogeneticaChallenges()}
        simulatorState={{ selectedPhenotype, doseAdjust }}
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
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
