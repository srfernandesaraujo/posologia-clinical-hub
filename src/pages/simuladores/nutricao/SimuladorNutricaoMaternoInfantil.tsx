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
  "Selecione um caso de gestante para avaliação nutricional.",
  "Em M1, revise os dados obstétricos e antropométricos.",
  "Em M2, classifique o estado nutricional pela curva de Atalah e defina o ganho de peso recomendado.",
  "Em M3, prescreva a suplementação com doses corretas para cada nutriente.",
  "Em M4, ajuste a dieta diante da intercorrência gestacional.",
  "Ao final, revise o feedback e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Juliana Martins", age: 28, difficulty: "Médio",
    ig: 24, imcPreGest: 22.5, currentWeight: 68, preWeight: 60, height: 1.63,
    labs: "Hb 11.2 g/dL, glicemia jejum 88 mg/dL, ferritina 18 ng/mL",
    idealAtalah: "adequado", idealGainRange: "11.5-16",
    idealSupplements: { acidoFolico: "400", ferro: "40", calcio: "nao", vitD: "nao", omega3: "nao" },
    complication: "Anemia ferropriva (Hb 9.8 g/dL na 28ª semana)",
    idealCompAction: "aumentar-ferro",
  },
  {
    id: "p2", name: "Patrícia Souza", age: 35, difficulty: "Difícil",
    ig: 30, imcPreGest: 31.2, currentWeight: 92, preWeight: 85, height: 1.65,
    labs: "Hb 12.0, glicemia jejum 102 mg/dL, TOTG 75g 2h: 162 mg/dL, HbA1c 6.1%",
    idealAtalah: "sobrepeso", idealGainRange: "7-11.5",
    idealSupplements: { acidoFolico: "400", ferro: "40", calcio: "1000", vitD: "600", omega3: "nao" },
    complication: "Diabetes Gestacional (DMG) diagnosticado",
    idealCompAction: "dieta-dmg",
  },
  {
    id: "p3", name: "Amanda Reis", age: 19, difficulty: "Fácil",
    ig: 12, imcPreGest: 18.0, currentWeight: 48, preWeight: 47, height: 1.62,
    labs: "Hb 13.0, glicemia jejum 78 mg/dL, ferritina 35 ng/mL",
    idealAtalah: "baixo-peso", idealGainRange: "12.5-18",
    idealSupplements: { acidoFolico: "400", ferro: "40", calcio: "nao", vitD: "nao", omega3: "nao" },
    complication: "Pré-eclâmpsia leve (PA 150/95, proteinúria +)",
    idealCompAction: "restringir-sodio",
  },
];

const ATALAH_OPTIONS = [
  { value: "baixo-peso", label: "Baixo peso" },
  { value: "adequado", label: "Adequado" },
  { value: "sobrepeso", label: "Sobrepeso" },
  { value: "obesidade", label: "Obesidade" },
];
const GAIN_OPTIONS = [
  { value: "5-9", label: "5-9 kg (obesidade)" },
  { value: "7-11.5", label: "7-11.5 kg (sobrepeso)" },
  { value: "11.5-16", label: "11.5-16 kg (adequado)" },
  { value: "12.5-18", label: "12.5-18 kg (baixo peso)" },
];
const FOLICO_OPTIONS = [
  { value: "400", label: "400 µg/dia" },
  { value: "800", label: "800 µg/dia" },
  { value: "5000", label: "5 mg/dia (alto risco)" },
];
const FERRO_OPTIONS = [
  { value: "40", label: "40 mg Fe elementar/dia" },
  { value: "60", label: "60 mg Fe elementar/dia" },
  { value: "120", label: "120 mg Fe elementar/dia (terapêutico)" },
];
const SN_OPTIONS = [
  { value: "nao", label: "Não indicado" },
  { value: "600", label: "600 UI/dia" },
  { value: "1000", label: "1000 mg/dia" },
  { value: "200", label: "200 mg DHA/dia" },
];
const COMP_OPTIONS = [
  { value: "aumentar-ferro", label: "Aumentar dose de ferro para terapêutico (120 mg)" },
  { value: "dieta-dmg", label: "Dieta fracionada para DMG (6 refeições, CHO complexo)" },
  { value: "restringir-sodio", label: "Restrição de Na (< 2g/dia) + aumentar Ca e Mg" },
  { value: "manter", label: "Manter conduta inalterada" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — IG ${p.ig}sem`, difficulty: p.difficulty, patient: { diagnosis: `Gestante ${p.ig}sem, IMC pré-gestacional ${p.imcPreGest}` } }));

export default function SimuladorNutricaoMaternoInfantil() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-nutricao-materno-infantil") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("nutricao-materno-infantil", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [atalah, setAtalah] = useState("");
  const [gainRange, setGainRange] = useState("");
  const [folico, setFolico] = useState("");
  const [ferro, setFerro] = useState("");
  const [calcio, setCalcio] = useState("");
  const [vitD, setVitD] = useState("");
  const [omega3, setOmega3] = useState("");
  const [compAction, setCompAction] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const atalahOk = atalah === patient.idealAtalah; if (atalahOk) correct++; total++;
    decisions.push({ label: "Classificação Atalah", userChoice: ATALAH_OPTIONS.find(o => o.value === atalah)?.label || "—", idealChoice: ATALAH_OPTIONS.find(o => o.value === patient.idealAtalah)?.label || "—", correct: atalahOk });

    const gainOk = gainRange === patient.idealGainRange; if (gainOk) correct++; total++;
    decisions.push({ label: "Ganho de Peso Recomendado", userChoice: GAIN_OPTIONS.find(o => o.value === gainRange)?.label || "—", idealChoice: GAIN_OPTIONS.find(o => o.value === patient.idealGainRange)?.label || "—", correct: gainOk });

    const suppChecks: [string, string, string][] = [
      ["Ácido Fólico", folico, patient.idealSupplements.acidoFolico],
      ["Ferro", ferro, patient.idealSupplements.ferro],
      ["Cálcio", calcio, patient.idealSupplements.calcio],
      ["Vitamina D", vitD, patient.idealSupplements.vitD],
      ["Ômega-3", omega3, patient.idealSupplements.omega3],
    ];
    suppChecks.forEach(([label, user, ideal]) => {
      const ok = user === ideal; if (ok) correct++; total++;
      decisions.push({ label: `Supl. ${label}`, userChoice: user || "—", idealChoice: ideal || "—", correct: ok });
    });

    const compOk = compAction === patient.idealCompAction; if (compOk) correct++; total++;
    decisions.push({ label: "Manejo da Intercorrência", userChoice: COMP_OPTIONS.find(o => o.value === compAction)?.label || "—", idealChoice: COMP_OPTIONS.find(o => o.value === patient.idealCompAction)?.label || "—", correct: compOk });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Excelente! ${patient.name} teria ganho de peso adequado, suplementação correta e desfecho materno-fetal favorável.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} poderia ter inadequação nutricional com risco moderado de complicações.`
      : `Condutas inadequadas. ${patient.name} teria risco aumentado de macrossomia, anemia ou complicações gestacionais.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("nutricao-materno-infantil");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Nutrição Materno-Infantil</h1>
            <p className="text-sm text-muted-foreground">Avaliação nutricional na gestação, curva de Atalah e suplementação</p>
          </div>
          <SimulatorHowToUse title="Nutrição Materno-Infantil" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-nutricao-materno-infantil" toolName="Nutrição Materno-Infantil" toolType="simulator" prompt={prompt} />
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

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Nutrição Materno-Infantil</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Dados Obstétricos{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && (<div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
              <p><strong>{patient.name}</strong>, {patient.age}a — IG: {patient.ig} semanas</p>
              <p>IMC pré-gestacional: {patient.imcPreGest} | Peso atual: {patient.currentWeight}kg (pré: {patient.preWeight}kg)</p>
              <p>Altura: {patient.height}m</p>
              <p><strong>Exames:</strong> {patient.labs}</p>
            </div>)}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Atalah e Ganho de Peso{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && (<>
              <Select value={atalah} onValueChange={setAtalah}><SelectTrigger><SelectValue placeholder="Classificação Atalah" /></SelectTrigger><SelectContent>{ATALAH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={gainRange} onValueChange={setGainRange}><SelectTrigger><SelectValue placeholder="Faixa de ganho de peso" /></SelectTrigger><SelectContent>{GAIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {atalah && gainRange && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Suplementação{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <Select value={folico} onValueChange={setFolico}><SelectTrigger><SelectValue placeholder="Ácido Fólico" /></SelectTrigger><SelectContent>{FOLICO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={ferro} onValueChange={setFerro}><SelectTrigger><SelectValue placeholder="Ferro" /></SelectTrigger><SelectContent>{FERRO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={calcio} onValueChange={setCalcio}><SelectTrigger><SelectValue placeholder="Cálcio" /></SelectTrigger><SelectContent>{SN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={vitD} onValueChange={setVitD}><SelectTrigger><SelectValue placeholder="Vitamina D" /></SelectTrigger><SelectContent>{SN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={omega3} onValueChange={setOmega3}><SelectTrigger><SelectValue placeholder="Ômega-3" /></SelectTrigger><SelectContent>{SN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {folico && ferro && calcio && vitD && omega3 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Intercorrência{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && patient && (<>
              <div className="text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/30"><strong>⚠ Intercorrência:</strong> {patient.complication}</div>
              <Select value={compAction} onValueChange={setCompAction}><SelectTrigger><SelectValue placeholder="Conduta" /></SelectTrigger><SelectContent>{COMP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {compAction && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Nutrição Materno-Infantil" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a — IG ${patient.ig}sem`, "Atalah": ATALAH_OPTIONS.find(o => o.value === atalah)?.label || "—", "Ganho": GAIN_OPTIONS.find(o => o.value === gainRange)?.label || "—", "Intercorrência": patient.complication, "Conduta": COMP_OPTIONS.find(o => o.value === compAction)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
