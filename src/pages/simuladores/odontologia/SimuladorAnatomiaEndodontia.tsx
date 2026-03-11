import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Crosshair, Wrench, Shield, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";

const CASES = [
  { id: "c1", tooth: "Molar inferior (46)", lesion: "Cárie profunda", pulpStatus: "Pulpite reversível", tests: { cold: "Dor aguda que cessa em 5s", heat: "Sem dor", electric: "Resposta normal (40µA)", percussion: "Sem dor" }, idealTherapy: "cap-indireto", idealMaterial: "ionômero" },
  { id: "c2", tooth: "Incisivo central (11)", lesion: "Trauma (fratura coronária)", pulpStatus: "Exposição pulpar", tests: { cold: "Dor intensa que persiste >30s", heat: "Dor intensa", electric: "Resposta exagerada (15µA)", percussion: "Dor leve" }, idealTherapy: "cap-direto", idealMaterial: "mta" },
  { id: "c3", tooth: "Pré-molar superior (24)", lesion: "Necrose pulpar", pulpStatus: "Necrose", tests: { cold: "Sem resposta", heat: "Sem resposta", electric: "Sem resposta (>80µA)", percussion: "Dor à percussão vertical" }, idealTherapy: "endodontia", idealMaterial: "guta" },
];

const THERAPIES = [
  { id: "cap-indireto", label: "Capeamento pulpar indireto", desc: "Remoção parcial de cárie, proteção com Ca(OH)₂", indication: "Pulpite reversível sem exposição", prognosis: 90 },
  { id: "cap-direto", label: "Capeamento pulpar direto", desc: "Proteção direta da polpa exposta com MTA", indication: "Exposição pulpar acidental, polpa vital", prognosis: 80 },
  { id: "pulpotomia", label: "Pulpotomia", desc: "Remoção da polpa coronária, manutenção da radicular", indication: "Dentes com rizogênese incompleta", prognosis: 75 },
  { id: "endodontia", label: "Tratamento endodôntico completo", desc: "Pulpectomia, instrumentação e obturação do canal", indication: "Pulpite irreversível ou necrose", prognosis: 95 },
];

const MATERIALS = [
  { id: "guta", label: "Guta-percha + cimento AH Plus", type: "Obturação", desc: "Padrão-ouro para obturação de canais" },
  { id: "mta", label: "MTA (Agregado Trióxido Mineral)", type: "Reparo", desc: "Biocompatível, selamento hermético, induz mineralização" },
  { id: "resina", label: "Resina composta", type: "Restauração coronária", desc: "Restauração estética com técnica incremental" },
  { id: "ionômero", label: "Cimento de ionômero de vidro", type: "Base/forro", desc: "Liberação de flúor, adesão química ao dente" },
];

const CONSEQUENCES: Record<string, Record<string, string>> = {
  "c1": {
    "cap-indireto": "Terapia adequada. O capeamento indireto preserva a vitalidade pulpar com excelente prognóstico (90%). A polpa se recupera e forma dentina terciária de proteção.",
    "cap-direto": "Risco moderado. Não há exposição pulpar neste caso — capeamento direto é desnecessário e pode irritar a polpa sem necessidade.",
    "pulpotomia": "Excessivamente invasivo. Em pulpite reversível, a pulpotomia remove tecido pulpar vital desnecessariamente, comprometendo o prognóstico.",
    "endodontia": "Sobretratamento grave. Tratar endodonticamente uma pulpite reversível remove vitalidade desnecessariamente. O dente perde nutrição e fica mais frágil.",
  },
  "c2": {
    "cap-direto": "Terapia adequada. O MTA protege a polpa exposta, induz formação de barreira mineralizada e preserva vitalidade com bom prognóstico (80%).",
    "cap-indireto": "Insuficiente. Há exposição pulpar — capeamento indireto não aborda o problema. A polpa ficará exposta e necrosará em semanas.",
    "pulpotomia": "Aceitável em jovens com rizogênese incompleta, mas excessivo para este caso com polpa vital e boa resposta ao MTA.",
    "endodontia": "Desnecessário se a polpa ainda é vital. Perda de vitalidade desnecessária em um dente jovem com possibilidade de recuperação.",
  },
  "c3": {
    "endodontia": "Terapia adequada. Em necrose pulpar, o tratamento endodôntico completo é a única opção viável. Instrumentação e obturação eliminam a infecção com 95% de sucesso.",
    "cap-indireto": "Falha terapêutica certa. A polpa já está necrosada — capeamento não resolve infecção no canal. O paciente desenvolverá abscesso periapical.",
    "cap-direto": "Falha terapêutica certa. Polpa necrosada não responde a capeamento. Infecção persistirá e formará fístula.",
    "pulpotomia": "Insuficiente. Em necrose, a infecção está em toda a extensão do canal. Remoção parcial não elimina bactérias da porção radicular.",
  },
};

function ToothCrossSectionSVG({ lesion, pulpStatus, therapy, material }: { lesion: string; pulpStatus: string; therapy: string; material: string }) {
  const isNecrotic = pulpStatus === "Necrose";
  const hasEndodontics = therapy === "endodontia";
  const hasCapping = therapy.startsWith("cap");
  const pulpColor = isNecrotic ? "#6b7280" : "#ef4444";
  const canalFill = hasEndodontics ? "#f59e0b" : pulpColor;
  return (
    <svg viewBox="0 0 200 320" className="w-full max-w-[200px] mx-auto">
      <path d="M60 10 Q65 0 80 5 Q100 -2 120 5 Q135 0 140 10 Q145 30 140 70 Q130 90 120 100 L80 100 Q70 90 60 70 Q55 30 60 10 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.5} />
      <path d="M65 15 Q70 5 85 10 Q100 3 115 10 Q130 5 135 15 Q138 35 135 65 Q125 80 118 90 L82 90 Q75 80 65 65 Q62 35 65 15 Z" fill="#ebe5d9" stroke="none" />
      {lesion.includes("Cárie") && <ellipse cx={110} cy={30} rx={18} ry={12} fill="#8b4513" opacity={0.7}><title>Lesão de cárie</title></ellipse>}
      {lesion.includes("Trauma") && <line x1={100} y1={5} x2={105} y2={60} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />}
      <path d="M72 50 Q75 40 90 45 Q100 38 110 45 Q125 40 128 50 Q130 65 128 85 Q120 95 115 100 L85 100 Q82 75 85 60 Z" fill="#d4c5a0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      <path d="M85 60 Q90 50 100 52 Q110 50 115 60 Q118 75 115 95 L85 95 Q82 75 85 60 Z" fill={pulpColor} opacity={isNecrotic ? 0.5 : 0.8} stroke="hsl(var(--border))" strokeWidth={0.5}><title>Câmara pulpar — {pulpStatus}</title></path>
      <path d="M82 100 L78 240 Q79 260 85 270 Q90 275 95 270 Q100 260 100 240 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.2} />
      <path d="M118 100 L122 240 Q121 260 115 270 Q110 275 105 270 Q100 260 100 240 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.2} />
      <line x1={88} y1={100} x2={90} y2={260} stroke={canalFill} strokeWidth={3} strokeLinecap="round" />
      <line x1={112} y1={100} x2={110} y2={260} stroke={canalFill} strokeWidth={3} strokeLinecap="round" />
      {hasEndodontics && <>
        <line x1={88} y1={100} x2={90} y2={260} stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        <line x1={112} y1={100} x2={110} y2={260} stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        <text x={100} y={185} textAnchor="middle" fontSize={8} fill="#f59e0b" fontWeight="bold">GP</text>
      </>}
      {hasCapping && <rect x={83} y={55} width={34} height={6} rx={2} fill="#22c55e" opacity={0.7}><title>Proteção pulpar</title></rect>}
      <path d="M75 105 L72 240 Q73 265 82 275" fill="none" stroke="#f472b6" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M125 105 L128 240 Q127 265 118 275" fill="none" stroke="#f472b6" strokeWidth={1.5} strokeDasharray="3 3" />
      <rect x={40} y={105} width={30} height={180} rx={4} fill="#d1d5db" opacity={0.4} />
      <rect x={130} y={105} width={30} height={180} rx={4} fill="#d1d5db" opacity={0.4} />
      <g transform="translate(0, 290)">
        <rect x={10} y={0} width={8} height={8} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.5} /><text x={22} y={7} fontSize={7} fill="hsl(var(--foreground))">Esmalte</text>
        <rect x={65} y={0} width={8} height={8} fill="#d4c5a0" /><text x={77} y={7} fontSize={7} fill="hsl(var(--foreground))">Dentina</text>
        <rect x={120} y={0} width={8} height={8} fill={pulpColor} opacity={0.8} /><text x={132} y={7} fontSize={7} fill="hsl(var(--foreground))">Polpa</text>
      </g>
    </svg>
  );
}

const HOW_TO = [
  "Selecione o caso clínico (dente e lesão) no Módulo 1 e observe a anatomia em corte.",
  "Execute os testes de vitalidade no Módulo 2 para determinar o status pulpar.",
  "Escolha a terapia endodôntica mais adequada no Módulo 3 com base nos testes.",
  "Selecione o material de obturação/restauração no Módulo 4.",
  "O painel de Feedback mostrará o prognóstico e as consequências clínicas da sua decisão.",
];

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.tooth, difficulty: c.pulpStatus === "Necrose" ? "Difícil" : "Médio", patient: { diagnosis: c.lesion } }));

export default function SimuladorAnatomiaEndodontia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-anatomia-endodontia") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("anatomia-endodontia", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [performedTests, setPerformedTests] = useState<Set<string>>(new Set());
  const [selectedTherapy, setSelectedTherapy] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const therapy = THERAPIES.find(t => t.id === selectedTherapy);
  const material = MATERIALS.find(m => m.id === selectedMaterial);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const confirmRestoration = () => {
    completeModule(4);
    setShowFeedback(true);
  };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    const therapyCorrect = selectedTherapy === caseData.idealTherapy;
    const materialCorrect = selectedMaterial === caseData.idealMaterial;
    decisions.push({ label: "Terapia endodôntica", userChoice: therapy?.label || "-", idealChoice: THERAPIES.find(t => t.id === caseData.idealTherapy)?.label || "-", correct: therapyCorrect });
    decisions.push({ label: "Material de escolha", userChoice: material?.label || "-", idealChoice: MATERIALS.find(m => m.id === caseData.idealMaterial)?.label || "-", correct: materialCorrect });
    const score = Math.round(([therapyCorrect, materialCorrect].filter(Boolean).length / 2) * 100);
    const narrative = CONSEQUENCES[caseData.id]?.[selectedTherapy] || "Avaliação não disponível para esta combinação.";
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Anatomia Dental em Corte (Endodontia)</h1>
            <p className="text-sm text-muted-foreground">Anatomia interna e decisão endodôntica</p>
          </div>
          <SimulatorHowToUse title="Endodontia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-anatomia-endodontia" toolName="Anatomia Dental (Endodontia)" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />
          )}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const expSummary: Record<string, string> = caseData ? { "Dente": caseData.tooth, "Lesão": caseData.lesion, "Status pulpar": caseData.pulpStatus, "Terapia": therapy?.label || "-", "Material": material?.label || "-", "Prognóstico": therapy ? `${therapy.prognosis}%` : "-", "Pontuação": `${feedback.score}%` } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setPerformedTests(new Set()); setSelectedTherapy(""); setSelectedMaterial(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Anatomia Dental em Corte (Endodontia)</h1></div>
        <SimulatorHowToUse title="Endodontia" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crosshair className="h-4 w-4 text-primary" /> 1. Seleção do Dente e Lesão {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={setSelectedCase}><SelectTrigger><SelectValue placeholder="Selecione o caso clínico..." /></SelectTrigger><SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.tooth} — {c.lesion}</SelectItem>)}</SelectContent></Select>
            {caseData && <div className="bg-muted/50 rounded-lg p-3"><ToothCrossSectionSVG lesion={caseData.lesion} pulpStatus={caseData.pulpStatus} therapy="" material="" /></div>}
            <Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">Confirmar Caso</Button>
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crosshair className="h-4 w-4 text-primary" /> 2. Testes de Vitalidade {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && <div className="space-y-2">
              {(["cold", "heat", "electric", "percussion"] as const).map(test => {
                const labels: Record<string, string> = { cold: "Teste ao frio", heat: "Teste ao calor", electric: "Teste elétrico", percussion: "Percussão vertical" };
                const done = performedTests.has(test);
                return (<div key={test} className="bg-muted/30 rounded-lg p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">{labels[test]}</span><Button size="sm" variant={done ? "outline" : "default"} onClick={() => setPerformedTests(prev => new Set(prev).add(test))}>{done ? "Realizado" : "Executar"}</Button></div>{done && <p className="text-sm text-muted-foreground mt-1">{caseData.tests[test]}</p>}</div>);
              })}
            </div>}
            <Button onClick={() => completeModule(2)} disabled={performedTests.size < 2 || completedModules.has(2)} className="w-full">Concluir Testes</Button>
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> 3. Decisão Terapêutica {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">{THERAPIES.map(t => (
              <label key={t.id} className={`block p-3 rounded-lg border cursor-pointer transition-colors ${selectedTherapy === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                <input type="radio" name="therapy" value={t.id} checked={selectedTherapy === t.id} onChange={() => setSelectedTherapy(t.id)} className="sr-only" />
                <p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p><Badge variant="outline" className="text-[10px] mt-1">{t.indication}</Badge>
              </label>
            ))}</div>
            {caseData && selectedTherapy && <div className="bg-muted/50 rounded-lg p-3"><ToothCrossSectionSVG lesion={caseData.lesion} pulpStatus={caseData.pulpStatus} therapy={selectedTherapy} material="" /></div>}
            <Button onClick={() => completeModule(3)} disabled={!selectedTherapy || completedModules.has(3)} className="w-full">Confirmar Terapia</Button>
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> 4. Obturação e Restauração {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}><SelectTrigger><SelectValue placeholder="Selecione o material..." /></SelectTrigger><SelectContent>{MATERIALS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent></Select>
            {material && <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1"><p><strong>Tipo:</strong> {material.type}</p><p>{material.desc}</p></div>}
            {therapy && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm"><p className="font-medium text-green-700 dark:text-green-400">Prognóstico: {therapy.prognosis}% de sucesso</p></div>}
            <Button onClick={confirmRestoration} disabled={!selectedMaterial || completedModules.has(4)} className="w-full">Confirmar Restauração</Button>
          </CardContent>
        </Card>

        <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
        <LabReportPanel benchTitle="Anatomia Dental — Endodontia" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
