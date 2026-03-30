import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye } from "lucide-react";
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
  clinicalTip: string;
}

const PHENOTYPE_LABELS: Record<Phenotype, string> = {
  UM: "Metabolizador Ultrarrápido",
  EM: "Metabolizador Extensivo (Normal)",
  IM: "Metabolizador Intermediário",
  PM: "Metabolizador Lento",
};

const PHENOTYPE_COLORS: Record<Phenotype, string> = {
  UM: "text-red-500",
  EM: "text-green-600",
  IM: "text-yellow-600",
  PM: "text-blue-600",
};

const BUILT_IN_CASES: SNPCase[] = [
  {
    title: "CYP2D6 e Codeína — Metabolizador Ultrarrápido",
    difficulty: "Difícil",
    patient: { name: "Paulo Freitas", age: 42, weight: 75, diagnosis: "Dor pós-operatória — prescrição de codeína" },
    scenario: "Paciente com duplicação do gene CYP2D6. A codeína (pró-fármaco) é convertida rapidamente em morfina, causando toxicidade opioide.",
    gene: "CYP2D6",
    snpId: "rs3892097",
    allele1: "*1",
    allele2: "*1xN",
    expectedPhenotype: "UM",
    drug: "Codeína",
    standardDoseMg: 30,
    clinicalTip: "Metabolizadores ultrarrápidos CYP2D6 convertem codeína em morfina mais rapidamente, com risco de depressão respiratória. Alternativa: analgésicos não metabolizados pelo CYP2D6 (ex: paracetamol, AINEs).",
  },
  {
    title: "CYP2C19 e Clopidogrel — Metabolizador Lento",
    difficulty: "Médio",
    patient: { name: "Maria Santos", age: 65, weight: 68, diagnosis: "Pós-stent coronariano — antiagregação com clopidogrel" },
    scenario: "Paciente com genótipo CYP2C19 *2/*2 (metabolizador lento). Clopidogrel é um pró-fármaco que depende de CYP2C19 para ativação.",
    gene: "CYP2C19",
    snpId: "rs4244285",
    allele1: "*2",
    allele2: "*2",
    expectedPhenotype: "PM",
    drug: "Clopidogrel",
    standardDoseMg: 75,
    clinicalTip: "Metabolizadores lentos CYP2C19 não ativam adequadamente o clopidogrel, aumentando o risco de trombose de stent. Alternativas: ticagrelor ou prasugrel (não dependem de CYP2C19).",
  },
  {
    title: "VKORC1 e Varfarina — Sensibilidade Aumentada",
    difficulty: "Fácil",
    patient: { name: "Ana Oliveira", age: 55, weight: 60, diagnosis: "Fibrilação atrial — anticoagulação com varfarina" },
    scenario: "Paciente com SNP rs9923231 (VKORC1 -1639G>A, genótipo A/A). Sensibilidade aumentada à varfarina com risco de sangramento.",
    gene: "VKORC1",
    snpId: "rs9923231",
    allele1: "A",
    allele2: "A",
    expectedPhenotype: "PM",
    drug: "Varfarina",
    standardDoseMg: 5,
    clinicalTip: "O SNP VKORC1 -1639G>A reduz a expressão da vitamina K epóxido redutase. Genótipo A/A requer ~50% menos varfarina. Dose inicial sugerida: 2-3 mg/dia com monitoramento rigoroso de INR.",
  },
];

function computePK(phenotype: Phenotype, doseMg: number, time: number) {
  const clearanceMultiplier: Record<Phenotype, number> = { UM: 2.5, EM: 1.0, IM: 0.5, PM: 0.2 };
  const cl = clearanceMultiplier[phenotype];
  const ka = 1.2;
  const ke = 0.1 * cl;
  const vd = 250;
  const f = phenotype === "PM" ? 0.3 : phenotype === "IM" ? 0.6 : phenotype === "UM" ? 1.5 : 1.0;

  const data = [];
  for (let t = 0; t <= 24; t++) {
    const cp = (f * doseMg / vd) * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
    data.push({ time: t, cp: Math.max(0, +(cp * 1000).toFixed(2)) });
  }
  return data;
}

function getDoseAdjustment(phenotype: Phenotype, standardDose: number): { adjustedDose: number; recommendation: string } {
  switch (phenotype) {
    case "UM": return { adjustedDose: Math.round(standardDose * 0.5), recommendation: "Reduzir dose ou trocar fármaco — risco de toxicidade por conversão acelerada" };
    case "EM": return { adjustedDose: standardDose, recommendation: "Dose padrão adequada" };
    case "IM": return { adjustedDose: Math.round(standardDose * 0.75), recommendation: "Considerar redução de 25% ou monitoramento mais frequente" };
    case "PM": return { adjustedDose: Math.round(standardDose * 0.5), recommendation: "Trocar para alternativa ou reduzir 50% — risco de ineficácia (pró-fármaco) ou acúmulo" };
  }
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
        patient: cd.patient, scenario: cd.scenario, gene: cd.gene ?? "CYP2D6", snpId: cd.snpId ?? "rs3892097",
        allele1: cd.allele1 ?? "*1", allele2: cd.allele2 ?? "*1",
        expectedPhenotype: cd.expectedPhenotype ?? "EM", drug: cd.drug ?? "Codeína",
        standardDoseMg: cd.standardDoseMg ?? 30, clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedPhenotype("EM");
      setDoseAdjust(100);
    }
  }, [activeCase]);

  const pkData = useMemo(() => {
    if (!activeCase) return [];
    const dose = activeCase.standardDoseMg * (doseAdjust / 100);
    return computePK(selectedPhenotype, dose, 24);
  }, [activeCase, selectedPhenotype, doseAdjust]);

  const pkComparison = useMemo(() => {
    if (!activeCase) return [];
    const dose = activeCase.standardDoseMg;
    const phenotypes: Phenotype[] = ["UM", "EM", "IM", "PM"];
    const all = phenotypes.map(p => computePK(p, dose, 24));
    return Array.from({ length: 25 }, (_, t) => ({
      time: t,
      UM: all[0][t]?.cp ?? 0,
      EM: all[1][t]?.cp ?? 0,
      IM: all[2][t]?.cp ?? 0,
      PM: all[3][t]?.cp ?? 0,
    }));
  }, [activeCase]);

  const adjustment = useMemo(() => {
    if (!activeCase) return null;
    return getDoseAdjustment(selectedPhenotype, activeCase.standardDoseMg);
  }, [activeCase, selectedPhenotype]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const correct = selectedPhenotype === activeCase.expectedPhenotype;
    const s = correct ? 100 : 30;
    setLastScore(s);
    submitResults({ score: s, actions: { selectedPhenotype, doseAdjust, expectedPhenotype: activeCase.expectedPhenotype } });
    return s;
  }, [activeCase, selectedPhenotype, doseAdjust, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, gene: c.gene ?? "CYP2D6", snpId: c.snpId ?? "",
      allele1: c.allele1 ?? "*1", allele2: c.allele2 ?? "*1",
      expectedPhenotype: c.expectedPhenotype ?? "EM", drug: c.drug ?? "",
      standardDoseMg: c.standardDoseMg ?? 50, clinicalTip: c.clinicalTip ?? "",
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resultado Genotípico</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">Gene</p>
              <p className="text-lg font-bold">{activeCase.gene}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">SNP ID</p>
              <p className="text-lg font-bold">{activeCase.snpId}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">Alelos</p>
              <p className="text-lg font-bold">{activeCase.allele1}/{activeCase.allele2}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">Fármaco</p>
              <p className="text-lg font-bold">{activeCase.drug}</p>
            </div>
          </div>

          <p className="text-sm font-medium mb-2">Selecione o fenótipo metabólico:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {(["UM", "EM", "IM", "PM"] as Phenotype[]).map(p => (
              <Button key={p} variant={selectedPhenotype === p ? "default" : "outline"} size="sm" onClick={() => setSelectedPhenotype(p)} className="text-xs">
                {p} — {PHENOTYPE_LABELS[p].split(" ")[1]}
              </Button>
            ))}
          </div>

          <div className="p-3 rounded-lg border mb-4">
            <p className="text-sm"><strong>Fenótipo:</strong> <span className={PHENOTYPE_COLORS[selectedPhenotype]}>{PHENOTYPE_LABELS[selectedPhenotype]}</span></p>
            {adjustment && <p className="text-sm text-muted-foreground mt-1">{adjustment.recommendation}</p>}
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-2"><label className="text-sm font-medium">Ajuste de Dose</label><span className="text-sm font-bold">{doseAdjust}% ({Math.round(activeCase.standardDoseMg * doseAdjust / 100)} mg)</span></div>
            <Slider value={[doseAdjust]} onValueChange={([v]) => setDoseAdjust(v)} min={25} max={200} step={5} />
          </div>

          <div className="flex gap-2">
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Curva Cp×t — Dose Ajustada ({selectedPhenotype})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Cp (ng/mL)", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="cp" name="Cp (ng/mL)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Comparação entre Fenótipos (Dose Padrão)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pkComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Cp (ng/mL)", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="UM" name="Ultrarrápido" stroke="#ef4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="EM" name="Normal" stroke="#22c55e" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="IM" name="Intermediário" stroke="#eab308" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="PM" name="Lento" stroke="#3b82f6" dot={false} strokeWidth={2} />
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
        challengeSet={{ title: "Desafio: SNPs e Farmacogenética", description: "Teste seus conhecimentos sobre farmacogenética", challenges: [] }}
        simulatorState={{ selectedPhenotype, doseAdjust }}
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
