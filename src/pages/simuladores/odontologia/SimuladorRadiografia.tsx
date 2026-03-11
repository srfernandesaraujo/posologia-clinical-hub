import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lock, CheckCircle2, Image, Search, FileText, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
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
  { id: "r1", exam: "periapical", title: "Lesão periapical em 21", structures: ["Raiz do 21", "Osso alveolar", "Lâmina dura", "Espaço do ligamento periodontal"],
    pathologies: [
      { name: "Lesão radiolúcida periapical", type: "radiolúcida", classification: "Granuloma/Cisto periapical", distractors: ["Cementoma periapical", "Displasia fibrosa"] }
    ],
    idealDiagnosis: "Granuloma periapical com indicação de tratamento endodôntico",
    consequence: { correct: "Identificação correta da lesão permite encaminhamento para tratamento endodôntico e acompanhamento radiográfico. Prognóstico favorável com remissão da lesão em 6-12 meses.", wrong: "Falha na identificação pode levar a progressão da lesão, formação de cisto e perda do elemento dental." }
  },
  { id: "r2", exam: "panoramica", title: "Terceiro molar incluso 38", structures: ["Canal mandibular", "Forame mentual", "Seio maxilar", "Processo coronóide", "Côndilo mandibular", "Terceiro molar 38"],
    pathologies: [
      { name: "Inclusão dentária do 38", type: "mista", classification: "Dente incluso — mesioangular", distractors: ["Odontoma composto", "Ameloblastoma"] },
      { name: "Folículo pericoronário alargado", type: "radiolúcida", classification: "Possível cisto dentígero", distractors: ["Queratocisto odontogênico", "Granuloma central de células gigantes"] }
    ],
    idealDiagnosis: "Terceiro molar incluso mesioangular com folículo alargado — indicação de exodontia",
    consequence: { correct: "Identificação correta permite planejamento cirúrgico adequado e prevenção de complicações como infecção e reabsorção radicular do dente adjacente.", wrong: "Subdiagnóstico do folículo alargado pode permitir desenvolvimento de cisto dentígero com destruição óssea significativa." }
  },
  { id: "r3", exam: "interproximal", title: "Cáries interproximais múltiplas", structures: ["Crista óssea alveolar", "Coroas dos pré-molares", "Esmalte proximal"],
    pathologies: [
      { name: "Radiolucidez em esmalte distal do 15", type: "radiolúcida", classification: "Cárie incipiente (esmalte)", distractors: ["Artefato de sobreposição", "Hipoplasia de esmalte"] },
      { name: "Radiolucidez em mesial do 16 atingindo dentina", type: "radiolúcida", classification: "Cárie em dentina", distractors: ["Reabsorção interna", "Cárie de radiação"] }
    ],
    idealDiagnosis: "Cáries interproximais em diferentes estágios — restauração e controle",
    consequence: { correct: "Detecção precoce permite tratamento conservador (remineralização em esmalte, restauração em dentina) com preservação da estrutura dental.", wrong: "Cáries não detectadas progridem silenciosamente, podendo causar comprometimento pulpar e necessidade de tratamento endodôntico." }
  },
];

function PeriapicalSVG({ caseId, identifiedStructures, identifiedPathologies }: { caseId: string; identifiedStructures: Set<string>; identifiedPathologies: Set<string> }) {
  const isLesion = caseId === "r1";
  const isMolar = caseId === "r2";
  return (
    <svg viewBox="0 0 280 200" className="w-full">
      <rect x={0} y={0} width={280} height={200} rx={8} fill="#1a1a2e" />
      <rect x={10} y={80} width={260} height={110} rx={4} fill="#2d2d44" opacity={0.8} />
      {isMolar ? (<>
        <path d="M20 90 Q60 70 140 65 Q220 70 260 90" fill="none" stroke="#4a4a6a" strokeWidth={2} />
        <path d="M30 140 Q100 150 180 145 Q240 140 270 130" fill="none" stroke="#6b6b8a" strokeWidth={3} opacity={0.6} />
        {identifiedStructures.has("Canal mandibular") && <text x={150} y={158} textAnchor="middle" fontSize={7} fill="#22c55e">Canal mandibular ✓</text>}
        {[60,100,140,180,220].map((x, i) => (<g key={i}><rect x={x-12} y={65} width={24} height={30} rx={4} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} /><rect x={x-8} y={95} width={16} height={45} rx={3} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.6} /></g>))}
        <g transform="rotate(-30 55 120)"><rect x={35} y={100} width={20} height={35} rx={4} fill="#9090b0" stroke="#fbbf24" strokeWidth={1.5} /></g>
        {identifiedStructures.has("Terceiro molar 38") && <text x={55} y={90} fontSize={7} fill="#22c55e">38 incluso ✓</text>}
        <ellipse cx={50} cy={125} rx={18} ry={14} fill="#2a2a4a" stroke="#6b6b8a" strokeWidth={0.8} />
        {identifiedPathologies.has("Folículo pericoronário alargado") && <text x={50} y={148} textAnchor="middle" fontSize={6} fill="#ef4444">Folículo ✓</text>}
        <circle cx={120} cy={150} r={5} fill="#1a1a2e" stroke="#6b6b8a" strokeWidth={1} />
        {identifiedStructures.has("Forame mentual") && <text x={120} y={164} textAnchor="middle" fontSize={6} fill="#22c55e">For. mentual ✓</text>}
        <ellipse cx={200} cy={40} rx={40} ry={20} fill="#2a2a4a" stroke="#4a4a6a" strokeWidth={1} />
        {identifiedStructures.has("Seio maxilar") && <text x={200} y={25} textAnchor="middle" fontSize={7} fill="#22c55e">Seio maxilar ✓</text>}
      </>) : isLesion ? (<>
        <rect x={110} y={20} width={60} height={40} rx={6} fill="#c8c8e0" stroke="#8888aa" strokeWidth={1} />
        <rect x={118} y={60} width={20} height={70} rx={4} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.8} />
        <rect x={142} y={60} width={20} height={65} rx={4} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.8} />
        <path d="M115 60 L112 130 Q115 140 128 142 Q138 140 140 130 L137 60" fill="none" stroke="#7a7a9a" strokeWidth={1.5} />
        {identifiedStructures.has("Lâmina dura") && <text x={105} y={100} fontSize={6} fill="#22c55e" transform="rotate(-90 105 100)">Lâm. dura ✓</text>}
        <ellipse cx={128} cy={145} rx={16} ry={12} fill="#1a1a2e" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />
        {identifiedPathologies.has("Lesão radiolúcida periapical") && <text x={128} y={168} textAnchor="middle" fontSize={7} fill="#ef4444">Lesão periapical ✓</text>}
        {identifiedStructures.has("Espaço do ligamento periodontal") && <text x={165} y={100} fontSize={6} fill="#22c55e">LPD ✓</text>}
      </>) : (<>
        {[70, 120, 170, 220].map((x, i) => (<g key={i}><rect x={x-15} y={30} width={30} height={35} rx={5} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} /><rect x={x-15} y={100} width={30} height={35} rx={5} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} /></g>))}
        <path d="M50 75 Q100 70 140 72 Q180 70 230 75" fill="none" stroke="#6b6b8a" strokeWidth={1.5} />
        {identifiedStructures.has("Crista óssea alveolar") && <text x={140} y={88} textAnchor="middle" fontSize={7} fill="#22c55e">Crista óssea ✓</text>}
        <ellipse cx={100} cy={45} rx={5} ry={8} fill="#1a1a2e" opacity={0.7} />
        <ellipse cx={135} cy={42} rx={7} ry={10} fill="#1a1a2e" opacity={0.8} />
        {identifiedPathologies.has("Radiolucidez em esmalte distal do 15") && <circle cx={100} cy={45} r={8} fill="none" stroke="#ef4444" strokeWidth={1} />}
        {identifiedPathologies.has("Radiolucidez em mesial do 16 atingindo dentina") && <circle cx={135} cy={42} r={10} fill="none" stroke="#ef4444" strokeWidth={1} />}
      </>)}
    </svg>
  );
}

const HOW_TO = ["Selecione o tipo de exame e caso no Módulo 1.", "Identifique as estruturas anatômicas no Módulo 2.", "Classifique as patologias (tipo e diagnóstico diferencial) no Módulo 3.", "Redija o laudo radiográfico no Módulo 4.", "O Feedback mostrará a avaliação completa."];
const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.title, difficulty: c.pathologies.length > 1 ? "Difícil" : "Médio", patient: { diagnosis: c.exam } }));

export default function SimuladorRadiografia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-radiografia-odonto") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("radiografia-odonto", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [identifiedStructures, setIdentifiedStructures] = useState<Set<string>>(new Set());
  const [identifiedPathologies, setIdentifiedPathologies] = useState<Set<string>>(new Set());
  const [pathologyClassifications, setPathologyClassifications] = useState<Record<string, { type: string; diagnosis: string }>>({});
  const [reportText, setReportText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const toggleStructure = (s: string) => setIdentifiedStructures(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const confirmReport = () => { completeModule(4); setShowFeedback(true); };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    const structScore = Math.round(identifiedStructures.size / caseData.structures.length * 100);
    decisions.push({ label: "Estruturas identificadas", userChoice: `${identifiedStructures.size}/${caseData.structures.length}`, idealChoice: `${caseData.structures.length}/${caseData.structures.length}`, correct: structScore >= 80 });
    
    caseData.pathologies.forEach(p => {
      const classified = pathologyClassifications[p.name];
      const typeCorrect = classified?.type === p.type;
      const diagCorrect = classified?.diagnosis === p.classification;
      decisions.push({ label: `Tipo: ${p.name}`, userChoice: classified?.type || "Não classificado", idealChoice: p.type, correct: typeCorrect });
      decisions.push({ label: `Diagnóstico: ${p.name}`, userChoice: classified?.diagnosis || "Não selecionado", idealChoice: p.classification, correct: diagCorrect });
    });

    decisions.push({ label: "Laudo radiográfico", userChoice: reportText.length > 50 ? "Completo" : "Incompleto", idealChoice: "Completo", correct: reportText.length > 50 });

    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    const narrative = score >= 80 ? caseData.consequence.correct : caseData.consequence.wrong;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Radiografia e Interpretação de Imagens</h1><p className="text-sm text-muted-foreground">Leitura de radiografias odontológicas com classificação</p></div>
          <SimulatorHowToUse title="Radiografia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-radiografia-odonto" toolName="Radiografia Odontológica" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />)}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary: Record<string, string> = caseData ? { "Caso": caseData.title, "Estruturas": `${identifiedStructures.size}/${caseData.structures.length}`, "Patologias classificadas": `${Object.keys(pathologyClassifications).length}/${caseData.pathologies.length}`, "Pontuação": `${feedback.score}%` } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setIdentifiedStructures(new Set()); setIdentifiedPathologies(new Set()); setPathologyClassifications({}); setReportText(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Radiografia e Interpretação</h1></div>
        <SimulatorHowToUse title="Radiografia" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4 text-primary" /> 1. Caso Clínico {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedCase} onValueChange={setSelectedCase}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>{caseData && <div className="bg-muted/50 rounded-lg p-3 text-sm"><p>Exame: {caseData.exam}</p></div>}<Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">Confirmar</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> 2. Identificação de Estruturas {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{caseData && <PeriapicalSVG caseId={caseData.id} identifiedStructures={identifiedStructures} identifiedPathologies={identifiedPathologies} />}{caseData && <div className="space-y-1.5"><p className="text-xs text-muted-foreground">Marque as estruturas que você identifica:</p>{caseData.structures.map(s => (<label key={s} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer ${identifiedStructures.has(s) ? "border-green-500 bg-green-500/10" : "border-border"}`}><input type="checkbox" checked={identifiedStructures.has(s)} onChange={() => toggleStructure(s)} className="rounded" />{s}</label>))}</div>}<Button onClick={() => completeModule(2)} disabled={identifiedStructures.size === 0 || completedModules.has(2)} className="w-full">Confirmar Estruturas</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> 3. Classificação de Patologias {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{caseData && caseData.pathologies.map(p => (
          <div key={p.name} className="space-y-2 border rounded-lg p-3">
            <p className="text-sm font-medium">{p.name}</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo radiográfico:</p>
              <div className="flex gap-1 flex-wrap">{["radiolúcida", "radiopaca", "mista"].map(t => (<label key={t} className={`px-2 py-1 rounded border text-xs cursor-pointer ${pathologyClassifications[p.name]?.type === t ? "border-primary bg-primary/10" : "border-border"}`}><input type="radio" name={`type-${p.name}`} value={t} checked={pathologyClassifications[p.name]?.type === t} onChange={() => setPathologyClassifications(prev => ({ ...prev, [p.name]: { ...prev[p.name], type: t, diagnosis: prev[p.name]?.diagnosis || "" } }))} className="sr-only" />{t}</label>))}</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Diagnóstico diferencial:</p>
              <div className="space-y-1">{[p.classification, ...(p.distractors || [])].sort().map(d => (<label key={d} className={`block p-1.5 rounded border text-xs cursor-pointer ${pathologyClassifications[p.name]?.diagnosis === d ? "border-primary bg-primary/10" : "border-border"}`}><input type="radio" name={`diag-${p.name}`} value={d} checked={pathologyClassifications[p.name]?.diagnosis === d} onChange={() => setPathologyClassifications(prev => ({ ...prev, [p.name]: { ...prev[p.name], type: prev[p.name]?.type || "", diagnosis: d } }))} className="sr-only" />{d}</label>))}</div>
            </div>
          </div>
        ))}<Button onClick={() => completeModule(3)} disabled={caseData ? Object.keys(pathologyClassifications).length < caseData.pathologies.length : true || completedModules.has(3)} className="w-full">Confirmar Classificação</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> 4. Laudo Radiográfico {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="Redija o laudo radiográfico descrevendo: tipo de exame, estruturas, achados patológicos e conclusão..." value={reportText} onChange={(e) => setReportText(e.target.value)} rows={6} /><Button onClick={confirmReport} disabled={reportText.length < 20 || completedModules.has(4)} className="w-full">Finalizar Laudo</Button></CardContent></Card>

      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Radiografia Odontológica" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
