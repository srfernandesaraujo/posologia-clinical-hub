import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, User, ArrowLeft, Sparkles } from "lucide-react";
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
  "Selecione um caso clínico para iniciar a avaliação postural.",
  "Em M1, revise os dados clínicos do paciente.",
  "Em M2, selecione os pontos anatômicos CORRETOS na silhueta (cuidado com os distratores!).",
  "Em M3, escolha o diagnóstico postural principal entre as opções apresentadas.",
  "Em M4, monte o programa de correção postural adequado.",
  "Ao final, revise o feedback com a previsão de evolução do paciente.",
];

const CASES = [
  { id: "c1", name: "Escoliose torácica", description: "Adolescente 15a, assimetria de ombros e escápulas", difficulty: "Médio",
    correctPoints: ["tragusL", "tragusR", "acromioL", "acromioR", "easiL", "easiR", "maleolL", "maleolR"],
    distractors: ["claviculaL", "claviculaR", "umbigo", "joelhoL"],
    landmarks: { tragusL: { x: 48, y: 12 }, tragusR: { x: 52, y: 11 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 20 }, easiL: { x: 42, y: 52 }, easiR: { x: 58, y: 52 }, maleolL: { x: 43, y: 95 }, maleolR: { x: 57, y: 95 }, claviculaL: { x: 42, y: 18 }, claviculaR: { x: 58, y: 18 }, umbigo: { x: 50, y: 48 }, joelhoL: { x: 43, y: 75 } },
    deviations: ["Inclinação lateral da cabeça à direita", "Desnível de ombros (D mais alto)", "Escoliose torácica convexa à direita", "Triângulo de Tales assimétrico"],
    correctDiagnosis: "Escoliose torácica convexa à direita com inclinação cefálica",
    diagnosisOptions: ["Escoliose torácica convexa à direita com inclinação cefálica", "Hiperlordose lombar com anteversão pélvica", "Cifose torácica com protrusão de cabeça", "Joelho valgo bilateral com pés planos"],
    idealCorrections: ["rpg", "fort-escapular", "prop-neuro"],
    cobbEstimate: 18 },
  { id: "c2", name: "Hiperlordose lombar", description: "Mulher 35a, queixa de lombalgia crônica", difficulty: "Fácil",
    correctPoints: ["tragusL", "tragusR", "acromioL", "acromioR", "easiL", "easiR", "maleolL", "maleolR"],
    distractors: ["claviculaL", "claviculaR", "umbigo", "joelhoL"],
    landmarks: { tragusL: { x: 47, y: 12 }, tragusR: { x: 53, y: 12 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 22 }, easiL: { x: 42, y: 53 }, easiR: { x: 58, y: 53 }, maleolL: { x: 43, y: 95 }, maleolR: { x: 57, y: 95 }, claviculaL: { x: 42, y: 18 }, claviculaR: { x: 58, y: 18 }, umbigo: { x: 50, y: 48 }, joelhoL: { x: 43, y: 75 } },
    deviations: ["Anteversão pélvica", "Hiperlordose lombar", "Abdômen protuso", "Retificação torácica compensatória"],
    correctDiagnosis: "Hiperlordose lombar com anteversão pélvica e retificação torácica",
    diagnosisOptions: ["Hiperlordose lombar com anteversão pélvica e retificação torácica", "Escoliose lombar convexa à esquerda", "Cifose torácica com protrusão de cabeça", "Retificação lombar com retroversão pélvica"],
    idealCorrections: ["rpg", "pilates", "along-hip"],
    cobbEstimate: null },
  { id: "c3", name: "Joelho valgo bilateral", description: "Criança 8a, pais relatam marcha com joelhos para dentro", difficulty: "Difícil",
    correctPoints: ["tragusL", "tragusR", "acromioL", "acromioR", "easiL", "easiR", "maleolL", "maleolR"],
    distractors: ["claviculaL", "claviculaR", "umbigo", "joelhoL"],
    landmarks: { tragusL: { x: 49, y: 12 }, tragusR: { x: 51, y: 12 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 22 }, easiL: { x: 42, y: 52 }, easiR: { x: 58, y: 52 }, maleolL: { x: 41, y: 95 }, maleolR: { x: 59, y: 95 }, claviculaL: { x: 42, y: 18 }, claviculaR: { x: 58, y: 18 }, umbigo: { x: 50, y: 48 }, joelhoL: { x: 44, y: 75 } },
    deviations: ["Joelho valgo bilateral > 8°", "Rotação interna de quadril", "Pés planos compensatórios", "Distância intermaleolar aumentada"],
    correctDiagnosis: "Joelho valgo bilateral com rotação interna de quadril e pés planos",
    diagnosisOptions: ["Joelho valgo bilateral com rotação interna de quadril e pés planos", "Joelho varo bilateral fisiológico", "Genu recurvatum bilateral", "Escoliose lombossacra com basculação pélvica"],
    idealCorrections: ["prop-neuro", "palmilha", "fort-escapular"],
    cobbEstimate: null },
];

const CORRECTIONS = [
  { id: "rpg", name: "RPG (Reeducação Postural Global)", desc: "Posturas de alongamento global em cadeia" },
  { id: "pilates", name: "Pilates Clínico", desc: "Fortalecimento de core e estabilizadores" },
  { id: "fort-escapular", name: "Fortalecimento escapular", desc: "Trapézio médio/inferior, serrátil anterior" },
  { id: "along-hip", name: "Alongamento de flexores de quadril", desc: "Iliopsoas e reto femoral" },
  { id: "prop-neuro", name: "Propriocepção e treino neuromuscular", desc: "Equilíbrio e controle postural dinâmico" },
  { id: "palmilha", name: "Palmilhas posturais", desc: "Correção de apoio plantar e alinhamento" },
];

const POINT_LABELS: Record<string, string> = {
  tragusL: "Tragus E", tragusR: "Tragus D", acromioL: "Acrômio E", acromioR: "Acrômio D",
  easiL: "EIAS E", easiR: "EIAS D", maleolL: "Maléolo E", maleolR: "Maléolo D",
  claviculaL: "Clavícula E", claviculaR: "Clavícula D", umbigo: "Umbigo", joelhoL: "Joelho E",
};

function PostureSVG({ caseData, markedPoints, onPointClick }: { caseData: typeof CASES[0]; markedPoints: Set<string>; onPointClick: (id: string) => void }) {
  const allPoints = [...caseData.correctPoints, ...caseData.distractors];
  return (
    <svg viewBox="0 0 100 110" className="w-full max-w-[280px] mx-auto">
      <rect x={0} y={0} width={100} height={105} fill="hsl(var(--muted)/0.2)" rx={4} />
      <line x1={50} y1={5} x2={50} y2={100} stroke="hsl(var(--primary)/0.3)" strokeWidth={0.3} strokeDasharray="1 1" />
      {[20, 40, 60, 80].map(y => <line key={y} x1={10} y1={y} x2={90} y2={y} stroke="hsl(var(--muted-foreground)/0.1)" strokeWidth={0.2} />)}
      <ellipse cx={50} cy={10} rx={5} ry={5} fill="hsl(var(--foreground)/0.15)" />
      <line x1={50} y1={15} x2={50} y2={55} stroke="hsl(var(--foreground)/0.15)" strokeWidth={2} />
      <line x1={38} y1={22} x2={62} y2={22} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1.5} />
      <line x1={38} y1={22} x2={35} y2={42} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1} />
      <line x1={62} y1={22} x2={65} y2={42} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1} />
      <line x1={50} y1={55} x2={43} y2={95} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1.2} />
      <line x1={50} y1={55} x2={57} y2={95} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1.2} />
      {allPoints.map(id => {
        const pos = caseData.landmarks[id as keyof typeof caseData.landmarks];
        if (!pos) return null;
        const marked = markedPoints.has(id);
        return (
          <g key={id} onClick={() => onPointClick(id)} className="cursor-pointer">
            <circle cx={pos.x} cy={pos.y} r={marked ? 2.5 : 2} fill={marked ? "hsl(var(--primary))" : "hsl(var(--muted-foreground)/0.4)"} stroke={marked ? "hsl(var(--primary))" : "none"} strokeWidth={0.5} />
            <title>{POINT_LABELS[id] || id}</title>
            {marked && <text x={pos.x} y={pos.y - 3.5} textAnchor="middle" fontSize={2.5} fill="hsl(var(--primary))">{POINT_LABELS[id]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.description } }));

export default function SimuladorAvaliacaoPostural() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-avaliacao-postural") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("avaliacao-postural", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [markedPoints, setMarkedPoints] = useState<Set<string>>(new Set());
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [selectedCorrections, setSelectedCorrections] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    // Points accuracy
    const correctSet = new Set(caseData.correctPoints);
    const userCorrectPoints = [...markedPoints].filter(p => correctSet.has(p)).length;
    const userWrongPoints = [...markedPoints].filter(p => !correctSet.has(p)).length;
    const pointScore = userCorrectPoints === caseData.correctPoints.length && userWrongPoints === 0;
    if (pointScore) correct++;
    total++;
    decisions.push({ label: "Pontos anatômicos", userChoice: `${userCorrectPoints} corretos, ${userWrongPoints} incorretos`, idealChoice: `${caseData.correctPoints.length} pontos corretos`, correct: pointScore, explanation: userWrongPoints > 0 ? `Pontos distratores selecionados indevidamente` : undefined });

    // Diagnosis
    const diagCorrect = selectedDiagnosis === caseData.correctDiagnosis;
    if (diagCorrect) correct++;
    total++;
    decisions.push({ label: "Diagnóstico postural", userChoice: selectedDiagnosis || "-", idealChoice: caseData.correctDiagnosis, correct: diagCorrect });

    // Corrections
    const idealSet = new Set(caseData.idealCorrections);
    const userSet = new Set(selectedCorrections);
    const techMatch = selectedCorrections.filter(t => idealSet.has(t)).length === caseData.idealCorrections.length && selectedCorrections.filter(t => !idealSet.has(t)).length === 0;
    if (techMatch) correct++;
    total++;
    decisions.push({ label: "Programa corretivo", userChoice: selectedCorrections.map(id => CORRECTIONS.find(c => c.id === id)?.name).join(", ") || "Nenhum", idealChoice: caseData.idealCorrections.map(id => CORRECTIONS.find(c => c.id === id)?.name).join(", "), correct: techMatch });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Com a identificação correta dos desvios e programa adequado, o paciente (${caseData.name}) teria melhora progressiva do alinhamento postural em 12-16 semanas, com redução de sintomas associados e menor risco de progressão.`
      : score >= 50
      ? `Parte dos desvios foi identificada, mas o programa corretivo não aborda completamente as alterações encontradas. O paciente teria melhora parcial com persistência de desequilíbrios compensatórios.`
      : `O diagnóstico e/ou programa estão inadequados. Sem intervenção correta, o paciente manteria ou agravaria os desvios posturais, com risco de dor crônica e limitação funcional progressiva.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Avaliação Postural — Simetrógrafo Virtual</h1><p className="text-sm text-muted-foreground">Análise postural com marcação de pontos anatômicos</p></div>
          <SimulatorHowToUse title="Avaliação Postural" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-avaliacao-postural" toolName="Avaliação Postural" toolType="simulator" prompt={prompt} />
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

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary = caseData ? { "Caso": `${caseData.name} — ${caseData.description}`, "Pontos": `${markedPoints.size} marcados`, "Diagnóstico": selectedDiagnosis || "-", "Programa": selectedCorrections.map(id => CORRECTIONS.find(c => c.id === id)?.name).join(", ") || "Nenhum", "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setMarkedPoints(new Set()); setSelectedDiagnosis(""); setSelectedCorrections([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Avaliação Postural</h1></div>
        <SimulatorHowToUse title="Avaliação Postural" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setMarkedPoints(new Set()); setSelectedDiagnosis(""); setSelectedCorrections([]); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.description}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg">{caseData.description}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — Marcação com distratores */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Marcação de Pontos Anatômicos{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && (<>
              <p className="text-sm text-muted-foreground">Selecione apenas os pontos anatômicos relevantes para avaliação postural ({markedPoints.size} selecionados). Cuidado: nem todos os pontos são relevantes!</p>
              <PostureSVG caseData={caseData} markedPoints={markedPoints} onPointClick={id => setMarkedPoints(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; })} />
              {markedPoints.size >= 6 && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Pontos</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M3 — Diagnóstico (múltipla escolha) */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Diagnóstico Postural{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && caseData && (<>
              <p className="text-sm text-muted-foreground">Com base nos achados da avaliação, qual o diagnóstico postural principal?</p>
              {caseData.diagnosisOptions.map((opt, i) => (
                <label key={i} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedDiagnosis === opt ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" name="diagnosis" checked={selectedDiagnosis === opt} onChange={() => setSelectedDiagnosis(opt)} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {selectedDiagnosis && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Diagnóstico</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 — Programa */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Correção{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (<>
              {CORRECTIONS.map(c => (
                <label key={c.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedCorrections.includes(c.id)} onChange={e => setSelectedCorrections(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">{c.name}</p><p className="text-muted-foreground">{c.desc}</p></div>
                </label>
              ))}
              {selectedCorrections.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar Programa</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Avaliação Postural" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
