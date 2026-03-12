import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

const HOW_TO = [
  "Selecione um caso clínico para iniciar a avaliação nutricional.",
  "Em M1, revise os dados antropométricos do paciente.",
  "Em M2, calcule o IMC e classifique o estado nutricional entre as opções.",
  "Em M3, identifique os indicadores de risco metabólico/cardiovascular.",
  "Em M4, defina as metas nutricionais para o paciente.",
  "Ao final, revise o feedback com a projeção de evolução e gere seu relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Maria Silva", age: 52, sex: "F", difficulty: "Médio",
    weight: 89, height: 1.62,
    waist: 102, hip: 110, triceps: 28, subscapular: 22, suprailiac: 30,
    idealBMIClass: "obesidade-i",
    idealRiskIndicators: ["waist", "whRatio"],
    idealGoal: "perda-moderada",
  },
  {
    id: "p2", name: "João Santos", age: 74, sex: "M", difficulty: "Fácil",
    weight: 56, height: 1.70,
    waist: 78, hip: 92, triceps: 8, subscapular: 10, suprailiac: 12,
    idealBMIClass: "desnutricao-leve",
    idealRiskIndicators: ["triceps"],
    idealGoal: "ganho-moderado",
  },
  {
    id: "p3", name: "Ana Oliveira", age: 38, sex: "F", difficulty: "Difícil",
    weight: 120, height: 1.55,
    waist: 118, hip: 125, triceps: 38, subscapular: 34, suprailiac: 42,
    idealBMIClass: "obesidade-iii",
    idealRiskIndicators: ["waist", "whRatio", "bodyFat"],
    idealGoal: "perda-intensa",
  },
];

const BMI_OPTIONS = [
  { value: "desnutricao-grave", label: "Desnutrição Grave (< 16)" },
  { value: "desnutricao-moderada", label: "Desnutrição Moderada (16–16.9)" },
  { value: "desnutricao-leve", label: "Desnutrição Leve (17–18.4)" },
  { value: "eutrofico", label: "Eutrófico (18.5–24.9)" },
  { value: "sobrepeso", label: "Sobrepeso (25–29.9)" },
  { value: "obesidade-i", label: "Obesidade Grau I (30–34.9)" },
  { value: "obesidade-ii", label: "Obesidade Grau II (35–39.9)" },
  { value: "obesidade-iii", label: "Obesidade Grau III (≥ 40)" },
];

const RISK_INDICATORS = [
  { id: "waist", label: "Circunferência Abdominal elevada" },
  { id: "whRatio", label: "Relação Cintura-Quadril elevada" },
  { id: "triceps", label: "Dobra tricipital reduzida (depleção)" },
  { id: "bodyFat", label: "% Gordura corporal acima do recomendado" },
  { id: "subscapular", label: "Dobra subescapular isolada (distrator)" },
  { id: "hip", label: "Circunferência do quadril (distrator)" },
];

const GOAL_OPTIONS = [
  { value: "perda-intensa", label: "Perda intensa (> 10% em 6 meses)" },
  { value: "perda-moderada", label: "Perda moderada (5-10% em 6 meses)" },
  { value: "manutencao", label: "Manutenção do peso atual" },
  { value: "ganho-moderado", label: "Ganho moderado (0.5 kg/semana)" },
  { value: "ganho-rapido", label: "Ganho rápido (1+ kg/semana)" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a, ${p.sex}`, difficulty: p.difficulty, patient: { diagnosis: `Avaliação antropométrica — ${p.weight}kg, ${p.height}m` } }));

export default function SimuladorAvaliacaoNutricional() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-avaliacao-nutricional") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("avaliacao-nutricional", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [bmiClass, setBmiClass] = useState("");
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const bmi = patient ? (patient.weight / (patient.height * patient.height)).toFixed(1) : "—";
  const whRatio = patient ? (patient.waist / patient.hip).toFixed(2) : "—";

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const bmiCorrect = bmiClass === patient.idealBMIClass;
    if (bmiCorrect) correct++;
    total++;
    decisions.push({ label: "Classificação IMC", userChoice: BMI_OPTIONS.find(o => o.value === bmiClass)?.label || "—", idealChoice: BMI_OPTIONS.find(o => o.value === patient.idealBMIClass)?.label || "—", correct: bmiCorrect });

    const idealSet = new Set(patient.idealRiskIndicators);
    const userSet = new Set(selectedRisks);
    const riskCorrect = selectedRisks.length === patient.idealRiskIndicators.length && selectedRisks.every(r => idealSet.has(r));
    if (riskCorrect) correct++;
    total++;
    decisions.push({ label: "Indicadores de Risco", userChoice: selectedRisks.map(r => RISK_INDICATORS.find(i => i.id === r)?.label).join(", ") || "Nenhum", idealChoice: patient.idealRiskIndicators.map(r => RISK_INDICATORS.find(i => i.id === r)?.label).join(", "), correct: riskCorrect });

    const goalCorrect = selectedGoal === patient.idealGoal;
    if (goalCorrect) correct++;
    total++;
    decisions.push({ label: "Meta Nutricional", userChoice: GOAL_OPTIONS.find(o => o.value === selectedGoal)?.label || "—", idealChoice: GOAL_OPTIONS.find(o => o.value === patient.idealGoal)?.label || "—", correct: goalCorrect });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Com a classificação e metas adequadas, ${patient.name} teria acompanhamento nutricional eficaz com evolução favorável em 3-6 meses, atingindo composição corporal saudável.`
      : score >= 50
      ? `A avaliação está parcialmente adequada. ${patient.name} poderia ter atraso na melhora por classificação ou metas imprecisas.`
      : `A avaliação não reflete o estado real do paciente. ${patient.name} teria risco de intervenção inadequada e piora do quadro nutricional.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("avaliacao-nutricional");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Avaliação Nutricional Antropométrica</h1>
            <p className="text-sm text-muted-foreground">IMC, composição corporal e classificação de risco metabólico</p>
          </div>
          <SimulatorHowToUse title="Avaliação Nutricional" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-avaliacao-nutricional" toolName="Avaliação Nutricional" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />
          )}
        </div>
        {isAdmin && !isVR && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);

  const expSummary = patient ? {
    "Paciente": `${patient.name}, ${patient.age}a, ${patient.sex}`,
    "Antropometria": `Peso: ${patient.weight}kg | Altura: ${patient.height}m | IMC: ${bmi} | CA: ${patient.waist}cm | RCQ: ${whRatio}`,
    "Classificação": BMI_OPTIONS.find(o => o.value === bmiClass)?.label || "—",
    "Indicadores de Risco": selectedRisks.map(r => RISK_INDICATORS.find(i => i.id === r)?.label).join(", ") || "Nenhum",
    "Meta": GOAL_OPTIONS.find(o => o.value === selectedGoal)?.label || "—",
    "Pontuação": `${feedback.score}%`,
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setBmiClass(""); setSelectedRisks([]); setSelectedGoal(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Avaliação Nutricional</h1></div>
        <SimulatorHowToUse title="Avaliação Nutricional" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Dados do Paciente{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && (
              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                <p><strong>Paciente:</strong> {patient.name}, {patient.age} anos, {patient.sex}</p>
                <p><strong>Peso:</strong> {patient.weight} kg | <strong>Altura:</strong> {patient.height} m</p>
                <p><strong>CA:</strong> {patient.waist} cm | <strong>CQ:</strong> {patient.hip} cm</p>
                <p><strong>Dobras:</strong> Tricipital: {patient.triceps}mm | Subescapular: {patient.subscapular}mm | Suprailíaca: {patient.suprailiac}mm</p>
              </div>
            )}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — Classificação IMC */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Classificação Nutricional{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && patient && (<>
              <p className="text-sm text-muted-foreground">Com base nos dados antropométricos, calcule o IMC e classifique o estado nutricional:</p>
              <div className="text-sm bg-muted/50 p-2 rounded"><strong>Dados para cálculo:</strong> {patient.weight}kg ÷ ({patient.height}m)² = ?</div>
              <Select value={bmiClass} onValueChange={setBmiClass}>
                <SelectTrigger><SelectValue placeholder="Classificar estado nutricional" /></SelectTrigger>
                <SelectContent>{BMI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {bmiClass && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Classificação</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M3 — Indicadores de Risco */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Indicadores de Risco{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && patient && (<>
              <p className="text-sm text-muted-foreground">Selecione os indicadores de risco cardiovascular/metabólico relevantes:</p>
              <div className="text-sm bg-muted/50 p-2 rounded"><strong>RCQ:</strong> {whRatio} | <strong>CA:</strong> {patient.waist}cm</div>
              {RISK_INDICATORS.map(ri => (
                <label key={ri.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedRisks.includes(ri.id)} onChange={e => setSelectedRisks(prev => e.target.checked ? [...prev, ri.id] : prev.filter(x => x !== ri.id))} className="mt-1" />
                  <span className="text-sm">{ri.label}</span>
                </label>
              ))}
              {selectedRisks.length > 0 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Indicadores</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 — Metas */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Metas Nutricionais{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && (<>
              <p className="text-sm text-muted-foreground">Defina a meta de intervenção nutricional:</p>
              <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                <SelectTrigger><SelectValue placeholder="Selecionar meta" /></SelectTrigger>
                <SelectContent>{GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {selectedGoal && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar Meta</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Avaliação Nutricional Antropométrica" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} isVirtualRoom={isVR} onVRSubmit={handleVRSubmit} vrSubmitted={submitted} />
    </div>
  );
}
