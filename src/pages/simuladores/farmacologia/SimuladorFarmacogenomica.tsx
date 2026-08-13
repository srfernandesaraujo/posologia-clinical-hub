import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getFarmacogenomicaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "farmacogenomica";

type Phenotype = "ultrarapido" | "extensivo" | "intermediario" | "lento";
type DrugType = "pro-farmaco" | "farmaco-ativo";

const PHENOTYPE_LABELS: Record<Phenotype, string> = { ultrarapido: "Ultrarrápido", extensivo: "Extensivo (Normal)", intermediario: "Intermediário", lento: "Lento (PM)" };
const PHENOTYPE_FACTOR: Record<Phenotype, number> = { ultrarapido: 2.5, extensivo: 1, intermediario: 0.5, lento: 0.15 };

interface FGCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  drugType: DrugType;
  enzyme: string;
  expectedPhenotype: Phenotype;
  expectedDoseAdjust: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: FGCase[] = [
  { title: "Codeína → Morfina (CYP2D6)", difficulty: "Médio", patient: { name: "Isabela Neves", age: 30, weight: 55, diagnosis: "Dor pós-operatória em metabolizadora ultrarrápida CYP2D6" }, scenario: "A codeína é um pró-fármaco convertido em morfina pelo CYP2D6. Metabolizadores ultrarrápidos produzem excesso de morfina, com risco de depressão respiratória.", drugType: "pro-farmaco", enzyme: "CYP2D6", expectedPhenotype: "ultrarapido", expectedDoseAdjust: [20, 50], clinicalTip: "Metabolizadores ultrarrápidos CYP2D6: EVITAR codeína e tramadol. Risco fatal de depressão respiratória, especialmente em lactantes (morfina passa ao leite)." },
  { title: "Varfarina e CYP2C9/VKORC1", difficulty: "Difícil", patient: { name: "Otávio Gomes", age: 65, weight: 78, diagnosis: "TEP em anticoagulação – metabolizador lento CYP2C9" }, scenario: "Metabolizadores lentos de CYP2C9 têm clearance reduzido de varfarina. Combinado com VKORC1 sensível, a dose necessária pode ser 50-75% menor.", drugType: "farmaco-ativo", enzyme: "CYP2C9", expectedPhenotype: "lento", expectedDoseAdjust: [25, 50], clinicalTip: "Varfarina: genótipos CYP2C9 *2/*3 e VKORC1 -1639G>A explicam ~40% da variabilidade de dose. Algoritmos farmacogenômicos (warfarindosing.org) são mais precisos que dosagem empírica." },
  { title: "Clopidogrel e CYP2C19", difficulty: "Médio", patient: { name: "Renata Torres", age: 58, weight: 70, diagnosis: "Pós-stent coronariano – metabolizador lento CYP2C19" }, scenario: "Clopidogrel é pró-fármaco ativado pelo CYP2C19. Metabolizadores lentos têm menor conversão ao metabólito ativo, com maior risco de trombose de stent.", drugType: "pro-farmaco", enzyme: "CYP2C19", expectedPhenotype: "lento", expectedDoseAdjust: [80, 120], clinicalTip: "CYP2C19 PM: trocar clopidogrel por prasugrel ou ticagrelor (não dependem de ativação CYP). Genotipagem pré-stent é recomendada pelo CPIC." },
];

function generatePGxCurve(dose: number, phenotype: Phenotype, drugType: DrugType) {
  const factor = PHENOTYPE_FACTOR[phenotype];
  const points = [];

  for (let t = 0; t <= 24; t += 0.5) {
    const ka = 2;
    const ke = 0.15 * (drugType === "farmaco-ativo" ? factor : 1);

    let parentDrug, activeMetabolite;
    if (drugType === "pro-farmaco") {
      parentDrug = dose * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
      const km = 0.1 * factor;
      activeMetabolite = dose * factor * (ka / (ka - km)) * (Math.exp(-km * t) - Math.exp(-ka * t));
    } else {
      parentDrug = (dose / factor) * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
      activeMetabolite = 0;
    }

    points.push({
      time: t,
      parentDrug: Math.round(Math.max(0, parentDrug) * 100) / 100,
      activeMetabolite: Math.round(Math.max(0, activeMetabolite) * 100) / 100,
    });
  }
  return points;
}

export default function SimuladorFarmacogenomica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<FGCase | null>(null);
  const [phenotype, setPhenotype] = useState<Phenotype>("extensivo");
  const [dose, setDose] = useState(100);
  const [drugType, setDrugType] = useState<DrugType>("pro-farmaco");
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: cd.id ?? virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, drugType: cd.drugType ?? "pro-farmaco", enzyme: cd.enzyme ?? "CYP2D6", expectedPhenotype: cd.expectedPhenotype ?? "extensivo", expectedDoseAdjust: cd.expectedDoseAdjust ?? [80, 120], clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setPhenotype("extensivo"); setDose(100); setDrugType(activeCase.drugType); } }, [activeCase]);

  const points = useMemo(() => generatePGxCurve(dose, phenotype, drugType), [dose, phenotype, drugType]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const phenOk = phenotype === activeCase.expectedPhenotype;
    const doseOk = dose >= activeCase.expectedDoseAdjust[0] && dose <= activeCase.expectedDoseAdjust[1];
    const s = (phenOk ? 60 : 0) + (doseOk ? 40 : 0);
    setLastScore(s);
    submitResults({ score: s, actions: { phenotype, dose, drugType } });
    return s;
  }, [activeCase, phenotype, dose, drugType, submitted, submitResults]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); const cs = sessionStorage.getItem("challengeScore"); if (cs) setLastScore(Number(cs)); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, drugType: c.drugType ?? "pro-farmaco", enzyme: c.enzyme ?? "CYP2D6", expectedPhenotype: c.expectedPhenotype ?? "extensivo", expectedDoseAdjust: c.expectedDoseAdjust ?? [80, 120], clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Farmacogenômica</h1>
            <p className="text-muted-foreground">Explore o impacto de polimorfismos CYP na farmacocinética de pró-fármacos e fármacos ativos.</p>
            <AdminPromptViewer toolSlug="sim-farmacogenomica" toolName="Farmacogenômica" toolType="simulator" prompt={getNativePrompt("sim-farmacogenomica") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
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
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm"><strong>Enzima:</strong> {activeCase.enzyme}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Genótipo e Dose</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Fenótipo Metabolizador</p>
              {(Object.keys(PHENOTYPE_LABELS) as Phenotype[]).map(p => (<button key={p} onClick={() => setPhenotype(p)} className={`w-full text-left p-2.5 rounded text-sm ${phenotype === p ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{PHENOTYPE_LABELS[p]} (×{PHENOTYPE_FACTOR[p]})</button>))}
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose (%)</label><span className="text-sm font-bold">{dose}%</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={10} max={200} step={5} /></div>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Tipo de Fármaco</p>
              <button onClick={() => setDrugType("pro-farmaco")} className={`w-full text-left p-2 rounded text-sm ${drugType === "pro-farmaco" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>Pró-fármaco (precisa de ativação)</button>
              <button onClick={() => setDrugType("farmaco-ativo")} className={`w-full text-left p-2 rounded text-sm ${drugType === "farmaco-ativo" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>Fármaco ativo (metabolismo = inativação)</button>
            </div>
            
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Perfil Cp×t – {PHENOTYPE_LABELS[phenotype]}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Cp (mg/L)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="parentDrug" name={drugType === "pro-farmaco" ? "Pró-fármaco" : "Fármaco Ativo"} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                {drugType === "pro-farmaco" && <Line type="monotone" dataKey="activeMetabolite" name="Metabólito Ativo" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getFarmacogenomicaChallenges()} simulatorState={{ phenotype, dose, drugType }} onComplete={() => setChallengeCompleted(true)} />
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
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
