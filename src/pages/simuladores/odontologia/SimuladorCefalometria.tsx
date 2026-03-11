import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Crosshair, BarChart3, Wrench, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

const CASES = [
  { id: "c1", classe: "Classe I", profile: "Perfil reto, relação molar normal", points: { S: { x: 140, y: 55 }, N: { x: 170, y: 50 }, A: { x: 185, y: 110 }, B: { x: 178, y: 150 }, Gn: { x: 175, y: 195 }, Go: { x: 80, y: 175 } }, sna: 82, snb: 80, anb: 2, idealClassification: "Classe I (ANB 0-4°)", idealTreatment: "fixo", consequence: { correct: "Tratamento ortodôntico convencional adequado. A Classe I esquelética permite correção apenas dentária, com bom prognóstico e resultado estético previsível.", wrong: "Tratamento excessivo ou inadequado para o padrão esquelético. Intervenção cirúrgica em Classe I é desnecessária e a correção excessiva pode comprometer o perfil facial." } },
  { id: "c2", classe: "Classe II div 1", profile: "Perfil convexo, mandíbula retrognática", points: { S: { x: 140, y: 55 }, N: { x: 170, y: 50 }, A: { x: 190, y: 108 }, B: { x: 170, y: 155 }, Gn: { x: 168, y: 198 }, Go: { x: 75, y: 178 } }, sna: 84, snb: 76, anb: 8, idealClassification: "Classe II (ANB >4°)", idealTreatment: "fixo", consequence: { correct: "Aparelho fixo com mecânica Classe II (elásticos intermaxilares) é adequado para ANB 8°. Prognóstico favorável com boa cooperação do paciente.", wrong: "ANB de 8° está no limite entre tratamento conservador e cirúrgico. A escolha inadequada pode resultar em compensação dentária excessiva ou recidiva." } },
  { id: "c3", classe: "Classe III", profile: "Perfil côncavo, prognatismo mandibular", points: { S: { x: 140, y: 55 }, N: { x: 170, y: 50 }, A: { x: 180, y: 112 }, B: { x: 192, y: 148 }, Gn: { x: 190, y: 195 }, Go: { x: 82, y: 172 } }, sna: 78, snb: 82, anb: -4, idealClassification: "Classe III (ANB <0°)", idealTreatment: "ortognatica", consequence: { correct: "ANB -4° com prognatismo mandibular indica discrepância esquelética severa. A cirurgia ortognática é a abordagem mais previsível para correção do perfil e oclusão.", wrong: "Alinhadores ou ortodontia convencional isolada são insuficientes para ANB -4°. A camuflagem dentária compromete o perfil e tem alta taxa de recidiva em Classe III esquelética." } },
];

const TREATMENTS = [
  { id: "fixo", label: "Aparelho fixo convencional", desc: "Braquetes metálicos/estéticos para correção dentária" },
  { id: "alinhadores", label: "Alinhadores transparentes", desc: "Moldeiras sequenciais para movimentação progressiva" },
  { id: "ortognatica", label: "Cirurgia ortognática", desc: "Correção cirúrgica da discrepância esquelética" },
  { id: "expansor", label: "Aparelho expansor (Hyrax)", desc: "Disjunção palatina rápida para atresia maxilar" },
];

type PointKey = "S" | "N" | "A" | "B" | "Gn" | "Go";
const POINT_LABELS: Record<PointKey, string> = { S: "Sela", N: "Násio", A: "Ponto A", B: "Ponto B", Gn: "Gnátio", Go: "Gônio" };

function CephalogramSVG({ caseData, userPoints, onPointClick }: { caseData: typeof CASES[0]; userPoints: Partial<Record<PointKey, { x: number; y: number }>>; onPointClick: (e: React.MouseEvent<SVGSVGElement>) => void; }) {
  return (
    <svg viewBox="0 0 260 240" className="w-full cursor-crosshair" onClick={onPointClick}>
      <path d="M80 30 Q100 10 140 15 Q180 10 200 30 Q220 50 215 80 Q210 110 200 130 Q195 140 190 155 Q188 170 185 185 Q180 200 170 210 Q150 220 120 210 Q100 200 85 185 Q75 170 70 150 Q60 130 55 110 Q50 80 55 60 Q60 40 80 30 Z" fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} opacity={0.6} />
      <path d="M160 120 Q175 115 190 120 Q195 130 192 140 Q185 145 175 145 Q165 140 160 130 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />
      <path d="M75 170 Q85 160 100 158 Q130 155 160 158 Q175 160 185 170 Q190 180 185 195 Q175 210 155 215 Q120 218 90 210 Q78 200 75 185 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />
      <rect x={165} y={135} width={20} height={8} rx={2} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <rect x={165} y={155} width={20} height={8} rx={2} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.5} />
      {(Object.entries(caseData.points) as [PointKey, { x: number; y: number }][]).map(([key, pt]) => (
        <g key={key}><circle cx={pt.x} cy={pt.y} r={4} fill="hsl(var(--primary))" opacity={0.3} /><text x={pt.x + 7} y={pt.y + 3} fontSize={7} fill="hsl(var(--muted-foreground))" opacity={0.5}>{key}</text></g>
      ))}
      {(Object.entries(userPoints) as [PointKey, { x: number; y: number }][]).map(([key, pt]) => (
        <g key={`user-${key}`}><circle cx={pt.x} cy={pt.y} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} /><text x={pt.x + 8} y={pt.y + 3} fontSize={8} fill="#ef4444" fontWeight="bold">{key}</text></g>
      ))}
      {userPoints.S && userPoints.N && <line x1={userPoints.S.x} y1={userPoints.S.y} x2={userPoints.N.x} y2={userPoints.N.y} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" />}
      {userPoints.N && userPoints.A && <line x1={userPoints.N.x} y1={userPoints.N.y} x2={userPoints.A.x} y2={userPoints.A.y} stroke="#22c55e" strokeWidth={1} strokeDasharray="4 2" />}
      {userPoints.N && userPoints.B && <line x1={userPoints.N.x} y1={userPoints.N.y} x2={userPoints.B.x} y2={userPoints.B.y} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" />}
    </svg>
  );
}

const HOW_TO = ["Selecione o caso no Módulo 1.", "Marque os pontos cefalométricos (S, N, A, B, Gn, Go) clicando na telerradiografia SVG.", "Analise os ângulos calculados e classifique o padrão esquelético.", "Escolha o plano de tratamento adequado no Módulo 4.", "O Feedback mostrará a adequação do tratamento ao padrão."];
const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.classe, difficulty: Math.abs(c.anb) > 4 ? "Difícil" : "Médio", patient: { diagnosis: c.profile } }));

export default function SimuladorCefalometria() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-cefalometria") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("cefalometria", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [userPoints, setUserPoints] = useState<Partial<Record<PointKey, { x: number; y: number }>>>({});
  const [currentPoint, setCurrentPoint] = useState<PointKey>("S");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const pointOrder: PointKey[] = ["S", "N", "A", "B", "Gn", "Go"];
  const placedCount = Object.keys(userPoints).length;

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (placedCount >= 6) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 260;
    const y = ((e.clientY - rect.top) / rect.height) * 240;
    setUserPoints(prev => ({ ...prev, [currentPoint]: { x, y } }));
    const nextIdx = pointOrder.indexOf(currentPoint) + 1;
    if (nextIdx < pointOrder.length) setCurrentPoint(pointOrder[nextIdx]);
  };

  const calcAngle = (p1: { x: number; y: number }, vertex: { x: number; y: number }, p2: { x: number; y: number }) => {
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    let angle = Math.abs((a1 - a2) * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const userSNA = userPoints.S && userPoints.N && userPoints.A ? calcAngle(userPoints.S, userPoints.N, userPoints.A).toFixed(1) : "-";
  const userSNB = userPoints.S && userPoints.N && userPoints.B ? calcAngle(userPoints.S, userPoints.N, userPoints.B).toFixed(1) : "-";
  const userANB = userSNA !== "-" && userSNB !== "-" ? (parseFloat(userSNA) - parseFloat(userSNB)).toFixed(1) : "-";

  const confirmTreatment = () => { completeModule(4); setShowFeedback(true); };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    decisions.push({ label: "Classificação esquelética", userChoice: selectedClassification || "-", idealChoice: caseData.idealClassification, correct: selectedClassification === caseData.idealClassification });
    decisions.push({ label: "Plano de tratamento", userChoice: TREATMENTS.find(t => t.id === selectedTreatment)?.label || "-", idealChoice: TREATMENTS.find(t => t.id === caseData.idealTreatment)?.label || "-", correct: selectedTreatment === caseData.idealTreatment });
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    const narrative = score === 100 ? caseData.consequence.correct : caseData.consequence.wrong;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("cefalometria");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Cefalometria e Classificação de Angle</h1><p className="text-sm text-muted-foreground">Marcação cefalométrica interativa com cálculo SNA, SNB, ANB</p></div>
          <SimulatorHowToUse title="Cefalometria" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-cefalometria" toolName="Cefalometria" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />)}
        </div>
        {isAdmin && !isVR && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary: Record<string, string> = caseData ? { "Caso": caseData.classe, "SNA": `${userSNA}° (ref: ${caseData.sna}°)`, "SNB": `${userSNB}° (ref: ${caseData.snb}°)`, "ANB": `${userANB}° (ref: ${caseData.anb}°)`, "Classificação": selectedClassification || "-", "Tratamento": TREATMENTS.find(t => t.id === selectedTreatment)?.label || "-", "Pontuação": `${feedback.score}%` } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserPoints({}); setCurrentPoint("S"); setSelectedClassification(""); setSelectedTreatment(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Cefalometria e Classificação de Angle</h1></div>
        <SimulatorHowToUse title="Cefalometria" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crosshair className="h-4 w-4 text-primary" /> 1. Seleção do Caso {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedCase} onValueChange={setSelectedCase}><SelectTrigger><SelectValue placeholder="Selecione a classe..." /></SelectTrigger><SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.classe}</SelectItem>)}</SelectContent></Select>{caseData && <div className="bg-muted/50 rounded-lg p-3 text-sm"><p>{caseData.profile}</p></div>}<Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">Confirmar Caso</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crosshair className="h-4 w-4 text-primary" /> 2. Marcação Cefalométrica {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{placedCount < 6 && <p className="text-sm text-center">Clique no SVG para posicionar: <Badge variant="outline">{currentPoint} — {POINT_LABELS[currentPoint]}</Badge></p>}{caseData && <CephalogramSVG caseData={caseData} userPoints={userPoints} onPointClick={handleSVGClick} />}<div className="flex flex-wrap gap-1">{pointOrder.map(p => <Badge key={p} variant={userPoints[p] ? "default" : "outline"} className="text-[10px]">{p}</Badge>)}</div>{placedCount > 0 && <Button variant="outline" size="sm" onClick={() => { setUserPoints({}); setCurrentPoint("S"); }}>Resetar pontos</Button>}<Button onClick={() => completeModule(2)} disabled={placedCount < 4 || completedModules.has(2)} className="w-full">Confirmar Marcação</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> 3. Análise Cefalométrica {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-3 gap-2 text-center"><div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">SNA</p><p className="font-bold text-lg">{userSNA}°</p><p className="text-[10px] text-muted-foreground">Ref: 82°±2</p></div><div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">SNB</p><p className="font-bold text-lg">{userSNB}°</p><p className="text-[10px] text-muted-foreground">Ref: 80°±2</p></div><div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">ANB</p><p className="font-bold text-lg">{userANB}°</p><p className="text-[10px] text-muted-foreground">Ref: 2°±2</p></div></div><div><p className="text-sm font-medium mb-2">Classificação esquelética:</p>{["Classe I (ANB 0-4°)", "Classe II (ANB >4°)", "Classe III (ANB <0°)"].map(c => (<label key={c} className={`block p-2 rounded border text-sm cursor-pointer mb-1 ${selectedClassification === c ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="class" value={c} checked={selectedClassification === c} onChange={() => setSelectedClassification(c)} className="sr-only" />{c}</label>))}</div><Button onClick={() => completeModule(3)} disabled={!selectedClassification || completedModules.has(3)} className="w-full">Confirmar Análise</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> 4. Plano de Tratamento {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{TREATMENTS.map(t => (<label key={t.id} className={`block p-3 rounded border cursor-pointer ${selectedTreatment === t.id ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="treatment" value={t.id} checked={selectedTreatment === t.id} onChange={() => setSelectedTreatment(t.id)} className="sr-only" /><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p></label>))}<Button onClick={confirmTreatment} disabled={!selectedTreatment || completedModules.has(4)} className="w-full">Confirmar Tratamento</Button></CardContent></Card>

      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Cefalometria Ortodôntica" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
