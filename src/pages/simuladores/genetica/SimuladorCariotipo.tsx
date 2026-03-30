import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye, CheckCircle2, XCircle } from "lucide-react";
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

const SLUG = "cariotipo";

interface ChromosomeInfo {
  pair: number;
  label: string;
  count: number; // normal = 2 for autosomes, sex depends
  anomaly?: string;
}

interface KaryoCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  sex: "XX" | "XY";
  chromosomes: ChromosomeInfo[];
  expectedKaryotype: string;
  expectedAnomalies: string[];
  clinicalTip: string;
}

const NORMAL_CHROMOSOMES = (sex: "XX" | "XY"): ChromosomeInfo[] => {
  const autosomes: ChromosomeInfo[] = Array.from({ length: 22 }, (_, i) => ({
    pair: i + 1,
    label: `${i + 1}`,
    count: 2,
  }));
  const sexChr: ChromosomeInfo = sex === "XX"
    ? { pair: 23, label: "X", count: 2 }
    : { pair: 23, label: "X/Y", count: 2 };
  return [...autosomes, sexChr];
};

const BUILT_IN_CASES: KaryoCase[] = [
  {
    title: "Síndrome de Down (Trissomia 21)",
    difficulty: "Fácil",
    patient: { name: "Sofia Lima", age: 0.5, weight: 4.5, diagnosis: "RN com hipotonia, fácies típica e prega palmar única" },
    scenario: "Recém-nascida com características sugestivas de trissomia 21. Identifique o cromossomo extra no cariótipo.",
    sex: "XX",
    chromosomes: (() => {
      const chrs = NORMAL_CHROMOSOMES("XX");
      chrs[20] = { pair: 21, label: "21", count: 3, anomaly: "Trissomia do 21" };
      return chrs;
    })(),
    expectedKaryotype: "47,XX,+21",
    expectedAnomalies: ["Trissomia do 21"],
    clinicalTip: "Trissomia do 21 (Síndrome de Down) é a aneuploidia mais comum: 1/700 nascidos vivos. Causada por não-disjunção meiótica (95%), translocação robertsoniana (3-4%) ou mosaicismo (1-2%). Risco aumenta com idade materna.",
  },
  {
    title: "Síndrome de Klinefelter (47,XXY)",
    difficulty: "Médio",
    patient: { name: "Gabriel Torres", age: 16, weight: 65, diagnosis: "Adolescente com ginecomastia e atraso puberal" },
    scenario: "Adolescente com testículos pequenos, ginecomastia e estatura elevada. O cariótipo revela um cromossomo X extra.",
    sex: "XY",
    chromosomes: (() => {
      const chrs = NORMAL_CHROMOSOMES("XY");
      chrs[22] = { pair: 23, label: "X/X/Y", count: 3, anomaly: "47,XXY — Síndrome de Klinefelter" };
      return chrs;
    })(),
    expectedKaryotype: "47,XXY",
    expectedAnomalies: ["47,XXY — Síndrome de Klinefelter"],
    clinicalTip: "Síndrome de Klinefelter (47,XXY) afeta ~1/660 homens. Caracteriza-se por hipogonadismo hipergonadotrófico, ginecomastia, infertilidade e risco de osteoporose. O cromossomo X extra é inativado (Corpúsculo de Barr).",
  },
  {
    title: "Translocação Robertsoniana t(14;21)",
    difficulty: "Difícil",
    patient: { name: "Marcos Silva", age: 30, weight: 78, diagnosis: "Casal com abortos de repetição — estudo citogenético" },
    scenario: "Paciente portador equilibrado de translocação robertsoniana entre cromossomos 14 e 21. Total de 45 cromossomos com material genético completo.",
    sex: "XY",
    chromosomes: (() => {
      const chrs = NORMAL_CHROMOSOMES("XY");
      chrs[13] = { pair: 14, label: "14", count: 1, anomaly: "t(14;21) — Translocação Robertsoniana" };
      chrs[20] = { pair: 21, label: "21", count: 1, anomaly: "t(14;21) — Translocação Robertsoniana" };
      return chrs;
    })(),
    expectedKaryotype: "45,XY,rob(14;21)",
    expectedAnomalies: ["t(14;21) — Translocação Robertsoniana"],
    clinicalTip: "Translocações robertsonianas envolvem fusão de dois cromossomos acrocêntricos (13, 14, 15, 21, 22). Portadores equilibrados são fenotipicamente normais mas têm risco aumentado de descendência com trissomia por segregação desequilibrada.",
  },
];

const CHROMOSOME_SIZES = [8, 7.5, 7, 6.5, 6, 5.5, 5.5, 5, 5, 5, 4.5, 4.5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2.5, 1.8, 2, 3];

export default function SimuladorCariotipo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<KaryoCase | null>(null);
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [userKaryotype, setUserKaryotype] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
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
        patient: cd.patient, scenario: cd.scenario, sex: cd.sex ?? "XX",
        chromosomes: cd.chromosomes ?? NORMAL_CHROMOSOMES("XX"),
        expectedKaryotype: cd.expectedKaryotype ?? "46,XX",
        expectedAnomalies: cd.expectedAnomalies ?? [], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedAnomalies([]); setUserKaryotype(""); setShowAnswer(false);
    }
  }, [activeCase]);

  const toggleAnomaly = (anomaly: string) => {
    setSelectedAnomalies(prev =>
      prev.includes(anomaly) ? prev.filter(a => a !== anomaly) : [...prev, anomaly]
    );
  };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const expectedSet = new Set(activeCase.expectedAnomalies);
    const selectedSet = new Set(selectedAnomalies);
    const correct = expectedSet.size === selectedSet.size && [...expectedSet].every(a => selectedSet.has(a));
    const karyoCorrect = userKaryotype.trim().toLowerCase() === activeCase.expectedKaryotype.toLowerCase();
    const s = Math.round((correct ? 60 : 0) + (karyoCorrect ? 40 : 0));
    setLastScore(s);
    setShowAnswer(true);
    submitResults({ score: s, actions: { selectedAnomalies, userKaryotype, expectedKaryotype: activeCase.expectedKaryotype } });
    return s;
  }, [activeCase, selectedAnomalies, userKaryotype, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, sex: c.sex ?? "XX",
      chromosomes: c.chromosomes ?? NORMAL_CHROMOSOMES("XX"),
      expectedKaryotype: c.expectedKaryotype ?? "46,XX",
      expectedAnomalies: c.expectedAnomalies ?? [], clinicalTip: c.clinicalTip ?? "",
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
            <h1 className="text-2xl font-bold">Cariótipo e Anomalias Cromossômicas</h1>
            <p className="text-muted-foreground">Monte cariótipos virtuais e identifique anomalias cromossômicas.</p>
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

  const barData = activeCase.chromosomes.map((chr, i) => ({
    name: chr.label,
    count: chr.count,
    fill: chr.anomaly ? "hsl(var(--destructive))" : "hsl(var(--primary))",
  }));

  const anomalyOptions = activeCase.chromosomes
    .filter(c => c.anomaly)
    .map(c => c.anomaly!);
  const allPossibleAnomalies = [
    ...anomalyOptions,
    "Cariótipo Normal",
    "Deleção parcial",
    "Duplicação cromossômica",
    "Inversão pericêntrica",
  ];
  const uniqueAnomalies = [...new Set(allPossibleAnomalies)];

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

      {/* Karyotype visualization */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cariótipo — Visualização Cromossômica</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 md:grid-cols-12 gap-2 mb-4">
            {activeCase.chromosomes.map((chr, i) => (
              <div key={i} className={`flex flex-col items-center p-2 rounded-lg border-2 transition-colors ${chr.anomaly ? "border-destructive bg-destructive/10" : "border-border bg-muted/50"}`}>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: chr.count }).map((_, j) => (
                    <div
                      key={j}
                      className={`rounded-sm ${chr.anomaly ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: 6, height: (CHROMOSOME_SIZES[i] || 3) * 4 }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold">{chr.label}</span>
                {chr.count !== 2 && <span className="text-[9px] text-destructive font-bold">×{chr.count}</span>}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 4]} stroke="hsl(var(--muted-foreground))" label={{ value: "Contagem", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" name="Cromossomos" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomaly identification */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identifique as Anomalias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {uniqueAnomalies.map(anomaly => (
              <Button
                key={anomaly}
                variant={selectedAnomalies.includes(anomaly) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAnomaly(anomaly)}
                className="justify-start text-xs"
                disabled={showAnswer}
              >
                {showAnswer && (
                  activeCase.expectedAnomalies.includes(anomaly)
                    ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    : selectedAnomalies.includes(anomaly) ? <XCircle className="h-3 w-3 mr-1 text-destructive" /> : null
                )}
                {anomaly}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Escreva o cariótipo (ex: 47,XX,+21):</label>
            <input
              type="text"
              value={userKaryotype}
              onChange={e => setUserKaryotype(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="46,XX ou 47,XXY..."
              disabled={showAnswer}
            />
            {showAnswer && (
              <p className={`text-xs mt-1 ${userKaryotype.trim().toLowerCase() === activeCase.expectedKaryotype.toLowerCase() ? "text-green-600" : "text-destructive"}`}>
                Resposta correta: {activeCase.expectedKaryotype}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted} className="flex-1">Finalizar</Button>}
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
        challengeSet={{ title: "Desafio: Cariótipo", description: "Teste seus conhecimentos sobre anomalias cromossômicas", challenges: [] }}
        simulatorState={{ selectedAnomalies, userKaryotype }}
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
