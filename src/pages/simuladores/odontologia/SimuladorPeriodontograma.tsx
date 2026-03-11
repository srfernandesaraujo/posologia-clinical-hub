import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Ruler, ClipboardList, Wrench, ArrowLeft, Sparkles } from "lucide-react";
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
  { id: "g1", name: "Gengivite", desc: "Inflamação gengival reversível, sem perda óssea", depths: [2,2,3,2,2,3], bop: [true,false,true,false,true,false], boneLoss: 0, idealStage: "I", idealGrade: "A", idealTreatments: ["rasp"], consequence: { correct: "A raspagem supragengival resolve a gengivite. Em 2-4 semanas o BOP normaliza e a gengiva volta ao tom rosado saudável.", wrong: "Tratamento insuficiente ou excessivo. Gengivite não tratada adequadamente pode progredir para periodontite com perda óssea irreversível." } },
  { id: "p1", name: "Periodontite Estágio I", desc: "Perda de inserção 1-2mm, profundidades até 4mm", depths: [3,3,4,3,3,4], bop: [true,true,false,true,false,true], boneLoss: 15, idealStage: "I", idealGrade: "B", idealTreatments: ["rasp"], consequence: { correct: "RAR adequada controla a progressão do Estágio I. Manutenção periódica a cada 3-4 meses estabiliza os tecidos.", wrong: "Sem tratamento adequado, a periodontite progride para estágios avançados com perda óssea acelerada." } },
  { id: "p2", name: "Periodontite Estágio III", desc: "Perda de inserção ≥5mm, bolsas profundas, mobilidade", depths: [5,6,7,4,5,6], bop: [true,true,true,true,true,true], boneLoss: 50, idealStage: "III", idealGrade: "B", idealTreatments: ["rasp", "antibio", "cirurgia"], consequence: { correct: "A combinação de RAR + antibioticoterapia adjuvante + acesso cirúrgico permite debridamento completo das bolsas profundas e controle da infecção.", wrong: "RAR isolada em Estágio III com bolsas >6mm é insuficiente. A instrumentação não alcança o fundo da bolsa, mantendo biofilme residual e progressão da doença." } },
  { id: "p3", name: "Periodontite Estágio IV", desc: "Perda avançada, menos de 20 dentes, função mastigatória comprometida", depths: [7,8,9,6,7,8], bop: [true,true,true,true,true,true], boneLoss: 70, idealStage: "IV", idealGrade: "C", idealTreatments: ["rasp", "antibio", "cirurgia", "regeneracao"], consequence: { correct: "Abordagem completa com RTG é a melhor chance de recuperação tecidual. Combinada com controle microbiano sistêmico, permite regeneração parcial do tecido de suporte.", wrong: "Tratamento conservador isolado em Estágio IV é insuficiente. Sem cirurgia e regeneração, a perda óssea progressiva levará à perda dos dentes remanescentes." } },
];

const CLASSIFICATION = [
  { stage: "I", label: "Estágio I — Inicial" },
  { stage: "II", label: "Estágio II — Moderada" },
  { stage: "III", label: "Estágio III — Severa com potencial perda" },
  { stage: "IV", label: "Estágio IV — Avançada com perda de função" },
];

const GRADES = [
  { grade: "A", label: "Grau A — Progressão lenta" },
  { grade: "B", label: "Grau B — Progressão moderada" },
  { grade: "C", label: "Grau C — Progressão rápida" },
];

const TREATMENTS = [
  { id: "rasp", label: "Raspagem e alisamento radicular (RAR)", desc: "Debridamento mecânico subgengival" },
  { id: "antibio", label: "Antibioticoterapia adjuvante", desc: "Amoxicilina + metronidazol sistêmico" },
  { id: "cirurgia", label: "Cirurgia periodontal a retalho", desc: "Acesso cirúrgico para debridamento" },
  { id: "regeneracao", label: "Regeneração tecidual guiada (RTG)", desc: "Membrana + enxerto ósseo" },
];

const SITES = ["MV", "V", "DV", "ML", "L", "DL"] as const;

function ProbeSVG({ depths, bopFlags, probedSites, onSiteClick }: { depths: number[]; bopFlags: boolean[]; probedSites: Set<number>; onSiteClick?: (index: number) => void }) {
  const w = 300, h = 200, toothX = 150, gumLine = 60;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <rect x={20} y={120} width={w - 40} height={60} rx={4} fill="hsl(var(--muted))" opacity={0.3} />
      <rect x={toothX - 40} y={30} width={80} height={140} rx={6} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.5} />
      <rect x={toothX - 40} y={30} width={80} height={35} rx={6} fill="#ebe5d9" stroke="hsl(var(--border))" strokeWidth={1} />
      <path d={`M 30 ${gumLine} Q ${toothX - 50} ${gumLine + 5} ${toothX - 40} ${gumLine + 3} Q ${toothX} ${gumLine - 5} ${toothX + 40} ${gumLine + 3} Q ${toothX + 50} ${gumLine + 5} ${w - 30} ${gumLine} L ${w - 30} ${gumLine + 20} Q ${toothX} ${gumLine + 25} 30 ${gumLine + 20} Z`} fill="#f472b6" opacity={0.5} stroke="#ec4899" strokeWidth={0.8} />
      {SITES.map((site, i) => {
        const siteX = toothX - 35 + (i * 14);
        const probed = probedSites.has(i);
        const d = depths[i] || 0;
        const probeEnd = gumLine + d * 8;
        const isBleeding = bopFlags[i];
        return (
          <g key={i} className={onSiteClick && !probed ? "cursor-pointer" : ""} onClick={() => onSiteClick && !probed && onSiteClick(i)}>
            {probed ? (
              <>
                <line x1={siteX} y1={gumLine - 5} x2={siteX} y2={probeEnd} stroke={d >= 5 ? "#ef4444" : d >= 4 ? "#f59e0b" : "#22c55e"} strokeWidth={2} strokeLinecap="round" />
                <text x={siteX} y={probeEnd + 12} textAnchor="middle" fontSize={8} fill={d >= 5 ? "#ef4444" : "hsl(var(--foreground))"} fontWeight="bold">{d}</text>
                {isBleeding && <circle cx={siteX} cy={gumLine} r={3} fill="#ef4444" />}
              </>
            ) : (
              <>
                <line x1={siteX} y1={gumLine - 5} x2={siteX} y2={gumLine + 15} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.5} />
                <circle cx={siteX} cy={gumLine + 18} r={4} fill="hsl(var(--primary))" opacity={0.3}>
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            <text x={siteX} y={gumLine - 12} textAnchor="middle" fontSize={6} fill="hsl(var(--muted-foreground))">{site}</text>
          </g>
        );
      })}
      <g transform={`translate(20, ${h - 18})`}><circle cx={5} cy={5} r={3} fill="#22c55e" /><text x={12} y={8} fontSize={7} fill="hsl(var(--foreground))">≤3mm</text><circle cx={55} cy={5} r={3} fill="#f59e0b" /><text x={62} y={8} fontSize={7} fill="hsl(var(--foreground))">4mm</text><circle cx={95} cy={5} r={3} fill="#ef4444" /><text x={102} y={8} fontSize={7} fill="hsl(var(--foreground))">≥5mm</text><circle cx={145} cy={5} r={3} fill="#ef4444" /><text x={152} y={8} fontSize={7} fill="hsl(var(--foreground))">BOP</text></g>
    </svg>
  );
}

const HOW_TO = ["Selecione o caso clínico no Módulo 1.", "No Módulo 2, clique em cada sítio (MV, V, DV, ML, L, DL) para realizar a sondagem. A profundidade e sangramento são revelados ao clicar.", "Classifique a doença (Estágio e Grau AAP/EFP 2018) no Módulo 3.", "Selecione o plano terapêutico no Módulo 4.", "O Feedback mostrará o resultado das suas decisões clínicas."];
const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.boneLoss > 50 ? "Difícil" : "Médio", patient: { diagnosis: c.desc } }));

export default function SimuladorPeriodontograma() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-periodontograma") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("periodontograma", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [probedSites, setProbedSites] = useState<Set<number>>(new Set());
  const [revealedDepths, setRevealedDepths] = useState<number[]>([0,0,0,0,0,0]);
  const [revealedBop, setRevealedBop] = useState<boolean[]>([false,false,false,false,false,false]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const handleSiteClick = (index: number) => {
    if (!caseData) return;
    const depth = caseData.depths[index] + Math.round((Math.random() - 0.5) * 1);
    const bop = caseData.bop[index];
    setProbedSites(prev => new Set(prev).add(index));
    setRevealedDepths(prev => { const n = [...prev]; n[index] = depth; return n; });
    setRevealedBop(prev => { const n = [...prev]; n[index] = bop; return n; });
  };

  const allSitesProbed = probedSites.size === 6;
  const confirmProbing = () => { if (allSitesProbed) completeModule(2); };
  const confirmTreatment = () => { completeModule(4); setShowFeedback(true); };

  const bopPercent = allSitesProbed ? Math.round(revealedBop.filter(Boolean).length / 6 * 100) : 0;
  const maxDepth = allSitesProbed ? Math.max(...revealedDepths) : 0;

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    decisions.push({ label: "Estágio", userChoice: `Estágio ${selectedStage}`, idealChoice: `Estágio ${caseData.idealStage}`, correct: selectedStage === caseData.idealStage });
    decisions.push({ label: "Grau", userChoice: `Grau ${selectedGrade}`, idealChoice: `Grau ${caseData.idealGrade}`, correct: selectedGrade === caseData.idealGrade });
    const idealSet = new Set(caseData.idealTreatments);
    const userSet = new Set(selectedTreatments);
    caseData.idealTreatments.forEach(t => { const tl = TREATMENTS.find(x => x.id === t)?.label || t; decisions.push({ label: tl, userChoice: userSet.has(t) ? "Incluído" : "Não incluído", idealChoice: "Incluído", correct: userSet.has(t) }); });
    selectedTreatments.filter(t => !idealSet.has(t)).forEach(t => { const tl = TREATMENTS.find(x => x.id === t)?.label || t; decisions.push({ label: tl, userChoice: "Incluído", idealChoice: "Não necessário", correct: false }); });
    const correctCount = decisions.filter(d => d.correct).length;
    const score = Math.round((correctCount / decisions.length) * 100);
    const allTreatmentsCorrect = caseData.idealTreatments.every(t => userSet.has(t)) && selectedTreatments.length === caseData.idealTreatments.length;
    const narrative = allTreatmentsCorrect && selectedStage === caseData.idealStage ? caseData.consequence.correct : caseData.consequence.wrong;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Periodontograma e Classificação</h1><p className="text-sm text-muted-foreground">Sondagem periodontal interativa AAP/EFP 2018</p></div>
          <SimulatorHowToUse title="Periodontograma" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-periodontograma" toolName="Periodontograma" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />)}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary: Record<string, string> = caseData ? { "Caso": caseData.name, "Prof. máxima": `${maxDepth}mm`, "BOP": `${bopPercent}%`, "Classificação": selectedStage ? `Estágio ${selectedStage}` : "-", "Grau": selectedGrade || "-", "Tratamentos": selectedTreatments.length > 0 ? selectedTreatments.join(", ") : "-", "Pontuação": `${feedback.score}%` } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setProbedSites(new Set()); setRevealedDepths([0,0,0,0,0,0]); setRevealedBop([false,false,false,false,false,false]); setSelectedStage(""); setSelectedGrade(""); setSelectedTreatments([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Periodontograma e Classificação</h1></div>
        <SimulatorHowToUse title="Periodontograma" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> 1. Caso Clínico {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedCase} onValueChange={setSelectedCase}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>{caseData && <div className="bg-muted/50 rounded-lg p-3 text-sm"><p>{caseData.desc}</p><p className="text-muted-foreground mt-1">Perda óssea estimada: {caseData.boneLoss}%</p></div>}<Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">Confirmar Caso</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /> 2. Sondagem Interativa {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">Clique em cada sítio para realizar a sondagem ({probedSites.size}/6 sítios sondados)</p>
          <ProbeSVG depths={revealedDepths} bopFlags={revealedBop} probedSites={probedSites} onSiteClick={completedModules.has(2) ? undefined : handleSiteClick} />
          {allSitesProbed && (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground text-xs">Prof. Máx.</p><p className="font-bold text-lg">{maxDepth}mm</p></div>
              <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground text-xs">BOP</p><p className="font-bold text-lg">{bopPercent}%</p></div>
              <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground text-xs">Sítios ≥5mm</p><p className="font-bold text-lg">{revealedDepths.filter(d => d >= 5).length}</p></div>
            </div>
          )}
          <Button onClick={confirmProbing} disabled={!allSitesProbed || completedModules.has(2)} className="w-full">Confirmar Sondagem</Button>
        </CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> 3. Classificação {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="text-sm font-medium mb-2">Estágio (AAP/EFP 2018):</p><div className="space-y-1.5">{CLASSIFICATION.map(c => (<label key={c.stage} className={`block p-2 rounded border text-sm cursor-pointer ${selectedStage === c.stage ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="stage" value={c.stage} checked={selectedStage === c.stage} onChange={() => setSelectedStage(c.stage)} className="sr-only" />{c.label}</label>))}</div></div><div><p className="text-sm font-medium mb-2">Grau:</p><div className="space-y-1.5">{GRADES.map(g => (<label key={g.grade} className={`block p-2 rounded border text-sm cursor-pointer ${selectedGrade === g.grade ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="grade" value={g.grade} checked={selectedGrade === g.grade} onChange={() => setSelectedGrade(g.grade)} className="sr-only" />{g.label}</label>))}</div></div><Button onClick={() => completeModule(3)} disabled={!selectedStage || !selectedGrade || completedModules.has(3)} className="w-full">Confirmar Classificação</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> 4. Plano Terapêutico {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{TREATMENTS.map(t => { const checked = selectedTreatments.includes(t.id); return (<label key={t.id} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted/30 cursor-pointer text-sm"><input type="checkbox" checked={checked} onChange={() => setSelectedTreatments(prev => checked ? prev.filter(x => x !== t.id) : [...prev, t.id])} className="mt-1 rounded" /><div><p className="font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p></div></label>); })}<Button onClick={confirmTreatment} disabled={selectedTreatments.length === 0 || completedModules.has(4)} className="w-full">Confirmar Tratamento</Button></CardContent></Card>

      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Periodontograma" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
