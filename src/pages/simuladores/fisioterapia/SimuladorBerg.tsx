import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle2, Scale, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
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
  "Selecione um caso clínico para iniciar a avaliação de equilíbrio.",
  "Em M1, revise os dados do paciente.",
  "Em M2, aplique a escala pontuando cada um dos 14 itens (0-4).",
  "Em M3, analise o gráfico radar e determine o score total e a classificação de risco.",
  "Em M4, selecione os exercícios para o programa de treino de equilíbrio.",
  "Ao final, revise o feedback com o prognóstico de risco de queda.",
];

const BERG_ITEMS = [
  { id: 1, name: "Sentado para em pé", desc: "Levantar-se sem apoio das mãos" },
  { id: 2, name: "Em pé sem apoio", desc: "Manter-se em pé por 2 minutos" },
  { id: 3, name: "Sentado sem apoio", desc: "Manter-se sentado com pés no chão" },
  { id: 4, name: "Em pé para sentado", desc: "Sentar-se controladamente" },
  { id: 5, name: "Transferências", desc: "Transferir-se entre duas cadeiras" },
  { id: 6, name: "Em pé de olhos fechados", desc: "Manter equilíbrio com olhos fechados por 10s" },
  { id: 7, name: "Em pé com pés juntos", desc: "Pés juntos, manter por 1 minuto" },
  { id: 8, name: "Alcance funcional", desc: "Braço estendido à frente, alcançar o máximo" },
  { id: 9, name: "Pegar objeto do chão", desc: "Pegar um sapato do chão à sua frente" },
  { id: 10, name: "Olhar para trás", desc: "Girar o tronco para olhar para trás" },
  { id: 11, name: "Girar 360°", desc: "Dar uma volta completa em ambas direções" },
  { id: 12, name: "Pé alternado no degrau", desc: "Tocar alternadamente um degrau com os pés" },
  { id: 13, name: "Em pé com um pé à frente", desc: "Tandem — um pé diretamente à frente do outro" },
  { id: 14, name: "Apoio unipodal", desc: "Ficar em pé sobre uma perna" },
];

const CASES = [
  { id: "c1", name: "Idoso com quedas recorrentes", age: 78, desc: "3 quedas nos últimos 6 meses, usa bengala", difficulty: "Médio", scores: [3, 2, 4, 3, 2, 1, 1, 2, 2, 3, 2, 1, 0, 0] },
  { id: "c2", name: "Pós-AVC — hemiparesia esquerda", age: 65, desc: "AVC há 3 meses, deambula com auxílio", difficulty: "Difícil", scores: [2, 2, 3, 2, 1, 0, 0, 1, 1, 2, 1, 0, 0, 0] },
  { id: "c3", name: "Parkinson (H&Y III)", age: 71, desc: "Instabilidade postural, festinação, congelamento", difficulty: "Médio", scores: [3, 3, 4, 3, 2, 2, 1, 2, 3, 2, 1, 1, 0, 0] },
];

const EXERCISES = [
  { id: "bipedal", name: "Treino bipodal em superfície instável", desc: "Espuma, disco proprioceptivo" },
  { id: "tandem", name: "Marcha em tandem", desc: "Pé ante pé em linha reta" },
  { id: "unipodal", name: "Apoio unipodal progressivo", desc: "Com/sem apoio, olhos abertos/fechados" },
  { id: "alcance", name: "Alcance funcional multidirecional", desc: "Anterior, lateral e posterior" },
  { id: "sentado-pe", name: "Treino de transferência sentado-em pé", desc: "Progressão de altura da cadeira" },
  { id: "dupla-tarefa", name: "Treino de dupla tarefa", desc: "Cognitivo + motor simultâneo" },
];

function BalanceSVG({ currentItem, score }: { currentItem: number; score: number | null }) {
  const item = BERG_ITEMS[currentItem];
  const isStanding = [1, 2, 6, 7, 8, 10, 11, 13, 14].includes(item.id);
  const isOneleg = item.id === 14;
  const stability = score !== null ? score / 4 : 0.5;
  const cogX = 50 + (1 - stability) * 15 * (currentItem % 2 === 0 ? 1 : -1);
  return (
    <svg viewBox="0 0 100 90" className="w-full max-w-[200px] mx-auto">
      <rect x={5} y={5} width={90} height={80} fill="hsl(var(--muted)/0.2)" rx={4} />
      <rect x={30} y={72} width={40} height={4} rx={2} fill="hsl(var(--foreground)/0.1)" stroke="hsl(var(--border))" strokeWidth={0.3} />
      {isStanding ? (<>
        <circle cx={50} cy={20} r={6} fill="hsl(var(--foreground)/0.15)" />
        <line x1={50} y1={26} x2={50} y2={52} stroke="hsl(var(--foreground)/0.2)" strokeWidth={2} />
        <line x1={50} y1={32} x2={35} y2={42} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1.5} />
        <line x1={50} y1={32} x2={65} y2={42} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1.5} />
        {isOneleg ? (<><line x1={50} y1={52} x2={50} y2={72} stroke="hsl(var(--foreground)/0.2)" strokeWidth={2} /><line x1={50} y1={55} x2={60} y2={62} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1.5} strokeDasharray="2 1" /></>)
          : (<><line x1={50} y1={52} x2={42} y2={72} stroke="hsl(var(--foreground)/0.2)" strokeWidth={1.5} /><line x1={50} y1={52} x2={58} y2={72} stroke="hsl(var(--foreground)/0.2)" strokeWidth={1.5} /></>)}
      </>) : (<>
        <circle cx={50} cy={25} r={6} fill="hsl(var(--foreground)/0.15)" />
        <line x1={50} y1={31} x2={50} y2={50} stroke="hsl(var(--foreground)/0.2)" strokeWidth={2} />
        <line x1={50} y1={50} x2={42} y2={72} stroke="hsl(var(--foreground)/0.2)" strokeWidth={1.5} />
        <line x1={50} y1={50} x2={58} y2={72} stroke="hsl(var(--foreground)/0.2)" strokeWidth={1.5} />
        <rect x={38} y={48} width={24} height={3} rx={1} fill="hsl(var(--foreground)/0.1)" />
      </>)}
      {score !== null && (<><circle cx={cogX} cy={45} r={3} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.8} strokeDasharray="1 1" /><circle cx={cogX} cy={45} r={1} fill="hsl(var(--primary))" /><text x={cogX} y={42} textAnchor="middle" fontSize={3} fill="hsl(var(--primary))">CoG</text></>)}
      <text x={50} y={86} textAnchor="middle" fontSize={3.5} fill="hsl(var(--foreground))">{item.name}</text>
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.desc } }));

export default function SimuladorBerg() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-berg") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("berg", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [userScores, setUserScores] = useState<(number | null)[]>(new Array(14).fill(null));
  const [userTotalScore, setUserTotalScore] = useState("");
  const [userRiskLevel, setUserRiskLevel] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allScored = userScores.every(s => s !== null);
  const realTotalScore = userScores.reduce((sum, s) => sum + (s ?? 0), 0);
  const realRiskLevel = realTotalScore < 36 ? "Alto risco" : realTotalScore < 45 ? "Risco moderado" : "Baixo risco";

  const radarData = BERG_ITEMS.map((item, i) => ({ subject: item.id.toString(), score: userScores[i] ?? 0, fullMark: 4 }));

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    // Score accuracy
    const scoreNum = parseInt(userTotalScore);
    const scoreCorrect = !isNaN(scoreNum) && Math.abs(scoreNum - realTotalScore) <= 2;
    if (scoreCorrect) correct++;
    total++;
    decisions.push({ label: "Score total", userChoice: userTotalScore || "-", idealChoice: `${realTotalScore}/56`, correct: scoreCorrect, explanation: !scoreCorrect ? `Diferença: ${Math.abs((scoreNum || 0) - realTotalScore)} pontos` : undefined });

    // Risk classification
    const riskCorrect = userRiskLevel.toLowerCase().includes(realRiskLevel.toLowerCase().split(" ")[0]);
    if (riskCorrect) correct++;
    total++;
    decisions.push({ label: "Classificação de risco", userChoice: userRiskLevel || "-", idealChoice: realRiskLevel, correct: riskCorrect });

    // Exercises
    const exCorrect = selectedExercises.length >= 3;
    if (exCorrect) correct++;
    total++;
    decisions.push({ label: "Programa de treino", userChoice: `${selectedExercises.length} exercícios`, idealChoice: "≥3 exercícios adequados", correct: exCorrect });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Avaliação precisa. Com o programa de treino adequado, ${caseData.name} teria redução de ~40% no risco de queda em 12 semanas e melhora funcional significativa.`
      : `Imprecisão na avaliação ou programa insuficiente. O risco de queda permaneceria elevado e o paciente não receberia intervenção proporcional ao seu déficit de equilíbrio.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("berg");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedCase(CASES[0]?.id || ""); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Escala de Equilíbrio de Berg</h1><p className="text-sm text-muted-foreground">Avaliação funcional de equilíbrio e risco de queda</p></div>
          <SimulatorHowToUse title="Escala de Berg" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-berg" toolName="Escala de Berg" toolType="simulator" prompt={prompt} />
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
  const expSummary = caseData ? { "Paciente": `${caseData.name}, ${caseData.age}a`, "Score Real": `${realTotalScore}/56`, "Score Aluno": userTotalScore || "-", "Risco": userRiskLevel || "-", "Programa": selectedExercises.map(id => EXERCISES.find(e => e.id === id)?.name).join(", ") || "Nenhum", "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserScores(new Array(14).fill(null)); setUserTotalScore(""); setUserRiskLevel(""); setSelectedExercises([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Escala de Berg</h1></div>
        <SimulatorHowToUse title="Escala de Berg" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setUserScores(new Array(14).fill(null)); setCurrentItemIndex(0); setUserTotalScore(""); setUserRiskLevel(""); setSelectedExercises([]); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.age}a</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg">{caseData.desc}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Aplicação da Escala ({currentItemIndex + 1}/14){completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && (<>
              <BalanceSVG currentItem={currentItemIndex} score={userScores[currentItemIndex]} />
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium">{BERG_ITEMS[currentItemIndex].id}. {BERG_ITEMS[currentItemIndex].name}</p>
                <p className="text-muted-foreground">{BERG_ITEMS[currentItemIndex].desc}</p>
                <p className="mt-1 text-xs">Desempenho: <em>{caseData.scores[currentItemIndex] <= 1 ? "Grande dificuldade, necessita auxílio" : caseData.scores[currentItemIndex] <= 2 ? "Consegue com dificuldade moderada" : caseData.scores[currentItemIndex] <= 3 ? "Realiza com leve dificuldade" : "Realiza normalmente"}</em></p>
              </div>
              <div className="flex gap-1 justify-center">
                {[0, 1, 2, 3, 4].map(s => (
                  <Button key={s} size="sm" variant={userScores[currentItemIndex] === s ? "default" : "outline"} onClick={() => { const n = [...userScores]; n[currentItemIndex] = s; setUserScores(n); }} className="w-10">{s}</Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={currentItemIndex === 0} onClick={() => setCurrentItemIndex(p => p - 1)} className="flex-1">Anterior</Button>
                <Button size="sm" variant="outline" disabled={currentItemIndex === 13 || userScores[currentItemIndex] === null} onClick={() => setCurrentItemIndex(p => p + 1)} className="flex-1">Próximo</Button>
              </div>
              {allScored && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Pontuação</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M3 — Student interprets the radar and decides score + risk */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Interpretação do Resultado{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}><PolarGrid stroke="hsl(var(--muted))" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} /><PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 8 }} /><Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} /></RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-muted-foreground">Analise o gráfico e determine:</p>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Score total (0-56):</label>
                  <Input type="number" min={0} max={56} value={userTotalScore} onChange={e => setUserTotalScore(e.target.value)} placeholder="Digite o score" />
                </div>
                <div>
                  <label className="text-sm font-medium">Classificação de risco:</label>
                  <Select value={userRiskLevel} onValueChange={setUserRiskLevel}>
                    <SelectTrigger><SelectValue placeholder="Selecionar risco" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alto risco de queda">Alto risco de queda</SelectItem>
                      <SelectItem value="Risco moderado">Risco moderado</SelectItem>
                      <SelectItem value="Baixo risco">Baixo risco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {userTotalScore && userRiskLevel && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Análise</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Treino{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (<>
              {EXERCISES.map(e => (
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
      <LabReportPanel benchTitle="Escala de Equilíbrio de Berg" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
