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
  "Selecione um caso de paciente com suspeita de disfagia.",
  "Em M1, revise os dados clínicos e a queixa funcional.",
  "Em M2, escolha os testes de avaliação à beira-leito para aplicar.",
  "Em M3, classifique o grau de disfagia (FOIS) e defina a consistência alimentar.",
  "Em M4, selecione as estratégias compensatórias e exames complementares.",
  "Ao final, revise o feedback e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Dona Rosa", age: 76, difficulty: "Médio",
    scenario: "Pós-AVC isquêmico (7 dias). Queixa de engasgos com líquidos. Voz úmida após deglutição.",
    idealTests: ["agua", "ausculta"],
    testResults: { agua: "Tosse após 5 mL de água. Voz úmida.", ausculta: "Ruídos deglutitórios prolongados com componente aspirativo.", oximetria: "Queda de SpO2 de 96% para 91% durante teste." },
    idealFOIS: "5", idealConsistency: "nectar",
    idealStrategies: ["queixo", "espessamento"],
    idealExam: "videofluoroscopia",
  },
  {
    id: "p2", name: "Seu Jorge", age: 82, difficulty: "Difícil",
    scenario: "Parkinson avançado (Hoehn-Yahr IV). Pneumonia aspirativa recorrente. Perda ponderal 12% em 6m.",
    idealTests: ["agua", "ausculta", "oximetria"],
    testResults: { agua: "Engasgo imediato com 3 mL. Tosse ineficaz.", ausculta: "Deglutição ineficiente com múltiplas tentativas.", oximetria: "Dessaturação para 87%." },
    idealFOIS: "2", idealConsistency: "pudim",
    idealStrategies: ["queixo", "supraglotica", "espessamento"],
    idealExam: "nasofibro",
  },
  {
    id: "p3", name: "Ana Paula", age: 55, difficulty: "Fácil",
    scenario: "Tireoidectomia total há 5 dias. Dificuldade leve para engolir comprimidos grandes. Sem engasgos com líquidos.",
    idealTests: ["agua"],
    testResults: { agua: "Sem tosse, sem engasgo. Deglutição adequada.", ausculta: "Normal, sem ruídos aspirativos.", oximetria: "SpO2 estável em 98%." },
    idealFOIS: "6", idealConsistency: "macio",
    idealStrategies: ["espessamento"],
    idealExam: "nenhum",
  },
];

const TEST_OPTIONS = [
  { id: "agua", label: "Teste de água (3-5 mL)" },
  { id: "ausculta", label: "Ausculta cervical" },
  { id: "oximetria", label: "Oximetria durante deglutição" },
  { id: "palpacao", label: "Palpação laríngea (distrator)" },
];
const FOIS_OPTIONS = [
  { value: "1", label: "FOIS 1 — Nada por via oral" },
  { value: "2", label: "FOIS 2 — Dependente de via alternativa, mínimo VO" },
  { value: "3", label: "FOIS 3 — Dependente de via alternativa, VO suplementar" },
  { value: "4", label: "FOIS 4 — VO exclusiva, uma consistência" },
  { value: "5", label: "FOIS 5 — VO exclusiva, múltiplas consistências com preparo especial" },
  { value: "6", label: "FOIS 6 — VO exclusiva sem preparo, com restrições" },
  { value: "7", label: "FOIS 7 — VO exclusiva, sem restrições" },
];
const CONSISTENCY_OPTIONS = [
  { value: "liquido-fino", label: "Líquido fino" },
  { value: "nectar", label: "Néctar (levemente espessado)" },
  { value: "mel", label: "Mel (moderadamente espessado)" },
  { value: "pudim", label: "Pudim (extremamente espessado)" },
  { value: "macio", label: "Sólido macio" },
];
const STRATEGY_OPTIONS = [
  { id: "queixo", label: "Postura de queixo rebaixado (chin tuck)" },
  { id: "supraglotica", label: "Deglutição supraglótica" },
  { id: "espessamento", label: "Espessamento de líquidos" },
  { id: "multipla", label: "Deglutição múltipla (distrator)" },
];
const EXAM_OPTIONS = [
  { value: "videofluoroscopia", label: "Videofluoroscopia da deglutição" },
  { value: "nasofibro", label: "Nasofibrolaringoscopia (FEES)" },
  { value: "nenhum", label: "Nenhum exame complementar necessário" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a`, difficulty: p.difficulty, patient: { diagnosis: p.scenario } }));

export default function SimuladorDisfagia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-disfagia") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("disfagia", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [revealedResults, setRevealedResults] = useState<string[]>([]);
  const [fois, setFois] = useState("");
  const [consistency, setConsistency] = useState("");
  const [strategies, setStrategies] = useState<string[]>([]);
  const [exam, setExam] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const applyTests = () => {
    if (!patient) return;
    setRevealedResults(selectedTests);
  };

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const idealTestSet = new Set(patient.idealTests);
    const testOk = selectedTests.length === patient.idealTests.length && selectedTests.every(t => idealTestSet.has(t));
    if (testOk) correct++; total++;
    decisions.push({ label: "Testes Aplicados", userChoice: selectedTests.map(t => TEST_OPTIONS.find(o => o.id === t)?.label).join(", ") || "—", idealChoice: patient.idealTests.map(t => TEST_OPTIONS.find(o => o.id === t)?.label).join(", "), correct: testOk });

    const foisOk = fois === patient.idealFOIS; if (foisOk) correct++; total++;
    decisions.push({ label: "Classificação FOIS", userChoice: FOIS_OPTIONS.find(o => o.value === fois)?.label || "—", idealChoice: FOIS_OPTIONS.find(o => o.value === patient.idealFOIS)?.label || "—", correct: foisOk });

    const consOk = consistency === patient.idealConsistency; if (consOk) correct++; total++;
    decisions.push({ label: "Consistência Alimentar", userChoice: CONSISTENCY_OPTIONS.find(o => o.value === consistency)?.label || "—", idealChoice: CONSISTENCY_OPTIONS.find(o => o.value === patient.idealConsistency)?.label || "—", correct: consOk });

    const idealStratSet = new Set(patient.idealStrategies);
    const stratOk = strategies.length === patient.idealStrategies.length && strategies.every(s => idealStratSet.has(s));
    if (stratOk) correct++; total++;
    decisions.push({ label: "Estratégias Compensatórias", userChoice: strategies.map(s => STRATEGY_OPTIONS.find(o => o.id === s)?.label).join(", ") || "—", idealChoice: patient.idealStrategies.map(s => STRATEGY_OPTIONS.find(o => o.id === s)?.label).join(", "), correct: stratOk });

    const examOk = exam === patient.idealExam; if (examOk) correct++; total++;
    decisions.push({ label: "Exame Complementar", userChoice: EXAM_OPTIONS.find(o => o.value === exam)?.label || "—", idealChoice: EXAM_OPTIONS.find(o => o.value === patient.idealExam)?.label || "—", correct: examOk });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Avaliação adequada! ${patient.name} teria risco de broncoaspiração minimizado com a consistência e estratégias corretas.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} poderia ter episódios de aspiração por inadequação da consistência ou falta de estratégia compensatória.`
      : `Avaliação inadequada. ${patient.name} teria alto risco de pneumonia aspirativa e deterioração nutricional.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("disfagia");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Avaliação e Conduta em Disfagia</h1>
            <p className="text-sm text-muted-foreground">Testes à beira-leito, FOIS e manejo de consistências</p>
          </div>
          <SimulatorHowToUse title="Disfagia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-disfagia" toolName="Disfagia" toolType="simulator" prompt={prompt} />
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
        <div className="flex-1"><h1 className="text-2xl font-bold">Avaliação de Disfagia</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Caso Clínico{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && <div className="text-sm bg-muted/50 p-3 rounded-lg"><p><strong>{patient.name}, {patient.age}a</strong></p><p className="mt-1">{patient.scenario}</p></div>}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Testes à Beira-Leito{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && patient && (<>
              <p className="text-sm text-muted-foreground">Selecione os testes a aplicar:</p>
              {TEST_OPTIONS.map(t => (
                <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={e => setSelectedTests(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} className="mt-1" />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
              {selectedTests.length > 0 && revealedResults.length === 0 && <Button size="sm" className="w-full" onClick={applyTests}>Aplicar Testes</Button>}
              {revealedResults.length > 0 && (
                <div className="space-y-2">
                  {revealedResults.map(t => (
                    <div key={t} className="text-sm bg-muted/50 p-2 rounded">
                      <strong>{TEST_OPTIONS.find(o => o.id === t)?.label}:</strong> {patient.testResults[t as keyof typeof patient.testResults] || "Normal"}
                    </div>
                  ))}
                  {!completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Prosseguir</Button>}
                </div>
              )}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>FOIS e Consistência{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <Select value={fois} onValueChange={setFois}><SelectTrigger><SelectValue placeholder="Classificar FOIS" /></SelectTrigger><SelectContent>{FOIS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={consistency} onValueChange={setConsistency}><SelectTrigger><SelectValue placeholder="Consistência alimentar" /></SelectTrigger><SelectContent>{CONSISTENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {fois && consistency && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Estratégias e Exames{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && (<>
              <p className="text-sm text-muted-foreground">Selecione estratégias compensatórias:</p>
              {STRATEGY_OPTIONS.map(s => (
                <label key={s.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={strategies.includes(s.id)} onChange={e => setStrategies(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} className="mt-1" />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
              <Select value={exam} onValueChange={setExam}><SelectTrigger><SelectValue placeholder="Exame complementar" /></SelectTrigger><SelectContent>{EXAM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {strategies.length > 0 && exam && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Avaliação de Disfagia" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "FOIS": FOIS_OPTIONS.find(o => o.value === fois)?.label || "—", "Consistência": CONSISTENCY_OPTIONS.find(o => o.value === consistency)?.label || "—", "Exame": EXAM_OPTIONS.find(o => o.value === exam)?.label || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
