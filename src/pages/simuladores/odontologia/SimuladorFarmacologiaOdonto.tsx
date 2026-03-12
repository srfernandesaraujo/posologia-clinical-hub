import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, User, Pill, Shield, FileText, ArrowLeft, Sparkles } from "lucide-react";
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

const PATIENTS = [
  { id: "p1", name: "Adulto saudável (35 anos)", profile: "Sem comorbidades", weight: 70, contraindications: [], risks: { renal: 0, hepatic: 0, cardiovascular: 0, gastric: 10 }, idealAnalgesic: "dipirona", idealAINE: "ibuprofeno", idealAntibiotic: "", scenario72h: "Paciente evolui bem. Dor controlada, sem sinais de infecção." },
  { id: "p3", name: "Cardiopata (62 anos)", profile: "HAS + FA, uso de varfarina", weight: 80, contraindications: ["AINEs (risco hemorrágico)", "Epinefrina em alta dose"], risks: { renal: 20, hepatic: 15, cardiovascular: 60, gastric: 40 }, idealAnalgesic: "paracetamol", idealAINE: "dexametasona", idealAntibiotic: "amoxicilina", scenario72h: "Paciente retorna com INR elevado (4.2). Havia prescrito ibuprofeno que potencializou o efeito da varfarina." },
  { id: "p5", name: "Nefropata (55 anos)", profile: "DRC estágio 3, TFG 45 mL/min", weight: 72, contraindications: ["AINEs (nefrotóxicos)", "Doses plenas de amoxicilina"], risks: { renal: 70, hepatic: 20, cardiovascular: 30, gastric: 25 }, idealAnalgesic: "paracetamol", idealAINE: "dexametasona", idealAntibiotic: "", scenario72h: "Paciente retorna com piora da TFG (35 mL/min). O ibuprofeno causou vasoconstricção da arteríola aferente, agravando a função renal." },
];

const PROCEDURES = ["Exodontia simples", "Exodontia de incluso", "Restauração extensa", "Cirurgia periodontal"];

const ANALGESICS = [
  { id: "dipirona", name: "Dipirona 500mg", posology: "500mg VO 6/6h", alerts: [] },
  { id: "paracetamol", name: "Paracetamol 750mg", posology: "750mg VO 6/6h", alerts: ["Hepatotoxicidade em doses elevadas"] },
  { id: "tramadol", name: "Tramadol 50mg", posology: "50mg VO 6/6h", alerts: ["Opioide — risco de dependência"] },
];

const AINES = [
  { id: "ibuprofeno", name: "Ibuprofeno 600mg", posology: "600mg VO 8/8h por 3 dias", alerts: ["Risco GI", "Contraindicado em nefropatas"] },
  { id: "nimesulida", name: "Nimesulida 100mg", posology: "100mg VO 12/12h por 5 dias", alerts: ["Hepatotoxicidade"] },
  { id: "dexametasona", name: "Dexametasona 4mg", posology: "4mg VO dose única pré-op", alerts: ["Corticoide — sem efeito AINE clássico"] },
];

const ANTIBIOTICS = [
  { id: "amoxicilina", name: "Amoxicilina 500mg", posology: "500mg VO 8/8h por 7 dias", alerts: [] },
  { id: "amoxi-clav", name: "Amoxicilina + Clavulanato", posology: "875/125mg VO 12/12h por 7 dias", alerts: [] },
  { id: "clindamicina", name: "Clindamicina 300mg", posology: "300mg VO 8/8h por 7 dias", alerts: ["Alternativa para alérgicos a penicilinas"] },
  { id: "azitromicina", name: "Azitromicina 500mg", posology: "500mg VO 1x/dia por 3 dias", alerts: ["Interação com varfarina"] },
];

const M4_CONDUTAS = [
  { id: "manter", label: "Manter prescrição atual", desc: "A prescrição está adequada, sem necessidade de ajustes" },
  { id: "trocar-aine", label: "Trocar anti-inflamatório", desc: "Substituir por opção mais segura para o perfil" },
  { id: "trocar-analgesico", label: "Trocar analgésico", desc: "Substituir por opção mais segura" },
  { id: "suspender-antibiotico", label: "Suspender antibiótico", desc: "Antibiótico desnecessário neste caso" },
  { id: "ajustar-dose", label: "Ajustar dose para função renal/hepática", desc: "Reduzir dose conforme clearance" },
];

function RiskGaugeSVG({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? "#ef4444" : value >= 25 ? "#f59e0b" : "#22c55e";
  return (
    <div className="text-center">
      <svg viewBox="0 0 60 36" className="w-16 mx-auto">
        <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke="hsl(var(--muted))" strokeWidth={5} strokeLinecap="round" />
        <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${(value / 100) * 75.4} 75.4`} />
        <text x={30} y={28} textAnchor="middle" fontSize={10} fill={color} fontWeight="bold">{value}%</text>
      </svg>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

const HOW_TO = ["Selecione paciente e procedimento no M1.", "Prescreva analgésico, anti-inflamatório e antibiótico no M2.", "No M3, analise os riscos e decida se mantém ou altera a prescrição.", "No M4, veja o cenário clínico resultante e confirme sua conduta.", "O Feedback prevê o desfecho do paciente."];
const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: p.name, difficulty: p.risks.renal > 50 ? "Difícil" : "Médio", patient: { diagnosis: p.profile } }));

export default function SimuladorFarmacologiaOdonto() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-farmacologia-odonto") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("farmacologia-odonto", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [selectedAnalgesic, setSelectedAnalgesic] = useState("");
  const [selectedAINE, setSelectedAINE] = useState("");
  const [selectedAntibiotic, setSelectedAntibiotic] = useState("");
  const [m3Decision, setM3Decision] = useState("");
  const [m3AltAnalgesic, setM3AltAnalgesic] = useState("");
  const [m3AltAINE, setM3AltAINE] = useState("");
  const [m3AltAntibiotic, setM3AltAntibiotic] = useState("");
  const [m4Conduta, setM4Conduta] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  // Use altered prescription if M3 decision was "alterar" and alternatives were selected
  const effectiveAnalgesic = m3Decision === "alterar" && m3AltAnalgesic ? m3AltAnalgesic : selectedAnalgesic;
  const effectiveAINE = m3Decision === "alterar" && m3AltAINE ? m3AltAINE : selectedAINE;
  const effectiveAntibiotic = m3Decision === "alterar" && m3AltAntibiotic ? m3AltAntibiotic : selectedAntibiotic;

  const analgesic = ANALGESICS.find(a => a.id === effectiveAnalgesic);
  const aine = AINES.find(a => a.id === effectiveAINE);
  const antibiotic = ANTIBIOTICS.find(a => a.id === effectiveAntibiotic);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const adjustedRisks = patient ? { ...patient.risks } : { renal: 0, hepatic: 0, cardiovascular: 0, gastric: 0 };
  if (effectiveAINE === "ibuprofeno") { adjustedRisks.renal += 20; adjustedRisks.gastric += 25; }
  if (effectiveAINE === "nimesulida") { adjustedRisks.hepatic += 15; }
  if (effectiveAnalgesic === "paracetamol") { adjustedRisks.hepatic += 10; }

  const hasContraindication = patient && (
    (patient.contraindications.some(c => c.includes("AINEs")) && selectedAINE && selectedAINE !== "dexametasona") ||
    (patient.id === "p3" && selectedAntibiotic === "azitromicina")
  );

  const confirmM3 = () => {
    if (!m3Decision) return;
    if (m3Decision === "alterar" && !m3AltAnalgesic && !m3AltAINE && !m3AltAntibiotic) return;
    completeModule(3);
  };
  const confirmM4 = () => { completeModule(4); setShowFeedback(true); };

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    decisions.push({ label: "Analgésico", userChoice: analgesic?.name || "-", idealChoice: ANALGESICS.find(a => a.id === patient.idealAnalgesic)?.name || "-", correct: effectiveAnalgesic === patient.idealAnalgesic });
    decisions.push({ label: "Anti-inflamatório", userChoice: aine?.name || "-", idealChoice: AINES.find(a => a.id === patient.idealAINE)?.name || "-", correct: effectiveAINE === patient.idealAINE });
    if (patient.idealAntibiotic) {
      decisions.push({ label: "Antibiótico", userChoice: antibiotic?.name || "Não prescrito", idealChoice: ANTIBIOTICS.find(a => a.id === patient.idealAntibiotic)?.name || "-", correct: effectiveAntibiotic === patient.idealAntibiotic });
    }
    decisions.push({ label: "Decisão no M3", userChoice: m3Decision === "manter" ? "Manteve" : "Alterou", idealChoice: hasContraindication ? "Alterou" : "Manteve", correct: hasContraindication ? m3Decision === "alterar" : m3Decision === "manter" });
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    const narrative = score >= 75 ? "Prescrição segura e adequada ao perfil do paciente. A análise farmacológica demonstra domínio das contraindicações e interações medicamentosas." : hasContraindication ? patient.scenario72h : "A prescrição contém inadequações que podem comprometer a segurança do paciente.";
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("farmacologia-odonto");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Farmacologia Odontológica e Prescrição</h1><p className="text-sm text-muted-foreground">Prescrição segura com análise de risco</p></div>
          <SimulatorHowToUse title="Farmacologia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-farmacologia-odonto" toolName="Farmacologia Odontológica" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />)}
        </div>
        {isAdmin && !isVR && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary: Record<string, string> = { "Paciente": patient?.name || "-", "Procedimento": selectedProcedure || "-", "Analgésico": analgesic?.name || "-", "Anti-inflamatório": aine?.name || "-", "Antibiótico": antibiotic?.name || "Não prescrito", "Pontuação": `${feedback.score}%` };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setSelectedAnalgesic(""); setSelectedAINE(""); setSelectedAntibiotic(""); setM3Decision(""); setM3AltAnalgesic(""); setM3AltAINE(""); setM3AltAntibiotic(""); setM4Conduta(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Farmacologia Odontológica</h1></div>
        <SimulatorHowToUse title="Farmacologia" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> 1. Caso Clínico {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedPatient} onValueChange={setSelectedPatient}><SelectTrigger><SelectValue placeholder="Perfil do paciente..." /></SelectTrigger><SelectContent>{PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><Select value={selectedProcedure} onValueChange={setSelectedProcedure}><SelectTrigger><SelectValue placeholder="Procedimento..." /></SelectTrigger><SelectContent>{PROCEDURES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>{patient && <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1"><p><strong>Perfil:</strong> {patient.profile}</p><p><strong>Peso:</strong> {patient.weight} kg</p>{patient.contraindications.length > 0 && <div className="mt-2"><p className="font-medium text-destructive text-xs">Contraindicações:</p>{patient.contraindications.map(c => <Badge key={c} variant="destructive" className="text-[10px] mr-1">{c}</Badge>)}</div>}</div>}<Button onClick={() => completeModule(1)} disabled={!patient || !selectedProcedure || completedModules.has(1)} className="w-full">Confirmar</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> 2. Prescrição {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div><label className="text-xs font-medium text-muted-foreground">Analgésico:</label><Select value={selectedAnalgesic} onValueChange={setSelectedAnalgesic}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{ANALGESICS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>{analgesic && <p className="text-xs text-muted-foreground mt-1">{analgesic.posology}</p>}</div><div><label className="text-xs font-medium text-muted-foreground">Anti-inflamatório:</label><Select value={selectedAINE} onValueChange={setSelectedAINE}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{AINES.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>{aine && <p className="text-xs text-muted-foreground mt-1">{aine.posology}</p>}</div><div><label className="text-xs font-medium text-muted-foreground">Antibiótico:</label><Select value={selectedAntibiotic} onValueChange={setSelectedAntibiotic}><SelectTrigger><SelectValue placeholder="Selecione ou deixe em branco..." /></SelectTrigger><SelectContent>{ANTIBIOTICS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => completeModule(2)} disabled={!selectedAnalgesic || completedModules.has(2)} className="w-full">Confirmar Prescrição</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> 3. Análise de Risco — Decisão {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-4 gap-2"><RiskGaugeSVG label="Renal" value={Math.min(adjustedRisks.renal, 100)} /><RiskGaugeSVG label="Hepático" value={Math.min(adjustedRisks.hepatic, 100)} /><RiskGaugeSVG label="Cardiov." value={Math.min(adjustedRisks.cardiovascular, 100)} /><RiskGaugeSVG label="Gástrico" value={Math.min(adjustedRisks.gastric, 100)} /></div>{hasContraindication && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">⚠️ Contraindicação detectada! Avalie se deve manter ou alterar a prescrição.</div>}<div className="space-y-1.5"><p className="text-sm font-medium">Com base na análise de risco, qual sua decisão?</p><label className={`block p-2 rounded border text-sm cursor-pointer ${m3Decision === "manter" ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="m3" value="manter" checked={m3Decision === "manter"} onChange={() => setM3Decision("manter")} className="sr-only" />Manter prescrição atual — os riscos são aceitáveis</label><label className={`block p-2 rounded border text-sm cursor-pointer ${m3Decision === "alterar" ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="m3" value="alterar" checked={m3Decision === "alterar"} onChange={() => setM3Decision("alterar")} className="sr-only" />Alterar prescrição — há contraindicação ou risco elevado</label></div>{m3Decision === "alterar" && !completedModules.has(3) && (<div className="space-y-3 border-t border-border pt-3 mt-2"><p className="text-sm font-medium text-primary">Nova prescrição:</p><div><label className="text-xs font-medium text-muted-foreground">Analgésico:</label><Select value={m3AltAnalgesic} onValueChange={setM3AltAnalgesic}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{ANALGESICS.filter(a => a.id !== selectedAnalgesic).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium text-muted-foreground">Anti-inflamatório:</label><Select value={m3AltAINE} onValueChange={setM3AltAINE}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{AINES.filter(a => a.id !== selectedAINE).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium text-muted-foreground">Antibiótico:</label><Select value={m3AltAntibiotic} onValueChange={setM3AltAntibiotic}><SelectTrigger><SelectValue placeholder="Manter ou trocar..." /></SelectTrigger><SelectContent>{ANTIBIOTICS.filter(a => a.id !== selectedAntibiotic).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div></div>)}<Button onClick={confirmM3} disabled={!m3Decision || (m3Decision === "alterar" && !m3AltAnalgesic && !m3AltAINE && !m3AltAntibiotic) || completedModules.has(3)} className="w-full">Confirmar Decisão</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> 4. Cenário Clínico em 72h {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{patient && <div className={`rounded-lg p-3 text-sm ${hasContraindication && m3Decision === "manter" ? "bg-destructive/10 border border-destructive/20" : "bg-green-500/10 border border-green-500/20"}`}><p className="font-medium mb-1">{hasContraindication && m3Decision === "manter" ? "⚠️ Cenário adverso em 72h:" : "✓ Evolução favorável em 72h:"}</p><p className="text-muted-foreground">{hasContraindication && m3Decision === "manter" ? patient.scenario72h : "Paciente evolui bem. Dor controlada, sem sinais de infecção ou efeitos adversos."}</p></div>}<div className="space-y-1.5"><p className="text-sm font-medium">Conduta final:</p>{M4_CONDUTAS.map(c => (<label key={c.id} className={`block p-2 rounded border text-sm cursor-pointer ${m4Conduta === c.id ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="m4" value={c.id} checked={m4Conduta === c.id} onChange={() => setM4Conduta(c.id)} className="sr-only" /><p className="font-medium text-xs">{c.label}</p><p className="text-[10px] text-muted-foreground">{c.desc}</p></label>))}</div><Button onClick={confirmM4} disabled={!m4Conduta || completedModules.has(4)} className="w-full">Confirmar Conduta</Button></CardContent></Card>

      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Farmacologia Odontológica" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
