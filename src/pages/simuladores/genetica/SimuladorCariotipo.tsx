import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye, CheckCircle2, XCircle, Shuffle } from "lucide-react";
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
import { getCariotipoChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "cariotipo";

// Real relative chromosome sizes (Mb) for precise visual representation
const CHROMOSOME_DATA: { pair: number; label: string; sizeMb: number; group: string; type: string }[] = [
  { pair: 1, label: "1", sizeMb: 249, group: "A", type: "Metacêntrico" },
  { pair: 2, label: "2", sizeMb: 243, group: "A", type: "Submetacêntrico" },
  { pair: 3, label: "3", sizeMb: 198, group: "A", type: "Metacêntrico" },
  { pair: 4, label: "4", sizeMb: 191, group: "B", type: "Submetacêntrico" },
  { pair: 5, label: "5", sizeMb: 182, group: "B", type: "Submetacêntrico" },
  { pair: 6, label: "6", sizeMb: 171, group: "C", type: "Submetacêntrico" },
  { pair: 7, label: "7", sizeMb: 159, group: "C", type: "Submetacêntrico" },
  { pair: 8, label: "8", sizeMb: 146, group: "C", type: "Submetacêntrico" },
  { pair: 9, label: "9", sizeMb: 141, group: "C", type: "Submetacêntrico" },
  { pair: 10, label: "10", sizeMb: 136, group: "C", type: "Submetacêntrico" },
  { pair: 11, label: "11", sizeMb: 135, group: "C", type: "Submetacêntrico" },
  { pair: 12, label: "12", sizeMb: 133, group: "C", type: "Submetacêntrico" },
  { pair: 13, label: "13", sizeMb: 114, group: "D", type: "Acrocêntrico" },
  { pair: 14, label: "14", sizeMb: 107, group: "D", type: "Acrocêntrico" },
  { pair: 15, label: "15", sizeMb: 102, group: "D", type: "Acrocêntrico" },
  { pair: 16, label: "16", sizeMb: 90, group: "E", type: "Metacêntrico" },
  { pair: 17, label: "17", sizeMb: 84, group: "E", type: "Submetacêntrico" },
  { pair: 18, label: "18", sizeMb: 80, group: "E", type: "Submetacêntrico" },
  { pair: 19, label: "19", sizeMb: 59, group: "F", type: "Metacêntrico" },
  { pair: 20, label: "20", sizeMb: 64, group: "F", type: "Metacêntrico" },
  { pair: 21, label: "21", sizeMb: 47, group: "G", type: "Acrocêntrico" },
  { pair: 22, label: "22", sizeMb: 51, group: "G", type: "Acrocêntrico" },
  { pair: 23, label: "X", sizeMb: 156, group: "—", type: "Submetacêntrico" },
];

interface ChromosomeInfo { pair: number; label: string; count: number; anomaly?: string }

interface KaryoCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; sex: "XX" | "XY";
  chromosomes: ChromosomeInfo[];
  expectedKaryotype: string; expectedAnomalies: string[];
  clinicalTip: string;
}

const NORMAL_CHROMOSOMES = (sex: "XX" | "XY"): ChromosomeInfo[] => {
  const auto: ChromosomeInfo[] = Array.from({ length: 22 }, (_, i) => ({ pair: i + 1, label: `${i + 1}`, count: 2 }));
  return [...auto, { pair: 23, label: sex === "XX" ? "X" : "X/Y", count: 2 }];
};

const BUILT_IN_CASES: KaryoCase[] = [
  {
    title: "Síndrome de Down (Trissomia 21)", difficulty: "Fácil",
    patient: { name: "Sofia Lima", age: 0.5, weight: 4.5, diagnosis: "RN com hipotonia e fácies típica" },
    scenario: "Monte o cariótipo identificando os pares corretos. Encontre o cromossomo extra.",
    sex: "XX",
    chromosomes: (() => { const c = NORMAL_CHROMOSOMES("XX"); c[20] = { pair: 21, label: "21", count: 3, anomaly: "Trissomia do 21" }; return c; })(),
    expectedKaryotype: "47,XX,+21", expectedAnomalies: ["Trissomia do 21"],
    clinicalTip: "Trissomia 21: 1/700 nascidos. Não-disjunção meiótica (95%), translocação robertsoniana (3-4%) ou mosaicismo (1-2%). Risco aumenta com idade materna.",
  },
  {
    title: "Síndrome de Klinefelter (47,XXY)", difficulty: "Médio",
    patient: { name: "Gabriel Torres", age: 16, weight: 65, diagnosis: "Ginecomastia e atraso puberal" },
    scenario: "Identifique o cromossomo sexual extra analisando tamanhos e pareamentos.",
    sex: "XY",
    chromosomes: (() => { const c = NORMAL_CHROMOSOMES("XY"); c[22] = { pair: 23, label: "X/X/Y", count: 3, anomaly: "47,XXY — Klinefelter" }; return c; })(),
    expectedKaryotype: "47,XXY", expectedAnomalies: ["47,XXY — Klinefelter"],
    clinicalTip: "Klinefelter (47,XXY) afeta ~1/660 homens. Hipogonadismo, ginecomastia, infertilidade. Cromossomo X extra é inativado (Barr).",
  },
  {
    title: "Translocação Robertsoniana t(14;21)", difficulty: "Difícil",
    patient: { name: "Marcos Silva", age: 30, weight: 78, diagnosis: "Abortos de repetição" },
    scenario: "Portador equilibrado: 45 cromossomos com material genético completo. Identifique quais cromossomos estão envolvidos na translocação.",
    sex: "XY",
    chromosomes: (() => { const c = NORMAL_CHROMOSOMES("XY"); c[13] = { pair: 14, label: "14", count: 1, anomaly: "t(14;21)" }; c[20] = { pair: 21, label: "21", count: 1, anomaly: "t(14;21)" }; return c; })(),
    expectedKaryotype: "45,XY,rob(14;21)", expectedAnomalies: ["t(14;21)"],
    clinicalTip: "Translocações robertsonianas: fusão de acrocêntricos (13,14,15,21,22). Portadores equilibrados são normais mas têm risco de prole com trissomia.",
  },
];

export default function SimuladorCariotipo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<KaryoCase | null>(null);
  const [shuffledChromosomes, setShuffledChromosomes] = useState<{ id: number; pairGuess: number | null; actualPair: number; sizeMb: number; hasAnomaly: boolean }[]>([]);
  const [selectedChrId, setSelectedChrId] = useState<number | null>(null);
  const [assigningPair, setAssigningPair] = useState<number | null>(null);
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [userKaryotype, setUserKaryotype] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, sex: cd.sex ?? "XX", chromosomes: cd.chromosomes ?? NORMAL_CHROMOSOMES("XX"), expectedKaryotype: cd.expectedKaryotype ?? "46,XX", expectedAnomalies: cd.expectedAnomalies ?? [], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedAnomalies([]); setUserKaryotype(""); setShowAnswer(false);
      // Generate individual chromosomes shuffled
      const chroms: typeof shuffledChromosomes = [];
      let id = 0;
      activeCase.chromosomes.forEach(chr => {
        const data = CHROMOSOME_DATA.find(d => d.pair === chr.pair);
        const sizeMb = data?.sizeMb || 100;
        for (let j = 0; j < chr.count; j++) {
          chroms.push({ id: id++, pairGuess: null, actualPair: chr.pair, sizeMb: sizeMb + Math.round((Math.random() - 0.5) * 3), hasAnomaly: !!chr.anomaly });
        }
      });
      // Shuffle
      for (let i = chroms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chroms[i], chroms[j]] = [chroms[j], chroms[i]];
      }
      setShuffledChromosomes(chroms);
    }
  }, [activeCase]);

  const assignPair = (chrId: number, pair: number) => {
    setShuffledChromosomes(prev => prev.map(c => c.id === chrId ? { ...c, pairGuess: pair } : c));
    setSelectedChrId(null);
    setAssigningPair(null);
  };

  const correctPairings = useMemo(() => {
    return shuffledChromosomes.filter(c => c.pairGuess === c.actualPair).length;
  }, [shuffledChromosomes]);

  const totalChromosomes = shuffledChromosomes.length;

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const pairScore = totalChromosomes > 0 ? (correctPairings / totalChromosomes) * 50 : 0;
    const expectedSet = new Set(activeCase.expectedAnomalies);
    const selectedSet = new Set(selectedAnomalies);
    const anomalyCorrect = expectedSet.size === selectedSet.size && [...expectedSet].every(a => selectedSet.has(a));
    const karyoCorrect = userKaryotype.trim().toLowerCase() === activeCase.expectedKaryotype.toLowerCase();
    const s = Math.round(pairScore + (anomalyCorrect ? 30 : 0) + (karyoCorrect ? 20 : 0));
    setLastScore(s); setShowAnswer(true);
    submitResults({ score: s, actions: { correctPairings, totalChromosomes, selectedAnomalies, userKaryotype } });
    return s;
  }, [activeCase, correctPairings, totalChromosomes, selectedAnomalies, userKaryotype, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, sex: c.sex ?? "XX", chromosomes: c.chromosomes ?? NORMAL_CHROMOSOMES("XX"), expectedKaryotype: c.expectedKaryotype ?? "46,XX", expectedAnomalies: c.expectedAnomalies ?? [], clinicalTip: c.clinicalTip ?? "" });
  };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cariótipo e Anomalias Cromossômicas</h1>
            <p className="text-muted-foreground">Monte cariótipos e identifique anomalias cromossômicas.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Cariótipo" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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

  const anomalyOptions = [...new Set([
    ...activeCase.chromosomes.filter(c => c.anomaly).map(c => c.anomaly!),
    "Cariótipo Normal", "Deleção parcial", "Duplicação cromossômica", "Inversão pericêntrica",
  ])];

  const maxSize = 249;

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
        </CardContent>
      </Card>

      {/* Chromosome Assembly Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Shuffle className="h-4 w-4" /> Monte os Pares Cromossômicos</CardTitle>
            <Badge variant="secondary">{correctPairings}/{totalChromosomes} posicionados</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Clique em um cromossomo e depois selecione o par correto (1-22, X/Y). Use o tamanho como guia — cromossomos maiores pertencem aos pares menores em número.</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {shuffledChromosomes.map(chr => {
              const heightPx = Math.max(16, Math.round((chr.sizeMb / maxSize) * 60));
              const isSelected = selectedChrId === chr.id;
              const isAssigned = chr.pairGuess !== null;
              const isCorrect = showAnswer && chr.pairGuess === chr.actualPair;
              const isWrong = showAnswer && chr.pairGuess !== null && chr.pairGuess !== chr.actualPair;

              return (
                <button key={chr.id} onClick={() => { if (!showAnswer) { setSelectedChrId(chr.id); setAssigningPair(null); } }}
                  className={`flex flex-col items-center p-1 rounded border-2 transition-all min-w-[28px] ${
                    isSelected ? "border-primary bg-primary/10 ring-2 ring-primary" :
                    isCorrect ? "border-green-500 bg-green-500/10" :
                    isWrong ? "border-destructive bg-destructive/10" :
                    isAssigned ? "border-primary/40 bg-primary/5" :
                    "border-border hover:border-primary/50"
                  }`}>
                  <div className={`w-[6px] rounded-sm ${chr.hasAnomaly && showAnswer ? "bg-destructive" : "bg-primary"}`} style={{ height: heightPx }} />
                  <span className="text-[8px] mt-0.5 font-mono">{chr.sizeMb}Mb</span>
                  {isAssigned && <span className="text-[8px] font-bold text-primary">Par {chr.pairGuess}</span>}
                </button>
              );
            })}
          </div>

          {selectedChrId !== null && (
            <div className="p-3 rounded-lg border bg-muted/50 mb-3">
              <p className="text-xs font-medium mb-2">Atribua ao par (tamanho: {shuffledChromosomes.find(c => c.id === selectedChrId)?.sizeMb}Mb):</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 23 }, (_, i) => i + 1).map(pair => (
                  <Button key={pair} size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                    onClick={() => assignPair(selectedChrId!, pair)}>
                    {pair <= 22 ? pair : "X/Y"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>📏 Referência de tamanhos: Par 1 (249Mb) → Par 22 (51Mb), X (156Mb), Y (57Mb)</p>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly identification + karyotype */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identifique as Anomalias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {anomalyOptions.map(anomaly => (
              <Button key={anomaly} variant={selectedAnomalies.includes(anomaly) ? "default" : "outline"} size="sm"
                onClick={() => setSelectedAnomalies(prev => prev.includes(anomaly) ? prev.filter(a => a !== anomaly) : [...prev, anomaly])}
                className="justify-start text-xs" disabled={showAnswer}>
                {showAnswer && (activeCase.expectedAnomalies.includes(anomaly) ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> : selectedAnomalies.includes(anomaly) ? <XCircle className="h-3 w-3 mr-1 text-destructive" /> : null)}
                {anomaly}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Escreva o cariótipo (ex: 47,XX,+21):</label>
            <input type="text" value={userKaryotype} onChange={e => setUserKaryotype(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="46,XX ou 47,XXY..." disabled={showAnswer} />
            {showAnswer && (
              <p className={`text-xs mt-1 ${userKaryotype.trim().toLowerCase() === activeCase.expectedKaryotype.toLowerCase() ? "text-green-600" : "text-destructive"}`}>
                Resposta: {activeCase.expectedKaryotype}
              </p>
            )}
          </div>

          {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar</Button>}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getCariotipoChallenges()}
        simulatorState={{ selectedAnomalies, userKaryotype, correctPairings }}
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
