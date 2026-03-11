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
  "Selecione um caso clínico para iniciar a triagem nutricional.",
  "Em M1, revise os dados de admissão do paciente.",
  "Em M2, aplique a ferramenta de triagem pontuando cada critério.",
  "Em M3, classifique o risco nutricional e decida a conduta.",
  "Em M4, selecione a via de alimentação adequada.",
  "Ao final, revise o feedback clínico e gere o relatório.",
];

interface NRS2002Score { nutritional: number; severity: number; ageBonus: number; }

const PATIENTS = [
  {
    id: "p1", name: "Dona Antônia", age: 78, difficulty: "Médio",
    admission: "Fratura de fêmur, cirurgia há 3 dias. IMC 19.5, perda de 8% do peso em 3 meses. Aceitação alimentar < 50%.",
    nrsIdeal: { nutritional: 2, severity: 2, ageBonus: 1 } as NRS2002Score,
    idealRiskClass: "alto-risco",
    idealConduct: "tn-precoce",
    idealRoute: "sne",
  },
  {
    id: "p2", name: "Carlos Mendes", age: 45, difficulty: "Fácil",
    admission: "Apendicectomia eletiva. IMC 26, sem perda de peso. Aceitação alimentar > 75%.",
    nrsIdeal: { nutritional: 0, severity: 1, ageBonus: 0 } as NRS2002Score,
    idealRiskClass: "sem-risco",
    idealConduct: "monitorar",
    idealRoute: "oral",
  },
  {
    id: "p3", name: "Helena Rocha", age: 82, difficulty: "Difícil",
    admission: "Pneumonia grave em UTI, intubada. IMC 17.2, albumina 2.1 g/dL, perda > 15% em 6 meses.",
    nrsIdeal: { nutritional: 3, severity: 3, ageBonus: 1 } as NRS2002Score,
    idealRiskClass: "alto-risco",
    idealConduct: "tn-precoce",
    idealRoute: "sne",
  },
];

const RISK_OPTIONS = [
  { value: "sem-risco", label: "Sem risco (NRS < 3)" },
  { value: "em-risco", label: "Em risco (NRS = 3)" },
  { value: "alto-risco", label: "Alto risco (NRS ≥ 4)" },
];
const CONDUCT_OPTIONS = [
  { value: "monitorar", label: "Monitorar e reavaliar em 7 dias" },
  { value: "plano-nutricional", label: "Iniciar plano nutricional oral" },
  { value: "tn-precoce", label: "Terapia Nutricional precoce (< 48h)" },
];
const ROUTE_OPTIONS = [
  { value: "oral", label: "Via oral exclusiva" },
  { value: "sng", label: "Sonda Nasogástrica (SNG)" },
  { value: "sne", label: "Sonda Nasoentérica (SNE)" },
  { value: "snj", label: "Sonda Nasojejunal (SNJ)" },
  { value: "npt", label: "Nutrição Parenteral Total (NPT)" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a`, difficulty: p.difficulty, patient: { diagnosis: p.admission } }));

export default function SimuladorTriagemNutricional() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-triagem-nutricional") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("triagem-nutricional", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [nrsNutritional, setNrsNutritional] = useState("");
  const [nrsSeverity, setNrsSeverity] = useState("");
  const [nrsAge, setNrsAge] = useState("");
  const [riskClass, setRiskClass] = useState("");
  const [conduct, setConduct] = useState("");
  const [route, setRoute] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const userNRSTotal = (parseInt(nrsNutritional) || 0) + (parseInt(nrsSeverity) || 0) + (parseInt(nrsAge) || 0);

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const idealTotal = patient.nrsIdeal.nutritional + patient.nrsIdeal.severity + patient.nrsIdeal.ageBonus;
    const nrsCorrect = userNRSTotal === idealTotal;
    if (nrsCorrect) correct++;
    total++;
    decisions.push({ label: "Score NRS-2002", userChoice: `${userNRSTotal} (N:${nrsNutritional} S:${nrsSeverity} I:${nrsAge})`, idealChoice: `${idealTotal} (N:${patient.nrsIdeal.nutritional} S:${patient.nrsIdeal.severity} I:${patient.nrsIdeal.ageBonus})`, correct: nrsCorrect });

    const riskCorrect = riskClass === patient.idealRiskClass;
    if (riskCorrect) correct++;
    total++;
    decisions.push({ label: "Classificação de Risco", userChoice: RISK_OPTIONS.find(o => o.value === riskClass)?.label || "—", idealChoice: RISK_OPTIONS.find(o => o.value === patient.idealRiskClass)?.label || "—", correct: riskCorrect });

    const conductCorrect = conduct === patient.idealConduct;
    if (conductCorrect) correct++;
    total++;
    decisions.push({ label: "Conduta", userChoice: CONDUCT_OPTIONS.find(o => o.value === conduct)?.label || "—", idealChoice: CONDUCT_OPTIONS.find(o => o.value === patient.idealConduct)?.label || "—", correct: conductCorrect });

    const routeCorrect = route === patient.idealRoute;
    if (routeCorrect) correct++;
    total++;
    decisions.push({ label: "Via de Alimentação", userChoice: ROUTE_OPTIONS.find(o => o.value === route)?.label || "—", idealChoice: ROUTE_OPTIONS.find(o => o.value === patient.idealRoute)?.label || "—", correct: routeCorrect });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Triagem adequada! ${patient.name} receberia intervenção nutricional oportuna, reduzindo risco de complicações hospitalares e tempo de internação.`
      : score >= 50
      ? `Triagem parcial. ${patient.name} poderia ter atraso na intervenção nutricional, com risco de deterioração clínica.`
      : `Triagem inadequada. ${patient.name} estaria em risco de desnutrição hospitalar não detectada, com aumento de morbimortalidade.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("triagem-nutricional");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Triagem Nutricional (NRS-2002)</h1>
            <p className="text-sm text-muted-foreground">Aplicação de ferramentas de triagem e decisão de conduta nutricional</p>
          </div>
          <SimulatorHowToUse title="Triagem Nutricional" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-triagem-nutricional" toolName="Triagem Nutricional" toolType="simulator" prompt={prompt} />
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
        <div className="flex-1"><h1 className="text-2xl font-bold">Triagem Nutricional</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Dados de Admissão{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && <div className="text-sm bg-muted/50 p-3 rounded-lg"><p><strong>{patient.name}, {patient.age}a</strong></p><p className="mt-1">{patient.admission}</p></div>}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Triagem</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Pontuação NRS-2002{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && (<>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado Nutricional (0-3):</label>
                <Select value={nrsNutritional} onValueChange={setNrsNutritional}>
                  <SelectTrigger><SelectValue placeholder="Pontuar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 — Normal</SelectItem>
                    <SelectItem value="1">{"1 — Perda > 5% em 3m ou ingestão 50-75%"}</SelectItem>
                    <SelectItem value="2">{"2 — Perda > 5% em 2m ou IMC 18.5-20.5 + estado geral"}</SelectItem>
                    <SelectItem value="3">{"3 — Perda > 5% em 1m ou IMC < 18.5 + estado geral"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gravidade da Doença (0-3):</label>
                <Select value={nrsSeverity} onValueChange={setNrsSeverity}>
                  <SelectTrigger><SelectValue placeholder="Pontuar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 — Necessidades normais</SelectItem>
                    <SelectItem value="1">1 — Fratura de quadril, crônico com complicação</SelectItem>
                    <SelectItem value="2">2 — Cirurgia abdominal grande, AVC, pneumonia</SelectItem>
                    <SelectItem value="3">{"3 — TCE, transplante, UTI (APACHE > 10)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Idade ≥ 70 anos?</label>
                <Select value={nrsAge} onValueChange={setNrsAge}>
                  <SelectTrigger><SelectValue placeholder="Pontuar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 — Não</SelectItem>
                    <SelectItem value="1">1 — Sim (≥ 70 anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {nrsNutritional && nrsSeverity && nrsAge && (
                <div className="text-sm font-semibold bg-primary/10 p-2 rounded text-center">Score Total: {userNRSTotal}</div>
              )}
              {nrsNutritional && nrsSeverity && nrsAge && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Pontuação</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Classificação e Conduta{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <Select value={riskClass} onValueChange={setRiskClass}>
                <SelectTrigger><SelectValue placeholder="Classificar risco" /></SelectTrigger>
                <SelectContent>{RISK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={conduct} onValueChange={setConduct}>
                <SelectTrigger><SelectValue placeholder="Definir conduta" /></SelectTrigger>
                <SelectContent>{CONDUCT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {riskClass && conduct && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Via de Alimentação{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && (<>
              <p className="text-sm text-muted-foreground">Com base na condição clínica e risco nutricional, selecione a via de alimentação:</p>
              <Select value={route} onValueChange={setRoute}>
                <SelectTrigger><SelectValue placeholder="Selecionar via" /></SelectTrigger>
                <SelectContent>{ROUTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {route && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Triagem Nutricional" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "NRS-2002": `${userNRSTotal}`, "Risco": RISK_OPTIONS.find(o => o.value === riskClass)?.label || "—", "Conduta": CONDUCT_OPTIONS.find(o => o.value === conduct)?.label || "—", "Via": ROUTE_OPTIONS.find(o => o.value === route)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
