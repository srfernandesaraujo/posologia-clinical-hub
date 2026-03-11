import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, ClipboardList, Eye, Stethoscope, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";

const PATIENTS = [
  { id: "p1", name: "João Silva", age: 45, complaint: "Dor ao mastigar no lado direito", history: "Hipertensão controlada, fumante", xray: "RX periapical: radiolucidez oclusal em 46 e distal em 26. Elemento 16 com restauração extensa. Elementos 18, 28, 38, 48 ausentes.", findings: { 16: { O: "carie", M: "restauracao" }, 26: { D: "carie" }, 36: { absent: true }, 46: { V: "fratura", O: "carie" }, 18: { absent: true }, 28: { absent: true }, 38: { absent: true }, 48: { absent: true } }, idealDiagnoses: { "46-O": "ICDAS 4", "46-V": "Fratura coronária", "26-D": "ICDAS 3", "16-O": "ICDAS 5" }, idealPlan: ["46-V", "46-O", "26-D", "16-O"] },
  { id: "p2", name: "Maria Oliveira", age: 28, complaint: "Sangramento gengival ao escovar", history: "Gestante (24 sem), sem comorbidades", xray: "RX interproximal: radiolucidez mesial do 11 atingindo esmalte. Restauração oclusal íntegra em 24. Radiolucidez oclusal-distal em 14.", findings: { 11: { M: "carie" }, 21: { D: "restauracao" }, 14: { O: "carie", D: "carie" }, 24: { O: "restauracao" }, 37: { O: "carie" } }, idealDiagnoses: { "11-M": "ICDAS 2", "14-O": "ICDAS 3", "14-D": "ICDAS 3", "37-O": "ICDAS 4" }, idealPlan: ["14-O", "14-D", "37-O", "11-M"] },
  { id: "p3", name: "Carlos Mendes", age: 62, complaint: "Prótese parcial desadaptada", history: "Diabético tipo 2, cardiopata", xray: "RX panorâmica: múltiplas ausências (11,12,21,22,35,36,45,46). Cárie vestibular em 15, restauração oclusal em 25. Radiolucidez oclusal-distal em 47.", findings: { 11: { absent: true }, 12: { absent: true }, 21: { absent: true }, 22: { absent: true }, 35: { absent: true }, 36: { absent: true }, 45: { absent: true }, 46: { absent: true }, 15: { V: "carie" }, 25: { O: "restauracao" }, 47: { O: "carie", D: "carie" } }, idealDiagnoses: { "15-V": "ICDAS 3", "47-O": "ICDAS 4", "47-D": "ICDAS 3" }, idealPlan: ["47-O", "47-D", "15-V"] },
];

type Condition = "carie" | "restauracao" | "fratura" | "implante" | "ausente" | null;
const CONDITION_COLORS: Record<string, string> = { carie: "#ef4444", restauracao: "#3b82f6", fratura: "#f59e0b", implante: "#8b5cf6", ausente: "#6b7280" };
const CONDITION_LABELS: Record<string, string> = { carie: "Cárie", restauracao: "Restauração", fratura: "Fratura", implante: "Implante", ausente: "Ausente" };
const FACES = ["V", "L", "M", "D", "O"] as const;
const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const ICDAS_OPTIONS = ["ICDAS 1", "ICDAS 2", "ICDAS 3", "ICDAS 4", "ICDAS 5", "ICDAS 6", "Fratura coronária", "Ausente"];

type ToothFindings = Record<string, Condition>;
type AllFindings = Record<number, ToothFindings>;

function ToothSVG({ number, findings, onFaceClick, size = 48 }: { number: number; findings: ToothFindings; onFaceClick: (face: string) => void; size?: number }) {
  const isAbsent = findings.absent === "ausente";
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  if (isAbsent) {
    return (
      <svg width={size} height={size + 14} className="cursor-pointer" onClick={() => onFaceClick("absent")}>
        <line x1={4} y1={4} x2={size - 4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
        <line x1={size - 4} y1={4} x2={4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
        <text x={cx} y={size + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">{number}</text>
      </svg>
    );
  }
  const faceColor = (f: string) => findings[f] ? CONDITION_COLORS[findings[f] as string] : "hsl(var(--muted)/0.3)";
  const ir = r * 0.4;
  return (
    <svg width={size} height={size + 14} className="cursor-pointer">
      <path d={`M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx + ir} ${cy - ir} L ${cx - ir} ${cy - ir} Z`} fill={faceColor("V")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("V")}><title>Vestibular</title></path>
      <path d={`M ${cx - r} ${cy + r} L ${cx + r} ${cy + r} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`} fill={faceColor("L")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("L")}><title>Lingual</title></path>
      <path d={`M ${cx - r} ${cy - r} L ${cx - r} ${cy + r} L ${cx - ir} ${cy + ir} L ${cx - ir} ${cy - ir} Z`} fill={faceColor("M")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("M")}><title>Mesial</title></path>
      <path d={`M ${cx + r} ${cy - r} L ${cx + r} ${cy + r} L ${cx + ir} ${cy + ir} L ${cx + ir} ${cy - ir} Z`} fill={faceColor("D")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("D")}><title>Distal</title></path>
      <rect x={cx - ir} y={cy - ir} width={ir * 2} height={ir * 2} fill={faceColor("O")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("O")}><title>Oclusal</title></rect>
      <text x={cx} y={size + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))">{number}</text>
    </svg>
  );
}

function getDiagnoses(findings: AllFindings) {
  const diags: { tooth: number; face: string; condition: string; key: string }[] = [];
  Object.entries(findings).forEach(([t, faces]) => {
    const tooth = Number(t);
    Object.entries(faces).forEach(([face, cond]) => {
      if (cond === "carie") diags.push({ tooth, face, condition: "Cárie", key: `${tooth}-${face}` });
      if (cond === "fratura") diags.push({ tooth, face, condition: "Fratura coronária", key: `${tooth}-${face}` });
      if (cond === "ausente") diags.push({ tooth, face: "-", condition: "Elemento ausente", key: `${tooth}-absent` });
    });
  });
  return diags;
}

const HOW_TO_STEPS = [
  "Selecione um paciente no Módulo 1. Leia a anamnese e a radiografia esquemática para identificar os achados esperados.",
  "No Módulo 2, use as ferramentas (cárie, restauração, fratura, etc.) para marcar as faces dos dentes na arcada SVG baseado nos achados do RX.",
  "No Módulo 3, o sistema apresentará os achados encontrados. Para cada lesão, escolha a classificação ICDAS correta (quiz de múltipla escolha).",
  "No Módulo 4, selecione os procedimentos do plano de tratamento e confirme.",
  "Após confirmar todos os módulos, o painel de Feedback mostrará sua pontuação, decisões vs. ideais e o que aconteceria com o paciente.",
  "Gere o relatório científico no Módulo 5.",
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: p.name, difficulty: p.age > 60 ? "Difícil" : "Médio", patient: { diagnosis: p.complaint } }));

export default function SimuladorOdontograma() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-odontograma") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("odontograma", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [activeTool, setActiveTool] = useState<Condition>("carie");
  const [userFindings, setUserFindings] = useState<AllFindings>({});
  const [diagAnswers, setDiagAnswers] = useState<Record<string, string>>({});
  const [treatmentPlan, setTreatmentPlan] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const handleFaceClick = (tooth: number, face: string) => {
    if (!completedModules.has(1)) return;
    setUserFindings(prev => {
      const copy = { ...prev };
      if (!copy[tooth]) copy[tooth] = {};
      if (face === "absent") {
        copy[tooth] = { absent: "ausente" };
      } else {
        if (copy[tooth][face] === activeTool) {
          const { [face]: _, ...rest } = copy[tooth];
          copy[tooth] = rest;
        } else {
          copy[tooth] = { ...copy[tooth], [face]: activeTool };
        }
      }
      return copy;
    });
  };

  const diags = getDiagnoses(userFindings);

  const confirmTreatment = () => {
    completeModule(4);
    setShowFeedback(true);
  };

  // Calculate feedback
  const calcFeedback = (): { score: number; decisions: FeedbackDecision[]; narrative: string } => {
    if (!patient) return { score: 0, decisions: [], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    // Diagnoses quiz
    Object.entries(patient.idealDiagnoses).forEach(([key, ideal]) => {
      const userAnswer = diagAnswers[key] || "Não respondido";
      decisions.push({ label: `Diagnóstico ${key}`, userChoice: userAnswer, idealChoice: ideal, correct: userAnswer === ideal, explanation: userAnswer === ideal ? "Classificação correta segundo ICDAS" : `A classificação correta seria ${ideal} para esta lesão` });
    });
    // Treatment
    const idealSet = new Set(patient.idealPlan);
    const userSet = new Set(treatmentPlan);
    patient.idealPlan.forEach(key => {
      decisions.push({ label: `Tratamento ${key}`, userChoice: userSet.has(key) ? "Incluído" : "Não incluído", idealChoice: "Incluído", correct: userSet.has(key), explanation: !userSet.has(key) ? "Este procedimento era necessário e não foi incluído no plano" : undefined });
    });
    treatmentPlan.filter(k => !idealSet.has(k)).forEach(key => {
      decisions.push({ label: `Tratamento ${key}`, userChoice: "Incluído", idealChoice: "Não necessário", correct: false, explanation: "Este procedimento foi incluído mas não era necessário" });
    });
    const correctCount = decisions.filter(d => d.correct).length;
    const score = decisions.length > 0 ? Math.round((correctCount / decisions.length) * 100) : 0;
    const narrative = score >= 80
      ? "Com as decisões tomadas, o paciente teria um tratamento adequado com bom prognóstico. Os diagnósticos corretos permitem um plano de tratamento preciso e o paciente teria resolução dos seus sintomas."
      : score >= 50
      ? "Algumas decisões inadequadas podem levar a subtratamento ou tratamento desnecessário. Lesões não diagnosticadas corretamente podem progredir, enquanto diagnósticos equivocados podem resultar em procedimentos invasivos desnecessários."
      : "As decisões tomadas colocariam o paciente em risco. Lesões não identificadas progrediriam para comprometimento pulpar, e classificações incorretas levariam a abordagens terapêuticas inadequadas, resultando em dor persistente e possível perda dentária.";
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  // Dashboard mode
  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Odontograma Interativo e Diagnóstico</h1>
            <p className="text-sm text-muted-foreground">Registro clínico odontológico padronizado com arcada SVG interativa</p>
          </div>
          <SimulatorHowToUse title="Odontograma" steps={HOW_TO_STEPS} />
          <AdminPromptViewer toolSlug="sim-odontograma" toolName="Odontograma Interativo" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />
          )}
        </div>
        {isAdmin && (
          <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Gerando..." : "Gerar Caso com IA"}
          </Button>
        )}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module} para desbloquear</p>
    </div>
  );

  const expSummary: Record<string, string> = patient ? {
    "Paciente": patient.name,
    "Idade": `${patient.age} anos`,
    "Queixa": patient.complaint,
    "Achados registrados": `${Object.keys(userFindings).length} dentes`,
    "Diagnósticos": `${diags.length} encontrados`,
    "Pontuação": `${feedback.score}%`,
  } : {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserFindings({}); setDiagAnswers({}); setTreatmentPlan([]); setShowFeedback(false); setSelectedPatient(""); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Odontograma Interativo e Diagnóstico</h1>
          <p className="text-sm text-muted-foreground">Registro clínico odontológico padronizado</p>
        </div>
        <SimulatorHowToUse title="Odontograma" steps={HOW_TO_STEPS} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 — Seleção do Paciente + RX */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" /> 1. Seleção do Paciente
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente..." /></SelectTrigger>
              <SelectContent>
                {PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.age} anos</SelectItem>)}
              </SelectContent>
            </Select>
            {patient && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p><strong>Queixa:</strong> {patient.complaint}</p>
                  <p><strong>Histórico:</strong> {patient.history}</p>
                </div>
                <div className="bg-card border rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">📷 Radiografia Esquemática</p>
                  <div className="bg-[#1a1a2e] rounded-lg p-3 text-xs text-[#a0a0c0] leading-relaxed">
                    {patient.xray}
                  </div>
                </div>
              </>
            )}
            <Button onClick={() => completeModule(1)} disabled={!patient || completedModules.has(1)} className="w-full">
              Confirmar Paciente
            </Button>
          </CardContent>
        </Card>

        {/* M2 — Exame Clínico Visual */}
        <Card className="lg:col-span-1 relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> 2. Exame Clínico — Arcada SVG
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {(["carie", "restauracao", "fratura", "implante", "ausente"] as Condition[]).map(c => c && (
                <button key={c} onClick={() => setActiveTool(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${activeTool === c ? "border-foreground bg-foreground/10" : "border-border"}`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CONDITION_COLORS[c] }} />
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1 text-center">Arcada Superior</p>
              <div className="flex justify-center flex-wrap gap-0.5">
                {UPPER_TEETH.map(t => <ToothSVG key={t} number={t} findings={userFindings[t] || {}} onFaceClick={(f) => handleFaceClick(t, f)} size={40} />)}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1 text-center">Arcada Inferior</p>
              <div className="flex justify-center flex-wrap gap-0.5">
                {LOWER_TEETH.map(t => <ToothSVG key={t} number={t} findings={userFindings[t] || {}} onFaceClick={(f) => handleFaceClick(t, f)} size={40} />)}
              </div>
            </div>
            <Button onClick={() => completeModule(2)} disabled={Object.keys(userFindings).length === 0 || completedModules.has(2)} className="w-full">
              Confirmar Exame Clínico
            </Button>
          </CardContent>
        </Card>

        {/* M3 — Classificação Diagnóstica (Quiz ICDAS) */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> 3. Quiz Diagnóstico (ICDAS)
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diags.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-3">
                {diags.filter(d => d.condition !== "Elemento ausente").map((d, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CONDITION_COLORS[d.condition === "Cárie" ? "carie" : "fratura"] }} />
                      <span className="text-sm font-medium">Dente {d.tooth} ({d.face}) — {d.condition}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Classifique esta lesão:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {ICDAS_OPTIONS.map(opt => (
                        <button key={opt}
                          onClick={() => setDiagAnswers(prev => ({ ...prev, [d.key]: opt }))}
                          className={`text-xs p-1.5 rounded border transition-colors ${diagAnswers[d.key] === opt ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted/50"}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Registre achados no módulo 2 para gerar o quiz.</p>
            )}
            <Button onClick={() => completeModule(3)} disabled={diags.filter(d => d.condition !== "Elemento ausente").length === 0 || Object.keys(diagAnswers).length === 0 || completedModules.has(3)} className="w-full">
              Confirmar Diagnósticos
            </Button>
          </CardContent>
        </Card>

        {/* M4 — Plano de Tratamento */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 4. Plano de Tratamento
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione os procedimentos prioritários:</p>
                {diags.map((d, i) => {
                  const proc = d.condition === "Cárie" ? "Restauração direta em resina composta" : d.condition === "Fratura coronária" ? "Avaliação para coroa protética" : "Avaliação para prótese/implante";
                  const checked = treatmentPlan.includes(d.key);
                  return (
                    <label key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded p-2 cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" checked={checked} onChange={() => setTreatmentPlan(prev => checked ? prev.filter(x => x !== d.key) : [...prev, d.key])} className="rounded" />
                      <span className="font-medium">Dente {d.tooth}:</span>
                      <span>{proc}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <Button onClick={confirmTreatment} disabled={treatmentPlan.length === 0 || completedModules.has(4)} className="w-full">
              Confirmar Plano de Tratamento
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Feedback */}
      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />

      {/* M5 — Relatório */}
      <LabReportPanel benchTitle="Odontograma Interativo" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
