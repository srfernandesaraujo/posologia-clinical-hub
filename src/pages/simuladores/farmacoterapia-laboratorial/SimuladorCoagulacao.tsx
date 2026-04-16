import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Beaker, Activity, ShieldAlert, AlertTriangle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCoagulacaoLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-coagulacao";

interface CoagDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { inr: number; ttpa: number; antiXa: number; plaquetas: number; fibrinogenio: number; dDimero: number };
  sideEffects: { sangramento: number; hit: number; osteoporose: number; necroseCumarinicos: number; gi: number };
  daysToEffect: number;
}

const DRUGS: CoagDrug[] = [
  { name: "Varfarina", class: "Antagonista Vit K", doseMin: 1, doseMax: 10, doseUnit: "mg/dia", doseStep: 0.5, effects: { inr: 1.5, ttpa: 5, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: 0 }, sideEffects: { sangramento: 0.3, hit: 0, osteoporose: 0, necroseCumarinicos: 0.05, gi: 0.05 }, daysToEffect: 3 },
  { name: "Heparina NF (HNF)", class: "Heparina", doseMin: 5000, doseMax: 30000, doseUnit: "UI/dia EV", doseStep: 2500, effects: { inr: 0.1, ttpa: 30, antiXa: 0.3, plaquetas: -15, fibrinogenio: 0, dDimero: -0.2 }, sideEffects: { sangramento: 0.35, hit: 0.15, osteoporose: 0.1, necroseCumarinicos: 0, gi: 0 }, daysToEffect: 0.5 },
  { name: "Enoxaparina", class: "HBPM", doseMin: 40, doseMax: 120, doseUnit: "mg/dia SC", doseStep: 20, effects: { inr: 0, ttpa: 5, antiXa: 0.6, plaquetas: -5, fibrinogenio: 0, dDimero: -0.3 }, sideEffects: { sangramento: 0.2, hit: 0.03, osteoporose: 0.05, necroseCumarinicos: 0, gi: 0.02 }, daysToEffect: 1 },
  { name: "Rivaroxabana", class: "DOAC (anti-Xa)", doseMin: 10, doseMax: 20, doseUnit: "mg/dia", doseStep: 5, effects: { inr: 0.3, ttpa: 5, antiXa: 0.5, plaquetas: 0, fibrinogenio: 0, dDimero: -0.4 }, sideEffects: { sangramento: 0.2, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.15 }, daysToEffect: 1 },
  { name: "Apixabana", class: "DOAC (anti-Xa)", doseMin: 2.5, doseMax: 5, doseUnit: "mg 12/12h", doseStep: 2.5, effects: { inr: 0.15, ttpa: 3, antiXa: 0.4, plaquetas: 0, fibrinogenio: 0, dDimero: -0.3 }, sideEffects: { sangramento: 0.15, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.08 }, daysToEffect: 1 },
  { name: "Dabigatrana", class: "DOAC (anti-IIa)", doseMin: 110, doseMax: 150, doseUnit: "mg 12/12h", doseStep: 40, effects: { inr: 0.2, ttpa: 15, antiXa: 0, plaquetas: 0, fibrinogenio: -10, dDimero: -0.3 }, sideEffects: { sangramento: 0.2, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.15 }, daysToEffect: 1 },
  { name: "Vitamina K (Fitomenadiona)", class: "Reversor", doseMin: 1, doseMax: 10, doseUnit: "mg EV/VO", doseStep: 1, effects: { inr: -2, ttpa: -5, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: 0 }, sideEffects: { sangramento: -0.3, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0 }, daysToEffect: 6 },
  { name: "Ácido Tranexâmico", class: "Antifibrinolítico", doseMin: 500, doseMax: 3000, doseUnit: "mg/dia", doseStep: 250, effects: { inr: 0, ttpa: 0, antiXa: 0, plaquetas: 0, fibrinogenio: 20, dDimero: -0.5 }, sideEffects: { sangramento: -0.3, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.1 }, daysToEffect: 0.5 },
  { name: "Protamina", class: "Reversor HNF", doseMin: 25, doseMax: 100, doseUnit: "mg EV", doseStep: 25, effects: { inr: 0, ttpa: -25, antiXa: -0.3, plaquetas: 0, fibrinogenio: 0, dDimero: 0 }, sideEffects: { sangramento: -0.4, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.05 }, daysToEffect: 0.1 },
];

interface CoagCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: { inr: number; ttpa: number; tp: number; antiXa: number; plaquetas: number; fibrinogenio: number; dDimero: number; hb: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: CoagCase[] = [
  {
    title: "Caso 1: Início de Varfarina (FA)",
    difficulty: "Médio",
    patient: { name: "Carlos Mendes", age: 72, weight: 78, sex: "M", specialGroup: ["FA", "HAS"], diagnosis: "FA não valvar CHA₂DS₂-VASc 4" },
    scenario: "Homem 72a, FA crônica, HAS, DM2. CHA₂DS₂-VASc 4. INR basal 1.0. Iniciando anticoagulação.",
    baseLab: { inr: 1.0, ttpa: 28, tp: 12, antiXa: 0, plaquetas: 220, fibrinogenio: 300, dDimero: 0.4, hb: 13.5 },
    expectedDrugs: ["Varfarina", "Rivaroxabana", "Apixabana"],
    clinicalTip: "FA com CHA₂DS₂-VASc ≥2: anticoagular. DOACs preferidos sobre varfarina em FA não valvar. Se varfarina: INR alvo 2-3, monitorar semanalmente.",
    references: ["ESC AF Guidelines 2020", "AHA/ACC 2023"],
  },
  {
    title: "Caso 2: INR Supraterapêutico",
    difficulty: "Difícil",
    patient: { name: "Dona Helena", age: 78, weight: 55, sex: "F", specialGroup: ["Prótese Valvar"], diagnosis: "INR 8.2 — sem sangramento ativo" },
    scenario: "Mulher 78a, prótese mecânica mitral, em varfarina 5mg. INR controle: 8.2. Sem sangramento. Hb estável.",
    baseLab: { inr: 8.2, ttpa: 65, tp: 45, antiXa: 0, plaquetas: 180, fibrinogenio: 280, dDimero: 0.6, hb: 11.8 },
    expectedDrugs: ["Vitamina K (Fitomenadiona)"],
    clinicalTip: "INR >9 sem sangramento: vitamina K 2.5-5mg VO. INR 4.5-9: suspender varfarina, reavaliar dose. Sangramento grave: CCP 4 fatores + vit K 10mg EV.",
    references: ["ACCP 2012", "ISTH 2021"],
  },
  {
    title: "Caso 3: TVP Aguda",
    difficulty: "Médio",
    patient: { name: "Amanda Rocha", age: 35, weight: 68, sex: "F", specialGroup: ["ACO"], diagnosis: "TVP proximal femoropoplítea" },
    scenario: "Mulher 35a, em ACO, edema e dor em MIE há 3 dias. USG Doppler: TVP femoropoplítea. D-dímero 4.5.",
    baseLab: { inr: 1.0, ttpa: 30, tp: 12, antiXa: 0, plaquetas: 250, fibrinogenio: 350, dDimero: 4.5, hb: 12.8 },
    expectedDrugs: ["Enoxaparina", "Rivaroxabana"],
    clinicalTip: "TVP aguda: HBPM dose plena (enoxaparina 1mg/kg 12/12h) ou DOAC direto (rivaroxabana 15mg 12/12h 21d → 20mg/dia). Suspender ACO.",
    references: ["CHEST 2016", "EINSTEIN-DVT 2010"],
  },
  {
    title: "Caso 4: Sangramento por HNF",
    difficulty: "Difícil",
    patient: { name: "Roberto Alves", age: 60, weight: 85, sex: "M", specialGroup: ["SCA"], diagnosis: "Sangramento GI em uso de HNF pós-SCA" },
    scenario: "Homem 60a, SCA há 48h, em HNF EV. TTPa 95s (alvo 60-80). Melena + Hb caiu 3g/dL em 6h.",
    baseLab: { inr: 1.3, ttpa: 95, tp: 15, antiXa: 0.8, plaquetas: 130, fibrinogenio: 200, dDimero: 3.2, hb: 8.5 },
    expectedDrugs: ["Protamina"],
    clinicalTip: "Sangramento por HNF: protamina 1mg para cada 100 UI de HNF da última hora (máx 50mg). TTPa-alvo 60-80s. Neutraliza ~60% HBPM.",
    references: ["ACCP 2012", "Harrison's 21e"],
  },
  {
    title: "Caso 5: Preparo Pré-operatório",
    difficulty: "Médio",
    patient: { name: "Sônia Ferreira", age: 65, weight: 70, sex: "F", specialGroup: ["FA", "DRC"], diagnosis: "Cirurgia de quadril — suspensão de DOAC" },
    scenario: "Mulher 65a, FA em rivaroxabana 20mg. TFG 55 mL/min. Artroplastia de quadril em 5 dias. Quando suspender?",
    baseLab: { inr: 1.2, ttpa: 32, tp: 13, antiXa: 0.3, plaquetas: 200, fibrinogenio: 310, dDimero: 0.8, hb: 12.2 },
    expectedDrugs: ["Enoxaparina"],
    clinicalTip: "Rivaroxabana: suspender ≥48h pré-op (alto risco sangramento). TFG 30-50: 72h. Bridge com HBPM profilática se CHA₂DS₂-VASc alto. Reiniciar 48-72h pós.",
    references: ["PAUSE Trial 2019", "ASRA 2018"],
  },
];

function computeSimulation(drug: CoagDrug, dose: number, baseLab: CoagCase["baseLab"]) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.3 + doseFrac * 0.7;
  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = d >= drug.daysToEffect ? Math.min((d - drug.daysToEffect + 1) / 5, 1) : 0;
    trend.push({
      day: d,
      inr: Math.max(0.8, +(baseLab.inr + drug.effects.inr * intensity * p).toFixed(1)),
      ttpa: Math.max(20, Math.round(baseLab.ttpa + drug.effects.ttpa * intensity * p)),
      antiXa: Math.max(0, +(baseLab.antiXa + drug.effects.antiXa * intensity * p).toFixed(2)),
      plaquetas: Math.max(10, Math.round(baseLab.plaquetas + drug.effects.plaquetas * intensity * p * 10)),
      fibrinogenio: Math.max(50, Math.round(baseLab.fibrinogenio + drug.effects.fibrinogenio * intensity * p)),
    });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({
    name: k === "sangramento" ? "Sangramento" : k === "hit" ? "HIT" : k === "osteoporose" ? "Osteoporose" : k === "necroseCumarinicos" ? "Necrose Cutânea" : "GI",
    risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100),
  }));
  const labGauges = [
    { name: "INR", value: last.inr, unit: "", refLow: 0.8, refHigh: 1.2, status: last.inr > 3.5 ? "alto" : last.inr > 1.2 ? "elevado" : "normal" },
    { name: "TTPa", value: last.ttpa, unit: "s", refLow: 25, refHigh: 35, status: last.ttpa > 80 ? "alto" : last.ttpa > 35 ? "elevado" : "normal" },
    { name: "Anti-Xa", value: last.antiXa, unit: "UI/mL", refLow: 0, refHigh: 0.1, status: last.antiXa > 1.0 ? "alto" : last.antiXa > 0.5 ? "elevado" : "normal" },
    { name: "Plaquetas", value: last.plaquetas, unit: "×10³/µL", refLow: 150, refHigh: 400, status: last.plaquetas < 100 ? "baixo" : last.plaquetas < 150 ? "elevado" : "normal" },
    { name: "Fibrinogênio", value: last.fibrinogenio, unit: "mg/dL", refLow: 200, refHigh: 400, status: last.fibrinogenio < 150 ? "baixo" : "normal" },
    { name: "Hb", value: baseLab.hb, unit: "g/dL", refLow: 12, refHigh: 17, status: baseLab.hb < 10 ? "baixo" : baseLab.hb < 12 ? "elevado" : "normal" },
  ];
  return { trend, sideEffects, labGauges, lastLab: last };
}

function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : status === "elevado" ? "text-yellow-500" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : status === "elevado" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-green-500/10 border-green-500/30";
  const label = status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲▲ CRÍTICO" : status === "elevado" ? "▲ ELEVADO" : "● NORMAL";
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className="text-xs text-muted-foreground font-medium">{name}</p>
      <p className={`text-lg font-mono font-bold ${color}`}>{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
      <p className={`text-[9px] font-semibold ${color}`}>{label}</p>
    </div>
  );
}

function BleedingRisk({ inr, ttpa, plaquetas, hb }: { inr: number; ttpa: number; plaquetas: number; hb: number }) {
  const risk = (inr > 4 ? 3 : inr > 3 ? 2 : 0) + (ttpa > 80 ? 2 : ttpa > 60 ? 1 : 0) + (plaquetas < 50 ? 3 : plaquetas < 100 ? 1 : 0) + (hb < 8 ? 3 : hb < 10 ? 1 : 0);
  const level = risk >= 6 ? "CRÍTICO" : risk >= 3 ? "ALTO" : risk >= 1 ? "MODERADO" : "BAIXO";
  const lColor = level === "CRÍTICO" ? "bg-destructive/20 border-destructive text-destructive" : level === "ALTO" ? "bg-chart-5/20 border-chart-5 text-chart-5" : level === "MODERADO" ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-green-500/20 border-green-500 text-green-500";
  return (
    <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${lColor}`}>
      <AlertTriangle className="h-5 w-5" />
      <div>
        <p className="text-sm font-bold">Risco Hemorrágico: {level}</p>
        <p className="text-xs opacity-80">INR {inr} | TTPa {ttpa}s | Plaq {plaquetas}k | Hb {hb}</p>
      </div>
    </div>
  );
}

export default function SimuladorCoagulacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<CoagCase | null>(null);
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
            <h1 className="text-2xl font-bold">Coagulação e Anticoagulantes</h1>
            <p className="text-muted-foreground">Interprete INR, TTPa e coagulograma para manejo de anticoagulação.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Coagulação" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Bleeding Risk */}
      <BleedingRisk inr={simulation.lastLab.inr} ttpa={simulation.lastLab.ttpa} plaquetas={simulation.lastLab.plaquetas} hb={activeCase.baseLab.hb} />

      {/* Lab Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Coagulograma (após tratamento)</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Tendência do Coagulograma (7 dias)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={3} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "INR 3", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <Line type="monotone" dataKey="inr" name="INR" stroke="hsl(var(--chart-1))" strokeWidth={2} dot />
                <Line type="monotone" dataKey="ttpa" name="TTPa" stroke="hsl(var(--chart-2))" strokeWidth={2} dot />
                <Line type="monotone" dataKey="antiXa" name="Anti-Xa" stroke="hsl(var(--chart-3))" strokeWidth={2} dot />
              </LineChart>
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
        return <SimulatorChallengeMode challengeSet={getCoagulacaoLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab }} onComplete={() => setChallengeCompleted(true)} />;
      })()}

      {isVirtualRoom && submitted && (!showFeedback ? (
        <Card className="border-green-500/30 bg-green-500/5"><CardContent className="pt-4 text-center"><p className="text-green-500 font-bold">✅ Resultados enviados!</p><p className="text-muted-foreground text-sm">Redirecionando em 15s...</p></CardContent></Card>
      ) : null)}
    </div>
  );
}
