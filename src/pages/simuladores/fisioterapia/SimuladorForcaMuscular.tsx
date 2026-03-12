import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Dumbbell, ArrowLeft, Sparkles } from "lucide-react";
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
  "Selecione um caso clínico para iniciar a avaliação de força muscular.",
  "Em M1, revise o caso e inicie a avaliação.",
  "Em M2, clique em cada músculo para simular o teste — o sistema medirá a força automaticamente.",
  "Em M3, identifique o padrão neurológico e nível da lesão baseado nos resultados.",
  "Em M4, selecione o programa de fortalecimento adequado.",
  "Ao final, revise o feedback com o prognóstico funcional.",
];

const CASES = [
  { id: "c1", name: "AVC — Hemiparesia à direita", level: "Cortical (ACM esquerda)", limb: "upper", difficulty: "Médio",
    muscles: { "Deltóide": 2, "Bíceps": 3, "Tríceps": 2, "Flexores de punho": 1, "Extensores de punho": 1, "Interósseos": 0 },
    pattern: "Hemiparesia com gradiente distal",
    patternOptions: ["Hemiparesia com gradiente distal", "Tetraparesia simétrica", "Padrão radicular C5-C6", "Mononeuropatia ulnar"],
    idealExercises: ["iso", "aa", "fes"] },
  { id: "c2", name: "Lesão medular C6 — Tetraparesia", level: "Medular C6", limb: "upper", difficulty: "Difícil",
    muscles: { "Deltóide": 4, "Bíceps": 4, "Tríceps": 1, "Flexores de punho": 1, "Extensores de punho": 2, "Interósseos": 0 },
    pattern: "Tetraparesia nível C6",
    patternOptions: ["Tetraparesia nível C6", "Hemiparesia com gradiente distal", "Síndrome de Guillain-Barré", "Miopatia proximal"],
    idealExercises: ["iso", "aa", "func"] },
  { id: "c3", name: "Neuropatia peroneal — Pé caído", level: "Nervo fibular comum", limb: "lower", difficulty: "Fácil",
    muscles: { "Quadríceps": 5, "Isquiotibiais": 5, "Tibial anterior": 1, "Fibulares": 1, "Gastrocnêmio": 5, "Extensor longo dos dedos": 0 },
    pattern: "Déficit peroneal isolado",
    patternOptions: ["Déficit peroneal isolado", "Radiculopatia L5", "Polineuropatia motora simétrica", "Lesão medular lombar"],
    idealExercises: ["res", "marcha", "prop"] },
];

const OXFORD_LABELS: Record<number, string> = {
  0: "Nenhuma contração visível", 1: "Contração visível/palpável, sem movimento",
  2: "Movimento ativo, sem gravidade", 3: "Movimento ativo contra gravidade",
  4: "Movimento contra resistência moderada", 5: "Força normal",
};

const EXERCISES: Record<string, { id: string; name: string; desc: string }[]> = {
  upper: [
    { id: "iso", name: "Isométricos no leito", desc: "Para graus 0-2, manter tônus" },
    { id: "aa", name: "Ativo-assistido com polias", desc: "Para graus 2-3, ganho de ADM" },
    { id: "res", name: "Resistência progressiva com faixas", desc: "Para graus 3-4" },
    { id: "func", name: "Treino funcional de preensão", desc: "Para graus 4-5, AVDs" },
    { id: "fes", name: "FES em extensores de punho", desc: "Estimulação elétrica funcional" },
  ],
  lower: [
    { id: "iso", name: "Isométricos de quadríceps", desc: "Para graus 0-2" },
    { id: "aa", name: "Ativo-assistido em cadeia cinética aberta", desc: "Para graus 2-3" },
    { id: "res", name: "Resistência em leg press", desc: "Para graus 3-4" },
    { id: "marcha", name: "Treino de marcha com órtese", desc: "Para pé caído" },
    { id: "prop", name: "Propriocepção em prancha", desc: "Equilíbrio e controle motor" },
  ],
};

function MuscleSVG({ muscles, grades, onMuscleClick, limb }: { muscles: string[]; grades: Record<string, number | null>; onMuscleClick: (m: string) => void; limb: string }) {
  const gradeColor = (g: number | null) => {
    if (g === null) return "hsl(var(--muted)/0.3)";
    if (g >= 4) return "#22c55e"; if (g >= 3) return "#eab308"; if (g >= 2) return "#f97316"; return "#ef4444";
  };
  const positions = [{ y: 10 }, { y: 25 }, { y: 40 }, { y: 55 }, { y: 70 }, { y: 85 }];
  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[350px] mx-auto">
      <rect x={85} y={5} width={30} height={90} rx={8} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <text x={100} y={100} textAnchor="middle" fontSize={5} fill="hsl(var(--muted-foreground))">{limb === "upper" ? "Membro Superior" : "Membro Inferior"}</text>
      {muscles.map((m, i) => {
        const y = positions[i]?.y ?? 10 + i * 15;
        const g = grades[m];
        return (
          <g key={m} onClick={() => onMuscleClick(m)} className="cursor-pointer">
            <rect x={88} y={y} width={24} height={12} rx={3} fill={gradeColor(g)} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.3} />
            <text x={83} y={y + 8} textAnchor="end" fontSize={4} fill="hsl(var(--foreground))">{m}</text>
            {g !== null && <text x={100} y={y + 8} textAnchor="middle" fontSize={5} fontWeight="bold" fill="white">{g}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.level } }));

export default function SimuladorForcaMuscular() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-forca-muscular") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("forca-muscular", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [testingMuscle, setTestingMuscle] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const muscles = caseData ? Object.keys(caseData.muscles) : [];
  const allGraded = muscles.length > 0 && muscles.every(m => grades[m] !== null && grades[m] !== undefined);

  // System-determined force: simulate the test, then reveal the grade
  const handleTestMuscle = (m: string) => {
    if (!caseData) return;
    setTestingMuscle(m);
    setTimeout(() => {
      const realGrade = caseData.muscles[m as keyof typeof caseData.muscles];
      setGrades(prev => ({ ...prev, [m]: realGrade }));
      setTestingMuscle(null);
    }, 1200);
  };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    // Pattern identification
    const patCorrect = selectedPattern === caseData.pattern;
    if (patCorrect) correct++;
    total++;
    decisions.push({ label: "Padrão neurológico", userChoice: selectedPattern || "-", idealChoice: caseData.pattern, correct: patCorrect });

    // Exercises
    const idealSet = new Set(caseData.idealExercises);
    const userSet = new Set(selectedExercises);
    const match = selectedExercises.filter(e => idealSet.has(e)).length === caseData.idealExercises.length && selectedExercises.filter(e => !idealSet.has(e)).length === 0;
    if (match) correct++;
    total++;
    decisions.push({ label: "Programa de fortalecimento", userChoice: selectedExercises.map(id => EXERCISES[caseData.limb].find(e => e.id === id)?.name).join(", ") || "Nenhum", idealChoice: caseData.idealExercises.map(id => EXERCISES[caseData.limb].find(e => e.id === id)?.name).join(", "), correct: match });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Com a identificação correta do padrão e programa adequado, o paciente teria ganho funcional progressivo com potencial de recuperação de 1-2 graus em 8-12 semanas.`
      : `O programa não é totalmente adequado ao padrão neurológico encontrado. O paciente teria recuperação sub-ótima com risco de contraturas e perda funcional adicional.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("forca-muscular");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedCase(CASES[0]?.id || ""); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Teste de Força Muscular (Oxford/MRC)</h1><p className="text-sm text-muted-foreground">Avaliação manual de força muscular — graduação 0 a 5</p></div>
          <SimulatorHowToUse title="Força Muscular" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-forca-muscular" toolName="Força Muscular" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />
          )}
        </div>
        {isAdmin && !isVR && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary = caseData ? { "Caso": `${caseData.name} — ${caseData.level}`, "Força": muscles.map(m => `${m}: ${grades[m] ?? "?"}/5`).join("; "), "Padrão": selectedPattern || "-", "Programa": selectedExercises.map(id => EXERCISES[caseData.limb].find(e => e.id === id)?.name).join(", ") || "Nenhum", "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setGrades({}); setSelectedPattern(""); setSelectedExercises([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Força Muscular (Oxford/MRC)</h1></div>
        <SimulatorHowToUse title="Força Muscular" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setGrades({}); setTestingMuscle(null); setSelectedPattern(""); setSelectedExercises([]); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && (<div className="text-sm bg-muted/50 p-3 rounded-lg"><p><strong>Nível:</strong> {caseData.level}</p><p><strong>Membro:</strong> {caseData.limb === "upper" ? "Superior" : "Inferior"}</p></div>)}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — System-determined force */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Teste Muscular{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && (<>
              <p className="text-sm text-muted-foreground">Clique em cada músculo para simular o teste. O sistema medirá a força:</p>
              <MuscleSVG muscles={muscles} grades={grades} onMuscleClick={m => { if (grades[m] === null || grades[m] === undefined) handleTestMuscle(m); }} limb={caseData.limb} />
              {testingMuscle && <p className="text-sm text-center text-primary animate-pulse">Testando {testingMuscle}...</p>}
              {grades[muscles[muscles.length - 1]] !== null && grades[muscles[muscles.length - 1]] !== undefined && (
                <div className="space-y-1">{muscles.map(m => (<div key={m} className="flex justify-between text-sm p-1.5 rounded bg-muted/50"><span>{m}</span><span className="font-semibold">{grades[m]}/5 — {OXFORD_LABELS[grades[m] ?? 0]}</span></div>))}</div>
              )}
              {allGraded && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Resultados</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M3 — Pattern identification (student decides) */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Identificação do Padrão Neurológico{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && caseData && (<>
              <p className="text-sm text-muted-foreground">Com base nos resultados, identifique o padrão neurológico:</p>
              {caseData.patternOptions.map((opt, i) => (
                <label key={i} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedPattern === opt ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" name="pattern" checked={selectedPattern === opt} onChange={() => setSelectedPattern(opt)} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {selectedPattern && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Padrão</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Fortalecimento{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && caseData && (<>
              {EXERCISES[caseData.limb].map(e => (
                <label key={e.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedExercises.includes(e.id)} onChange={ev => setSelectedExercises(prev => ev.target.checked ? [...prev, e.id] : prev.filter(x => x !== e.id))} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">{e.name}</p><p className="text-muted-foreground">{e.desc}</p></div>
                </label>
              ))}
              {selectedExercises.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar Programa</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Força Muscular (Oxford/MRC)" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
