import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Eye, Wrench, AlertTriangle, Pill, ArrowLeft, Sparkles } from "lucide-react";
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
  { id: "m1", position: "Mesioangular", winter: "Mesioangulado", pellGregory: { class: "II", pos: "B" }, difficulty: "Moderada", needsOsteotomy: true, needsOdontosection: true, complicationId: "alveolite", idealPreOp: ["Dexametasona 8mg VO 1h antes"], idealPostOp: ["Dipirona 500mg 6/6h por 3 dias", "Ibuprofeno 600mg 8/8h por 3 dias", "Digluconato de clorexidina 0,12% bochechos"], consequence: { correct: "Planejamento cirúrgico adequado com osteotomia e odontossecção em mesioangular Classe II-B. Complicação manejada corretamente. Pós-operatório previsível.", wrong: "Falha no planejamento cirúrgico pode resultar em fraturas, lesão nervosa ou alveolite por trauma excessivo." } },
  { id: "m2", position: "Vertical", winter: "Vertical", pellGregory: { class: "I", pos: "A" }, difficulty: "Baixa", needsOsteotomy: false, needsOdontosection: false, complicationId: "alveolite", idealPreOp: [], idealPostOp: ["Dipirona 500mg 6/6h por 3 dias"], consequence: { correct: "Extração simples de molar vertical Classe I-A, sem necessidade de osteotomia. Recuperação rápida esperada.", wrong: "Procedimento excessivo para extração simples. Osteotomia desnecessária aumenta morbidade." } },
  { id: "m3", position: "Horizontal", winter: "Horizontal", pellGregory: { class: "III", pos: "C" }, difficulty: "Alta", needsOsteotomy: true, needsOdontosection: true, complicationId: "fratura", idealPreOp: ["Dexametasona 8mg VO 1h antes", "Amoxicilina 2g VO 1h antes (profilaxia)"], idealPostOp: ["Dipirona 500mg 6/6h por 3 dias", "Ibuprofeno 600mg 8/8h por 3 dias", "Amoxicilina 500mg 8/8h por 7 dias", "Digluconato de clorexidina 0,12% bochechos"], consequence: { correct: "Abordagem completa para caso de alta complexidade (horizontal III-C). Profilaxia antibiótica e osteotomia reduzem risco de complicações.", wrong: "Horizontal III-C sem osteotomia adequada resulta em fratura mandibular. A falta de profilaxia aumenta risco infeccioso." } },
];

const COMPLICATIONS: Record<string, { title: string; desc: string; options: { label: string; correct: boolean }[] }> = {
  alveolite: { title: "Alveolite seca", desc: "Paciente retorna 3 dias após com dor intensa, alvéolo exposto sem coágulo.", options: [{ label: "Irrigação com soro + curativo alveolar (Alveolex)", correct: true }, { label: "Prescrever antibiótico e dispensar", correct: false }, { label: "Reabrir o alvéolo cirurgicamente", correct: false }] },
  parestesia: { title: "Parestesia do nervo alveolar inferior", desc: "Dormência persistente no lábio e mento.", options: [{ label: "Documentar, monitorar, encaminhar se >8 semanas", correct: true }, { label: "Prescrever corticoide em alta dose", correct: false }, { label: "Informar que é normal e desaparecerá", correct: false }] },
  fratura: { title: "Fratura de mandíbula", desc: "Estalido durante luxação, mobilidade anormal do ângulo.", options: [{ label: "Bloqueio maxilomandibular + encaminhamento para CTBMF", correct: true }, { label: "Continuar a extração e suturar", correct: false }, { label: "Prescrever anti-inflamatório apenas", correct: false }] },
};

const PRE_OP_MEDS = ["Dexametasona 8mg VO 1h antes", "Amoxicilina 2g VO 1h antes (profilaxia)", "Ansiolítico (Midazolam 7.5mg)"];
const POST_OP_MEDS = ["Dipirona 500mg 6/6h por 3 dias", "Ibuprofeno 600mg 8/8h por 3 dias", "Amoxicilina 500mg 8/8h por 7 dias", "Digluconato de clorexidina 0,12% bochechos"];

function MolarSVG({ position, showRetalho, showOsteotomy, showOdontosection }: { position: string; showRetalho: boolean; showOsteotomy: boolean; showOdontosection: boolean }) {
  const rotation = position === "Mesioangular" ? -35 : position === "Horizontal" ? -80 : position === "Distoangular" ? 25 : 0;
  return (
    <svg viewBox="0 0 260 200" className="w-full">
      <path d="M20 50 L20 160 Q30 180 60 185 Q130 190 200 185 Q230 180 240 160 L240 50" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1.5} opacity={0.4} />
      <rect x={200} y={30} width={40} height={160} rx={8} fill="hsl(var(--muted))" opacity={0.3} stroke="hsl(var(--border))" strokeWidth={1} />
      <path d="M30 130 Q80 140 140 138 Q180 135 210 125" fill="none" stroke="#fbbf24" strokeWidth={2.5} opacity={0.5} strokeDasharray="5 3" />
      <rect x={100} y={48} width={35} height={28} rx={5} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1} />
      <rect x={106} y={76} width={10} height={50} rx={3} fill="#ddd5c0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      <rect x={120} y={76} width={10} height={45} rx={3} fill="#ddd5c0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      <line x1={30} y1={48} x2={200} y2={48} stroke="hsl(var(--primary))" strokeWidth={0.8} strokeDasharray="6 4" opacity={0.4} />
      <g transform={`rotate(${rotation} 165 80)`}>
        <rect x={148} y={55} width={34} height={50} rx={6} fill="#e8dfd0" stroke="#b8a880" strokeWidth={1.5} />
        {showOdontosection && <line x1={165} y1={52} x2={165} y2={108} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />}
      </g>
      {showOsteotomy && <ellipse cx={170} cy={85} rx={28} ry={20} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3"><animate attributeName="stroke-opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" /></ellipse>}
      {showRetalho && <path d="M90 48 L90 40 Q130 35 170 40 L170 48" fill="none" stroke="#22c55e" strokeWidth={2} />}
      <text x={10} y={195} fontSize={7} fill="hsl(var(--foreground))">Winter: {position}</text>
    </svg>
  );
}

const HOW_TO = ["Classifique o caso (Winter + P&G) no M1.", "Planeje o procedimento cirúrgico no M2 (retalho, osteotomia, odontossecção).", "No M3, uma complicação será apresentada baseada nas suas escolhas. Escolha a conduta.", "No M4, selecione o protocolo medicamentoso.", "O Feedback mostrará o resumo cirúrgico completo."];
const BUILT_IN = CASES.map(c => ({ id: c.id, title: `${c.position} — ${c.difficulty}`, difficulty: c.difficulty === "Alta" ? "Difícil" : "Médio", patient: { diagnosis: `P&G Classe ${c.pellGregory.class}, Posição ${c.pellGregory.pos}` } }));

export default function SimuladorCirurgiaExodontia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-cirurgia-exodontia") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("cirurgia-exodontia", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [userWinter, setUserWinter] = useState("");
  const [userPGClass, setUserPGClass] = useState("");
  const [userPGPos, setUserPGPos] = useState("");
  const [useRetalho, setUseRetalho] = useState(false);
  const [useOsteotomy, setUseOsteotomy] = useState(false);
  const [useOdontosection, setUseOdontosection] = useState(false);
  const [complicationAnswer, setComplicationAnswer] = useState<string | null>(null);
  const [preOpMeds, setPreOpMeds] = useState<string[]>([]);
  const [postOpMeds, setPostOpMeds] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const complication = caseData ? COMPLICATIONS[caseData.complicationId] : null;
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const classificationCorrect = caseData && userWinter === caseData.winter && userPGClass === caseData.pellGregory.class && userPGPos === caseData.pellGregory.pos;

  const confirmComplication = () => { completeModule(3); };
  const confirmProtocol = () => { completeModule(4); setShowFeedback(true); };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    decisions.push({ label: "Classificação Winter", userChoice: userWinter || "-", idealChoice: caseData.winter, correct: userWinter === caseData.winter });
    decisions.push({ label: "P&G Classe", userChoice: userPGClass || "-", idealChoice: caseData.pellGregory.class, correct: userPGClass === caseData.pellGregory.class });
    decisions.push({ label: "P&G Posição", userChoice: userPGPos || "-", idealChoice: caseData.pellGregory.pos, correct: userPGPos === caseData.pellGregory.pos });
    decisions.push({ label: "Osteotomia", userChoice: useOsteotomy ? "Sim" : "Não", idealChoice: caseData.needsOsteotomy ? "Sim" : "Não", correct: useOsteotomy === caseData.needsOsteotomy });
    decisions.push({ label: "Odontossecção", userChoice: useOdontosection ? "Sim" : "Não", idealChoice: caseData.needsOdontosection ? "Sim" : "Não", correct: useOdontosection === caseData.needsOdontosection });
    const correctComp = complication?.options.find(o => o.correct)?.label;
    decisions.push({ label: "Conduta na complicação", userChoice: complicationAnswer || "-", idealChoice: correctComp || "-", correct: complicationAnswer === correctComp });
    // Check meds
    caseData.idealPreOp.forEach(m => decisions.push({ label: `Pré-op: ${m.substring(0,25)}...`, userChoice: preOpMeds.includes(m) ? "Incluído" : "Não", idealChoice: "Incluído", correct: preOpMeds.includes(m) }));
    caseData.idealPostOp.forEach(m => decisions.push({ label: `Pós-op: ${m.substring(0,25)}...`, userChoice: postOpMeds.includes(m) ? "Incluído" : "Não", idealChoice: "Incluído", correct: postOpMeds.includes(m) }));
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    const narrative = score >= 75 ? caseData.consequence.correct : caseData.consequence.wrong;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("cirurgia-exodontia");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Cirurgia e Exodontia — Pell & Gregory</h1><p className="text-sm text-muted-foreground">Classificação e planejamento cirúrgico de terceiros molares</p></div>
          <SimulatorHowToUse title="Cirurgia e Exodontia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-cirurgia-exodontia" toolName="Cirurgia e Exodontia" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />)}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary: Record<string, string> = caseData ? { "Posição": caseData.position, "Winter": userWinter || "-", "P&G": `Classe ${userPGClass || "?"}, Pos ${userPGPos || "?"}`, "Osteotomia": useOsteotomy ? "Sim" : "Não", "Odontossecção": useOdontosection ? "Sim" : "Não", "Pontuação": `${feedback.score}%` } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserWinter(""); setUserPGClass(""); setUserPGPos(""); setUseRetalho(false); setUseOsteotomy(false); setUseOdontosection(false); setComplicationAnswer(null); setPreOpMeds([]); setPostOpMeds([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Cirurgia e Exodontia</h1></div>
        <SimulatorHowToUse title="Cirurgia e Exodontia" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> 1. Classificação {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedCase} onValueChange={setSelectedCase}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.position} — {c.difficulty}</SelectItem>)}</SelectContent></Select>{caseData && <MolarSVG position={caseData.position} showRetalho={false} showOsteotomy={false} showOdontosection={false} />}{caseData && <div className="space-y-2"><div><label className="text-xs font-medium">Winter:</label><Select value={userWinter} onValueChange={setUserWinter}><SelectTrigger><SelectValue placeholder="Posição..." /></SelectTrigger><SelectContent>{["Mesioangulado","Vertical","Horizontal","Distoangulado"].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-medium">P&G Classe:</label><Select value={userPGClass} onValueChange={setUserPGClass}><SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger><SelectContent>{["I","II","III"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium">P&G Posição:</label><Select value={userPGPos} onValueChange={setUserPGPos}><SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger><SelectContent>{["A","B","C"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div></div></div>}<Button onClick={() => completeModule(1)} disabled={!userWinter || !userPGClass || !userPGPos || completedModules.has(1)} className="w-full">Confirmar</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> 2. Planejamento Cirúrgico {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-2">{[{ label: "Retalho mucoperiósteo", state: useRetalho, toggle: () => setUseRetalho(!useRetalho) },{ label: "Osteotomia", state: useOsteotomy, toggle: () => setUseOsteotomy(!useOsteotomy) },{ label: "Odontossecção", state: useOdontosection, toggle: () => setUseOdontosection(!useOdontosection) }].map(item => (<label key={item.label} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${item.state ? "border-primary bg-primary/5" : "border-border"}`}><input type="checkbox" checked={item.state} onChange={item.toggle} className="rounded" />{item.label}</label>))}</div>{caseData && <MolarSVG position={caseData.position} showRetalho={useRetalho} showOsteotomy={useOsteotomy} showOdontosection={useOdontosection} />}<Button onClick={() => completeModule(2)} disabled={completedModules.has(2)} className="w-full">Confirmar</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> 3. Complicação {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{complication && <><div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm"><p className="font-medium text-destructive">⚠️ {complication.title}</p><p className="text-muted-foreground mt-1">{complication.desc}</p></div>{complication.options.map((opt, i) => (<label key={i} className={`block p-2 rounded border text-sm cursor-pointer ${complicationAnswer === opt.label ? (completedModules.has(3) ? (opt.correct ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10") : "border-primary bg-primary/5") : "border-border"}`}><input type="radio" name="comp" value={opt.label} checked={complicationAnswer === opt.label} onChange={() => setComplicationAnswer(opt.label)} className="sr-only" />{opt.label}</label>))}</>}<Button onClick={confirmComplication} disabled={!complicationAnswer || completedModules.has(3)} className="w-full">Confirmar Conduta</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> 4. Protocolo Medicamentoso {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="text-sm font-medium mb-2">Pré-operatório:</p>{PRE_OP_MEDS.map(m => (<label key={m} className="flex items-center gap-2 p-1.5 text-sm cursor-pointer"><input type="checkbox" checked={preOpMeds.includes(m)} onChange={() => setPreOpMeds(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className="rounded" />{m}</label>))}</div><div><p className="text-sm font-medium mb-2">Pós-operatório:</p>{POST_OP_MEDS.map(m => (<label key={m} className="flex items-center gap-2 p-1.5 text-sm cursor-pointer"><input type="checkbox" checked={postOpMeds.includes(m)} onChange={() => setPostOpMeds(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className="rounded" />{m}</label>))}</div><Button onClick={confirmProtocol} disabled={(preOpMeds.length === 0 && postOpMeds.length === 0) || completedModules.has(4)} className="w-full">Confirmar Protocolo</Button></CardContent></Card>

      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Cirurgia e Exodontia" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
