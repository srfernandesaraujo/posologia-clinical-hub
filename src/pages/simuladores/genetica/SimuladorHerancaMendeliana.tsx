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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getHerancaMendelianaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "heranca-mendeliana";

type InheritancePattern = "AD" | "AR" | "XL" | "XD";

interface HerancaCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; trait: string;
  parentGenotypes: { father: string; mother: string };
  expectedPattern: InheritancePattern;
  dominantAllele: string; recessiveAllele: string;
  clinicalTip: string;
}

const PATTERN_LABELS: Record<InheritancePattern, string> = {
  AD: "Autossômica Dominante", AR: "Autossômica Recessiva",
  XL: "Ligada ao X Recessiva", XD: "Ligada ao X Dominante",
};

const BUILT_IN_CASES: HerancaCase[] = [
  {
    title: "Fibrose Cística — AR", difficulty: "Fácil",
    patient: { name: "Pedro Almeida", age: 3, weight: 12, diagnosis: "Infecções pulmonares e esteatorreia" },
    scenario: "Ambos portadores (Cc). Calcule probabilidades com o quadro de Punnett.",
    trait: "Fibrose Cística (CFTR)", parentGenotypes: { father: "Cc", mother: "Cc" },
    expectedPattern: "AR", dominantAllele: "C", recessiveAllele: "c",
    clinicalTip: "AR: ambos portadores (Aa) → 25% afetados (aa). Exemplos: FC, anemia falciforme, fenilcetonúria.",
  },
  {
    title: "Doença de Huntington — AD", difficulty: "Médio",
    patient: { name: "Ricardo Nunes", age: 40, weight: 80, diagnosis: "Coreia progressiva" },
    scenario: "Pai Hh × mãe hh. Determine o padrão e risco para prole.",
    trait: "Doença de Huntington (HTT)", parentGenotypes: { father: "Hh", mother: "hh" },
    expectedPattern: "AD", dominantAllele: "H", recessiveAllele: "h",
    clinicalTip: "AD: basta 1 alelo mutante. Hh × hh = 50% afetados. Início tardio (30-50 anos), penetrância completa.",
  },
  {
    title: "Hemofilia A — Ligada ao X", difficulty: "Difícil",
    patient: { name: "Lucas Ferreira", age: 8, weight: 25, diagnosis: "Hemartroses recorrentes" },
    scenario: "Mãe portadora (XᴴXʰ) × pai normal (XᴴY). Calcule risco para filhos e filhas.",
    trait: "Hemofilia A (F8)", parentGenotypes: { father: "XY", mother: "XᴴXʰ" },
    expectedPattern: "XL", dominantAllele: "Xᴴ", recessiveAllele: "Xʰ",
    clinicalTip: "X recessiva: homens hemizigóticos (XʰY) afetados. Filhos de portadora: 50% afetados. Filhas: 50% portadoras.",
  },
];

function computePunnett(father: string, mother: string) {
  const fA = father.length === 2 ? [father[0], father[1]] : [father, father];
  const mA = mother.length >= 2 ? [mother[0], mother[1]] : [mother, mother];
  const grid = [[fA[0]+mA[0], fA[0]+mA[1]], [fA[1]+mA[0], fA[1]+mA[1]]];
  const counts: Record<string, number> = {};
  grid.flat().forEach(g => { const s = g.split("").sort().join(""); counts[s] = (counts[s] || 0) + 1; });
  return { grid, genotypeCounts: counts };
}

export default function SimuladorHerancaMendeliana() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<HerancaCase | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<InheritancePattern | null>(null);
  const [penetrance, setPenetrance] = useState(100);
  const [generations, setGenerations] = useState(3);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, trait: cd.trait ?? "", parentGenotypes: cd.parentGenotypes ?? { father: "Aa", mother: "Aa" }, expectedPattern: cd.expectedPattern ?? "AR", dominantAllele: cd.dominantAllele ?? "A", recessiveAllele: cd.recessiveAllele ?? "a", clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => { if (activeCase) { setSelectedPattern(null); setPenetrance(100); setGenerations(3); } }, [activeCase]);

  const punnett = useMemo(() => activeCase ? computePunnett(activeCase.parentGenotypes.father, activeCase.parentGenotypes.mother) : null, [activeCase]);

  // Probability calculation with penetrance
  const probabilities = useMemo(() => {
    if (!punnett || !activeCase) return null;
    const total = 4;
    const recessiveGeno = activeCase.recessiveAllele.repeat(2);
    const affected = Object.entries(punnett.genotypeCounts).reduce((sum, [geno, count]) => {
      if (activeCase.expectedPattern === "AR") return sum + (geno === recessiveGeno ? count : 0);
      if (activeCase.expectedPattern === "AD") return sum + (geno.includes(activeCase.dominantAllele) ? count : 0);
      return sum + count * 0.5; // simplified for X-linked
    }, 0);
    const rawProb = (affected / total) * 100;
    const adjustedProb = rawProb * (penetrance / 100);
    return { rawProb: Math.round(rawProb), adjustedProb: Math.round(adjustedProb) };
  }, [punnett, activeCase, penetrance]);

  // Heredogram data
  const heredogramData = useMemo(() => {
    if (!probabilities) return [];
    return Array.from({ length: generations }, (_, g) => ({
      gen: `G${g + 1}`,
      afetados: Math.round(probabilities.adjustedProb * (g === 0 ? 0.5 : 1)),
      portadores: activeCase?.expectedPattern === "AR" ? Math.round(50 * (penetrance / 100)) : 0,
      normais: Math.round(100 - probabilities.adjustedProb),
    }));
  }, [probabilities, generations, activeCase, penetrance]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = selectedPattern === activeCase.expectedPattern ? 100 : 20;
    setLastScore(s);
    submitResults({ score: s, actions: { selectedPattern, penetrance, generations } });
    return s;
  }, [activeCase, selectedPattern, penetrance, generations, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, trait: c.trait ?? "", parentGenotypes: c.parentGenotypes ?? { father: "Aa", mother: "Aa" }, expectedPattern: c.expectedPattern ?? "AR", dominantAllele: c.dominantAllele ?? "A", recessiveAllele: c.recessiveAllele ?? "a", clinicalTip: c.clinicalTip ?? "" });
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
            <p className="text-muted-foreground">Padrões de herança, Punnett e cálculo de probabilidades.</p>
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm"><strong>Condição:</strong> {activeCase.trait}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Parameters */}
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Genéticos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">♂ Pai</p>
                <p className="text-2xl font-mono font-bold">{activeCase.parentGenotypes.father}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">♀ Mãe</p>
                <p className="text-2xl font-mono font-bold">{activeCase.parentGenotypes.mother}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Penetrância</label><span className="text-sm font-bold">{penetrance}%</span></div>
              <Slider value={[penetrance]} onValueChange={([v]) => setPenetrance(v)} min={10} max={100} step={5} />
              <p className="text-xs text-muted-foreground mt-1">% dos portadores que manifestam a doença</p>
            </div>

            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Gerações no Heredograma</label><span className="text-sm font-bold">{generations}</span></div>
              <Slider value={[generations]} onValueChange={([v]) => setGenerations(v)} min={2} max={5} step={1} />
            </div>

            {probabilities && (
              <div className="p-3 rounded-lg border space-y-1">
                <p className="text-sm"><strong>Probabilidade bruta:</strong> {probabilities.rawProb}%</p>
                <p className="text-sm"><strong>Com penetrância ({penetrance}%):</strong> {probabilities.adjustedProb}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Punnett + Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Quadro de Punnett</CardTitle></CardHeader>
          <CardContent>
            {punnett && (
              <>
                <div className="inline-block border-2 border-border rounded-lg overflow-hidden mb-3">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="w-14 h-10 bg-muted border border-border"></th>
                        <th className="w-14 h-10 bg-muted border border-border text-sm font-bold">{activeCase.parentGenotypes.mother[0]}</th>
                        <th className="w-14 h-10 bg-muted border border-border text-sm font-bold">{activeCase.parentGenotypes.mother.length >= 2 ? activeCase.parentGenotypes.mother[1] : activeCase.parentGenotypes.mother[0]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {punnett.grid.map((row, ri) => (
                        <tr key={ri}>
                          <td className="w-14 h-12 bg-muted border border-border text-sm font-bold text-center">{activeCase.parentGenotypes.father[ri] || activeCase.parentGenotypes.father[0]}</td>
                          {row.map((cell, ci) => {
                            const isRec = cell === activeCase.recessiveAllele.repeat(2);
                            return (
                              <td key={ci} className={`w-14 h-12 border border-border text-center text-lg font-mono font-bold ${isRec ? "bg-destructive/15 text-destructive" : "bg-background"}`}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(punnett.genotypeCounts).map(([geno, count]) => (
                    <Badge key={geno} variant="secondary" className="text-xs">{geno}: {count}/4 ({Math.round(count / 4 * 100)}%)</Badge>
                  ))}
                </div>

                {/* Heredogram chart */}
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={heredogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="gen" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" label={{ value: "%", angle: -90, position: "insideLeft" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="afetados" name="Afetados (%)" fill="hsl(var(--destructive))" stackId="a" />
                    {activeCase.expectedPattern === "AR" && <Bar dataKey="portadores" name="Portadores (%)" fill="hsl(var(--chart-3))" stackId="a" />}
                    <Bar dataKey="normais" name="Normais (%)" fill="hsl(var(--chart-1))" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pattern Selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identifique o Padrão de Herança</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(PATTERN_LABELS) as [InheritancePattern, string][]).map(([key, label]) => (
              <Button key={key} variant={selectedPattern === key ? "default" : "outline"} onClick={() => setSelectedPattern(key)} className="text-xs h-auto py-3" disabled={submitted}>
                <span className="font-bold mr-1">{key}</span> — {label}
              </Button>
            ))}
          </div>
          {submitted && selectedPattern && (
            <div className={`p-3 rounded-lg border ${selectedPattern === activeCase.expectedPattern ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}`}>
              <p className="text-sm font-medium">
                {selectedPattern === activeCase.expectedPattern ? "✅ Correto!" : `❌ Resposta: ${activeCase.expectedPattern} — ${PATTERN_LABELS[activeCase.expectedPattern]}`}
              </p>
            </div>
          )}
          {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted || !selectedPattern} className="w-full">Finalizar</Button>}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getHerancaMendelianaChallenges()}
        simulatorState={{ selectedPattern, penetrance, generations }}
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
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-destructive"}`}>{lastScore}%</div></div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
