import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Syringe, AlertTriangle, Target, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";

const PROCEDURES = [
  { id: "exo38", label: "Exodontia do 38", region: "Mandíbula posterior esquerda", nerve: "Alveolar inferior + lingual", weight: 75, idealTech: "bloqueio-ai", idealAnesthetic: "lido2-epi", idealDoseOption: 2, complication: "intravascular" },
  { id: "rest16", label: "Restauração do 16", region: "Maxila posterior direita", nerve: "Alveolar superior posterior", weight: 65, idealTech: "infiltrativa", idealAnesthetic: "arti4-epi", idealDoseOption: 1, complication: "falha" },
  { id: "rest11", label: "Restauração do 11 — paciente cardiopata", region: "Maxila anterior", nerve: "Alveolar superior anterior (infiltrativa)", weight: 80, idealTech: "infiltrativa", idealAnesthetic: "mepi3", idealDoseOption: 1, complication: "intravascular" },
  { id: "exo46", label: "Exodontia do 46", region: "Mandíbula posterior direita", nerve: "Alveolar inferior + bucal", weight: 70, idealTech: "bloqueio-ai", idealAnesthetic: "lido2-epi", idealDoseOption: 2, complication: "parestesia" },
];

const TECHNIQUES = [
  { id: "bloqueio-ai", label: "Bloqueio do nervo alveolar inferior", desc: "Inserção na espinha de Spix", insertionPoint: { x: 70, y: 140 } },
  { id: "infiltrativa", label: "Anestesia infiltrativa", desc: "Deposição junto ao ápice do dente", insertionPoint: { x: 160, y: 80 } },
  { id: "intraligamentar", label: "Anestesia intraligamentar", desc: "Injeção no ligamento periodontal", insertionPoint: { x: 150, y: 120 } },
  { id: "bloqueio-mental", label: "Bloqueio do nervo mentual", desc: "Junto ao forame mentual", insertionPoint: { x: 120, y: 160 } },
];

const ANESTHETICS = [
  { id: "lido2-epi", label: "Lidocaína 2% + Epinefrina 1:100.000", mgPerTubete: 36, maxDoseMgKg: 7, vasoconstrictor: true },
  { id: "arti4-epi", label: "Articaína 4% + Epinefrina 1:100.000", mgPerTubete: 72, maxDoseMgKg: 7, vasoconstrictor: true },
  { id: "mepi3", label: "Mepivacaína 3% (sem vaso)", mgPerTubete: 54, maxDoseMgKg: 6.6, vasoconstrictor: false },
  { id: "prilo3-feli", label: "Prilocaína 3% + Felipressina", mgPerTubete: 54, maxDoseMgKg: 6, vasoconstrictor: false },
];

const COMPLICATIONS: Record<string, { title: string; desc: string; options: { label: string; correct: boolean }[] }> = {
  falha: { title: "Falha anestésica", desc: "O paciente relata dor durante o procedimento.", options: [{ label: "Repetir a técnica com reposicionamento da agulha", correct: true }, { label: "Trocar para anestesia geral", correct: false }, { label: "Prosseguir mesmo com dor", correct: false }] },
  intravascular: { title: "Injeção intravascular acidental", desc: "Aspiração positiva com retorno de sangue no tubete.", options: [{ label: "Recuar a agulha, reposicionar e re-aspirar", correct: true }, { label: "Injetar rapidamente para dispersar", correct: false }, { label: "Cancelar definitivamente o procedimento", correct: false }] },
  parestesia: { title: "Parestesia pós-anestésica", desc: "Paciente retorna com dormência persistente no lábio após 48h.", options: [{ label: "Orientar, monitorar e encaminhar se >8 semanas", correct: true }, { label: "Prescrever corticoides imediatamente", correct: false }, { label: "Considerar normal e dispensar o paciente", correct: false }] },
};

function generateDoseOptions(anesthetic: typeof ANESTHETICS[0], weight: number) {
  const correctMaxDose = anesthetic.maxDoseMgKg * weight;
  const correctMaxTubetes = Math.floor(correctMaxDose / anesthetic.mgPerTubete);
  
  // Generate 4 options: 1 correct + 3 wrong
  const options = [
    { id: 0, doseMg: Math.round(correctMaxDose * 0.5), tubetes: Math.floor((correctMaxDose * 0.5) / anesthetic.mgPerTubete), label: `${Math.round(correctMaxDose * 0.5)} mg (${Math.floor((correctMaxDose * 0.5) / anesthetic.mgPerTubete)} tubetes)`, correct: false, explanation: "Subdosagem — dose máxima calculada incorretamente (fator 0.5x)" },
    { id: 1, doseMg: Math.round(correctMaxDose), tubetes: correctMaxTubetes, label: `${Math.round(correctMaxDose)} mg (${correctMaxTubetes} tubetes)`, correct: true, explanation: `Correto: ${anesthetic.maxDoseMgKg} mg/kg × ${weight} kg = ${Math.round(correctMaxDose)} mg` },
    { id: 2, doseMg: Math.round(correctMaxDose * 1.5), tubetes: Math.floor((correctMaxDose * 1.5) / anesthetic.mgPerTubete), label: `${Math.round(correctMaxDose * 1.5)} mg (${Math.floor((correctMaxDose * 1.5) / anesthetic.mgPerTubete)} tubetes)`, correct: false, explanation: "Sobredosagem — excede a dose máxima segura em 50%" },
    { id: 3, doseMg: Math.round(anesthetic.mgPerTubete * 10), tubetes: 10, label: `${Math.round(anesthetic.mgPerTubete * 10)} mg (10 tubetes)`, correct: false, explanation: "Dose fixa sem considerar o peso do paciente — abordagem incorreta" },
  ];
  // Shuffle
  return options.sort(() => Math.random() - 0.5);
}

function JawSVG({ selectedTechnique }: { selectedTechnique: string }) {
  const tech = TECHNIQUES.find(t => t.id === selectedTechnique);
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-[280px] mx-auto">
      <path d="M30 40 Q40 20 80 15 Q130 5 180 15 Q220 20 230 40 Q240 80 235 120 Q225 160 200 185 Q170 200 130 205 Q90 200 60 185 Q35 160 25 120 Q20 80 30 40 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1.5} opacity={0.4} />
      {[60,80,100,120,140,160,180,200].map((x, i) => (<rect key={`u${i}`} x={x - 8} y={25} width={16} height={20} rx={3} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.8} />))}
      {[60,80,100,120,140,160,180,200].map((x, i) => (<rect key={`l${i}`} x={x - 8} y={50} width={16} height={20} rx={3} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.8} />))}
      <path d="M40 100 Q60 110 80 115 Q120 125 160 120 Q200 115 220 100" fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 3"><title>Nervo alveolar inferior</title></path>
      <circle cx={120} cy={150} r={4} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1}><title>Forame mentual</title></circle>
      <path d="M40 85 Q80 75 130 70 Q180 75 220 85" fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3"><title>Nervo lingual</title></path>
      {tech && (<g><line x1={tech.insertionPoint.x} y1={tech.insertionPoint.y - 30} x2={tech.insertionPoint.x} y2={tech.insertionPoint.y} stroke="#ef4444" strokeWidth={2} /><circle cx={tech.insertionPoint.x} cy={tech.insertionPoint.y} r={5} fill="#ef4444" opacity={0.5}><animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite" /></circle></g>)}
    </svg>
  );
}

const HOW_TO = ["Selecione o procedimento no Módulo 1. O peso do paciente é fixo para cada caso.", "Escolha a técnica anestésica no Módulo 2 e observe o ponto de inserção no SVG.", "No Módulo 3, selecione o anestésico e escolha a dose máxima correta entre as opções.", "No Módulo 4, o sistema apresentará uma complicação. Escolha a conduta adequada.", "O Feedback mostrará o resultado final."];
const BUILT_IN = PROCEDURES.map(p => ({ id: p.id, title: p.label, difficulty: p.weight > 75 ? "Difícil" : "Médio", patient: { diagnosis: p.region } }));

export default function SimuladorAnestesiologia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-anestesiologia") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("anestesiologia-odonto", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState("");
  const [selectedAnesthetic, setSelectedAnesthetic] = useState("");
  const [selectedDoseOption, setSelectedDoseOption] = useState<number | null>(null);
  const [doseOptions, setDoseOptions] = useState<ReturnType<typeof generateDoseOptions>>([]);
  const [complicationAnswer, setComplicationAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const procedure = PROCEDURES.find(p => p.id === selectedProcedure);
  const anesthetic = ANESTHETICS.find(a => a.id === selectedAnesthetic);
  const complication = procedure ? COMPLICATIONS[procedure.complication] : null;
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const patientWeight = procedure?.weight || 70;

  // Generate dose options when anesthetic changes
  const handleAnestheticChange = (value: string) => {
    setSelectedAnesthetic(value);
    setSelectedDoseOption(null);
    const anesth = ANESTHETICS.find(a => a.id === value);
    if (anesth && procedure) {
      setDoseOptions(generateDoseOptions(anesth, procedure.weight));
    }
  };

  const confirmDose = () => {
    if (selectedDoseOption !== null) completeModule(3);
  };

  const confirmComplication = () => { completeModule(4); setShowFeedback(true); };

  const calcFeedback = () => {
    if (!procedure) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    decisions.push({ label: "Técnica anestésica", userChoice: TECHNIQUES.find(t => t.id === selectedTechnique)?.label || "-", idealChoice: TECHNIQUES.find(t => t.id === procedure.idealTech)?.label || "-", correct: selectedTechnique === procedure.idealTech });
    decisions.push({ label: "Anestésico", userChoice: anesthetic?.label || "-", idealChoice: ANESTHETICS.find(a => a.id === procedure.idealAnesthetic)?.label || "-", correct: selectedAnesthetic === procedure.idealAnesthetic, explanation: procedure.id === "rest11" && selectedAnesthetic !== "mepi3" ? "Para paciente cardiopata, mepivacaína sem vasoconstritor é mais segura" : undefined });
    const selectedOption = doseOptions.find(o => o.id === selectedDoseOption);
    decisions.push({ label: "Cálculo de dose", userChoice: selectedOption?.label || "-", idealChoice: doseOptions.find(o => o.correct)?.label || "-", correct: selectedOption?.correct || false, explanation: selectedOption?.explanation });
    const correctAnswer = complication?.options.find(o => o.correct)?.label;
    decisions.push({ label: "Conduta na complicação", userChoice: complicationAnswer || "-", idealChoice: correctAnswer || "-", correct: complicationAnswer === correctAnswer });
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    const narrative = score >= 80 ? "Excelente manejo anestésico. A técnica, anestésico e dosagem escolhidos são adequados para o procedimento e perfil do paciente. A complicação foi manejada corretamente." : score >= 50 ? "Algumas escolhas inadequadas podem comprometer a segurança. Revise o cálculo de dose máxima e a indicação por perfil do paciente." : "Decisões inadequadas colocariam o paciente em risco significativo. Em pacientes com comorbidades, a escolha errada do anestésico ou cálculo incorreto da dose pode causar eventos graves.";
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Anestesiologia Odontológica</h1><p className="text-sm text-muted-foreground">Técnicas de bloqueio com cálculo de dose</p></div>
          <SimulatorHowToUse title="Anestesiologia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-anestesiologia" toolName="Anestesiologia Odontológica" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedProcedure(PROCEDURES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} /> : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedProcedure(c.id); }} />)}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const selectedOption = doseOptions.find(o => o.id === selectedDoseOption);
  const expSummary = { "Procedimento": procedure?.label || "-", "Técnica": TECHNIQUES.find(t => t.id === selectedTechnique)?.label || "-", "Anestésico": anesthetic?.label || "-", "Peso": `${patientWeight} kg`, "Dose escolhida": selectedOption?.label || "-", "Pontuação": `${feedback.score}%` };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setSelectedTechnique(""); setSelectedAnesthetic(""); setSelectedDoseOption(null); setDoseOptions([]); setComplicationAnswer(null); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Anestesiologia Odontológica</h1></div>
        <SimulatorHowToUse title="Anestesiologia" steps={HOW_TO} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 1. Procedimento e Região {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><Select value={selectedProcedure} onValueChange={setSelectedProcedure}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{PROCEDURES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select>{procedure && <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1"><p><strong>Região:</strong> {procedure.region}</p><p><strong>Nervo-alvo:</strong> {procedure.nerve}</p><p><strong>Peso do paciente:</strong> {procedure.weight} kg</p></div>}<Button onClick={() => completeModule(1)} disabled={!procedure || completedModules.has(1)} className="w-full">Confirmar</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(1) && <LockedOverlay module={1} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" /> 2. Técnica {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-1.5">{TECHNIQUES.map(t => (<label key={t.id} className={`block p-2 rounded border text-sm cursor-pointer ${selectedTechnique === t.id ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="tech" value={t.id} checked={selectedTechnique === t.id} onChange={() => setSelectedTechnique(t.id)} className="sr-only" /><p className="font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p></label>))}</div><JawSVG selectedTechnique={selectedTechnique} /><Button onClick={() => completeModule(2)} disabled={!selectedTechnique || completedModules.has(2)} className="w-full">Confirmar Técnica</Button></CardContent></Card>

        <Card className="relative">{!completedModules.has(2) && <LockedOverlay module={2} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" /> 3. Cálculo de Dose {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-2 text-sm"><strong>Peso do paciente:</strong> {patientWeight} kg (fixo para este caso)</div>
          <Select value={selectedAnesthetic} onValueChange={handleAnestheticChange}><SelectTrigger><SelectValue placeholder="Selecione o anestésico..." /></SelectTrigger><SelectContent>{ANESTHETICS.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent></Select>
          {anesthetic && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>Concentração:</strong> {anesthetic.mgPerTubete} mg/tubete</p>
              <p><strong>Dose máx.:</strong> {anesthetic.maxDoseMgKg} mg/kg</p>
              {!anesthetic.vasoconstrictor && <Badge variant="outline" className="text-[10px]">Sem vasoconstritor — indicado para cardiopatas</Badge>}
            </div>
          )}
          {doseOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Qual a dose máxima segura para este paciente?</p>
              {doseOptions.map(opt => (
                <label key={opt.id} className={`block p-2 rounded border text-sm cursor-pointer ${selectedDoseOption === opt.id ? (completedModules.has(3) ? (opt.correct ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10") : "border-primary bg-primary/5") : "border-border"}`}>
                  <input type="radio" name="dose" value={opt.id} checked={selectedDoseOption === opt.id} onChange={() => setSelectedDoseOption(opt.id)} className="sr-only" />
                  {opt.label}
                  {completedModules.has(3) && selectedDoseOption === opt.id && !opt.correct && <p className="text-xs text-destructive mt-1">{opt.explanation}</p>}
                </label>
              ))}
            </div>
          )}
          <Button onClick={confirmDose} disabled={selectedDoseOption === null || completedModules.has(3)} className="w-full">Confirmar Dose</Button>
        </CardContent></Card>

        <Card className="relative">{!completedModules.has(3) && <LockedOverlay module={3} />}<CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> 4. Complicação {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}</CardTitle></CardHeader><CardContent className="space-y-3">{complication && <><div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm"><p className="font-medium text-destructive">⚠️ {complication.title}</p><p className="text-muted-foreground mt-1">{complication.desc}</p></div><p className="text-sm font-medium">Qual a conduta adequada?</p>{complication.options.map((opt, i) => (<label key={i} className={`block p-2 rounded border text-sm cursor-pointer ${complicationAnswer === opt.label ? (completedModules.has(4) ? (opt.correct ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10") : "border-primary bg-primary/5") : "border-border hover:bg-muted/30"}`}><input type="radio" name="comp" value={opt.label} checked={complicationAnswer === opt.label} onChange={() => setComplicationAnswer(opt.label)} className="sr-only" />{opt.label}</label>))}</>}<Button onClick={confirmComplication} disabled={!complicationAnswer || completedModules.has(4)} className="w-full">Confirmar Conduta</Button></CardContent></Card>

        <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
        <LabReportPanel benchTitle="Anestesiologia Odontológica" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
