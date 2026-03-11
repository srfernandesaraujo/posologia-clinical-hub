import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, MapPin, ArrowLeft, Sparkles } from "lucide-react";
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
  "Selecione um caso clínico para iniciar o exame sensitivo.",
  "Em M1, revise os dados do paciente.",
  "Em M2, clique em cada dermátomo para simular o teste — a sensibilidade será medida automaticamente.",
  "Em M3, escolha o nível lesional e o padrão (central vs periférico).",
  "Em M4, determine a classificação ASIA ou o diagnóstico diferencial.",
  "Ao final, revise o feedback com o prognóstico neurológico.",
];

type Sensitivity = "normal" | "diminuida" | "ausente";

const DERMATOMES = [
  { id: "C5", label: "C5", x: 25, y: 25, side: "lateral do braço" },
  { id: "C6", label: "C6", x: 20, y: 38, side: "polegar e indicador" },
  { id: "C7", label: "C7", x: 22, y: 42, side: "dedo médio" },
  { id: "C8", label: "C8", x: 24, y: 45, side: "dedo mínimo" },
  { id: "T1", label: "T1", x: 30, y: 35, side: "face medial do antebraço" },
  { id: "T4", label: "T4", x: 42, y: 30, side: "nível do mamilo" },
  { id: "T10", label: "T10", x: 42, y: 48, side: "nível do umbigo" },
  { id: "L1", label: "L1", x: 38, y: 55, side: "região inguinal" },
  { id: "L2", label: "L2", x: 35, y: 62, side: "face anterior da coxa" },
  { id: "L3", label: "L3", x: 37, y: 70, side: "face medial do joelho" },
  { id: "L4", label: "L4", x: 35, y: 78, side: "face medial da perna" },
  { id: "L5", label: "L5", x: 32, y: 88, side: "dorso do pé" },
  { id: "S1", label: "S1", x: 38, y: 92, side: "borda lateral do pé" },
  { id: "C5R", label: "C5", x: 75, y: 25, side: "lateral do braço (D)" },
  { id: "C6R", label: "C6", x: 80, y: 38, side: "polegar e indicador (D)" },
  { id: "L4R", label: "L4", x: 65, y: 78, side: "face medial da perna (D)" },
  { id: "L5R", label: "L5", x: 68, y: 88, side: "dorso do pé (D)" },
  { id: "S1R", label: "S1", x: 62, y: 92, side: "borda lateral do pé (D)" },
];

const CASES = [
  { id: "c1", name: "Lesão medular C5 completa", description: "Tetraplegia — sensibilidade preservada até C5", difficulty: "Difícil",
    affected: { C5: "normal", C6: "ausente", C7: "ausente", C8: "ausente", T1: "ausente", T4: "ausente", T10: "ausente", L1: "ausente", L2: "ausente", L3: "ausente", L4: "ausente", L5: "ausente", S1: "ausente", C5R: "normal", C6R: "ausente", L4R: "ausente", L5R: "ausente", S1R: "ausente" } as Record<string, Sensitivity>,
    correctLevel: "C5", correctPattern: "central", correctAsia: "A (Completa)",
    levelOptions: ["C4", "C5", "C6", "T1"],
    patternOptions: ["Central (medular)", "Periférico (radicular)", "Periférico (polineuropatia)"],
    asiaOptions: ["A (Completa)", "B (Incompleta — sensorial)", "C (Incompleta — motor <3)", "D (Incompleta — motor ≥3)"],
  },
  { id: "c2", name: "Hérnia discal L4-L5", description: "Dor irradiada para membro inferior esquerdo", difficulty: "Médio",
    affected: { C5: "normal", C6: "normal", C7: "normal", C8: "normal", T1: "normal", T4: "normal", T10: "normal", L1: "normal", L2: "normal", L3: "normal", L4: "diminuida", L5: "diminuida", S1: "normal", C5R: "normal", C6R: "normal", L4R: "normal", L5R: "normal", S1R: "normal" } as Record<string, Sensitivity>,
    correctLevel: "L4-L5", correctPattern: "periférico-radicular", correctAsia: null,
    levelOptions: ["L3-L4", "L4-L5", "L5-S1", "S1-S2"],
    patternOptions: ["Central (medular)", "Periférico (radicular)", "Periférico (polineuropatia)"],
    asiaOptions: null,
    diagnosisOptions: ["Radiculopatia L5 por hérnia discal", "Síndrome da cauda equina", "Estenose do canal lombar", "Neuropatia diabética"],
    correctDiagnosis: "Radiculopatia L5 por hérnia discal",
  },
  { id: "c3", name: "Neuropatia diabética distal", description: "Padrão em bota e luva", difficulty: "Fácil",
    affected: { C5: "normal", C6: "normal", C7: "normal", C8: "diminuida", T1: "normal", T4: "normal", T10: "normal", L1: "normal", L2: "normal", L3: "normal", L4: "diminuida", L5: "diminuida", S1: "diminuida", C5R: "normal", C6R: "normal", L4R: "diminuida", L5R: "diminuida", S1R: "diminuida" } as Record<string, Sensitivity>,
    correctLevel: "Distal-simétrico", correctPattern: "periférico-polineuropatia", correctAsia: null,
    levelOptions: ["Proximal", "Distal-simétrico", "Dermátomo L5", "Hemicorpo"],
    patternOptions: ["Central (medular)", "Periférico (radicular)", "Periférico (polineuropatia)"],
    asiaOptions: null,
    diagnosisOptions: ["Polineuropatia diabética distal simétrica", "Radiculopatia lombar bilateral", "Síndrome de Guillain-Barré", "Mielopatia compressiva"],
    correctDiagnosis: "Polineuropatia diabética distal simétrica",
  },
];

const SENS_COLORS: Record<string, string> = { normal: "#22c55e", diminuida: "#eab308", ausente: "#ef4444" };

function DermatomesSVG({ userSens, onPointClick, testedPoints }: { userSens: Record<string, Sensitivity | null>; onPointClick: (id: string) => void; testedPoints: Set<string> }) {
  return (
    <svg viewBox="0 0 100 105" className="w-full max-w-[300px] mx-auto">
      <rect x={0} y={0} width={100} height={100} fill="hsl(var(--muted)/0.2)" rx={4} />
      <ellipse cx={50} cy={10} rx={6} ry={7} fill="hsl(var(--foreground)/0.08)" stroke="hsl(var(--border))" strokeWidth={0.3} />
      <rect x={40} y={17} width={20} height={35} rx={5} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.3} />
      <rect x={15} y={20} width={25} height={8} rx={3} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <rect x={60} y={20} width={25} height={8} rx={3} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <rect x={35} y={52} width={12} height={40} rx={4} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <rect x={53} y={52} width={12} height={40} rx={4} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      {DERMATOMES.map(d => {
        const s = userSens[d.id];
        const tested = testedPoints.has(d.id);
        const color = s ? SENS_COLORS[s] : tested ? "hsl(var(--primary)/0.3)" : "hsl(var(--muted-foreground)/0.4)";
        return (
          <g key={d.id} onClick={() => onPointClick(d.id)} className="cursor-pointer">
            <circle cx={d.x} cy={d.y} r={s ? 3 : 2.5} fill={color} opacity={0.8} stroke="hsl(var(--background))" strokeWidth={0.3} />
            <text x={d.x} y={d.y - 4} textAnchor="middle" fontSize={2.5} fill="hsl(var(--foreground))">{d.label}</text>
            <title>{d.label} — {d.side}</title>
          </g>
        );
      })}
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.description } }));

export default function SimuladorDermatomos() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-dermatomos") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("dermatomos", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [userSens, setUserSens] = useState<Record<string, Sensitivity | null>>({});
  const [testedPoints, setTestedPoints] = useState<Set<string>>(new Set());
  const [testingPoint, setTestingPoint] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedPattern, setSelectedPattern] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allTested = DERMATOMES.every(d => userSens[d.id] !== null && userSens[d.id] !== undefined);

  // Auto-measure sensitivity when clicking a dermatome
  const handleTestDermatome = (id: string) => {
    if (!caseData || userSens[id]) return;
    setTestingPoint(id);
    setTestedPoints(prev => new Set(prev).add(id));
    setTimeout(() => {
      const result = caseData.affected[id] as Sensitivity;
      setUserSens(prev => ({ ...prev, [id]: result }));
      setTestingPoint(null);
    }, 800);
  };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const levelCorrect = selectedLevel === caseData.correctLevel;
    if (levelCorrect) correct++;
    total++;
    decisions.push({ label: "Nível lesional", userChoice: selectedLevel || "-", idealChoice: caseData.correctLevel, correct: levelCorrect });

    const patCorrect = selectedPattern.toLowerCase().includes(caseData.correctPattern.split("-").pop() || "");
    if (patCorrect) correct++;
    total++;
    decisions.push({ label: "Padrão", userChoice: selectedPattern || "-", idealChoice: caseData.patternOptions.find(p => p.toLowerCase().includes(caseData.correctPattern.split("-").pop() || "")) || caseData.correctPattern, correct: patCorrect });

    if (caseData.asiaOptions) {
      const asiaCorrect = selectedClassification === caseData.correctAsia;
      if (asiaCorrect) correct++;
      total++;
      decisions.push({ label: "Classificação ASIA", userChoice: selectedClassification || "-", idealChoice: caseData.correctAsia || "-", correct: asiaCorrect });
    } else if ((caseData as any).diagnosisOptions) {
      const diagCorrect = selectedClassification === (caseData as any).correctDiagnosis;
      if (diagCorrect) correct++;
      total++;
      decisions.push({ label: "Diagnóstico diferencial", userChoice: selectedClassification || "-", idealChoice: (caseData as any).correctDiagnosis, correct: diagCorrect });
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Classificação correta. O paciente seria encaminhado para o programa de reabilitação neurológica adequado ao nível e padrão identificados, com prognóstico funcional otimizado.`
      : `Classificação inadequada pode levar a programa de reabilitação não direcionado, atrasando a recuperação funcional e reduzindo o potencial de independência do paciente.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("dermatomos");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Dermátomos e Avaliação Sensitiva</h1><p className="text-sm text-muted-foreground">Mapeamento de sensibilidade e correlação neurológica</p></div>
          <SimulatorHowToUse title="Dermátomos" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-dermatomos" toolName="Dermátomos" toolType="simulator" prompt={prompt} />
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
  const expSummary = caseData ? { "Caso": `${caseData.name}`, "Mapa": DERMATOMES.map(d => `${d.label}: ${userSens[d.id] ?? "?"}`).join("; "), "Nível": selectedLevel || "-", "Padrão": selectedPattern || "-", "Classificação": selectedClassification || "-", "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserSens({}); setTestedPoints(new Set()); setSelectedLevel(""); setSelectedPattern(""); setSelectedClassification(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Dermátomos</h1></div>
        <SimulatorHowToUse title="Dermátomos" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setUserSens({}); setTestedPoints(new Set()); setSelectedLevel(""); setSelectedPattern(""); setSelectedClassification(""); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{caseData.description}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Exame</Button>}
          </CardContent>
        </Card>

        {/* M2 — Auto-measured sensitivity */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Exame Sensitivo{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Clique em cada dermátomo para simular o teste sensitivo. A sensibilidade será medida automaticamente:</p>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Normal</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Diminuída</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Ausente</span>
            </div>
            <DermatomesSVG userSens={userSens} onPointClick={handleTestDermatome} testedPoints={testedPoints} />
            {testingPoint && <p className="text-sm text-center text-primary animate-pulse">Testando {testingPoint}...</p>}
            {allTested && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Mapa</Button>}
          </CardContent>
        </Card>

        {/* M3 — Level and pattern (student decides) */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Correlação Neurológica{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && caseData && (<>
              <p className="text-sm text-muted-foreground">Com base no mapa sensitivo, identifique:</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nível lesional:</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger><SelectValue placeholder="Selecionar nível" /></SelectTrigger>
                  <SelectContent>{caseData.levelOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Padrão:</label>
                {caseData.patternOptions.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedPattern === opt ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="pattern" checked={selectedPattern === opt} onChange={() => setSelectedPattern(opt)} />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
              {selectedLevel && selectedPattern && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 — ASIA or Diagnosis (student decides) */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>{caseData?.asiaOptions ? "Classificação ASIA" : "Diagnóstico Diferencial"}{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && caseData && (<>
              <p className="text-sm text-muted-foreground">{caseData.asiaOptions ? "Determine a classificação ASIA:" : "Selecione o diagnóstico mais provável:"}</p>
              {(caseData.asiaOptions || (caseData as any).diagnosisOptions || []).map((opt: string, i: number) => (
                <label key={i} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedClassification === opt ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" name="classification" checked={selectedClassification === opt} onChange={() => setSelectedClassification(opt)} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {selectedClassification && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Dermátomos e Avaliação Sensitiva" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
