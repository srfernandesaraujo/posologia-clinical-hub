import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";

const SLUG = "heranca-mendeliana";

type InheritancePattern = "AD" | "AR" | "XL" | "XD";

interface HerancaCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  trait: string;
  parentGenotypes: { father: string; mother: string };
  expectedPattern: InheritancePattern;
  dominantAllele: string;
  recessiveAllele: string;
  clinicalTip: string;
}

const PATTERN_LABELS: Record<InheritancePattern, string> = {
  AD: "Autossômica Dominante",
  AR: "Autossômica Recessiva",
  XL: "Ligada ao X Recessiva",
  XD: "Ligada ao X Dominante",
};

const BUILT_IN_CASES: HerancaCase[] = [
  {
    title: "Fibrose Cística — Herança Autossômica Recessiva",
    difficulty: "Fácil",
    patient: { name: "Pedro Almeida", age: 3, weight: 12, diagnosis: "Infecções pulmonares recorrentes e esteatorreia" },
    scenario: "Ambos os pais são portadores (heterozigotos) para a mutação CFTR. Calcule a probabilidade de um filho afetado usando o quadro de Punnett.",
    trait: "Fibrose Cística (CFTR)",
    parentGenotypes: { father: "Cc", mother: "Cc" },
    expectedPattern: "AR",
    dominantAllele: "C",
    recessiveAllele: "c",
    clinicalTip: "Na herança autossômica recessiva, ambos os pais devem ser portadores (Aa) para ter filhos afetados (aa). A probabilidade é de 25% (1/4) para cada gestação. Exemplos: fibrose cística, anemia falciforme, fenilcetonúria.",
  },
  {
    title: "Doença de Huntington — Herança Autossômica Dominante",
    difficulty: "Médio",
    patient: { name: "Ricardo Nunes", age: 40, weight: 80, diagnosis: "Coreia progressiva e declínio cognitivo" },
    scenario: "Pai afetado heterozigoto (Hh) e mãe não afetada (hh). Determine o padrão de herança e o risco para a prole.",
    trait: "Doença de Huntington (HTT)",
    parentGenotypes: { father: "Hh", mother: "hh" },
    expectedPattern: "AD",
    dominantAllele: "H",
    recessiveAllele: "h",
    clinicalTip: "Na herança autossômica dominante, basta um alelo mutante para manifestar a doença. Pai Hh × mãe hh = 50% dos filhos afetados. A doença de Huntington apresenta penetrância completa e início tardio (30-50 anos).",
  },
  {
    title: "Hemofilia A — Herança Ligada ao X",
    difficulty: "Difícil",
    patient: { name: "Lucas Ferreira", age: 8, weight: 25, diagnosis: "Hemartroses recorrentes e tempo de coagulação prolongado" },
    scenario: "Mãe portadora (XᴴXʰ) e pai normal (XᴴY). Analise o heredograma e calcule o risco para filhos e filhas.",
    trait: "Hemofilia A (F8)",
    parentGenotypes: { father: "XY", mother: "XᴴXʰ" },
    expectedPattern: "XL",
    dominantAllele: "Xᴴ",
    recessiveAllele: "Xʰ",
    clinicalTip: "Na herança ligada ao X recessiva, homens hemizigóticos (XʰY) são afetados. Filhas de mãe portadora têm 50% de chance de ser portadoras. Filhos têm 50% de chance de ser afetados. Pais afetados transmitem o X mutante a todas as filhas.",
  },
];

function computePunnett(father: string, mother: string) {
  const fAlleles = father.length === 2 ? [father[0], father[1]] : [father, father];
  const mAlleles = mother.length >= 2 ? [mother[0], mother[1]] : [mother, mother];

  const grid = [
    [fAlleles[0] + mAlleles[0], fAlleles[0] + mAlleles[1]],
    [fAlleles[1] + mAlleles[0], fAlleles[1] + mAlleles[1]],
  ];

  const genotypeCounts: Record<string, number> = {};
  grid.flat().forEach(g => {
    const sorted = g.split("").sort().join("");
    genotypeCounts[sorted] = (genotypeCounts[sorted] || 0) + 1;
  });

  return { grid, genotypeCounts };
}

export default function SimuladorHerancaMendeliana() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<HerancaCase | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<InheritancePattern | null>(null);
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
        patient: cd.patient, scenario: cd.scenario, trait: cd.trait ?? "",
        parentGenotypes: cd.parentGenotypes ?? { father: "Aa", mother: "Aa" },
        expectedPattern: cd.expectedPattern ?? "AR", dominantAllele: cd.dominantAllele ?? "A",
        recessiveAllele: cd.recessiveAllele ?? "a", clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setSelectedPattern(null); }
  }, [activeCase]);

  const punnett = useMemo(() => {
    if (!activeCase) return null;
    return computePunnett(activeCase.parentGenotypes.father, activeCase.parentGenotypes.mother);
  }, [activeCase]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const correct = selectedPattern === activeCase.expectedPattern;
    const s = correct ? 100 : 20;
    setLastScore(s);
    submitResults({ score: s, actions: { selectedPattern, expectedPattern: activeCase.expectedPattern } });
    return s;
  }, [activeCase, selectedPattern, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, trait: c.trait ?? "",
      parentGenotypes: c.parentGenotypes ?? { father: "Aa", mother: "Aa" },
      expectedPattern: c.expectedPattern ?? "AR", dominantAllele: c.dominantAllele ?? "A",
      recessiveAllele: c.recessiveAllele ?? "a", clinicalTip: c.clinicalTip ?? "",
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
            <h1 className="text-2xl font-bold">Herança Mendeliana e Heredogramas</h1>
            <p className="text-muted-foreground">Padrões de herança, quadro de Punnett e cálculo de probabilidades.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Herança Mendeliana" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
          <p className="text-sm"><strong>Condição:</strong> {activeCase.trait}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      {/* Genotypes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Genótipos Parentais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-1">♂ Pai</p>
              <p className="text-3xl font-mono font-bold">{activeCase.parentGenotypes.father}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-1">♀ Mãe</p>
              <p className="text-3xl font-mono font-bold">{activeCase.parentGenotypes.mother}</p>
            </div>
          </div>

          {/* Punnett Square */}
          {punnett && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Quadro de Punnett</p>
              <div className="inline-block border-2 border-border rounded-lg overflow-hidden">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="w-16 h-10 bg-muted border border-border"></th>
                      <th className="w-16 h-10 bg-muted border border-border text-sm font-bold">{activeCase.parentGenotypes.mother[0]}</th>
                      <th className="w-16 h-10 bg-muted border border-border text-sm font-bold">{activeCase.parentGenotypes.mother.length >= 2 ? activeCase.parentGenotypes.mother[1] : activeCase.parentGenotypes.mother[0]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {punnett.grid.map((row, ri) => (
                      <tr key={ri}>
                        <td className="w-16 h-14 bg-muted border border-border text-sm font-bold text-center">
                          {activeCase.parentGenotypes.father[ri] || activeCase.parentGenotypes.father[0]}
                        </td>
                        {row.map((cell, ci) => {
                          const isHomoRecessive = cell === activeCase.recessiveAllele.repeat(2);
                          return (
                            <td key={ci} className={`w-16 h-14 border border-border text-center text-lg font-mono font-bold ${isHomoRecessive ? "bg-destructive/15 text-destructive" : "bg-background"}`}>
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(punnett.genotypeCounts).map(([geno, count]) => (
                  <Badge key={geno} variant="secondary" className="text-xs">
                    {geno}: {count}/4 ({Math.round(count / 4 * 100)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identifique o Padrão de Herança</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(PATTERN_LABELS) as [InheritancePattern, string][]).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedPattern === key ? "default" : "outline"}
                onClick={() => setSelectedPattern(key)}
                className="text-xs h-auto py-3"
                disabled={submitted}
              >
                <span className="font-bold mr-1">{key}</span> — {label}
              </Button>
            ))}
          </div>

          {submitted && selectedPattern && (
            <div className={`p-3 rounded-lg border ${selectedPattern === activeCase.expectedPattern ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}`}>
              <p className="text-sm font-medium">
                {selectedPattern === activeCase.expectedPattern
                  ? "✅ Correto!"
                  : `❌ Incorreto. Resposta correta: ${activeCase.expectedPattern} — ${PATTERN_LABELS[activeCase.expectedPattern]}`}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted || !selectedPattern} className="flex-1">Finalizar</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={{ title: "Desafio: Herança Mendeliana", description: "Teste seus conhecimentos sobre genética mendeliana", challenges: [] }}
        simulatorState={{ selectedPattern }}
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
