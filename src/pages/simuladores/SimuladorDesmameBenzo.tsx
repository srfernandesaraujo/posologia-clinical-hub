import { useState, useMemo, useRef } from "react";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, HelpCircle, FileDown, AlertTriangle, Sparkles, Loader2, CheckCircle, PauseCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import jsPDF from "jspdf";

// ─── Drug equivalence table (Ashton Protocol) ───
interface BenzoDrug {
  name: string;
  equivalentToDiazepam10mg: number; // mg of this drug = 10mg diazepam
  halfLife: string;
  halfLifeCategory: "short" | "medium" | "long";
}

const BENZO_DRUGS: BenzoDrug[] = [
  { name: "Alprazolam", equivalentToDiazepam10mg: 0.5, halfLife: "6-12h", halfLifeCategory: "short" },
  { name: "Clonazepam", equivalentToDiazepam10mg: 0.5, halfLife: "18-50h", halfLifeCategory: "long" },
  { name: "Lorazepam", equivalentToDiazepam10mg: 1, halfLife: "10-20h", halfLifeCategory: "medium" },
  { name: "Bromazepam", equivalentToDiazepam10mg: 3, halfLife: "12-20h", halfLifeCategory: "medium" },
  { name: "Diazepam", equivalentToDiazepam10mg: 10, halfLife: "20-100h", halfLifeCategory: "long" },
  { name: "Nitrazepam", equivalentToDiazepam10mg: 5, halfLife: "15-38h", halfLifeCategory: "long" },
  { name: "Flunitrazepam", equivalentToDiazepam10mg: 1, halfLife: "18-26h", halfLifeCategory: "long" },
  { name: "Midazolam", equivalentToDiazepam10mg: 7.5, halfLife: "1.5-2.5h", halfLifeCategory: "short" },
];

// ─── Withdrawal symptoms ───
const SYMPTOMS = [
  { id: "insomnia", label: "Insônia", severity: "mild" },
  { id: "tremors", label: "Tremores", severity: "moderate" },
  { id: "irritability", label: "Irritabilidade", severity: "mild" },
  { id: "tachycardia", label: "Taquicardia", severity: "severe" },
  { id: "anxiety", label: "Ansiedade intensa", severity: "moderate" },
  { id: "sweating", label: "Sudorese", severity: "moderate" },
  { id: "nausea", label: "Náusea/Vômito", severity: "moderate" },
  { id: "seizure", label: "Convulsões", severity: "severe" },
  { id: "confusion", label: "Confusão mental", severity: "severe" },
  { id: "muscle_pain", label: "Dor muscular", severity: "mild" },
];

// ─── Built-in cases ───
interface TaperingCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; sex: string; diagnosis: string; clinicalContext: string };
  drugName: string;
  dailyDose: number;
  usageDuration: number; // months
  sensitivity: "normal" | "high";
  comorbidities?: string[];
  expectedPlan: string;
}

const BUILT_IN_CASES: TaperingCase[] = [
  {
    title: "Caso 1: Desmame de Alprazolam após uso prolongado",
    difficulty: "Médio",
    patient: { name: "Mariana Costa", age: 52, sex: "Feminino", diagnosis: "TAG com insônia", clinicalContext: "Usa Alprazolam 2mg/dia há 3 anos. Tentou parar abruptamente e teve crise de pânico." },
    drugName: "Alprazolam", dailyDose: 2, usageDuration: 36, sensitivity: "high",
    comorbidities: ["Hipertensão arterial", "Hipotireoidismo"],
    expectedPlan: "Converter para Diazepam 40mg equivalente, depois reduzir 10% a cada 2 semanas devido à alta sensibilidade.",
  },
  {
    title: "Caso 2: Desmame simples de Clonazepam",
    difficulty: "Fácil",
    patient: { name: "Roberto Almeida", age: 38, sex: "Masculino", diagnosis: "Insônia", clinicalContext: "Usa Clonazepam 0.5mg/noite há 6 meses. Deseja parar por conta própria." },
    drugName: "Clonazepam", dailyDose: 0.5, usageDuration: 6, sensitivity: "normal",
    expectedPlan: "Dose baixa, uso curto. Redução direta de 10% a cada semana.",
  },
  {
    title: "Caso 3: Desmame complexo de Lorazepam em idoso",
    difficulty: "Difícil",
    patient: { name: "Helena Rodrigues", age: 74, sex: "Feminino", diagnosis: "Ansiedade generalizada + Depressão", clinicalContext: "Usa Lorazepam 4mg/dia há 8 anos. Queixa de quedas e déficit cognitivo." },
    drugName: "Lorazepam", dailyDose: 4, usageDuration: 96, sensitivity: "high",
    comorbidities: ["Osteoporose", "Doença de Alzheimer leve", "HAS"],
    expectedPlan: "Converter gradualmente para Diazepam (40mg equiv). Redução ultra-lenta de 5% a cada 2 semanas. Monitorar risco de quedas e cognição.",
  },
];

// ─── Sanitize for PDF ───
function sanitizePDF(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'é': 'e', 'ê': 'e', 'í': 'i',
    'ó': 'o', 'ô': 'o', 'õ': 'o', 'ú': 'u', 'ü': 'u', 'ç': 'c',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'É': 'E', 'Ê': 'E', 'Í': 'I',
    'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ú': 'U', 'Ü': 'U', 'Ç': 'C',
  };
  return text.replace(/[^\x00-\x7F]/g, c => map[c] || '');
}

export default function SimuladorDesmameBenzo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala");

  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("desmame-benzo", BUILT_IN_CASES);
  const { virtualRoomCase, isVirtualRoom: isVR, loading: loadingVR, goBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("desmame-benzo");

  const [screen, setScreen] = useState<"dashboard" | "config" | "plan">("dashboard");
  const [activeCase, setActiveCase] = useState<TaperingCase | null>(null);
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  // Config state
  const [selectedDrug, setSelectedDrug] = useState("");
  const [dailyDose, setDailyDose] = useState("");
  const [usageDuration, setUsageDuration] = useState("");
  const [sensitivity, setSensitivity] = useState<"normal" | "high">("normal");
  const [patientName, setPatientName] = useState("");

  // Plan state
  const [plan, setPlan] = useState<{ week: number; diazepamDose: number; originalDose: number; notes: string }[]>([]);
  const [diazepamEquiv, setDiazepamEquiv] = useState(0);
  const [needsConversion, setNeedsConversion] = useState(false);

  // Symptom check-in
  const [weekCheckins, setWeekCheckins] = useState<Record<number, string[]>>({});
  const [checkinWeek, setCheckinWeek] = useState<number | null>(null);
  const [pausedWeeks, setPausedWeeks] = useState<Set<number>>(new Set());

  // Help dialog
  const [helpOpen, setHelpOpen] = useState(false);

  // Auto-start for virtual rooms
  if (isVR && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    const c = virtualRoomCase as TaperingCase;
    setActiveCase(c);
    setSelectedDrug(c.drugName);
    setDailyDose(String(c.dailyDose));
    setUsageDuration(String(c.usageDuration));
    setSensitivity(c.sensitivity);
    setScreen("config");
  }

  const drug = BENZO_DRUGS.find(d => d.name === selectedDrug);

  // ─── Generate tapering plan ───
  const generatePlan = () => {
    if (!drug || !dailyDose || !usageDuration) return;

    const dose = parseFloat(dailyDose);
    const months = parseInt(usageDuration);
    const equivDiazepam = (dose / drug.equivalentToDiazepam10mg) * 10;
    setDiazepamEquiv(equivDiazepam);

    const isShortHalfLife = drug.halfLifeCategory === "short";
    setNeedsConversion(isShortHalfLife && drug.name !== "Diazepam");

    const reductionRate = sensitivity === "high" ? 0.05 : 0.10;
    const weeksBetween = sensitivity === "high" ? 2 : 1;
    const longUsage = months > 12;

    const schedule: { week: number; diazepamDose: number; originalDose: number; notes: string }[] = [];
    let currentDose = equivDiazepam;
    let week = 0;

    // Phase 1: If short half-life, gradual substitution to diazepam
    if (isShortHalfLife && drug.name !== "Diazepam") {
      const conversionSteps = Math.ceil(equivDiazepam / 5); // convert 5mg diazepam equiv at a time
      let convertedDiazepam = 0;
      let remainingOriginal = dose;

      for (let s = 0; s < conversionSteps && remainingOriginal > 0; s++) {
        week += weeksBetween;
        const chunkDiazepam = Math.min(5, equivDiazepam - convertedDiazepam);
        const chunkOriginal = (chunkDiazepam / 10) * drug.equivalentToDiazepam10mg;
        convertedDiazepam += chunkDiazepam;
        remainingOriginal = Math.max(0, remainingOriginal - chunkOriginal);

        schedule.push({
          week,
          diazepamDose: Math.round(convertedDiazepam * 10) / 10,
          originalDose: Math.round(remainingOriginal * 100) / 100,
          notes: `Substituir ${Math.round(chunkOriginal * 100) / 100}mg ${drug.name} por ${Math.round(chunkDiazepam * 10) / 10}mg Diazepam`,
        });
      }
    }

    // Phase 2: Gradual reduction
    const minDose = 0.5;
    while (currentDose > minDose) {
      week += weeksBetween;
      const reduction = Math.max(currentDose * reductionRate, 0.5);
      currentDose = Math.max(0, currentDose - reduction);
      if (currentDose < minDose) currentDose = 0;

      schedule.push({
        week,
        diazepamDose: Math.round(currentDose * 10) / 10,
        originalDose: 0,
        notes: currentDose === 0
          ? "Suspensão completa"
          : `Reduzir para ${Math.round(currentDose * 10) / 10}mg Diazepam (-${Math.round(reduction * 10) / 10}mg)`,
      });
    }

    // Ensure last entry is 0
    if (schedule.length > 0 && schedule[schedule.length - 1].diazepamDose > 0) {
      week += weeksBetween;
      schedule.push({ week, diazepamDose: 0, originalDose: 0, notes: "Suspensão completa" });
    }

    setPlan(schedule);
    setWeekCheckins({});
    setPausedWeeks(new Set());
    setScreen("plan");
  };

  // ─── Chart data ───
  const chartData = useMemo(() => {
    if (plan.length === 0) return [];
    const data = [{ week: 0, dose: diazepamEquiv }];
    plan.forEach(p => data.push({ week: p.week, dose: p.diazepamDose }));
    return data;
  }, [plan, diazepamEquiv]);

  // ─── Symptom check-in logic ───
  const getSymptomSeverity = (symptoms: string[]) => {
    const severe = symptoms.some(s => {
      const sym = SYMPTOMS.find(x => x.id === s);
      return sym?.severity === "severe";
    });
    const moderate = symptoms.filter(s => {
      const sym = SYMPTOMS.find(x => x.id === s);
      return sym?.severity === "moderate";
    }).length >= 2;
    return severe ? "severe" : moderate ? "moderate" : "mild";
  };

  const handleCheckin = (weekNum: number, symptomIds: string[]) => {
    setWeekCheckins(prev => ({ ...prev, [weekNum]: symptomIds }));
    const severity = getSymptomSeverity(symptomIds);
    if (severity === "severe") {
      setPausedWeeks(prev => new Set(prev).add(weekNum));
    }
  };

  // ─── PDF Export ───
  const exportPDF = () => {
    const doc = new jsPDF();
    const name = patientName || "Paciente";

    doc.setFontSize(16);
    doc.text(sanitizePDF("Plano de Desmame de Benzodiazepinicos"), 14, 20);
    doc.setFontSize(10);
    doc.text(sanitizePDF(`Protocolo de Ashton - Gerado em ${new Date().toLocaleDateString("pt-BR")}`), 14, 28);
    doc.text(sanitizePDF(`Paciente: ${name}`), 14, 35);

    doc.setFontSize(9);
    doc.text(sanitizePDF(`Medicamento: ${selectedDrug} ${dailyDose}mg/dia`), 14, 42);
    doc.text(sanitizePDF(`Equivalente Diazepam: ${diazepamEquiv}mg`), 14, 48);
    doc.text(sanitizePDF(`Tempo de uso: ${usageDuration} meses | Sensibilidade: ${sensitivity === "high" ? "Alta" : "Normal"}`), 14, 54);

    if (needsConversion) {
      doc.setTextColor(180, 100, 0);
      doc.text(sanitizePDF(`Nota: ${selectedDrug} tem meia-vida curta. Conversao gradual para Diazepam recomendada.`), 14, 61);
      doc.setTextColor(0, 0, 0);
    }

    // Table header
    let y = needsConversion ? 70 : 64;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Semana", 14, y);
    doc.text("Dose Diazepam (mg)", 45, y);
    doc.text(sanitizePDF("Observacoes"), 100, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    plan.forEach(p => {
      if (y > 270) { doc.addPage(); y = 20; }
      const isPaused = pausedWeeks.has(p.week);
      doc.text(`${p.week}`, 14, y);
      doc.text(`${p.diazepamDose}`, 45, y);
      const noteText = isPaused ? `${p.notes} [PAUSADO - sintomas]` : p.notes;
      const lines = doc.splitTextToSize(sanitizePDF(noteText), 95);
      doc.text(lines, 100, y);
      y += Math.max(6, lines.length * 5);
    });

    y += 8;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(sanitizePDF("SIMULADOR DIDATICO. O desmame de benzodiazepinicos deve ser supervisionado por um medico psiquiatra."), 14, y);

    doc.save(sanitizePDF(`Desmame_${selectedDrug}_${name.replace(/\s/g, "_")}.pdf`));
  };

  const startCase = (idx: number) => {
    const c = allCases[idx] as TaperingCase;
    setActiveCase(c);
    setSelectedDrug(c.drugName);
    setDailyDose(String(c.dailyDose));
    setUsageDuration(String(c.usageDuration));
    setSensitivity(c.sensitivity);
    setPatientName(c.patient?.name || "");
    setScreen("config");
  };

  const backToDashboard = () => {
    setActiveCase(null);
    setPlan([]);
    setScreen("dashboard");
  };

  if (loadingVR) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isVR && screen === "dashboard") return null;

  // ═══ DASHBOARD ═══
  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/simuladores")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Desmame de Benzodiazepínicos</h1>
          <p className="text-muted-foreground">Planejamento de redução gradual baseado no Protocolo de Ashton</p>
          <AdminPromptViewer toolSlug="sim-desmame-benzo" toolName="Desmame de Benzodiazepínicos" toolType="simulator" prompt={getNativePrompt("sim-desmame-benzo") || ""} />
        </div>

        {/* Legal disclaimer */}
        <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>SIMULADOR DIDÁTICO.</strong> O desmame de benzodiazepínicos deve ser supervisionado estritamente por um médico psiquiatra.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Free mode card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-primary/40" onClick={() => { setActiveCase(null); setSelectedDrug(""); setDailyDose(""); setUsageDuration(""); setSensitivity("normal"); setPatientName(""); setScreen("config"); }}>
            <CardContent className="flex flex-col items-center justify-center min-h-[140px] pt-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <span className="text-lg">💊</span>
              </div>
              <p className="font-medium text-sm">Modo Livre</p>
              <p className="text-xs text-muted-foreground text-center mt-1">Configure manualmente o perfil do paciente</p>
            </CardContent>
          </Card>

          {allCases.map((cs: any, i: number) => (
            <Card key={cs.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => startCase(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={cs.difficulty === "Fácil" ? "secondary" : cs.difficulty === "Difícil" ? "destructive" : "default"}>{cs.difficulty}</Badge>
                  <div className="flex items-center gap-1">
                    {cs.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                    <AdminCaseActions caseItem={cs} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{cs.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{cs.patient?.name} · {cs.drugName} {cs.dailyDose}mg/dia</p>
                {(cs._description || cs.scenario) && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cs._description || cs.scenario}</p>}
                {cs._authorName && <p className="text-xs text-muted-foreground/70 mt-1">Por {cs._authorName}</p>}
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ═══ CONFIGURATION SCREEN ═══
  if (screen === "config") {
    return (
      <div className="max-w-2xl mx-auto">
        {examFeedback && examProgress && (
          <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={examFeedback.simulatorSlug} caseTitle={examFeedback.caseTitle} examProgress={examProgress} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
        )}
        <ExamBanner simulatorSlug="desmame-benzo" caseTitle={activeCase?.title} examProgress={examProgress} />
        <Button variant="ghost" onClick={backToDashboard} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Configuração do Paciente</h1>
          <p className="text-sm text-muted-foreground">Protocolo de Ashton – Desmame gradual de benzodiazepínicos</p>
        </div>

        {/* Legal disclaimer */}
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>SIMULADOR DIDÁTICO.</strong> O desmame de benzodiazepínicos deve ser supervisionado estritamente por um médico psiquiatra.
          </p>
        </div>

        {/* Case context */}
        {activeCase && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <h3 className="font-semibold text-sm">{activeCase.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{activeCase.patient.clinicalContext}</p>
              {activeCase.comorbidities && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {activeCase.comorbidities.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label>Nome do Paciente (opcional)</Label>
              <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Para o relatório PDF" />
            </div>

            <div>
              <Label>Medicamento Atual</Label>
              <Select value={selectedDrug} onValueChange={setSelectedDrug}>
                <SelectTrigger><SelectValue placeholder="Selecione o benzodiazepínico" /></SelectTrigger>
                <SelectContent>
                  {BENZO_DRUGS.map(d => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name} (t½: {d.halfLife})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drug && (
                <p className="text-xs text-muted-foreground mt-1">
                  Equivalência: {drug.equivalentToDiazepam10mg}mg {drug.name} ≈ 10mg Diazepam | Meia-vida: {drug.halfLife}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dose Diária Atual (mg)</Label>
                <Input type="number" value={dailyDose} onChange={e => setDailyDose(e.target.value)} placeholder="Ex: 2" min="0" step="0.25" />
              </div>
              <div>
                <Label>Tempo de Uso (meses)</Label>
                <Input type="number" value={usageDuration} onChange={e => setUsageDuration(e.target.value)} placeholder="Ex: 12" min="1" />
              </div>
            </div>

            <div>
              <Label>Nível de Sensibilidade</Label>
              <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as "normal" | "high")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal – Redução 10% a cada 1 semana</SelectItem>
                  <SelectItem value="high">Alta Sensibilidade – Redução 5% a cada 2 semanas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Pacientes com tentativas anteriores de desmame fracassadas, uso &gt; 1 ano ou idosos devem usar "Alta Sensibilidade".
              </p>
            </div>

            {drug && dailyDose && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium">Dose Equivalente em Diazepam:</p>
                <p className="text-2xl font-bold text-primary">{((parseFloat(dailyDose) / drug.equivalentToDiazepam10mg) * 10).toFixed(1)} mg</p>
                {drug.halfLifeCategory === "short" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Meia-vida curta – substituição gradual para Diazepam recomendada antes do desmame
                  </p>
                )}
              </div>
            )}

            <Button onClick={generatePlan} disabled={!selectedDrug || !dailyDose || !usageDuration} className="w-full">
              Gerar Plano de Desmame
            </Button>
          </CardContent>
        </Card>

        {/* Help button */}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="gap-2">
            <HelpCircle className="h-4 w-4" /> O que é Síndrome de Abstinência?
          </Button>
        </div>

        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Síndrome de Abstinência de Benzodiazepínicos</DialogTitle></DialogHeader>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>A síndrome de abstinência ocorre quando um paciente que usa benzodiazepínicos de forma prolongada interrompe ou reduz abruptamente a dose.</p>
              <p><strong>Sintomas comuns:</strong> insônia rebote, ansiedade, tremores, irritabilidade, sudorese, palpitações, dores musculares.</p>
              <p><strong>Sintomas graves:</strong> convulsões, confusão mental, psicose. Podem ocorrer especialmente com drogas de meia-vida curta (Alprazolam, Midazolam).</p>
              <p><strong>Por que o desmame gradual?</strong> A redução lenta (5-10% a cada 1-2 semanas) permite que os receptores GABA-A se reajustem progressivamente, minimizando sintomas.</p>
              <p><strong>Protocolo de Ashton:</strong> Recomenda converter para Diazepam (meia-vida longa de 20-100h), que proporciona níveis plasmáticos mais estáveis, e então reduzir gradualmente.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══ PLAN SCREEN ═══
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setScreen("config")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar à Configuração
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="gap-1">
            <HelpCircle className="h-4 w-4" /> Ajuda
          </Button>
          <Button size="sm" onClick={exportPDF} className="gap-1">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>SIMULADOR DIDÁTICO.</strong> O desmame de benzodiazepínicos deve ser supervisionado estritamente por um médico psiquiatra.
        </p>
      </div>

      <h1 className="text-2xl font-bold mb-1">Plano de Desmame</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {selectedDrug} {dailyDose}mg/dia → Diazepam {diazepamEquiv.toFixed(1)}mg equiv. | Duração estimada: ~{plan.length > 0 ? plan[plan.length - 1].week : 0} semanas
        {patientName && ` | ${patientName}`}
      </p>

      {needsConversion && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Fase de Conversão:</strong> {selectedDrug} tem meia-vida curta. O plano inclui substituição gradual para Diazepam antes da redução final.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Curva de Redução</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Diazepam (mg)", angle: -90, position: "insideLeft" }} />
                  <ReferenceLine y={0} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="dose" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Dose" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Dose Inicial</p>
                <p className="font-bold text-sm">{diazepamEquiv.toFixed(1)}mg</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="font-bold text-sm">~{plan.length > 0 ? plan[plan.length - 1].week : 0} sem</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Redução/etapa</p>
                <p className="font-bold text-sm">{sensitivity === "high" ? "5%" : "10%"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Cronograma Semanal</CardTitle>
              <Badge variant="outline" className="text-xs">{plan.length} etapas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1.5">
              {plan.map((p, idx) => {
                const isPaused = pausedWeeks.has(p.week);
                const checkin = weekCheckins[p.week];
                const severity = checkin ? getSymptomSeverity(checkin) : null;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm transition-colors ${
                      p.diazepamDose === 0
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                        : isPaused
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "border-border"
                    }`}
                  >
                    <div className="flex-shrink-0 w-14 text-center">
                      <p className="text-xs text-muted-foreground">Sem.</p>
                      <p className="font-bold">{p.week}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{p.diazepamDose}mg</span>
                        {p.originalDose > 0 && (
                          <span className="text-xs text-muted-foreground">+ {p.originalDose}mg {selectedDrug}</span>
                        )}
                        {isPaused && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                            <PauseCircle className="h-3 w-3 mr-0.5" />Pausado
                          </Badge>
                        )}
                        {p.diazepamDose === 0 && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>

                      {/* Symptom feedback */}
                      {severity === "severe" && (
                        <div className="mt-1 p-1.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                          <p className="text-[10px] text-red-700 dark:text-red-300 font-medium">⚠ Sintomas graves detectados. Recomendação: pausar redução e consultar médico imediatamente.</p>
                        </div>
                      )}
                      {severity === "moderate" && (
                        <div className="mt-1 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Sintomas moderados. Considerar pausar redução por 1 semana adicional.</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setCheckinWeek(p.week)}>
                        Check-in
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Symptom Check-in Dialog */}
      <Dialog open={checkinWeek !== null} onOpenChange={() => setCheckinWeek(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Check-in Semanal – Semana {checkinWeek}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Marque os sintomas presentes nesta semana:</p>
          <div className="space-y-2">
            {SYMPTOMS.map(s => {
              const checked = (weekCheckins[checkinWeek || 0] || []).includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const current = weekCheckins[checkinWeek || 0] || [];
                      const updated = c ? [...current, s.id] : current.filter(x => x !== s.id);
                      handleCheckin(checkinWeek || 0, updated);
                    }}
                  />
                  <span className="text-sm">{s.label}</span>
                  <Badge variant="outline" className={`text-[10px] ml-auto ${
                    s.severity === "severe" ? "text-red-600 border-red-300" : s.severity === "moderate" ? "text-amber-600 border-amber-300" : "text-muted-foreground"
                  }`}>
                    {s.severity === "severe" ? "Grave" : s.severity === "moderate" ? "Moderado" : "Leve"}
                  </Badge>
                </label>
              );
            })}
          </div>
          <Separator className="my-3" />
          {checkinWeek !== null && weekCheckins[checkinWeek] && getSymptomSeverity(weekCheckins[checkinWeek]) === "severe" && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">⚠ Sintomas graves detectados!</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Recomendação: <strong>Pausar redução na dose atual</strong> por mais 1-2 semanas e <strong>consultar médico imediatamente</strong>.</p>
            </div>
          )}
          <Button onClick={() => setCheckinWeek(null)} className="w-full mt-2">Salvar Check-in</Button>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Síndrome de Abstinência de Benzodiazepínicos</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>A síndrome de abstinência ocorre quando um paciente que usa benzodiazepínicos de forma prolongada interrompe ou reduz abruptamente a dose.</p>
            <p><strong>Sintomas comuns:</strong> insônia rebote, ansiedade, tremores, irritabilidade, sudorese, palpitações, dores musculares.</p>
            <p><strong>Sintomas graves:</strong> convulsões, confusão mental, psicose. Podem ocorrer especialmente com drogas de meia-vida curta.</p>
            <p><strong>Protocolo de Ashton:</strong> Converter para Diazepam (meia-vida longa), depois reduzir 5-10% a cada 1-2 semanas.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Educational cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">⏱ Visualização do Tempo</h3>
          <p className="text-xs text-muted-foreground">Um desmame seguro pode levar 3, 6 ou até 12 meses. A pressa é inimiga da segurança.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">🧠 Segurança Psicológica</h3>
          <p className="text-xs text-muted-foreground">Prever e monitorar sintomas dá ao paciente mais controle e confiança no processo.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">⏸ Ajuste Fino</h3>
          <p className="text-xs text-muted-foreground">Pausar o desmame quando sintomas são fortes imita a prática clínica real e previne recaídas.</p>
        </div>
      </div>
    </div>
  );
}
