import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Wind, Eye, Play, Heart, Activity, Droplets, Thermometer, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getTratamentoAsmaChallenges } from "@/data/simulatorChallenges";

const SLUG = "tratamento-asma";

// ─── Drug Database ──────────────────────────────────────────────────────────
interface AsthmaDrug {
  name: string; class: string; type: "controller" | "rescue" | "addon";
  doseLow: number; doseMed: number; doseHigh: number; doseUnit: string;
  vef1Improvement: number; // 0-1 improvement factor
  crisisReduction: number; // 0-1 factor
  sideEffects: { candidiase: number; disfonia: number; supressaoAdrenal: number; taquicardia: number; tremor: number; osteoporose: number };
  safePregnancy: boolean; safeChild: boolean; safeElderly: boolean;
  preferredPregnancy?: boolean;
  ginaSteps: number[]; // Steps where this drug is indicated
}

const DRUGS: AsthmaDrug[] = [
  // ICS
  { name: "Budesonida", class: "CI", type: "controller", doseLow: 200, doseMed: 400, doseHigh: 800, doseUnit: "mcg/dia", vef1Improvement: 0.6, crisisReduction: 0.6, sideEffects: { candidiase: 0.15, disfonia: 0.1, supressaoAdrenal: 0.05, taquicardia: 0, tremor: 0, osteoporose: 0.05 }, safePregnancy: true, safeChild: true, safeElderly: true, preferredPregnancy: true, ginaSteps: [1, 2, 3, 4, 5] },
  { name: "Beclometasona", class: "CI", type: "controller", doseLow: 200, doseMed: 400, doseHigh: 800, doseUnit: "mcg/dia", vef1Improvement: 0.55, crisisReduction: 0.55, sideEffects: { candidiase: 0.18, disfonia: 0.12, supressaoAdrenal: 0.06, taquicardia: 0, tremor: 0, osteoporose: 0.06 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [2, 3, 4, 5] },
  { name: "Fluticasona propionato", class: "CI", type: "controller", doseLow: 100, doseMed: 250, doseHigh: 500, doseUnit: "mcg/dia", vef1Improvement: 0.65, crisisReduction: 0.65, sideEffects: { candidiase: 0.2, disfonia: 0.15, supressaoAdrenal: 0.1, taquicardia: 0, tremor: 0, osteoporose: 0.08 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [2, 3, 4, 5] },
  { name: "Mometasona", class: "CI", type: "controller", doseLow: 100, doseMed: 200, doseHigh: 400, doseUnit: "mcg/dia", vef1Improvement: 0.6, crisisReduction: 0.6, sideEffects: { candidiase: 0.12, disfonia: 0.08, supressaoAdrenal: 0.04, taquicardia: 0, tremor: 0, osteoporose: 0.04 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [2, 3, 4, 5] },
  // LABA
  { name: "Formoterol", class: "LABA", type: "controller", doseLow: 6, doseMed: 12, doseHigh: 24, doseUnit: "mcg/dia", vef1Improvement: 0.3, crisisReduction: 0.35, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0.15, tremor: 0.12, osteoporose: 0 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [3, 4, 5] },
  { name: "Salmeterol", class: "LABA", type: "controller", doseLow: 50, doseMed: 50, doseHigh: 100, doseUnit: "mcg/dia", vef1Improvement: 0.25, crisisReduction: 0.3, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0.12, tremor: 0.1, osteoporose: 0 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [3, 4, 5] },
  // LAMA
  { name: "Tiotrópio", class: "LAMA", type: "addon", doseLow: 2.5, doseMed: 5, doseHigh: 5, doseUnit: "mcg/dia", vef1Improvement: 0.15, crisisReduction: 0.2, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0.05, tremor: 0, osteoporose: 0 }, safePregnancy: false, safeChild: false, safeElderly: true, ginaSteps: [4, 5] },
  // SABA (rescue)
  { name: "Salbutamol", class: "SABA", type: "rescue", doseLow: 100, doseMed: 200, doseHigh: 800, doseUnit: "mcg/dose", vef1Improvement: 0.1, crisisReduction: 0.1, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0.3, tremor: 0.25, osteoporose: 0 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [1, 2, 3, 4, 5] },
  // Add-on therapies
  { name: "Montelucaste", class: "LTRA", type: "addon", doseLow: 5, doseMed: 10, doseHigh: 10, doseUnit: "mg/dia", vef1Improvement: 0.1, crisisReduction: 0.15, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0, tremor: 0, osteoporose: 0 }, safePregnancy: true, safeChild: true, safeElderly: true, ginaSteps: [2, 3, 4] },
  { name: "Omalizumabe (anti-IgE)", class: "Biológico", type: "addon", doseLow: 150, doseMed: 300, doseHigh: 600, doseUnit: "mg/mês", vef1Improvement: 0.2, crisisReduction: 0.4, sideEffects: { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0, tremor: 0, osteoporose: 0 }, safePregnancy: false, safeChild: false, safeElderly: true, ginaSteps: [5] },
  { name: "Prednisona (oral)", class: "Corticoide sistêmico", type: "addon", doseLow: 5, doseMed: 20, doseHigh: 60, doseUnit: "mg/dia", vef1Improvement: 0.3, crisisReduction: 0.5, sideEffects: { candidiase: 0.05, disfonia: 0, supressaoAdrenal: 0.6, taquicardia: 0.05, tremor: 0.05, osteoporose: 0.5 }, safePregnancy: false, safeChild: false, safeElderly: false, ginaSteps: [5] },
];

// ─── Case Type ──────────────────────────────────────────────────────────────
interface AsthmaCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  severity: "intermitente" | "persistente-leve" | "persistente-moderada" | "persistente-grave" | "crise-aguda";
  ginaStep: number;
  scenario: string;
  spirometry: { vef1: number; vef1cvf: number; pfe: number; bdResponse: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: AsthmaCase[] = [
  {
    title: "Caso 1: Classificação e Espirometria Inicial",
    difficulty: "Fácil",
    patient: { name: "Pedro Silva", age: 22, weight: 70, sex: "M", specialGroup: [] },
    severity: "intermitente",
    ginaStep: 1,
    scenario: "Jovem 22 anos com tosse noturna esporádica (~1x/mês) e sibilos ao esforço. Sem limitação de atividades. Despertar noturno ≤2x/mês. Espirometria: VEF1 92% do predito, VEF1/CVF 0.82, PFE 450 L/min. Prova broncodilatadora positiva (melhora de 15% e 250 mL). O aluno deve classificar como asma intermitente (sintomas ≤2x/mês, VEF1 ≥80%) e selecionar Step 1 GINA: SABA sob demanda (salbutamol 100-200 mcg) OU CI+formoterol sob demanda (terapia MART preferida pelo GINA 2023). Não há indicação de CI contínuo nesta classificação.",
    spirometry: { vef1: 92, vef1cvf: 82, pfe: 450, bdResponse: 15 },
    expectedDrugs: ["Salbutamol"],
    clinicalTip: "A asma intermitente é caracterizada por: sintomas diurnos ≤2x/mês, despertares noturnos ≤2x/mês, VEF1 ≥80%, variabilidade do PFE <20%. O GINA 2023 recomenda para Step 1: CI+formoterol sob demanda (preferido) ou SABA sob demanda. A prova broncodilatadora positiva (≥12% e ≥200 mL de aumento no VEF1) confirma a reversibilidade da obstrução, achado típico de asma. VEF1/CVF >0.75 em jovem adulto pode indicar obstrução leve — o padrão obstrutivo é VEF1/CVF <0.70.",
    references: ["Aula 17 – Entendendo a Asma", "GINA 2023 Report", "Pellegrino R et al. ERJ 2005 (Espirometria)"],
  },
  {
    title: "Caso 2: Escalonamento Terapêutico",
    difficulty: "Médio",
    patient: { name: "Marina Campos", age: 35, weight: 65, sex: "F", specialGroup: [] },
    severity: "persistente-moderada",
    ginaStep: 3,
    scenario: "Mulher 35 anos com sintomas diários de tosse e dispneia, despertar noturno >1x/semana, limitação parcial de atividades. Em uso de budesonida 200 mcg/dia (dose baixa) há 3 meses sem controle adequado. Espirometria: VEF1 68%, VEF1/CVF 0.65, PFE 320 L/min. BD positiva (+18%). Antes de escalonar: verificar técnica inalatória (erros em >70% dos pacientes), adesão terapêutica e exposição a alérgenos. O aluno deve escalonar para Step 3: CI dose média + LABA (budesonida 400 mcg + formoterol 12 mcg — terapia MART preferida) ou Step 4 se persistir sem controle. A terapia MART (Maintenance And Reliever Therapy) usa ICS-formoterol como controlador E resgate, eliminando o uso de SABA isolado.",
    spirometry: { vef1: 68, vef1cvf: 65, pfe: 320, bdResponse: 18 },
    expectedDrugs: ["Budesonida", "Formoterol"],
    clinicalTip: "Asma persistente moderada: sintomas diários, despertar noturno >1x/sem, VEF1 60-80%. O Step 3 GINA = CI dose média + LABA. A terapia MART (budesonida-formoterol como controlador E resgate) é preferida pelo GINA 2023 por reduzir exacerbações em ~60% comparado a CI+SABA. Verificar SEMPRE antes de escalonar: 1) Técnica inalatória (80% dos pacientes cometem erros), 2) Adesão (>50% não usam corretamente), 3) Comorbidades (rinite, DRGE, obesidade), 4) Exposição a gatilhos.",
    references: ["Aula 18 – Tratando a Asma", "GINA 2023 Steps 3-4", "Reddel HK et al. Lancet 2022"],
  },
  {
    title: "Caso 3: Asma Grave — Terapia Biológica",
    difficulty: "Difícil",
    patient: { name: "Roberto Almeida", age: 48, weight: 90, sex: "M", specialGroup: [] },
    severity: "persistente-grave",
    ginaStep: 5,
    scenario: "Homem 48 anos, múltiplas internações por exacerbações (3 no último ano), uso crônico de prednisona 10 mg/dia há 18 meses. VEF1 45%, VEF1/CVF 0.55. Eosinófilos no sangue: 650 céls/µL, IgE total: 450 UI/mL. Alérgico a ácaros e fungos (prick test positivo). Em uso de budesonida 800 mcg + formoterol 24 mcg + tiotrópio 5 mcg sem controle. O aluno deve identificar o fenótipo (alérgico eosinofílico, IgE elevada → candidato a omalizumabe anti-IgE), selecionar Step 5 GINA (CI dose alta + LABA + LAMA + biológico), e planejar o desmame gradual de prednisona (reduzir 2.5-5 mg a cada 2-4 semanas) após início do biológico.",
    spirometry: { vef1: 45, vef1cvf: 55, pfe: 220, bdResponse: 10 },
    expectedDrugs: ["Budesonida", "Formoterol", "Tiotrópio", "Omalizumabe (anti-IgE)"],
    clinicalTip: "Asma grave refratária (Step 5): CI dose alta + LABA + LAMA ± biológico. Fenotipagem é essencial: 1) Alérgico (IgE ↑, prick test +) → omalizumabe (anti-IgE); 2) Eosinofílico (eosinófilos ≥300) → mepolizumabe/benralizumabe (anti-IL5); 3) Inflamação T2 alta (FeNO ↑, IL-4/13) → dupilumabe. O desmame de corticoide oral deve ser gradual (2.5-5 mg/semana) monitorando sintomas de insuficiência adrenal. Prednisona crônica causa: osteoporose, DM, HAS, catarata, supressão adrenal, miopatia.",
    references: ["Aula 18 – Tratando a Asma", "GINA 2023 Step 5", "Bel EH et al. NEJM 2014 (Mepolizumab)"],
  },
  {
    title: "Caso 4: Asma na Gestação — Segurança do CI",
    difficulty: "Médio",
    patient: { name: "Amanda Ferreira", age: 30, weight: 68, sex: "F", specialGroup: ["Gestante (20 sem)"] },
    severity: "persistente-leve",
    ginaStep: 2,
    scenario: "Gestante 30 anos, 20 semanas, asma persistente leve com sintomas >2x/semana e despertar noturno 3-4x/mês. VEF1 82%, VEF1/CVF 0.78. Refere medo de usar corticoide inalatório ('vai fazer mal ao bebê'). Paciente suspendeu budesonida por conta própria há 2 meses. O aluno deve explicar que: 1) Asma não controlada é MAIS perigosa que o CI (risco de hipóxia fetal, pré-eclâmpsia, parto prematuro, baixo peso); 2) Budesonida é o CI PREFERIDO na gestação (maior evidência de segurança, FDA categoria B); 3) SABA (salbutamol) é seguro para resgate; 4) Montelucaste pode ser mantido se já em uso. Selecionar Step 2: budesonida dose baixa (200-400 mcg/dia).",
    spirometry: { vef1: 82, vef1cvf: 78, pfe: 400, bdResponse: 14 },
    expectedDrugs: ["Budesonida"],
    clinicalTip: "Asma na gestação: 'é mais seguro tratar do que não tratar'. Asma não controlada → hipóxia materna e fetal → risco de pré-eclâmpsia (3x), parto prematuro (1.5x), baixo peso ao nascer. Budesonida é o CI preferido (maior volume de dados de segurança). A regra dos terços: 1/3 melhora, 1/3 estável, 1/3 piora durante a gestação. SABA, CI, LABA (formoterol, salmeterol) e montelucaste são considerados seguros. Teofilina requer monitoramento de nível sérico. Corticoide oral de curta duração é aceitável nas exacerbações graves.",
    references: ["Aula 19 – Asma em Situações Especiais", "GINA 2023 Cap. Gestação", "Namazy JA, Schatz M. JACI 2005"],
  },
  {
    title: "Caso 5: Exacerbação Grave no PS",
    difficulty: "Difícil",
    patient: { name: "Lucas Torres", age: 16, weight: 55, sex: "M", specialGroup: [] },
    severity: "crise-aguda",
    ginaStep: 5,
    scenario: "Adolescente 16 anos trazido ao PS com dispneia intensa há 3 horas, após exposição a gato em casa de amigo. FR 32 irpm, SpO2 89%, FC 120 bpm, PFE 35% do predito. Fala em palavras isoladas, uso de musculatura acessória, tiragem intercostal, sibilos difusos bilaterais. Classificação: crise GRAVE (fala em palavras, FR >30, SpO2 <90%, PFE 25-50%). O aluno deve iniciar: 1) O2 suplementar para SpO2 93-95%; 2) Salbutamol nebulizado 2.5-5 mg a cada 20 min × 3 doses (ou 4-8 jatos pMDI+espaçador); 3) Ipratrópio 0.5 mg nebulizado nas primeiras 3 doses; 4) Corticoide sistêmico precoce (prednisona 40-50 mg VO ou hidrocortisona 200 mg EV); 5) Se sem resposta: sulfato de magnésio 2g EV em 20 min. Monitorar sinais de risco de vida (tórax silencioso, bradicardia, cianose, confusão).",
    spirometry: { vef1: 35, vef1cvf: 50, pfe: 170, bdResponse: 8 },
    expectedDrugs: ["Salbutamol", "Prednisona (oral)"],
    clinicalTip: "Classificação da crise: LEVE-MODERADA (fala em frases, FR normal-↑, SpO2 >90%, PFE >50%) → SABA 4-8 jatos + prednis 40 mg. GRAVE (fala em palavras, FR >30, SpO2 <90%, PFE 25-50%) → SABA nebulizado contínuo + ipratrópio + O2 + corticoide sistêmico ± MgSO4 EV. RISCO DE VIDA (tórax silencioso, bradicardia, confusão, SpO2 <88%) → UTI + todos acima + considerar aminofilina EV. O corticoide sistêmico deve ser administrado na 1ª HORA — reduz internação em 25%. Não usar sedativos. Alta com: CI dose alta + plano de ação.",
    references: ["Aula 18 – Tratando a Asma (Crise)", "GINA 2023 Cap. Exacerbações", "Rodrigo GJ et al. Chest 2004 (MgSO4)"],
  },
];

// ─── Simulation Engine ──────────────────────────────────────────────────────
function computeSimulation(
  drugs: AsthmaDrug[], doses: number[], ginaStep: number,
  device: string, specialGroups: { gestante: boolean; crianca: boolean; idoso: boolean; exercicio: boolean; drge: boolean; obesidade: boolean },
  severity: string, baseVef1: number
) {
  const weeks = Array.from({ length: 13 }, (_, i) => i); // 0-12 weeks

  // Compute combined improvement factors
  let totalVef1Improvement = 0;
  let totalCrisisReduction = 0;
  drugs.forEach((d, i) => {
    const doseFrac = doses[i] / d.doseHigh;
    totalVef1Improvement += d.vef1Improvement * doseFrac;
    totalCrisisReduction += d.crisisReduction * doseFrac;
  });

  // Device efficiency
  const deviceFactor = device === "pMDI+espaçador" ? 1.0 : device === "DPI" ? 0.95 : device === "Nebulizador" ? 0.9 : 0.7; // pMDI alone = 0.7
  totalVef1Improvement *= deviceFactor;
  totalCrisisReduction *= deviceFactor;

  // Special group modifiers
  if (specialGroups.obesidade) { totalVef1Improvement *= 0.8; totalCrisisReduction *= 0.8; }
  if (specialGroups.drge) { totalCrisisReduction *= 0.85; }
  if (specialGroups.exercicio && !drugs.some(d => d.class === "LABA")) totalCrisisReduction *= 0.7;

  // Severity baseline crises
  const baseCrisesWeek = severity === "intermitente" ? 0.25 : severity === "persistente-leve" ? 1 : severity === "persistente-moderada" ? 2.5 : severity === "crise-aguda" ? 5 : 4;
  const baseSABA = severity === "intermitente" ? 0.5 : severity === "persistente-leve" ? 2 : severity === "persistente-moderada" ? 5 : 8;

  const lungData: { week: number; vef1: number; pfe: number }[] = [];
  const crisisData: { week: number; crises: number; sabaUse: number }[] = [];

  for (const w of weeks) {
    const progress = Math.min(1, w / 8); // Full effect by week 8
    const vef1 = Math.min(100, baseVef1 + totalVef1Improvement * (100 - baseVef1) * progress);
    const pfe = (vef1 / 100) * 500; // approximate PFE
    const crises = Math.max(0, baseCrisesWeek * (1 - totalCrisisReduction * progress));
    const sabaUse = Math.max(0, baseSABA * (1 - totalCrisisReduction * progress * 0.9));

    lungData.push({ week: w, vef1: Math.round(vef1 * 10) / 10, pfe: Math.round(pfe) });
    crisisData.push({ week: w, crises: Math.round(crises * 100) / 100, sabaUse: Math.round(sabaUse * 100) / 100 });
  }

  // Side effects
  const combinedSE = { candidiase: 0, disfonia: 0, supressaoAdrenal: 0, taquicardia: 0, tremor: 0, osteoporose: 0 };
  drugs.forEach((d, i) => {
    const doseFrac = doses[i] / d.doseHigh;
    (Object.keys(combinedSE) as (keyof typeof combinedSE)[]).forEach(k => {
      combinedSE[k] += d.sideEffects[k] * doseFrac;
    });
  });
  if (specialGroups.idoso) { combinedSE.osteoporose *= 2; combinedSE.supressaoAdrenal *= 1.5; }

  const sideEffectData = [
    { name: "Candidíase", risco: Math.round(Math.min(combinedSE.candidiase * 100, 100)) },
    { name: "Disfonia", risco: Math.round(Math.min(combinedSE.disfonia * 100, 100)) },
    { name: "Supressão Adrenal", risco: Math.round(Math.min(combinedSE.supressaoAdrenal * 100, 100)) },
    { name: "Taquicardia", risco: Math.round(Math.min(combinedSE.taquicardia * 100, 100)) },
    { name: "Tremor", risco: Math.round(Math.min(combinedSE.tremor * 100, 100)) },
    { name: "Osteoporose", risco: Math.round(Math.min(combinedSE.osteoporose * 100, 100)) },
  ];

  // Warnings
  const warnings: string[] = [];
  if (specialGroups.gestante) {
    drugs.forEach(d => {
      if (!d.safePregnancy) warnings.push(`⚠️ ${d.name} — Uso na gestação requer avaliação cuidadosa!`);
      if (d.preferredPregnancy) warnings.push(`✅ ${d.name} é o CI preferido na gestação (maior evidência de segurança).`);
    });
  }
  if (specialGroups.crianca) {
    drugs.forEach(d => { if (!d.safeChild) warnings.push(`⚠️ ${d.name} — Uso em crianças requer avaliação!`); });
  }
  const hasLABA = drugs.some(d => d.class === "LABA");
  const hasICS = drugs.some(d => d.class === "CI");
  if (hasLABA && !hasICS) warnings.push("⚠️ LABA NÃO deve ser usado em monoterapia na asma (risco de morte)!");

  // Clinical panel
  const lastLung = lungData[lungData.length - 1];
  const lastCrisis = crisisData[crisisData.length - 1];
  const vitals = {
    spo2: Math.min(99, Math.max(85, 93 + (lastLung.vef1 - 50) * 0.12)),
    fr: Math.max(12, Math.round(22 - (lastLung.vef1 - 50) * 0.1)),
    pfe: lastLung.pfe,
    sintomasNoturnos: Math.max(0, Math.round(lastCrisis.crises * 2)),
  };

  return { lungData, crisisData, sideEffectData, vitals, warnings, finalVef1: lastLung.vef1 };
}

export default function SimuladorTratamentoAsma() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<AsthmaCase | null>(null);
  const [selectedDrugIndices, setSelectedDrugIndices] = useState<number[]>([0]);
  const [drugDoses, setDrugDoses] = useState<number[]>([200]);
  const [ginaStep, setGinaStep] = useState(1);
  const [device, setDevice] = useState("pMDI+espaçador");
  const [specialGroups, setSpecialGroups] = useState({ gestante: false, crianca: false, idoso: false, exercicio: false, drge: false, obesidade: false });
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
        severity: cd.severity ?? "persistente-leve", ginaStep: cd.ginaStep ?? 2,
        scenario: cd.scenario ?? "",
        spirometry: cd.spirometry ?? { vef1: 80, vef1cvf: 75, pfe: 400, bdResponse: 12 },
        expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "",
        references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedDrugIndices([0]);
      setDrugDoses([DRUGS[0].doseLow]);
      setGinaStep(activeCase.ginaStep);
      setDevice("pMDI+espaçador");
      const groups = activeCase.patient.specialGroup.map(g => g.toLowerCase());
      setSpecialGroups({
        gestante: groups.some(g => g.includes("gestante") || g.includes("gravidez")),
        crianca: groups.some(g => g.includes("criança")) || activeCase.patient.age < 6,
        idoso: groups.some(g => g.includes("idoso")) || activeCase.patient.age >= 65,
        exercicio: groups.some(g => g.includes("exerc")),
        drge: groups.some(g => g.includes("drge")),
        obesidade: groups.some(g => g.includes("obesi")),
      });
      setRunning(false);
      setAnimStep(0);
    }
  }, [activeCase]);

  const simulation = useMemo(() =>
    computeSimulation(selectedDrugs, drugDoses, ginaStep, device, specialGroups, activeCase?.severity ?? "persistente-leve", activeCase?.spirometry?.vef1 ?? 80),
    [selectedDrugs, drugDoses, ginaStep, device, specialGroups, activeCase?.severity, activeCase?.spirometry?.vef1]
  );

  const displayLungData = useMemo(() => running ? simulation.lungData.slice(0, animStep + 1) : simulation.lungData, [running, animStep, simulation.lungData]);
  const displayCrisisData = useMemo(() => running ? simulation.crisisData.slice(0, animStep + 1) : simulation.crisisData, [running, animStep, simulation.crisisData]);

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.lungData.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 1), 200);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.lungData.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const addDrug = (idx: number) => {
    if (!selectedDrugIndices.includes(idx)) {
      setSelectedDrugIndices(prev => [...prev, idx]);
      setDrugDoses(prev => [...prev, DRUGS[idx].doseLow]);
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
    const drugScore = (expectedFound / Math.max(activeCase.expectedDrugs.length, 1)) * 40;
    const vef1Improved = simulation.finalVef1 > (activeCase.spirometry?.vef1 ?? 80);
    const noContra = simulation.warnings.filter(w => w.startsWith("⚠️")).length === 0;
    const s = Math.round(drugScore + (vef1Improved ? 30 : 0) + (noContra ? 30 : 0));
    setLastScore(s);
    submitResults({ score: s, actions: { drugs: drugNames, doses: drugDoses, ginaStep, device, finalVef1: simulation.finalVef1, warnings: simulation.warnings } });
    return s;
  }, [activeCase, selectedDrugs, drugDoses, ginaStep, device, simulation, submitted, submitResults]);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
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
    severity: c.severity ?? "persistente-leve", ginaStep: c.ginaStep ?? 2,
    scenario: c.scenario ?? "", spirometry: c.spirometry ?? { vef1: 80, vef1cvf: 75, pfe: 400, bdResponse: 12 },
    expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [],
  });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Tratamento da Asma</h1>
            <p className="text-muted-foreground">Classifique, trate e monitore pacientes asmáticos conforme os Steps GINA, espirometria e situações especiais.</p>
            <AdminPromptViewer toolSlug="sim-tratamento-asma" toolName="Tratamento da Asma" toolType="simulator" prompt={getNativePrompt("sim-tratamento-asma") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
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

  const severityLabels: Record<string, string> = {
    intermitente: "Intermitente",
    "persistente-leve": "Persistente Leve",
    "persistente-moderada": "Persistente Moderada",
    "persistente-grave": "Persistente Grave",
    "crise-aguda": "Crise Aguda",
  };

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{severityLabels[activeCase.severity]}</Badge>
        <Badge>Step {activeCase.ginaStep}</Badge>
      </div>

      {/* Patient Info + Spirometry */}
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        <div className="mt-2 rounded-lg bg-muted/50 p-3 border border-border">
          <p className="text-xs font-semibold mb-1">🫁 Espirometria:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><strong>VEF1:</strong> {activeCase.spirometry.vef1}% predito</div>
            <div><strong>VEF1/CVF:</strong> {activeCase.spirometry.vef1cvf / 100}</div>
            <div><strong>PFE:</strong> {activeCase.spirometry.pfe} L/min</div>
            <div><strong>BD (+):</strong> {activeCase.spirometry.bdResponse}%</div>
          </div>
        </div>
      </CardContent></Card>

      {/* Warnings */}
      {simulation.warnings.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 space-y-1">
            {simulation.warnings.map((w, i) => <p key={i} className={`text-sm font-medium ${w.startsWith("✅") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{w}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Prescrição — Step {ginaStep}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Step GINA</label>
              <Select value={String(ginaStep)} onValueChange={v => setGinaStep(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(s => <SelectItem key={s} value={String(s)}>Step {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedDrugIndices.map((dIdx, pos) => {
              const d = DRUGS[dIdx];
              return (
                <div key={pos} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={String(dIdx)} onValueChange={v => {
                      const newIdx = Number(v);
                      setSelectedDrugIndices(prev => prev.map((old, i) => i === pos ? newIdx : old));
                      setDrugDoses(prev => prev.map((old, i) => i === pos ? DRUGS[newIdx].doseLow : old));
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
                    <Slider value={[drugDoses[pos]]} onValueChange={([v]) => setDrugDoses(prev => prev.map((old, i) => i === pos ? v : old))} min={d.doseLow} max={d.doseHigh} step={d.doseHigh <= 50 ? 2.5 : d.doseHigh <= 200 ? 10 : d.doseHigh <= 600 ? 25 : 50} />
                    <p className="text-xs text-muted-foreground">{d.doseLow}–{d.doseHigh} {d.doseUnit} • Steps: {d.ginaSteps.join(",")}</p>
                  </div>
                </div>
              );
            })}

            {selectedDrugIndices.length < 5 && (
              <Select onValueChange={v => addDrug(Number(v))}>
                <SelectTrigger><SelectValue placeholder="+ Adicionar fármaco" /></SelectTrigger>
                <SelectContent>
                  {DRUGS.filter((_, i) => !selectedDrugIndices.includes(i)).map((d, i) => (
                    <SelectItem key={DRUGS.indexOf(d)} value={String(DRUGS.indexOf(d))}>{d.name} ({d.class})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Dispositivo Inalatório</label>
              <Select value={device} onValueChange={setDevice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pMDI">pMDI (sem espaçador)</SelectItem>
                  <SelectItem value="pMDI+espaçador">pMDI + Espaçador</SelectItem>
                  <SelectItem value="DPI">DPI (pó seco)</SelectItem>
                  <SelectItem value="Nebulizador">Nebulizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Situação especial</p>
              {([
                { key: "gestante" as const, label: "Gestante" },
                { key: "crianca" as const, label: "Criança (<5 anos)" },
                { key: "idoso" as const, label: "Idoso" },
                { key: "exercicio" as const, label: "Asma induzida por exercício" },
                { key: "drge" as const, label: "DRGE associada" },
                { key: "obesidade" as const, label: "Obesidade" },
              ]).map(g => (
                <div key={g.key} className="flex items-center gap-2">
                  <Switch checked={specialGroups[g.key]} onCheckedChange={v => setSpecialGroups(prev => ({ ...prev, [g.key]: v }))} id={`sg-${g.key}`} />
                  <label htmlFor={`sg-${g.key}`} className="text-xs cursor-pointer">{g.label}</label>
                </div>
              ))}
            </div>

            <Button className="w-full gap-2" onClick={handleStart} disabled={running}>
              <Play className="h-4 w-4" /> {running ? "Simulando..." : "Iniciar Simulação"}
            </Button>
          </CardContent>
        </Card>

        {/* Clinical Panel */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Painel Clínico e Monitoramento</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <Droplets className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">SpO2</p>
                <p className={`text-lg font-bold ${simulation.vitals.spo2 < 92 ? "text-destructive" : ""}`}>{Math.round(simulation.vitals.spo2)}%</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Activity className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">FR</p>
                <p className={`text-lg font-bold ${simulation.vitals.fr > 24 ? "text-destructive" : ""}`}>{simulation.vitals.fr} <span className="text-xs">irpm</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Wind className="h-4 w-4 mx-auto text-chart-3 mb-1" />
                <p className="text-xs text-muted-foreground">PFE</p>
                <p className="text-lg font-bold">{simulation.vitals.pfe} <span className="text-xs">L/min</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Thermometer className="h-4 w-4 mx-auto text-chart-5 mb-1" />
                <p className="text-xs text-muted-foreground">Sint. noturnos/sem</p>
                <p className={`text-lg font-bold ${simulation.vitals.sintomasNoturnos > 2 ? "text-destructive" : ""}`}>{simulation.vitals.sintomasNoturnos}</p>
              </div>
            </div>

            {/* Lung Function Chart */}
            <p className="text-sm font-semibold mb-2">Função Pulmonar (VEF1% predito) ao longo de 12 semanas</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayLungData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[30, 105]} label={{ value: "VEF1 (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine y={80} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "≥80% (normal)", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <ReferenceLine y={60} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: "60% (moderada)", fill: "hsl(var(--chart-5))", fontSize: 10 }} />
                <Line type="monotone" dataKey="vef1" name="VEF1 (%)" stroke="hsl(var(--primary))" dot strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Crisis and Side Effects Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Frequência de Crises e Uso de SABA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={displayCrisisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Episódios/sem", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="crises" name="Exacerbações" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="sabaUse" name="Uso de SABA" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Risco de Efeitos Adversos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
      </div>

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
      <SimulatorChallengeMode
        challengeSet={getTratamentoAsmaChallenges()}
        simulatorState={{ drugs: selectedDrugs.map(d => d.name), drugClasses: selectedDrugs.map(d => d.class), doses: drugDoses, ginaStep, device, severity: activeCase.severity, finalVef1: simulation.finalVef1, vitals: simulation.vitals, warnings: simulation.warnings, safePregnancy: selectedDrugs.every(d => d.safePregnancy) }}
        onComplete={() => setChallengeCompleted(true)}
      />

      {/* Virtual Room Results */}
      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
