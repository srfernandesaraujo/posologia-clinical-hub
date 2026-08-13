import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Beaker, Activity, Heart, Thermometer } from "lucide-react";
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
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getAcidoBaseChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-acido-base";

// ─── Drug Database ──────────────────────────────────────────────────
interface ABDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: {
    pH: number; hco3: number; pCO2: number; na: number; k: number; ca: number; mg: number; cl: number; lactato: number;
  };
  sideEffects: { hipotensao: number; arritmia: number; sobrecarga: number; hipocalcemia: number; hipernatremia: number };
  hoursToEffect: number;
}

const DRUGS: ABDrug[] = [
  { name: "NaHCO3 8.4%", class: "Alcalinizante", doseMin: 50, doseMax: 300, doseUnit: "mL EV", doseStep: 25, effects: { pH: 0.05, hco3: 3, pCO2: -1, na: 4, k: -0.3, ca: -0.2, mg: 0, cl: 0, lactato: 0 }, sideEffects: { hipotensao: 0.05, arritmia: 0.1, sobrecarga: 0.2, hipocalcemia: 0.15, hipernatremia: 0.2 }, hoursToEffect: 0.5 },
  { name: "KCl 19.1%", class: "Reposição de potássio", doseMin: 10, doseMax: 60, doseUnit: "mEq EV", doseStep: 5, effects: { pH: 0.01, hco3: 0, pCO2: 0, na: 0, k: 1.0, ca: 0, mg: 0, cl: 1, lactato: 0 }, sideEffects: { hipotensao: 0.05, arritmia: 0.25, sobrecarga: 0.05, hipocalcemia: 0, hipernatremia: 0 }, hoursToEffect: 1 },
  { name: "NaCl 0.9%", class: "Cristaloide", doseMin: 250, doseMax: 2000, doseUnit: "mL EV", doseStep: 250, effects: { pH: -0.01, hco3: -1, pCO2: 0, na: 2, k: 0, ca: 0, mg: 0, cl: 3, lactato: 0 }, sideEffects: { hipotensao: -0.1, arritmia: 0.02, sobrecarga: 0.2, hipocalcemia: 0, hipernatremia: 0.1 }, hoursToEffect: 0.5 },
  { name: "NaCl 3% (hipertônico)", class: "Solução hipertônica", doseMin: 50, doseMax: 300, doseUnit: "mL EV", doseStep: 25, effects: { pH: 0, hco3: 0, pCO2: 0, na: 6, k: -0.2, ca: 0, mg: 0, cl: 5, lactato: 0 }, sideEffects: { hipotensao: -0.05, arritmia: 0.05, sobrecarga: 0.3, hipocalcemia: 0, hipernatremia: 0.35 }, hoursToEffect: 0.5 },
  { name: "Gluconato de Cálcio 10%", class: "Reposição de cálcio", doseMin: 10, doseMax: 40, doseUnit: "mL EV", doseStep: 5, effects: { pH: 0, hco3: 0, pCO2: 0, na: 0, k: 0, ca: 1.5, mg: 0, cl: 0, lactato: 0 }, sideEffects: { hipotensao: 0.05, arritmia: 0.1, sobrecarga: 0.05, hipocalcemia: -0.3, hipernatremia: 0 }, hoursToEffect: 0.25 },
  { name: "MgSO4 50%", class: "Reposição de magnésio", doseMin: 1, doseMax: 4, doseUnit: "g EV", doseStep: 0.5, effects: { pH: 0, hco3: 0, pCO2: 0, na: 0, k: 0.1, ca: -0.2, mg: 1.0, cl: 0, lactato: 0 }, sideEffects: { hipotensao: 0.15, arritmia: 0.05, sobrecarga: 0.05, hipocalcemia: 0.1, hipernatremia: 0 }, hoursToEffect: 0.5 },
  { name: "Furosemida", class: "Diurético de alça", doseMin: 20, doseMax: 200, doseUnit: "mg EV", doseStep: 10, effects: { pH: 0.02, hco3: 2, pCO2: 0, na: -3, k: -0.8, ca: -0.3, mg: -0.3, cl: -4, lactato: 0 }, sideEffects: { hipotensao: 0.25, arritmia: 0.15, sobrecarga: -0.2, hipocalcemia: 0.1, hipernatremia: 0.1 }, hoursToEffect: 0.5 },
  { name: "Insulina Regular + Glicose", class: "Shift de potássio", doseMin: 5, doseMax: 20, doseUnit: "UI + 25g glicose", doseStep: 5, effects: { pH: 0.01, hco3: 1, pCO2: 0, na: 0, k: -1.0, ca: 0, mg: 0, cl: 0, lactato: -0.5 }, sideEffects: { hipotensao: 0.05, arritmia: 0.05, sobrecarga: 0.05, hipocalcemia: 0, hipernatremia: 0 }, hoursToEffect: 0.5 },
  { name: "Poliestirenossulfonato (Sorcal)", class: "Quelante de K+", doseMin: 15, doseMax: 60, doseUnit: "g VO/retal", doseStep: 15, effects: { pH: 0, hco3: 0, pCO2: 0, na: 2, k: -0.8, ca: -0.1, mg: -0.1, cl: 0, lactato: 0 }, sideEffects: { hipotensao: 0.02, arritmia: 0.02, sobrecarga: 0.1, hipocalcemia: 0.05, hipernatremia: 0.15 }, hoursToEffect: 2 },
];

// ─── Case Type ──────────────────────────────────────────────────────
interface ABCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: {
    pH: number; pCO2: number; pO2: number; hco3: number; be: number; lactato: number;
    na: number; k: number; ca: number; mg: number; cl: number; glicemia: number;
  };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: ABCase[] = [
  {
    title: "Caso 1: Cetoacidose Diabética (Acidose Metabólica AG Elevado)",
    difficulty: "Médio",
    patient: { name: "João Santos", age: 28, weight: 72, sex: "M", specialGroup: ["DM1"] },
    scenario: "Homem 28 anos, DM1, admitido com poliúria, polidipsia, náuseas e respiração de Kussmaul. Glicemia 420 mg/dL. Gasometria arterial mostra acidose metabólica grave com ânion gap elevado (AG=28). Cetonúria 3+. O aluno deve corrigir com hidratação (NaCl 0.9%), insulina EV e repor potássio quando K<5.5.",
    baseLab: { pH: 7.12, pCO2: 20, pO2: 98, hco3: 6, be: -20, lactato: 2.5, na: 132, k: 5.8, ca: 9.0, mg: 1.8, cl: 98, glicemia: 420 },
    expectedDrugs: ["NaCl 0.9%", "Insulina Regular + Glicose"],
    clinicalTip: "Cetoacidose diabética: pH <7.30, HCO3 <15, AG >12, cetonemia. Pilares: (1) NaCl 0.9% 1-2L na 1ª hora, (2) Insulina regular 0.1 UI/kg/h EV (NÃO dar bolus), (3) Reposição de K+ quando K<5.5 mEq/L (ANTES de iniciar insulina se K<3.3). AG = Na - (Cl + HCO3). A respiração de Kussmaul é compensação respiratória para eliminar CO2. Fórmula de Winter: pCO2 esperada = 1.5 × HCO3 + 8 (±2).",
    references: ["ADA 2023 DKA Guidelines", "Kitabchi AE et al. Diabetes Care 2009"],
  },
  {
    title: "Caso 2: Alcalose Metabólica Hipoclorêmica (Vômitos)",
    difficulty: "Fácil",
    patient: { name: "Maria Luiza", age: 45, weight: 60, sex: "F", specialGroup: [] },
    scenario: "Mulher 45 anos com vômitos incoercíveis há 4 dias por obstrução pilórica. Desidratada, hipotensa. Gasometria: alcalose metabólica com hipocloremia e hipocalemia. O aluno deve repor volume com NaCl 0.9% (solução rica em Cl⁻) e repor potássio.",
    baseLab: { pH: 7.55, pCO2: 48, pO2: 90, hco3: 42, be: 18, lactato: 1.5, na: 136, k: 2.8, ca: 8.5, mg: 1.6, cl: 82, glicemia: 95 },
    expectedDrugs: ["NaCl 0.9%", "KCl 19.1%"],
    clinicalTip: "Alcalose metabólica por vômitos: perda de H⁺ e Cl⁻ gástrico. Classificação: (1) Cloro-responsiva (Cl urinário <20): vômitos, SNG — tratar com NaCl 0.9%; (2) Cloro-resistente (Cl urinário >20): hiperaldosteronismo, Cushing. A hipocalemia é causa E consequência da alcalose (shift transcelular de H⁺/K⁺). Repor K⁺ é essencial para corrigir a alcalose.",
    references: ["Harrison's Cap. 51", "Luke RG, Galla JH. NEJM 2012"],
  },
  {
    title: "Caso 3: Hipocalemia e Toxicidade Digitálica",
    difficulty: "Difícil",
    patient: { name: "Sebastião Gomes", age: 78, weight: 65, sex: "M", specialGroup: ["IC", "FA"] },
    scenario: "Idoso 78 anos, ICC e FA crônica, em uso de digoxina 0.25 mg/dia e furosemida 40 mg/dia. Chega com náuseas, visão amarelada e bigeminismo no ECG. K⁺ = 2.6 mEq/L. A hipocalemia potencializa a toxicidade digitálica. O aluno deve suspender digoxina, repor K⁺ e Mg²⁺, e monitorar ECG.",
    baseLab: { pH: 7.48, pCO2: 44, pO2: 88, hco3: 32, be: 8, lactato: 1.2, na: 138, k: 2.6, ca: 8.8, mg: 1.2, cl: 94, glicemia: 105 },
    expectedDrugs: ["KCl 19.1%", "MgSO4 50%"],
    clinicalTip: "Hipocalemia (K<3.5) + digoxina = emergência. A digoxina inibe a Na⁺/K⁺-ATPase; a hipocalemia POTENCIALIZA esse efeito (mais sítios de ligação livres), causando intoxicação mesmo com nível sérico 'normal' de digoxina. Repor K⁺ (alvo >4.0) e Mg²⁺ (a hipomagnesemia refratariza a hipocalemia). A furosemida causa perda urinária de K⁺, Mg²⁺ e Ca²⁺.",
    references: ["Rang & Dale Cap. 21", "Eichhorn EJ, Gheorghiade M. JACC 2002"],
  },
  {
    title: "Caso 4: Hipercalemia com Risco de Arritmia",
    difficulty: "Difícil",
    patient: { name: "Paulo Roberto", age: 62, weight: 90, sex: "M", specialGroup: ["DRC G4", "HAS"] },
    scenario: "Homem 62 anos, DRC estágio 4 (TFG 22), HAS, em uso de enalapril + espironolactona. ECG com ondas T apiculadas e alargamento do QRS. K⁺ = 7.2 mEq/L. Emergência: estabilizar membrana cardíaca com gluconato de cálcio, shift de K⁺ com insulina+glicose, e remoção com Sorcal ou diálise.",
    baseLab: { pH: 7.28, pCO2: 32, pO2: 92, hco3: 15, be: -10, lactato: 1.8, na: 134, k: 7.2, ca: 8.2, mg: 2.5, cl: 108, glicemia: 130 },
    expectedDrugs: ["Gluconato de Cálcio 10%", "Insulina Regular + Glicose"],
    clinicalTip: "Hipercalemia >6.5 com alterações ECG = emergência. Protocolo: (1) Gluconato de cálcio 10% 10-20 mL EV em 2-5 min — ESTABILIZA a membrana cardíaca (efeito em 1-3 min, duração 30-60 min); (2) Insulina regular 10 UI + Glicose 25g EV — SHIFT transcelular de K⁺ (efeito em 15-30 min); (3) NaHCO3 se acidose; (4) Poliestirenossulfonato ou diálise para REMOÇÃO definitiva. O gluconato de cálcio NÃO reduz o K⁺ — apenas protege o coração.",
    references: ["AHA ACLS Guidelines", "Palmer BF. NEJM 2004"],
  },
  {
    title: "Caso 5: Hiponatremia Dilucional (SIADH)",
    difficulty: "Médio",
    patient: { name: "Teresa Alves", age: 68, weight: 55, sex: "F", specialGroup: ["Pós-op neuro"] },
    scenario: "Mulher 68 anos, 3º dia pós-operatório de ressecção de meningioma. Sonolenta, confusa, convulsão tônico-clônica. Na⁺ = 118 mEq/L. Osmolaridade sérica baixa (255 mOsm/kg), urina concentrada (>300 mOsm/kg). Diagnóstico: SIADH pós-cirúrgica. Correção com NaCl 3% lento (limite: ↑Na máx 8-10 mEq/24h para evitar mielinólise).",
    baseLab: { pH: 7.38, pCO2: 38, pO2: 94, hco3: 23, be: -1, lactato: 0.8, na: 118, k: 3.8, ca: 9.0, mg: 1.9, cl: 85, glicemia: 100 },
    expectedDrugs: ["NaCl 3% (hipertônico)"],
    clinicalTip: "Hiponatremia grave (<120 + sintomas neurológicos) = emergência. Na SIADH: euvolêmica, osmolaridade urinária >100, Na urinário >40. Tratamento: NaCl 3% — bolus 100 mL em 10 min (pode repetir 2x se convulsão). REGRA DE OURO: não corrigir >8-10 mEq/L em 24h (risco de mielinólise pontina osmótica). Fórmula de Adrogue-Madias: ΔNa = (Na infusão - Na paciente) / (ACT + 1).",
    references: ["Harrison's Cap. 49", "Sterns RH. NEJM 2015"],
  },
];

// ─── Engine ──────────────────────────────────────────────────────────
function computeSimulation(drugs: ABDrug[], doses: number[], baseLab: ABCase["baseLab"], hours: number = 24) {
  const timeline = Array.from({ length: hours + 1 }, (_, i) => i);

  const labTrend: { hour: number; pH: number; hco3: number; pCO2: number; na: number; k: number; ca: number; mg: number; cl: number; lactato: number }[] = [];

  for (const h of timeline) {
    let pH = baseLab.pH;
    let hco3 = baseLab.hco3;
    let pCO2 = baseLab.pCO2;
    let na = baseLab.na;
    let k = baseLab.k;
    let ca = baseLab.ca;
    let mg = baseLab.mg;
    let cl = baseLab.cl;
    let lactato = baseLab.lactato;

    drugs.forEach((d, i) => {
      // Therapeutic intensity: 65% at doseMin → 100% at doseMax, so switching
      // between drugs at default dose already produces visible curve changes.
      const range = Math.max(d.doseMax - d.doseMin, 1);
      const doseFrac = 0.65 + Math.min(1, Math.max(0, (doses[i] - d.doseMin) / range)) * 0.35;
      const progress = Math.min(1, Math.max(0, (h - d.hoursToEffect) / Math.max(1, 4)));
      if (h >= d.hoursToEffect) {
        pH += d.effects.pH * doseFrac * progress;
        hco3 += d.effects.hco3 * doseFrac * progress;
        pCO2 += d.effects.pCO2 * doseFrac * progress;
        na += d.effects.na * doseFrac * progress;
        k += d.effects.k * doseFrac * progress;
        ca += d.effects.ca * doseFrac * progress;
        mg += d.effects.mg * doseFrac * progress;
        cl += d.effects.cl * doseFrac * progress;
        lactato += d.effects.lactato * doseFrac * progress;
      }
    });

    // Henderson-Hasselbalch constraint
    pH = Math.max(6.8, Math.min(7.8, pH));
    hco3 = Math.max(2, Math.min(50, hco3));
    pCO2 = Math.max(10, Math.min(90, pCO2));
    na = Math.max(100, Math.min(165, na));
    k = Math.max(1.5, Math.min(9, k));
    ca = Math.max(5, Math.min(14, ca));
    mg = Math.max(0.5, Math.min(5, mg));
    cl = Math.max(70, Math.min(130, cl));
    lactato = Math.max(0, Math.min(20, lactato));

    labTrend.push({
      hour: h,
      pH: Math.round(pH * 100) / 100,
      hco3: Math.round(hco3 * 10) / 10,
      pCO2: Math.round(pCO2 * 10) / 10,
      na: Math.round(na * 10) / 10,
      k: Math.round(k * 10) / 10,
      ca: Math.round(ca * 10) / 10,
      mg: Math.round(mg * 10) / 10,
      cl: Math.round(cl * 10) / 10,
      lactato: Math.round(lactato * 10) / 10,
    });
  }

  // Side effects
  const combinedSE = { hipotensao: 0, arritmia: 0, sobrecarga: 0, hipocalcemia: 0, hipernatremia: 0 };
  drugs.forEach((d, i) => {
    const range = Math.max(d.doseMax - d.doseMin, 1);
    const doseFrac = 0.65 + Math.min(1, Math.max(0, (doses[i] - d.doseMin) / range)) * 0.35;
    (Object.keys(combinedSE) as (keyof typeof combinedSE)[]).forEach(key => {
      combinedSE[key] += d.sideEffects[key] * doseFrac;
    });
  });
  const sideEffectData = [
    { name: "Hipotensão", risco: Math.round(Math.min(Math.max(combinedSE.hipotensao, 0) * 100, 100)) },
    { name: "Arritmia", risco: Math.round(Math.min(combinedSE.arritmia * 100, 100)) },
    { name: "Sobrecarga volêmica", risco: Math.round(Math.min(combinedSE.sobrecarga * 100, 100)) },
    { name: "Hipocalcemia", risco: Math.round(Math.min(Math.max(combinedSE.hipocalcemia, 0) * 100, 100)) },
    { name: "Hipernatremia", risco: Math.round(Math.min(combinedSE.hipernatremia * 100, 100)) },
  ];

  const lastLab = labTrend[labTrend.length - 1];
  const ag = Math.round((lastLab.na - (lastLab.cl + lastLab.hco3)) * 10) / 10;

  // Gasometry gauges
  const gasGauges = [
    { name: "pH", value: lastLab.pH, unit: "", refLow: 7.35, refHigh: 7.45, status: lastLab.pH < 7.35 ? "baixo" : lastLab.pH > 7.45 ? "alto" : "normal" },
    { name: "pCO₂", value: lastLab.pCO2, unit: "mmHg", refLow: 35, refHigh: 45, status: lastLab.pCO2 < 35 ? "baixo" : lastLab.pCO2 > 45 ? "alto" : "normal" },
    { name: "HCO₃⁻", value: lastLab.hco3, unit: "mEq/L", refLow: 22, refHigh: 26, status: lastLab.hco3 < 22 ? "baixo" : lastLab.hco3 > 26 ? "alto" : "normal" },
    { name: "AG", value: ag, unit: "mEq/L", refLow: 8, refHigh: 12, status: ag > 12 ? "alto" : ag < 8 ? "baixo" : "normal" },
  ];

  const electrolyteGauges = [
    { name: "Na⁺", value: lastLab.na, unit: "mEq/L", refLow: 135, refHigh: 145, status: lastLab.na < 135 ? "baixo" : lastLab.na > 145 ? "alto" : "normal" },
    { name: "K⁺", value: lastLab.k, unit: "mEq/L", refLow: 3.5, refHigh: 5.0, status: lastLab.k < 3.5 ? "baixo" : lastLab.k > 5.0 ? "alto" : "normal" },
    { name: "Ca²⁺", value: lastLab.ca, unit: "mg/dL", refLow: 8.5, refHigh: 10.5, status: lastLab.ca < 8.5 ? "baixo" : lastLab.ca > 10.5 ? "alto" : "normal" },
    { name: "Mg²⁺", value: lastLab.mg, unit: "mg/dL", refLow: 1.7, refHigh: 2.2, status: lastLab.mg < 1.7 ? "baixo" : lastLab.mg > 2.2 ? "alto" : "normal" },
    { name: "Cl⁻", value: lastLab.cl, unit: "mEq/L", refLow: 98, refHigh: 106, status: lastLab.cl < 98 ? "baixo" : lastLab.cl > 106 ? "alto" : "normal" },
    { name: "Lactato", value: lastLab.lactato, unit: "mmol/L", refLow: 0, refHigh: 2.0, status: lastLab.lactato > 2.0 ? "alto" : "normal" },
  ];

  return { labTrend, sideEffectData, gasGauges, electrolyteGauges, lastLab, ag };
}

// ─── Gauge ─────────────────────────────────────────────────────────
function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : "bg-green-500/10 border-green-500/30";
  const label = status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲ ALTO" : "● NORMAL";
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className="text-xs text-muted-foreground font-medium">{name}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      <Badge variant="outline" className={`text-[10px] mt-1 ${color}`}>{label}</Badge>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────
export default function SimuladorAcidoBase() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<ABCase | null>(null);
  const isEmbed = useIsEmbed();
  const embedCaseId = useEmbedCaseId();
  useEffect(() => {
    if (isEmbed && embedCaseId && !activeCase) {
      const decoded = decodeURIComponent(embedCaseId);
      const found = BUILT_IN_CASES.find((c: any) => c.title === decoded);
      if (found) setActiveCase(found as any);
    }
  }, [isEmbed, embedCaseId, activeCase]);
  const [selectedDrugIndices, setSelectedDrugIndices] = useState<number[]>([0]);
  const [drugDoses, setDrugDoses] = useState<number[]>([DRUGS[0].doseMin]);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedDrugs = selectedDrugIndices.map(i => DRUGS[i]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 40, weight: 70, sex: "M", specialGroup: [] },
        scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab,
        expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedDrugIndices([0]);
      setDrugDoses([DRUGS[0].doseMin]);
      setRunning(false);
      setAnimStep(0);
    }
  }, [activeCase]);

  const simulation = useMemo(() =>
    computeSimulation(selectedDrugs, drugDoses, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab),
    [selectedDrugs, drugDoses, activeCase?.baseLab]
  );

  const displayTrend = useMemo(() => running ? simulation.labTrend.slice(0, animStep + 1) : simulation.labTrend, [running, animStep, simulation.labTrend]);

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.labTrend.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 1), 100);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.labTrend.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const addDrug = (idx: number) => {
    if (!selectedDrugIndices.includes(idx)) {
      setSelectedDrugIndices(prev => [...prev, idx]);
      setDrugDoses(prev => [...prev, DRUGS[idx].doseMin]);
    }
  };
  const removeDrug = (pos: number) => {
    if (selectedDrugIndices.length <= 1) return;
    setSelectedDrugIndices(prev => prev.filter((_, i) => i !== pos));
    setDrugDoses(prev => prev.filter((_, i) => i !== pos));
  };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const drugNames = selectedDrugs.map(d => d.name);
    const expectedFound = activeCase.expectedDrugs.filter(e => drugNames.includes(e)).length;
    const drugScore = (expectedFound / Math.max(activeCase.expectedDrugs.length, 1)) * 50;
    const phNorm = simulation.lastLab.pH >= 7.35 && simulation.lastLab.pH <= 7.45;
    const s = Math.round(drugScore + (phNorm ? 30 : 0) + 20);
    setLastScore(s);
    const decisions: SimDecision[] = [
      { label: "Fármacos selecionados", userChoice: drugNames.join(", ") || "Nenhum", idealChoice: activeCase.expectedDrugs.join(", "), correct: expectedFound === activeCase.expectedDrugs.length, category: "Seleção farmacológica" },
      { label: "pH normalizado", userChoice: `pH: ${simulation.lastLab.pH}`, idealChoice: "7.35-7.45", correct: phNorm, category: "Desfecho" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions("farmacoterapia-acido-base", decisions) });
    return s;
  }, [activeCase, selectedDrugs, simulation, submitted, submitResults]);

  useEffect(() => {
    if (challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({
    id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
    patient: c.patient ?? { name: "Paciente", age: 40, weight: 70, sex: "M", specialGroup: [] },
    scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab,
    expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [],
  });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Distúrbios Ácido-Base e Eletrólitos</h1>
            <p className="text-muted-foreground">Interprete gasometrias, identifique distúrbios e corrija com farmacoterapia guiada por laboratório.</p>
            <ShareToolButton toolSlug="farmacoterapia-acido-base" toolName="Distúrbios Ácido-Base e Eletrólitos" /><AdminPromptViewer toolSlug="sim-farmacoterapia-acido-base" toolName="Ácido-Base" toolType="simulator" prompt={getNativePrompt("sim-farmacoterapia-acido-base") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (<NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />))}
            {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && (
              <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
              </Button>
            )}
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
        <div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-acido-base" toolName="Distúrbios Ácido-Base e Eletrólitos" caseId={activeCase.title} /></div>
      </div>

      {/* Patient */}
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Gasometry Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4 text-primary" /> Gasometria Arterial (após tratamento)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {simulation.gasGauges.map(g => <LabGauge key={g.name} {...g} />)}
          </div>
          <p className="text-sm font-semibold mb-2">Eletrólitos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {simulation.electrolyteGauges.map(g => <LabGauge key={g.name} {...g} />)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Intervenção Farmacológica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedDrugIndices.map((dIdx, pos) => {
              const d = DRUGS[dIdx];
              return (
                <div key={pos} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={String(dIdx)} onValueChange={v => {
                      const newIdx = Number(v);
                      setSelectedDrugIndices(prev => prev.map((old, i) => i === pos ? newIdx : old));
                      setDrugDoses(prev => prev.map((old, i) => i === pos ? DRUGS[newIdx].doseMin : old));
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DRUGS.map((dr, i) => <SelectItem key={i} value={String(i)}>{dr.name} ({dr.class})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedDrugIndices.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDrug(pos)}>✕</Button>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{drugDoses[pos]} {d.doseUnit}</span></div>
                    <Slider value={[drugDoses[pos]]} onValueChange={([v]) => setDrugDoses(prev => prev.map((old, i) => i === pos ? v : old))} min={d.doseMin} max={d.doseMax} step={d.doseStep} />
                    <p className="text-xs text-muted-foreground">{d.doseMin}–{d.doseMax} {d.doseUnit}</p>
                  </div>
                </div>
              );
            })}

            {selectedDrugIndices.length < 5 && (
              <Select onValueChange={v => addDrug(Number(v))}>
                <SelectTrigger><SelectValue placeholder="+ Adicionar fármaco" /></SelectTrigger>
                <SelectContent>
                  {DRUGS.filter((_, i) => !selectedDrugIndices.includes(i)).map((d) => (
                    <SelectItem key={DRUGS.indexOf(d)} value={String(DRUGS.indexOf(d))}>{d.name} ({d.class})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button className="w-full gap-2" onClick={handleStart} disabled={running}>
              <Play className="h-4 w-4" /> {running ? "Simulando..." : "Iniciar Simulação (24h)"}
            </Button>
          </CardContent>
        </Card>

        {/* Trend Charts */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tendência Laboratorial (24h)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold">pH e HCO₃⁻</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Hora", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="ph" domain={[6.8, 7.8]} label={{ value: "pH", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="hco3" orientation="right" domain={[0, 50]} label={{ value: "HCO₃⁻", angle: 90, position: "insideRight" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine yAxisId="ph" y={7.35} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" />
                <ReferenceLine yAxisId="ph" y={7.45} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" />
                <Line yAxisId="ph" type="monotone" dataKey="pH" name="pH" stroke="hsl(var(--primary))" dot={false} strokeWidth={2.5} />
                <Line yAxisId="hco3" type="monotone" dataKey="hco3" name="HCO₃⁻" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>

            <p className="text-sm font-semibold">Eletrólitos: Na⁺ e K⁺</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Hora", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="na" domain={[100, 165]} label={{ value: "Na⁺", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="k" orientation="right" domain={[1.5, 9]} label={{ value: "K⁺", angle: 90, position: "insideRight" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine yAxisId="k" y={3.5} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                <ReferenceLine yAxisId="k" y={5.0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                <Line yAxisId="na" type="monotone" dataKey="na" name="Na⁺" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} />
                <Line yAxisId="k" type="monotone" dataKey="k" name="K⁺" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader><CardTitle className="text-base">Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={simulation.sideEffectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} label={{ value: "Risco (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="risco" name="Risco (%)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Initial Lab */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-2">🔬 Gasometria e Eletrólitos Iniciais</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            <div><strong>pH:</strong> {activeCase.baseLab.pH}</div>
            <div><strong>pCO₂:</strong> {activeCase.baseLab.pCO2} mmHg</div>
            <div><strong>pO₂:</strong> {activeCase.baseLab.pO2} mmHg</div>
            <div><strong>HCO₃⁻:</strong> {activeCase.baseLab.hco3} mEq/L</div>
            <div><strong>BE:</strong> {activeCase.baseLab.be}</div>
            <div><strong>Lactato:</strong> {activeCase.baseLab.lactato} mmol/L</div>
            <div><strong>Na⁺:</strong> {activeCase.baseLab.na} mEq/L</div>
            <div><strong>K⁺:</strong> {activeCase.baseLab.k} mEq/L</div>
            <div><strong>Ca²⁺:</strong> {activeCase.baseLab.ca} mg/dL</div>
            <div><strong>Mg²⁺:</strong> {activeCase.baseLab.mg} mg/dL</div>
            <div><strong>Cl⁻:</strong> {activeCase.baseLab.cl} mEq/L</div>
            <div><strong>Glicemia:</strong> {activeCase.baseLab.glicemia} mg/dL</div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Tip */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
          {activeCase.references?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground">Referências:</p>
              {activeCase.references.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge Mode */}
      {(() => {
        const activeCaseIndex = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
        return (
          <SimulatorChallengeMode
            challengeSet={getAcidoBaseChallenges(activeCaseIndex >= 0 ? activeCaseIndex : undefined)}
            simulatorState={{
              drugs: selectedDrugs.map(d => d.name),
              drugClasses: selectedDrugs.map(d => d.class),
              doses: drugDoses,
              gasGauges: simulation.gasGauges,
              electrolyteGauges: simulation.electrolyteGauges,
              sideEffectData: simulation.sideEffectData,
              labTrend: simulation.labTrend,
              lastLab: simulation.lastLab,
              baseLab: activeCase.baseLab,
              ag: simulation.ag,
            }}
            onComplete={() => setChallengeCompleted(true)}
          />
        );
      })()}

      {/* Virtual Room Results */}
      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
