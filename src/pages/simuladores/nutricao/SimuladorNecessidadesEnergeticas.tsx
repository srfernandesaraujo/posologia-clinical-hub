import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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

const HOW_TO = [
  "Selecione um caso clínico para calcular as necessidades energéticas.",
  "Em M1, revise os dados do paciente e sua condição clínica.",
  "Em M2, escolha a equação preditiva e o GET correto entre as opções.",
  "Em M3, distribua os macronutrientes usando os sliders (PTN + CHO + LIP = 100%).",
  "Em M4, defina o tipo de dieta e o fracionamento.",
  "Ao final, revise o feedback e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Roberto Lima", age: 55, sex: "M", weight: 78, height: 1.75, condition: "Pós-operatório de gastrectomia (3º dia)", difficulty: "Médio",
    idealEquation: "harris-benedict", idealGET: 2200,
    idealPTN: 20, idealCHO: 50, idealLIP: 30,
    idealDiet: "hiperproteica",
    getOptions: [1800, 2200, 2600, 3100],
  },
  {
    id: "p2", name: "Luciana Ferreira", age: 30, sex: "F", weight: 62, height: 1.65, condition: "Queimadura de 35% SCQ — fase aguda", difficulty: "Difícil",
    idealEquation: "harris-benedict", idealGET: 2800,
    idealPTN: 25, idealCHO: 50, idealLIP: 25,
    idealDiet: "hipercalorica",
    getOptions: [2000, 2400, 2800, 3400],
  },
  {
    id: "p3", name: "Seu Manoel", age: 68, sex: "M", weight: 70, height: 1.68, condition: "Sepse abdominal em UTI", difficulty: "Difícil",
    idealEquation: "mifflin", idealGET: 1750,
    idealPTN: 25, idealCHO: 45, idealLIP: 30,
    idealDiet: "hiperproteica",
    getOptions: [1400, 1750, 2100, 2500],
  },
];

const EQUATION_OPTIONS = [
  { value: "harris-benedict", label: "Harris-Benedict (1919)" },
  { value: "mifflin", label: "Mifflin-St Jeor (1990)" },
  { value: "ireton-jones", label: "Ireton-Jones (distrator para queimados)" },
  { value: "penn-state", label: "Penn-State (distrator para UTI)" },
];

const DIET_OPTIONS = [
  { value: "hipercalorica", label: "Hipercalórica" },
  { value: "hiperproteica", label: "Hiperproteica" },
  { value: "hipossodica", label: "Hipossódica" },
  { value: "padrao", label: "Dieta padrão normocalórica" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.condition}`, difficulty: p.difficulty, patient: { diagnosis: p.condition } }));

export default function SimuladorNecessidadesEnergeticas() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-necessidades-energeticas") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("necessidades-energeticas", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [equation, setEquation] = useState("");
  const [selectedGET, setSelectedGET] = useState("");
  const [ptn, setPtn] = useState(20);
  const [cho, setCho] = useState(55);
  const [lip, setLip] = useState(25);
  const [diet, setDiet] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const macroTotal = ptn + cho + lip;

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const eqCorrect = equation === patient.idealEquation;
    if (eqCorrect) correct++;
    total++;
    decisions.push({ label: "Equação Preditiva", userChoice: EQUATION_OPTIONS.find(o => o.value === equation)?.label || "—", idealChoice: EQUATION_OPTIONS.find(o => o.value === patient.idealEquation)?.label || "—", correct: eqCorrect });

    const getCorrect = parseInt(selectedGET) === patient.idealGET;
    if (getCorrect) correct++;
    total++;
    decisions.push({ label: "GET (kcal/dia)", userChoice: selectedGET || "—", idealChoice: `${patient.idealGET}`, correct: getCorrect });

    const ptnOk = Math.abs(ptn - patient.idealPTN) <= 5;
    const choOk = Math.abs(cho - patient.idealCHO) <= 5;
    const lipOk = Math.abs(lip - patient.idealLIP) <= 5;
    const macroCorrect = ptnOk && choOk && lipOk;
    if (macroCorrect) correct++;
    total++;
    decisions.push({ label: "Distribuição Macro (PTN/CHO/LIP)", userChoice: `${ptn}/${cho}/${lip}%`, idealChoice: `${patient.idealPTN}/${patient.idealCHO}/${patient.idealLIP}%`, correct: macroCorrect });

    const dietCorrect = diet === patient.idealDiet;
    if (dietCorrect) correct++;
    total++;
    decisions.push({ label: "Tipo de Dieta", userChoice: DIET_OPTIONS.find(o => o.value === diet)?.label || "—", idealChoice: DIET_OPTIONS.find(o => o.value === patient.idealDiet)?.label || "—", correct: dietCorrect });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Cálculo energético adequado! ${patient.name} receberia aporte calórico-proteico suficiente, com balanço nitrogenado positivo e recuperação otimizada.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} poderia ter déficit ou excesso energético, impactando a recuperação clínica.`
      : `Cálculo inadequado. ${patient.name} teria risco de síndrome de realimentação ou desnutrição proteico-calórica.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Cálculo de Necessidades Energéticas</h1>
            <p className="text-sm text-muted-foreground">Harris-Benedict, Mifflin e distribuição de macronutrientes</p>
          </div>
          <SimulatorHowToUse title="Necessidades Energéticas" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-necessidades-energeticas" toolName="Necessidades Energéticas" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />
          )}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Necessidades Energéticas</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Caso Clínico{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && (
              <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                <p><strong>{patient.name}</strong>, {patient.age}a, {patient.sex}</p>
                <p>Peso: {patient.weight}kg | Altura: {patient.height}m</p>
                <p><strong>Condição:</strong> {patient.condition}</p>
              </div>
            )}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Cálculo</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Equação e GET{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && patient && (<>
              <Select value={equation} onValueChange={setEquation}>
                <SelectTrigger><SelectValue placeholder="Escolher equação preditiva" /></SelectTrigger>
                <SelectContent>{EQUATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {equation && (<>
                <p className="text-sm text-muted-foreground">Qual é o GET (kcal/dia) para este paciente?</p>
                <div className="grid grid-cols-2 gap-2">
                  {patient.getOptions.map(v => (
                    <Button key={v} variant={selectedGET === String(v) ? "default" : "outline"} size="sm" onClick={() => setSelectedGET(String(v))}>{v} kcal</Button>
                  ))}
                </div>
              </>)}
              {selectedGET && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Macronutrientes{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {completedModules.has(2) && (<>
              <p className="text-sm text-muted-foreground">Distribua os macronutrientes (total deve ser 100%):</p>
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Proteínas: {ptn}%</label><Slider value={[ptn]} onValueChange={v => setPtn(v[0])} min={5} max={40} step={1} /></div>
                <div><label className="text-sm font-medium">Carboidratos: {cho}%</label><Slider value={[cho]} onValueChange={v => setCho(v[0])} min={30} max={70} step={1} /></div>
                <div><label className="text-sm font-medium">Lipídeos: {lip}%</label><Slider value={[lip]} onValueChange={v => setLip(v[0])} min={15} max={45} step={1} /></div>
              </div>
              <div className={`text-sm font-semibold text-center p-2 rounded ${macroTotal === 100 ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                Total: {macroTotal}% {macroTotal !== 100 && "(deve ser 100%)"}
              </div>
              {macroTotal === 100 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Distribuição</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Tipo de Dieta{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && (<>
              <Select value={diet} onValueChange={setDiet}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo de dieta" /></SelectTrigger>
                <SelectContent>{DIET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {diet && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Necessidades Energéticas" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "Equação": EQUATION_OPTIONS.find(o => o.value === equation)?.label || "—", "GET": `${selectedGET} kcal/dia`, "Macro": `PTN ${ptn}% / CHO ${cho}% / LIP ${lip}%`, "Dieta": DIET_OPTIONS.find(o => o.value === diet)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
