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
  "Selecione um caso com indicação de nutrição parenteral.",
  "Em M1, revise a indicação e a contraindicação da via enteral.",
  "Em M2, prescreva a solução parenteral (glicose, aminoácidos, lipídeos).",
  "Em M3, avalie compatibilidade e decida o acesso venoso.",
  "Em M4, ajuste a prescrição diante da alteração laboratorial.",
  "Ao final, revise o feedback e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Fernanda Gomes", age: 45, difficulty: "Difícil",
    scenario: "Íleo paralítico pós-operatório prolongado (> 7 dias). Desnutrida (IMC 17). Acesso venoso central.",
    idealGlucose: "25", idealAA: "10", idealLipid: "20",
    idealAccess: "central",
    idealCompatDrugs: ["ranitidina", "insulina"],
    labAlteration: "Hiperglicemia (glicemia 320 mg/dL)",
    idealLabAction: "reduzir-glicose",
  },
  {
    id: "p2", name: "Antônio Barros", age: 58, difficulty: "Médio",
    scenario: "Fístula entero-cutânea de alto débito. NPO obrigatório. Albumina 2.5, peso 72 kg.",
    idealGlucose: "20", idealAA: "10", idealLipid: "20",
    idealAccess: "central",
    idealCompatDrugs: ["insulina"],
    labAlteration: "Hipertrigliceridemia (TG 450 mg/dL)",
    idealLabAction: "suspender-lipideos",
  },
  {
    id: "p3", name: "Cláudia Neves", age: 32, difficulty: "Fácil",
    scenario: "Pancreatite aguda grave, NPO. Sem acesso central disponível inicialmente. Peso 60 kg.",
    idealGlucose: "10", idealAA: "5", idealLipid: "10",
    idealAccess: "periferico",
    idealCompatDrugs: ["ranitidina"],
    labAlteration: "Hipofosfatemia (P = 1.0 mg/dL)",
    idealLabAction: "repor-fosforo",
  },
];

const GLUCOSE_OPTIONS = ["5", "10", "15", "20", "25", "50"];
const AA_OPTIONS = ["5", "8", "10", "15"];
const LIPID_OPTIONS = ["10", "20", "30"];
const ACCESS_OPTIONS = [
  { value: "periferico", label: "Acesso periférico (osmolaridade < 900 mOsm/L)" },
  { value: "central", label: "Acesso venoso central" },
];
const COMPAT_DRUGS = [
  { id: "ranitidina", label: "Ranitidina" },
  { id: "insulina", label: "Insulina regular" },
  { id: "fenitoina", label: "Fenitoína (incompatível)" },
  { id: "diazepam", label: "Diazepam (incompatível)" },
];
const LAB_ACTION_OPTIONS = [
  { value: "reduzir-glicose", label: "Reduzir concentração de glicose + insulina IV" },
  { value: "suspender-lipideos", label: "Suspender lipídeos e reavaliar TG em 24h" },
  { value: "repor-fosforo", label: "Repor fósforo IV e monitorar eletrólitos" },
  { value: "manter", label: "Manter prescrição inalterada" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a`, difficulty: p.difficulty, patient: { diagnosis: p.scenario } }));

export default function SimuladorTNP() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-tnp") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("tnp", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [glucose, setGlucose] = useState("");
  const [aa, setAa] = useState("");
  const [lipid, setLipid] = useState("");
  const [access, setAccess] = useState("");
  const [compatDrugs, setCompatDrugs] = useState<string[]>([]);
  const [labAction, setLabAction] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const gOk = glucose === patient.idealGlucose; if (gOk) correct++; total++;
    decisions.push({ label: "Glicose %", userChoice: `${glucose}%`, idealChoice: `${patient.idealGlucose}%`, correct: gOk });

    const aOk = aa === patient.idealAA; if (aOk) correct++; total++;
    decisions.push({ label: "Aminoácidos %", userChoice: `${aa}%`, idealChoice: `${patient.idealAA}%`, correct: aOk });

    const lOk = lipid === patient.idealLipid; if (lOk) correct++; total++;
    decisions.push({ label: "Lipídeos %", userChoice: `${lipid}%`, idealChoice: `${patient.idealLipid}%`, correct: lOk });

    const accOk = access === patient.idealAccess; if (accOk) correct++; total++;
    decisions.push({ label: "Acesso Venoso", userChoice: ACCESS_OPTIONS.find(o => o.value === access)?.label || "—", idealChoice: ACCESS_OPTIONS.find(o => o.value === patient.idealAccess)?.label || "—", correct: accOk });

    const idealCompat = new Set(patient.idealCompatDrugs);
    const compOk = compatDrugs.length === patient.idealCompatDrugs.length && compatDrugs.every(d => idealCompat.has(d));
    if (compOk) correct++; total++;
    decisions.push({ label: "Fármacos Compatíveis", userChoice: compatDrugs.map(d => COMPAT_DRUGS.find(c => c.id === d)?.label).join(", ") || "Nenhum", idealChoice: patient.idealCompatDrugs.map(d => COMPAT_DRUGS.find(c => c.id === d)?.label).join(", "), correct: compOk });

    const labOk = labAction === patient.idealLabAction; if (labOk) correct++; total++;
    decisions.push({ label: "Ajuste Laboratorial", userChoice: LAB_ACTION_OPTIONS.find(o => o.value === labAction)?.label || "—", idealChoice: LAB_ACTION_OPTIONS.find(o => o.value === patient.idealLabAction)?.label || "—", correct: labOk });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Prescrição parenteral adequada! ${patient.name} teria aporte nutricional otimizado, com desfecho metabólico favorável.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} poderia ter complicações metabólicas por composição ou ajuste inadequado.`
      : `Prescrição inadequada. ${patient.name} teria alto risco de complicações graves (hiperglicemia, hipertrigliceridemia, sepse de cateter).`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("tnp");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Terapia Nutricional Parenteral (TNP)</h1>
            <p className="text-sm text-muted-foreground">Prescrição, compatibilidade e manejo metabólico</p>
          </div>
          <SimulatorHowToUse title="TNP" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-tnp" toolName="TNP" toolType="simulator" prompt={prompt} />
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
        <div className="flex-1"><h1 className="text-2xl font-bold">Nutrição Parenteral</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Indicação{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && <div className="text-sm bg-muted/50 p-3 rounded-lg"><p><strong>{patient.name}, {patient.age}a</strong></p><p className="mt-1">{patient.scenario}</p></div>}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Prescrição</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Composição{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && (<>
              <div className="space-y-2">
                <label className="text-sm font-medium">Glicose (%):</label>
                <div className="flex flex-wrap gap-2">{GLUCOSE_OPTIONS.map(v => <Button key={v} variant={glucose === v ? "default" : "outline"} size="sm" onClick={() => setGlucose(v)}>{v}%</Button>)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Aminoácidos (%):</label>
                <div className="flex flex-wrap gap-2">{AA_OPTIONS.map(v => <Button key={v} variant={aa === v ? "default" : "outline"} size="sm" onClick={() => setAa(v)}>{v}%</Button>)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lipídeos (%):</label>
                <div className="flex flex-wrap gap-2">{LIPID_OPTIONS.map(v => <Button key={v} variant={lipid === v ? "default" : "outline"} size="sm" onClick={() => setLipid(v)}>{v}%</Button>)}</div>
              </div>
              {glucose && aa && lipid && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Compatibilidade e Acesso{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <p className="text-sm text-muted-foreground">Quais fármacos são compatíveis com a NP em Y?</p>
              {COMPAT_DRUGS.map(d => (
                <label key={d.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={compatDrugs.includes(d.id)} onChange={e => setCompatDrugs(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id))} className="mt-1" />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
              <Select value={access} onValueChange={setAccess}><SelectTrigger><SelectValue placeholder="Acesso venoso" /></SelectTrigger><SelectContent>{ACCESS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {access && compatDrugs.length > 0 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Alteração Laboratorial{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && patient && (<>
              <div className="text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/30"><strong>⚠ Alteração:</strong> {patient.labAlteration}</div>
              <Select value={labAction} onValueChange={setLabAction}><SelectTrigger><SelectValue placeholder="Ajustar prescrição" /></SelectTrigger><SelectContent>{LAB_ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {labAction && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Nutrição Parenteral" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "Composição": `Glic ${glucose}% / AA ${aa}% / Lip ${lipid}%`, "Acesso": ACCESS_OPTIONS.find(o => o.value === access)?.label || "—", "Alteração": patient.labAlteration, "Ajuste": LAB_ACTION_OPTIONS.find(o => o.value === labAction)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
