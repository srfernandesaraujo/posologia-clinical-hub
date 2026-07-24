import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Beaker, Activity, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Area, AreaChart } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getGlicemiaLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-glicemia";

interface GlicDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { jejum: number; pp: number; hba1c: number; insulina: number; peptideoC: number };
  sideEffects: { hipo: number; gi: number; peso: number; cetoacidose: number; lacticoacidose: number };
  daysToEffect: number;
}

const DRUGS: GlicDrug[] = [
  { name: "Metformina", class: "Biguanida", doseMin: 500, doseMax: 2550, doseUnit: "mg/dia", doseStep: 250, effects: { jejum: -40, pp: -50, hba1c: -1.5, insulina: 0, peptideoC: 0 }, sideEffects: { hipo: 0.02, gi: 0.35, peso: -0.1, cetoacidose: 0, lacticoacidose: 0.05 }, daysToEffect: 7 },
  { name: "Glibenclamida", class: "Sulfonilureia", doseMin: 2.5, doseMax: 20, doseUnit: "mg/dia", doseStep: 2.5, effects: { jejum: -55, pp: -70, hba1c: -1.5, insulina: 15, peptideoC: 0.5 }, sideEffects: { hipo: 0.4, gi: 0.1, peso: 0.3, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 3 },
  { name: "Empagliflozina", class: "iSGLT2", doseMin: 10, doseMax: 25, doseUnit: "mg/dia", doseStep: 15, effects: { jejum: -25, pp: -35, hba1c: -0.8, insulina: -5, peptideoC: 0 }, sideEffects: { hipo: 0.01, gi: 0.05, peso: -0.2, cetoacidose: 0.08, lacticoacidose: 0 }, daysToEffect: 5 },
  { name: "Sitagliptina", class: "iDPP-4", doseMin: 25, doseMax: 100, doseUnit: "mg/dia", doseStep: 25, effects: { jejum: -15, pp: -40, hba1c: -0.7, insulina: 8, peptideoC: 0.3 }, sideEffects: { hipo: 0.02, gi: 0.08, peso: 0.05, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 5 },
  { name: "Liraglutida", class: "GLP-1 RA", doseMin: 0.6, doseMax: 1.8, doseUnit: "mg/dia SC", doseStep: 0.6, effects: { jejum: -30, pp: -55, hba1c: -1.2, insulina: 10, peptideoC: 0.4 }, sideEffects: { hipo: 0.02, gi: 0.3, peso: -0.3, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 7 },
  { name: "Insulina NPH", class: "Insulina Basal", doseMin: 10, doseMax: 60, doseUnit: "UI/dia", doseStep: 2, effects: { jejum: -60, pp: -30, hba1c: -1.5, insulina: 30, peptideoC: 0 }, sideEffects: { hipo: 0.35, gi: 0, peso: 0.4, cetoacidose: -0.5, lacticoacidose: 0 }, daysToEffect: 2 },
  { name: "Insulina Glargina", class: "Insulina Basal", doseMin: 10, doseMax: 80, doseUnit: "UI/dia", doseStep: 2, effects: { jejum: -65, pp: -25, hba1c: -1.5, insulina: 25, peptideoC: 0 }, sideEffects: { hipo: 0.2, gi: 0, peso: 0.35, cetoacidose: -0.5, lacticoacidose: 0 }, daysToEffect: 3 },
  { name: "Insulina Lispro", class: "Insulina Rápida", doseMin: 4, doseMax: 30, doseUnit: "UI/refeição", doseStep: 2, effects: { jejum: -10, pp: -80, hba1c: -1.0, insulina: 40, peptideoC: 0 }, sideEffects: { hipo: 0.45, gi: 0, peso: 0.4, cetoacidose: -0.3, lacticoacidose: 0 }, daysToEffect: 0.5 },
  { name: "Pioglitazona", class: "Tiazolidinediona", doseMin: 15, doseMax: 45, doseUnit: "mg/dia", doseStep: 15, effects: { jejum: -35, pp: -40, hba1c: -1.0, insulina: -8, peptideoC: 0 }, sideEffects: { hipo: 0.02, gi: 0.05, peso: 0.35, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 14 },
];

interface GlicCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: { jejum: number; pp: number; hba1c: number; insulina: number; peptideoC: number; creatinina: number; tfg: number; potassio: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: GlicCase[] = [
  {
    title: "Caso 1: DM2 Recém-diagnosticado",
    difficulty: "Fácil",
    patient: { name: "Maria Santos", age: 52, weight: 85, sex: "F", specialGroup: ["Obesa"], diagnosis: "DM2 HbA1c 8.2% — 1ª linha" },
    scenario: "Mulher 52a, obesa (IMC 32), glicemia de jejum 185 mg/dL, HbA1c 8.2%. Sem complicações. TFG 95. Primeira consulta.",
    baseLab: { jejum: 185, pp: 260, hba1c: 8.2, insulina: 22, peptideoC: 3.0, creatinina: 0.8, tfg: 95, potassio: 4.2 },
    expectedDrugs: ["Metformina"],
    clinicalTip: "DM2 recém-diagnosticado com HbA1c 7-9%: metformina 1ª linha. Iniciar 500mg e titular a cada 1-2 semanas. Associar MEV.",
    references: ["SBD 2024", "ADA Standards of Care 2024"],
  },
  {
    title: "Caso 2: DM2 com Doença CV",
    difficulty: "Médio",
    patient: { name: "José Oliveira", age: 63, weight: 92, sex: "M", specialGroup: ["DCV", "IC"], diagnosis: "DM2 + IC com FE reduzida" },
    scenario: "Homem 63a, DM2 há 8 anos, IAM prévio, IC FE 35%. HbA1c 8.5% em uso de metformina 2g/dia. TFG 72.",
    baseLab: { jejum: 195, pp: 280, hba1c: 8.5, insulina: 18, peptideoC: 2.5, creatinina: 1.1, tfg: 72, potassio: 4.5 },
    expectedDrugs: ["Empagliflozina", "Liraglutida"],
    clinicalTip: "DM2 + DCV/IC: priorizar iSGLT2 (empagliflozina/dapagliflozina) por benefício cardiorrenal. GLP-1 RA como alternativa com benefício CV.",
    references: ["EMPA-REG OUTCOME 2015", "ADA/EASD Consensus 2022"],
  },
  {
    title: "Caso 3: DM2 com DRC G3b",
    difficulty: "Difícil",
    patient: { name: "Dona Fátima", age: 68, weight: 65, sex: "F", specialGroup: ["DRC G3b"], diagnosis: "DM2 + DRC G3b TFG 38" },
    scenario: "Mulher 68a, DM2 há 15 anos. TFG 38 mL/min (G3b). HbA1c 8.0% em metformina 1g + glibenclamida 10mg. Hipoglicemias frequentes.",
    baseLab: { jejum: 170, pp: 240, hba1c: 8.0, insulina: 14, peptideoC: 4.0, creatinina: 1.6, tfg: 38, potassio: 5.0 },
    expectedDrugs: ["Insulina Glargina"],
    clinicalTip: "DRC G3b (TFG 30-44): suspender metformina se <30. Suspender glibenclamida (hipoglicemia). iSGLT2 com cautela. Insulina é segura.",
    references: ["KDIGO 2022", "SBD 2024"],
  },
  {
    title: "Caso 4: Cetoacidose Diabética",
    difficulty: "Difícil",
    patient: { name: "Pedro Lima", age: 28, weight: 70, sex: "M", specialGroup: ["DM1"], diagnosis: "CAD — pH 7.18, glicemia 450" },
    scenario: "Homem 28a, DM1 diagnosticado há 5 meses. Parou insulina há 3 dias. Náusea, dor abdominal, Kussmaul. pH 7.18, glicemia 450.",
    baseLab: { jejum: 450, pp: 520, hba1c: 11.0, insulina: 2, peptideoC: 0.3, creatinina: 1.4, tfg: 75, potassio: 5.8 },
    expectedDrugs: ["Insulina Lispro"],
    clinicalTip: "CAD: SF 0.9% 1-1.5L/h → insulina regular EV 0.1 UI/kg/h. Repor K⁺ se <5.3. Manter insulina até gap AG normalizar. Transição para basal-bolus.",
    references: ["ADA 2024", "Kitabchi AE, Diabetes Care 2009"],
  },
  {
    title: "Caso 5: DM2 Idoso Frágil",
    difficulty: "Médio",
    patient: { name: "Seu Antônio", age: 82, weight: 58, sex: "M", specialGroup: ["Idoso frágil", "Polifarmácia"], diagnosis: "DM2 + fragilidade — meta HbA1c <8.5%" },
    scenario: "Homem 82a, frágil, DM2 há 20 anos. HbA1c 7.0% com glibenclamida 15mg + metformina 1.5g. Hipoglicemias noturnas recorrentes.",
    baseLab: { jejum: 110, pp: 180, hba1c: 7.0, insulina: 10, peptideoC: 1.5, creatinina: 1.3, tfg: 45, potassio: 4.8 },
    expectedDrugs: ["Sitagliptina"],
    clinicalTip: "Idoso frágil: meta HbA1c <8-8.5%. Suspender sulfonilureias (hipo). iDPP-4 seguro, peso-neutro. Reduzir metformina se TFG <45.",
    references: ["ADA Older Adults 2024", "SBD 2024"],
  },
];

function computeSimulation(drug: GlicDrug, dose: number, baseLab: GlicCase["baseLab"]) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.65 + doseFrac * 0.35;
  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = d >= drug.daysToEffect ? Math.min((d - drug.daysToEffect + 1) / 5, 1) : 0;
    trend.push({
      day: d,
      jejum: Math.max(40, Math.round(baseLab.jejum + drug.effects.jejum * intensity * p)),
      pp: Math.max(60, Math.round(baseLab.pp + drug.effects.pp * intensity * p)),
      hba1c: Math.max(4, +(baseLab.hba1c + drug.effects.hba1c * intensity * p * 0.3).toFixed(1)),
      insulina: Math.max(0, +(baseLab.insulina + drug.effects.insulina * intensity * p).toFixed(1)),
    });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({
    name: k === "hipo" ? "Hipoglicemia" : k === "gi" ? "GI" : k === "peso" ? "Ganho de Peso" : k === "cetoacidose" ? "Cetoacidose" : "Acidose Láctica",
    risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100),
  }));
  const labGauges = [
    { name: "Jejum", value: last.jejum, unit: "mg/dL", refLow: 70, refHigh: 99, status: last.jejum < 70 ? "baixo" : last.jejum > 99 ? "alto" : "normal" },
    { name: "Pós-prandial", value: last.pp, unit: "mg/dL", refLow: 70, refHigh: 140, status: last.pp > 140 ? "alto" : "normal" },
    { name: "HbA1c", value: last.hba1c, unit: "%", refLow: 4.0, refHigh: 7.0, status: last.hba1c > 7.0 ? "alto" : "normal" },
    { name: "Insulina", value: last.insulina, unit: "µUI/mL", refLow: 2.6, refHigh: 24.9, status: last.insulina < 2.6 ? "baixo" : last.insulina > 24.9 ? "alto" : "normal" },
    { name: "K⁺", value: baseLab.potassio, unit: "mEq/L", refLow: 3.5, refHigh: 5.0, status: baseLab.potassio < 3.5 ? "baixo" : baseLab.potassio > 5.0 ? "alto" : "normal" },
    { name: "TFG", value: baseLab.tfg, unit: "mL/min", refLow: 60, refHigh: 120, status: baseLab.tfg < 60 ? "baixo" : "normal" },
  ];
  return { trend, sideEffects, labGauges, lastLab: last };
}

function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : "bg-green-500/10 border-green-500/30";
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className="text-xs text-muted-foreground font-medium">{name}</p>
      <p className={`text-lg font-mono font-bold ${color}`}>{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
      <p className={`text-[9px] font-semibold ${color}`}>{status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲ ALTO" : "● NORMAL"}</p>
    </div>
  );
}

function GlycemicZone({ jejum, pp }: { jejum: number; pp: number }) {
  const zone = jejum < 70 || pp < 70 ? "HIPOGLICEMIA" : jejum <= 130 && pp <= 180 ? "ALVO" : "HIPERGLICEMIA";
  const zoneColor = zone === "HIPOGLICEMIA" ? "bg-destructive/20 border-destructive text-destructive" : zone === "ALVO" ? "bg-green-500/20 border-green-500 text-green-500" : "bg-chart-5/20 border-chart-5 text-chart-5";
  const icon = zone === "HIPOGLICEMIA" ? <TrendingDown className="h-5 w-5" /> : zone === "ALVO" ? <Activity className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />;
  return (
    <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${zoneColor}`}>
      {icon}
      <div>
        <p className="text-sm font-bold">{zone}</p>
        <p className="text-xs opacity-80">Jejum {jejum} mg/dL | Pós-prandial {pp} mg/dL</p>
      </div>
    </div>
  );
}

export default function SimuladorGlicemia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<GlicCase | null>(null);
  const isEmbed = useIsEmbed();
  const embedCaseId = useEmbedCaseId();
  useEffect(() => {
    if (isEmbed && embedCaseId && !activeCase) {
      const decoded = decodeURIComponent(embedCaseId);
      const found = BUILT_IN_CASES.find((c: any) => c.title === decoded);
      if (found) setActiveCase(found as any);
    }
  }, [isEmbed, embedCaseId, activeCase]);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedDrug = DRUGS[selectedDrugIdx];

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab,
        expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab), [selectedDrug, dose, activeCase?.baseLab]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.trend.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 1), 300);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.trend.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = lastScore || 70;
    const decisions: SimDecision[] = [
      { label: "Fármaco", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) });
    return s;
  }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [] });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Glicemia, Diabetes e Insulinoterapia</h1>
            <p className="text-muted-foreground">Interprete glicemia, HbA1c e perfil insulínico para ajuste farmacoterapêutico.</p>
            <ShareToolButton toolSlug="farmacoterapia-glicemia" toolName="Glicemia, Diabetes e Insulinoterapia" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Glicemia" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3 flex-wrap">
        {!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-glicemia" toolName="Glicemia, Diabetes e Insulinoterapia" caseId={activeCase.title} /></div>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Glycemic Zone indicator */}
      <GlycemicZone jejum={simulation.lastLab.jejum} pp={simulation.lastLab.pp} />

      {/* Lab Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Painel Glicêmico (após tratamento)</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card>
          <CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name} ({d.class})</SelectItem>)}</SelectContent>
            </Select>
            <div>
              <div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div>
              <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} />
            </div>
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 7 dias"}</Button>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Curva Glicêmica (7 dias)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={displayTrend}>
                <defs>
                  <linearGradient id="gradJejum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradPP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Hipo 70", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <ReferenceLine y={180} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: "Alvo PP 180", fill: "hsl(var(--chart-5))", fontSize: 10 }} />
                <Area type="monotone" dataKey="jejum" name="Jejum" stroke="hsl(var(--chart-1))" fill="url(#gradJejum)" strokeWidth={2} />
                <Area type="monotone" dataKey="pp" name="Pós-prandial" stroke="hsl(var(--chart-2))" fill="url(#gradPP)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Clinical Tip */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
          {activeCase.references?.length > 0 && <div className="mt-2"><p className="text-xs font-semibold text-muted-foreground">Referências:</p>{activeCase.references.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}</div>}
        </CardContent>
      </Card>

      {/* Challenges */}
      {(() => {
        const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
        return <SimulatorChallengeMode challengeSet={getGlicemiaLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab }} onComplete={() => setChallengeCompleted(true)} />;
      })()}

      {isVirtualRoom && submitted && (!showFeedback ? (
        <Card className="border-green-500/30 bg-green-500/5"><CardContent className="pt-4 text-center"><p className="text-green-500 font-bold">✅ Resultados enviados!</p><p className="text-muted-foreground text-sm">Redirecionando em 15s...</p></CardContent></Card>
      ) : null)}
    </div>
  );
}
