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
  "Selecione um caso clínico de paciente com indicação de suporte enteral.",
  "Em M1, revise os dados do paciente e a indicação da TNE.",
  "Em M2, escolha a fórmula enteral e a via de acesso.",
  "Em M3, selecione o protocolo de progressão e o volume/velocidade.",
  "Em M4, maneje a complicação apresentada pelo sistema.",
  "Ao final, revise o feedback clínico e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "José Almeida", age: 62, difficulty: "Médio",
    scenario: "Pós-AVC isquêmico extenso, disfagia grave. NRS-2002 = 5. Trato GI íntegro.",
    idealFormula: "polimerica", idealVia: "sne", idealProtocol: "progressao-lenta",
    complication: "Resíduo gástrico alto (350 mL)",
    idealComplicationAction: "procinético",
  },
  {
    id: "p2", name: "Mariana Costa", age: 34, difficulty: "Fácil",
    scenario: "Pós-operatório de pancreatectomia parcial, realimentação enteral. IMC 22, sem desnutrição prévia.",
    idealFormula: "oligomerica", idealVia: "snj", idealProtocol: "progressao-padrao",
    complication: "Diarreia osmótica (> 3 episódios/dia)",
    idealComplicationAction: "reduzir-velocidade",
  },
  {
    id: "p3", name: "Edson Ribeiro", age: 78, difficulty: "Difícil",
    scenario: "UTI, pneumonia aspirativa com VM. Desnutrido grave (IMC 16.5, albumina 2.0). Alto risco de síndrome de realimentação.",
    idealFormula: "especializada", idealVia: "sne", idealProtocol: "progressao-lenta",
    complication: "Hipofosfatemia grave (P = 1.2 mg/dL) — Síndrome de realimentação",
    idealComplicationAction: "repor-fosforo",
  },
];

const FORMULA_OPTIONS = [
  { value: "polimerica", label: "Polimérica padrão (1.0-1.5 kcal/mL)" },
  { value: "oligomerica", label: "Oligomérica / Semi-elementar" },
  { value: "elementar", label: "Elementar (aminoácidos livres)" },
  { value: "especializada", label: "Especializada (renal/hepática/imuno)" },
];
const VIA_OPTIONS = [
  { value: "sng", label: "SNG (Nasogástrica)" },
  { value: "sne", label: "SNE (Nasoentérica)" },
  { value: "snj", label: "SNJ (Nasojejunal)" },
  { value: "gastrostomia", label: "Gastrostomia" },
];
const PROTOCOL_OPTIONS = [
  { value: "progressao-rapida", label: "Rápida (meta em 24-48h)" },
  { value: "progressao-padrao", label: "Padrão (meta em 48-72h)" },
  { value: "progressao-lenta", label: "Lenta (meta em 72-96h, risco de realimentação)" },
  { value: "bolus", label: "Bolus intermitente" },
];
const COMPLICATION_OPTIONS = [
  { value: "procinético", label: "Iniciar procinético (metoclopramida) e reavaliar" },
  { value: "reduzir-velocidade", label: "Reduzir velocidade de infusão e trocar fórmula" },
  { value: "suspender", label: "Suspender dieta e trocar para NPT" },
  { value: "repor-fosforo", label: "Repor fósforo IV e reduzir oferta calórica" },
  { value: "trocar-sonda", label: "Trocar a sonda por obstrução" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a`, difficulty: p.difficulty, patient: { diagnosis: p.scenario } }));

export default function SimuladorTNE() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-tne") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("tne", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [formula, setFormula] = useState("");
  const [via, setVia] = useState("");
  const [protocol, setProtocol] = useState("");
  const [compAction, setCompAction] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const items: [string, string, string, string][] = [
      ["Fórmula Enteral", formula, patient.idealFormula, "formula"],
      ["Via de Acesso", via, patient.idealVia, "via"],
      ["Protocolo de Progressão", protocol, patient.idealProtocol, "protocol"],
      ["Manejo da Complicação", compAction, patient.idealComplicationAction, "comp"],
    ];
    const optMaps: Record<string, any[]> = { formula: FORMULA_OPTIONS, via: VIA_OPTIONS, protocol: PROTOCOL_OPTIONS, comp: COMPLICATION_OPTIONS };

    items.forEach(([label, user, ideal, key]) => {
      const isCorrect = user === ideal;
      if (isCorrect) correct++;
      total++;
      const opts = optMaps[key];
      decisions.push({ label, userChoice: opts.find((o: any) => o.value === user)?.label || "—", idealChoice: opts.find((o: any) => o.value === ideal)?.label || "—", correct: isCorrect });
    });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Excelente! ${patient.name} atingiria a meta calórica em tempo adequado, com complicações bem manejadas e evolução nutricional favorável.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} teria atraso no alcance da meta ou manejo subótimo de complicações.`
      : `Condutas inadequadas. ${patient.name} teria risco de complicações graves (broncoaspiração, realimentação, desnutrição progressiva).`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("tne");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Terapia Nutricional Enteral (TNE)</h1>
            <p className="text-sm text-muted-foreground">Fórmulas enterais, vias de acesso e manejo de complicações</p>
          </div>
          <SimulatorHowToUse title="TNE" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-tne" toolName="TNE" toolType="simulator" prompt={prompt} />
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
        <div className="flex-1"><h1 className="text-2xl font-bold">Terapia Nutricional Enteral</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Caso Clínico{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && <div className="text-sm bg-muted/50 p-3 rounded-lg"><p><strong>{patient.name}, {patient.age}a</strong></p><p className="mt-1">{patient.scenario}</p></div>}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Fórmula e Via{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && (<>
              <Select value={formula} onValueChange={setFormula}><SelectTrigger><SelectValue placeholder="Escolher fórmula" /></SelectTrigger><SelectContent>{FORMULA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={via} onValueChange={setVia}><SelectTrigger><SelectValue placeholder="Escolher via" /></SelectTrigger><SelectContent>{VIA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {formula && via && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Progressão{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <p className="text-sm text-muted-foreground">Selecione o protocolo de progressão da dieta enteral:</p>
              <Select value={protocol} onValueChange={setProtocol}><SelectTrigger><SelectValue placeholder="Protocolo" /></SelectTrigger><SelectContent>{PROTOCOL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {protocol && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Complicação{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && patient && (<>
              <div className="text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/30"><strong>⚠ Complicação:</strong> {patient.complication}</div>
              <Select value={compAction} onValueChange={setCompAction}><SelectTrigger><SelectValue placeholder="Conduta" /></SelectTrigger><SelectContent>{COMPLICATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {compAction && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Terapia Nutricional Enteral" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "Fórmula": FORMULA_OPTIONS.find(o => o.value === formula)?.label || "—", "Via": VIA_OPTIONS.find(o => o.value === via)?.label || "—", "Protocolo": PROTOCOL_OPTIONS.find(o => o.value === protocol)?.label || "—", "Complicação": patient.complication, "Conduta": COMPLICATION_OPTIONS.find(o => o.value === compAction)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} isVirtualRoom={isVR} onVRSubmit={handleVRSubmit} vrSubmitted={submitted} />
    </div>
  );
}
