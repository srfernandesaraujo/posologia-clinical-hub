import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, ShieldAlert, Droplets, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getRenalChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-renal";

interface RenalDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { creatinina: number; ureia: number; k: number; na: number };
  sideEffects: { nefrotox: number; ototox: number; gi: number; hipocalemia: number; hipoglicemia: number };
  needsAdjust: boolean;
  contraindicatedBelow: number; // ClCr threshold
}

const DRUGS: RenalDrug[] = [
  { name: "Vancomicina", class: "Glicopeptídeo", doseMin: 500, doseMax: 2000, doseUnit: "mg EV 12/12h", doseStep: 250, effects: { creatinina: 0.3, ureia: 5, k: 0.1, na: 0 }, sideEffects: { nefrotox: 0.3, ototox: 0.15, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
  { name: "Gentamicina", class: "Aminoglicosídeo", doseMin: 1, doseMax: 7, doseUnit: "mg/kg/dia", doseStep: 0.5, effects: { creatinina: 0.5, ureia: 8, k: -0.2, na: 0 }, sideEffects: { nefrotox: 0.45, ototox: 0.25, gi: 0.05, hipocalemia: 0.1, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
  { name: "Metformina", class: "Biguanida", doseMin: 500, doseMax: 2550, doseUnit: "mg/dia", doseStep: 250, effects: { creatinina: 0, ureia: 0, k: 0, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.3, hipocalemia: 0, hipoglicemia: 0.05 }, needsAdjust: true, contraindicatedBelow: 30 },
  { name: "Digoxina", class: "Glicosídeo cardíaco", doseMin: 0.0625, doseMax: 0.25, doseUnit: "mg/dia", doseStep: 0.0625, effects: { creatinina: 0, ureia: 0, k: -0.1, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.2, hipocalemia: 0.1, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
  { name: "Ibuprofeno", class: "AINE", doseMin: 200, doseMax: 1200, doseUnit: "mg/dia", doseStep: 200, effects: { creatinina: 0.4, ureia: 6, k: 0.3, na: -2 }, sideEffects: { nefrotox: 0.4, ototox: 0, gi: 0.25, hipocalemia: 0, hipoglicemia: 0 }, needsAdjust: false, contraindicatedBelow: 30 },
  { name: "Alopurinol", class: "Inibidor Xantina Oxidase", doseMin: 100, doseMax: 600, doseUnit: "mg/dia", doseStep: 100, effects: { creatinina: 0, ureia: -3, k: 0, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
  { name: "Gabapentina", class: "Anticonvulsivante", doseMin: 100, doseMax: 1200, doseUnit: "mg 8/8h", doseStep: 100, effects: { creatinina: 0, ureia: 0, k: 0, na: -1 }, sideEffects: { nefrotox: 0, ototox: 0, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
  { name: "Lítio", class: "Estabilizador humor", doseMin: 300, doseMax: 1200, doseUnit: "mg/dia", doseStep: 150, effects: { creatinina: 0.15, ureia: 2, k: 0, na: -1 }, sideEffects: { nefrotox: 0.2, ototox: 0, gi: 0.2, hipocalemia: 0, hipoglicemia: 0 }, needsAdjust: true, contraindicatedBelow: 0 },
];

interface RenalCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: { creatinina: number; ureia: number; k: number; na: number; ca: number; fosforo: number; hb: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: RenalCase[] = [
  {
    title: "Caso 1: Vancomicina em DRC G3",
    difficulty: "Médio",
    patient: { name: "Carlos Eduardo", age: 58, weight: 75, sex: "M", specialGroup: ["DRC G3b", "DM2"] },
    scenario: "Homem 58 anos com DRC G3b (TFG 38 mL/min), DM2, internado com osteomielite por MRSA. Necessita vancomicina EV. Creatinina basal 2.1. O aluno deve calcular ClCr, ajustar dose e intervalo, e monitorar nefrotoxicidade.",
    baseLab: { creatinina: 2.1, ureia: 68, k: 4.8, na: 138, ca: 8.5, fosforo: 5.2, hb: 10.5 },
    expectedDrugs: ["Vancomicina"],
    clinicalTip: "Vancomicina em DRC: ajustar pelo vale sérico (15-20 mcg/mL para MRSA) ou AUC/MIC (400-600). ClCr 30-50: 15mg/kg a cada 24-48h. Monitorar creatinina a cada 48-72h. Associação com aminoglicosídeo potencializa nefrotoxicidade.",
    references: ["IDSA MRSA Guidelines 2011", "Rybak MJ et al. AJHP 2020"],
  },
  {
    title: "Caso 2: Metformina em DRC G4",
    difficulty: "Fácil",
    patient: { name: "Dona Maria", age: 72, weight: 62, sex: "F", specialGroup: ["DRC G4", "DM2", "HAS"] },
    scenario: "Mulher 72 anos, DM2 há 20 anos, em uso de metformina 2g/dia. Creatinina subiu para 2.8 (TFG estimada 18 mL/min — DRC G4). HbA1c 7.5%. Metformina está CONTRAINDICADA neste estágio. Qual a alternativa?",
    baseLab: { creatinina: 2.8, ureia: 95, k: 5.2, na: 136, ca: 8.0, fosforo: 6.1, hb: 9.8 },
    expectedDrugs: [],
    clinicalTip: "Metformina: reduzir dose 50% se TFG 30-45. CONTRAINDICADA se TFG <30 (risco de acidose láctica). Alternativas em DRC avançada: insulina, inibidores DPP-4 (linagliptina sem ajuste), gliclazida (cuidado com hipoglicemia). iSGLT2 perdem eficácia glicêmica com TFG <45 mas mantêm renoproteção.",
    references: ["ADA Standards 2023", "KDIGO DM-CKD 2022"],
  },
  {
    title: "Caso 3: Nefrotoxicidade por Gentamicina",
    difficulty: "Difícil",
    patient: { name: "José Antônio", age: 65, weight: 70, sex: "M", specialGroup: ["DRC G2"] },
    scenario: "Homem 65 anos com endocardite por Enterococcus. Em uso de gentamicina 5 mg/kg/dia + ampicilina há 10 dias. Creatinina subindo progressivamente (1.3→1.8→2.5). Nefrotoxicidade por aminoglicosídeo em evolução.",
    baseLab: { creatinina: 2.5, ureia: 72, k: 4.5, na: 140, ca: 9.0, fosforo: 4.5, hb: 11.5 },
    expectedDrugs: ["Gentamicina"],
    clinicalTip: "Nefrotoxicidade por aminoglicosídeo: não-oligúrica, com Mg e K baixos. Acomete 10-25% dos pacientes. Fatores de risco: uso >7 dias, desidratação, AINEs concomitantes, idade >60. Dose única diária reduz nefrotoxicidade sem perder eficácia (exceto endocardite). Monitorar pico e vale.",
    references: ["Beaucaire G. Int J Antimicrob Agents 2000"],
  },
  {
    title: "Caso 4: AINE em Idoso — DRC G2 → G4",
    difficulty: "Médio",
    patient: { name: "Dona Francisca", age: 78, weight: 55, sex: "F", specialGroup: ["HAS", "Osteoartrose"] },
    scenario: "Mulher 78 anos com osteoartrose, em uso de ibuprofeno 1200 mg/dia há 3 meses. Creatinina basal era 1.1 (TFG ~48), agora subiu para 2.3 (TFG ~22). Piora aguda por vasoconstrição aferente renal. AINEs devem ser SUSPENSOS.",
    baseLab: { creatinina: 2.3, ureia: 78, k: 5.5, na: 134, ca: 8.8, fosforo: 5.0, hb: 10.8 },
    expectedDrugs: [],
    clinicalTip: "AINEs causam IRA pré-renal por inibição da PGE2 (vasodilatação aferente). Idosos, DRC prévia, uso de IECA/BRA e diuréticos são fatores de risco (triplo whammy). Alternativas: paracetamol (≤3g/dia), capsaicina tópica, fisioterapia. A IRA por AINE geralmente reverte em 3-7 dias após suspensão.",
    references: ["Harirforoosh S et al. Expert Opin Drug Saf 2009"],
  },
  {
    title: "Caso 5: Digoxina em DRC — Acúmulo e Toxicidade",
    difficulty: "Difícil",
    patient: { name: "Seu Benedito", age: 82, weight: 65, sex: "M", specialGroup: ["ICC", "FA", "DRC G3a"] },
    scenario: "Homem 82 anos com ICC e FA, em uso de digoxina 0.25 mg/dia. TFG 42 mL/min. Apresenta náuseas, visão amarelada e bradicardia (FC 48). Nível sérico de digoxina: 3.2 ng/mL (terapêutico: 0.5-2.0). Toxicidade digitálica por acúmulo renal.",
    baseLab: { creatinina: 1.8, ureia: 58, k: 3.2, na: 140, ca: 9.2, fosforo: 4.0, hb: 12.0 },
    expectedDrugs: ["Digoxina"],
    clinicalTip: "Digoxina: 85% excretada via renal. Em DRC, reduzir dose (0.0625-0.125 mg/dia) e monitorar nível sérico. Toxicidade: náuseas, visão amarelada, arritmias (bradicardia, TV bidirecional). HIPOCALEMIA potencializa toxicidade (competição pelo sítio Na/K ATPase). Antídoto: fragmentos Fab anti-digoxina.",
    references: ["Bauman JL et al. Heart 2006", "UpToDate: Digitalis Toxicity"],
  },
];

// ─── Cockcroft-Gault ──────────────────────────────────────────────
function calcClCr(age: number, weight: number, creatinina: number, sex: string): number {
  const base = ((140 - age) * weight) / (72 * creatinina);
  return Math.round(sex === "F" ? base * 0.85 : base);
}

function drcStage(clcr: number): { stage: string; color: string } {
  if (clcr >= 90) return { stage: "G1", color: "text-green-400" };
  if (clcr >= 60) return { stage: "G2", color: "text-green-300" };
  if (clcr >= 45) return { stage: "G3a", color: "text-yellow-400" };
  if (clcr >= 30) return { stage: "G3b", color: "text-orange-400" };
  if (clcr >= 15) return { stage: "G4", color: "text-red-400" };
  return { stage: "G5", color: "text-red-600" };
}

export default function SimuladorRenal() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { roomCase, isExam, enunciado } = useVirtualRoomCase(SLUG);
  const { cases: aiCases, isLoading: casesLoading, generateCase, isGenerating } = useSimulatorCases(SLUG);

  const [activeCase, setActiveCase] = useState<RenalCase | null>(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
  const [selectedDrug, setSelectedDrug] = useState<RenalDrug>(DRUGS[0]);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [running, setRunning] = useState(false);
  const [day, setDay] = useState(0);
  const [labValues, setLabValues] = useState<RenalCase["baseLab"] | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (roomCase) {
      const rc = roomCase as any;
      const c: RenalCase = {
        title: rc.title || "Caso da Sala Virtual", difficulty: rc.difficulty || "Médio",
        patient: rc.patient || { name: "Paciente", age: 60, weight: 70, sex: "M", specialGroup: [] },
        scenario: rc.scenario || rc.enunciado || "", baseLab: rc.baseLab || BUILT_IN_CASES[0].baseLab,
        expectedDrugs: rc.expectedDrugs || [], clinicalTip: rc.clinicalTip || "", references: rc.references || [], isAI: true,
      };
      setActiveCase(c); setLabValues(c.baseLab);
      setTrendData([{ day: 0, creatinina: c.baseLab.creatinina, ureia: c.baseLab.ureia, k: c.baseLab.k }]);
    }
  }, [roomCase]);

  const loadCase = useCallback((c: RenalCase, idx: number) => {
    setActiveCase(c); setActiveCaseIndex(idx); setLabValues(c.baseLab); setDay(0); setRunning(false);
    setTrendData([{ day: 0, creatinina: c.baseLab.creatinina, ureia: c.baseLab.ureia, k: c.baseLab.k }]);
    setSelectedDrug(DRUGS[0]); setDose(DRUGS[0].doseMin);
  }, []);

  const clCr = useMemo(() => {
    if (!activeCase || !labValues) return 0;
    return calcClCr(activeCase.patient.age, activeCase.patient.weight, labValues.creatinina, activeCase.patient.sex);
  }, [activeCase, labValues]);

  const drc = useMemo(() => drcStage(clCr), [clCr]);

  const simulate = useCallback(() => {
    if (!labValues || !activeCase) return;
    setRunning(true);
    const baseLab = activeCase.baseLab;
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    const intensity = 0.3 + doseFraction * 0.7;
    // ClCr-based accumulation factor
    const accumFactor = clCr < 30 ? 2.0 : clCr < 60 ? 1.5 : 1.0;

    const newTrend: any[] = [...trendData];
    let current = { ...labValues };

    for (let d = 1; d <= 7; d++) {
      const progress = Math.min(d / 5, 1);
      const creatinina = Math.max(0.5, baseLab.creatinina + selectedDrug.effects.creatinina * intensity * progress * accumFactor);
      const ureia = Math.max(10, baseLab.ureia + selectedDrug.effects.ureia * intensity * progress * accumFactor);
      const k = Math.max(2.5, Math.min(7.0, baseLab.k + selectedDrug.effects.k * intensity * progress));
      const na = Math.max(120, Math.min(150, baseLab.na + selectedDrug.effects.na * intensity * progress));

      current = { ...baseLab, creatinina: +creatinina.toFixed(2), ureia: Math.round(ureia), k: +k.toFixed(1), na: Math.round(na), ca: baseLab.ca, fosforo: baseLab.fosforo, hb: baseLab.hb };
      newTrend.push({ day: trendData.length + d - 1, creatinina: +creatinina.toFixed(2), ureia: Math.round(ureia), k: +k.toFixed(1) });
    }
    setLabValues(current); setTrendData(newTrend); setDay(prev => prev + 7);
  }, [labValues, activeCase, dose, selectedDrug, trendData, clCr]);

  const sideEffectData = useMemo(() => {
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    const accumFactor = clCr < 30 ? 2.0 : clCr < 60 ? 1.5 : 1.0;
    return Object.entries(selectedDrug.sideEffects).map(([key, val]) => ({
      name: key === "nefrotox" ? "Nefrotoxicidade" : key === "ototox" ? "Ototoxicidade" : key === "gi" ? "GI" : key === "hipocalemia" ? "Hipocalemia" : "Hipoglicemia",
      value: Math.min(100, Math.round(Math.max(0, val * (0.5 + doseFraction * 0.8) * accumFactor) * 100)),
    }));
  }, [selectedDrug, dose, clCr]);

  // Contraindication alert
  const isContraindicated = selectedDrug.contraindicatedBelow > 0 && clCr < selectedDrug.contraindicatedBelow;

  const simulatorState = useMemo(() => ({
    selectedDrug: selectedDrug.name, dose, labValues, clCr, drcStage: drc.stage,
    sideEffectData, day, isContraindicated,
  }), [selectedDrug, dose, labValues, clCr, drc, sideEffectData, day, isContraindicated]);

  const decisions: SimDecision[] = useMemo(() => {
    if (!activeCase || !labValues) return [];
    return buildSimulatorDecisions({
      drug: selectedDrug.name, dose: `${dose} ${selectedDrug.doseUnit}`,
      creatinina: labValues.creatinina, clCr, drcStage: drc.stage,
      k: labValues.k, na: labValues.na,
      contraindicated: isContraindicated ? "SIM" : "NÃO",
    });
  }, [activeCase, labValues, selectedDrug, dose, clCr, drc, isContraindicated]);

  const labGauge = (label: string, value: number, unit: string, low: number, high: number, max: number) => {
    const pct = Math.min((value / max) * 100, 100);
    const color = value < low ? "text-blue-400" : value > high ? "text-destructive" : "text-green-400";
    return (
      <div className="bg-muted/50 rounded-lg p-2 text-center space-y-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-sm font-mono font-bold ${color}`}>{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: value < low || value > high ? "hsl(var(--destructive))" : "hsl(142 71% 45%)" }} />
        </div>
        <p className="text-[8px] text-muted-foreground">{unit} ({low}-{high})</p>
      </div>
    );
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Disfunção Renal e Ajuste de Dose</h1>
            <p className="text-sm text-muted-foreground">Calcule ClCr/TFG, classifique DRC e ajuste doses de nefrotóxicos</p>
          </div>
        </div>
        {isExam && enunciado && <ExamBanner enunciado={enunciado} />}
        <AdminPromptViewer toolSlug={SLUG} getNativePrompt={getNativePrompt} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BUILT_IN_CASES.map((c, i) => (
            <NativeCaseCard key={i} title={c.title} difficulty={c.difficulty} patient={c.patient} scenario={c.scenario} onSelect={() => loadCase(c, i)} />
          ))}
          {aiCases?.map((c: any) => (
            <AICaseCard key={c.id} id={c.id} title={c.title} difficulty={c.difficulty} scenario={c.case_data?.scenario} createdBy={c.created_by} isMarketplace={c.is_marketplace}
              onSelect={() => { const cd = c.case_data as any; loadCase({ ...cd, id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, created_by: c.created_by, is_marketplace: c.is_marketplace }, -1); }} />
          ))}
        </div>
        {!isVirtualRoom && (
          <Button onClick={() => generateCase()} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{activeCase.title}</h1>
          <p className="text-xs text-muted-foreground">{activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.sex}, {activeCase.patient.weight}kg</p>
        </div>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      {isExam && enunciado && <ExamBanner enunciado={enunciado} />}
      <Card><CardContent className="pt-4"><p className="text-sm leading-relaxed">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" /> Controles</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium">Fármaco</label>
              <Select value={selectedDrug.name} onValueChange={v => { const d = DRUGS.find(x => x.name === v)!; setSelectedDrug(d); setDose(d.doseMin); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isContraindicated && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-xs text-destructive font-semibold">
                ⚠️ CONTRAINDICADO com ClCr &lt;{selectedDrug.contraindicatedBelow} mL/min (atual: {clCr})
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Dose: {dose} {selectedDrug.doseUnit}</label>
              <Slider min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} value={[dose]} onValueChange={v => setDose(v[0])} />
            </div>
            {/* ClCr Calculator */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-primary">Cockcroft-Gault</p>
              <p className="text-2xl font-mono font-bold text-primary">{clCr} <span className="text-xs font-normal">mL/min</span></p>
              <Badge className={`${drc.color} bg-muted`}>DRC {drc.stage}</Badge>
            </div>
            <Button onClick={simulate} className="w-full gap-2"><Play className="h-4 w-4" /> Simular 7 dias</Button>
          </CardContent>
        </Card>

        {/* Lab Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Função Renal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {labValues && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {labGauge("Creatinina", labValues.creatinina, "mg/dL", 0.7, 1.3, 8)}
                {labGauge("Ureia", labValues.ureia, "mg/dL", 15, 45, 200)}
                {labGauge("K⁺", labValues.k, "mEq/L", 3.5, 5.0, 7)}
                {labGauge("Na⁺", labValues.na, "mEq/L", 135, 145, 160)}
                {labGauge("Ca²⁺", labValues.ca, "mg/dL", 8.5, 10.5, 14)}
                {labGauge("Fósforo", labValues.fosforo, "mg/dL", 2.5, 4.5, 10)}
                {labGauge("Hb", labValues.hb, "g/dL", 12, 16, 20)}
              </div>
            )}

            {trendData.length > 1 && (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="creatinina" name="Creatinina" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="k" name="K⁺" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
                    <ReferenceLine y={1.3} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Cr max", fontSize: 9 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sideEffectData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="value" name="Risco %">
                  {sideEffectData.map((e, i) => <Cell key={i} fill={e.value > 30 ? "hsl(var(--destructive))" : e.value > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Dica Clínica</p>
              <p className="text-xs leading-relaxed">{activeCase.clinicalTip}</p>
              {activeCase.references.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">Ref: {activeCase.references.join("; ")}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <SimulatorChallengeMode simulatorSlug={SLUG} getChallenges={getRenalChallenges} activeCaseIndex={activeCaseIndex >= 0 ? activeCaseIndex : undefined} simulatorState={simulatorState} decisions={decisions} />
      {isExam && <ExamFeedbackOverlay decisions={decisions} />}
    </div>
  );
}
