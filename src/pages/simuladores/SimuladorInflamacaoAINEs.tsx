import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye, Play, Heart, Activity, Droplets, Flame } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getInflamacaoAINEsChallenges } from "@/data/simulatorChallenges";

const SLUG = "inflamacao-aines";

// ─── Drug Database ──────────────────────────────────────────────────────────
interface AntiInflamDrug {
  name: string; class: string; category: string;
  doseMin: number; doseMax: number; doseUnit: string;
  intervalMin: number; intervalMax: number;
  bioavailability: number; tmax: number; halfLife: number;
  potency: number; // anti-inflammatory potency 0-1
  efficacyRefDose?: number; // dose at which clinical anti-inflammatory efficacy is expected
  residualAntiInflamFloor?: number; // persistent biological effect beyond plasma half-life
  cox1Selectivity: number; // 0 = COX-2 selective, 1 = COX-1 selective, 0.5 = non-selective
  pKa: number;
  sideEffects: { gi: number; cv: number; renal: number; bone: number; endocrine: number; immune: number };
  routes: string[];
}

const DRUGS: AntiInflamDrug[] = [
  { name: "Ibuprofeno", class: "AINE não-seletivo", category: "AINE", doseMin: 200, doseMax: 2400, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.9, tmax: 1.5, halfLife: 2, potency: 0.5, cox1Selectivity: 0.5, pKa: 4.4, sideEffects: { gi: 0.35, cv: 0.2, renal: 0.3, bone: 0, endocrine: 0, immune: 0 }, routes: ["VO"] },
  { name: "Naproxeno", class: "AINE não-seletivo", category: "AINE", doseMin: 250, doseMax: 1500, doseUnit: "mg", intervalMin: 12, intervalMax: 12, bioavailability: 0.95, tmax: 2, halfLife: 14, potency: 0.55, cox1Selectivity: 0.6, pKa: 4.2, sideEffects: { gi: 0.4, cv: 0.1, renal: 0.25, bone: 0, endocrine: 0, immune: 0 }, routes: ["VO"] },
  { name: "Diclofenaco", class: "AINE não-seletivo", category: "AINE", doseMin: 50, doseMax: 150, doseUnit: "mg", intervalMin: 8, intervalMax: 12, bioavailability: 0.55, tmax: 1, halfLife: 1.5, potency: 0.6, cox1Selectivity: 0.35, pKa: 4.0, sideEffects: { gi: 0.3, cv: 0.35, renal: 0.3, bone: 0, endocrine: 0, immune: 0 }, routes: ["VO", "Tópico"] },
  { name: "Celecoxibe", class: "AINE COX-2 seletivo", category: "AINE", doseMin: 100, doseMax: 400, doseUnit: "mg", intervalMin: 12, intervalMax: 24, bioavailability: 0.4, tmax: 3, halfLife: 11, potency: 0.55, cox1Selectivity: 0.05, pKa: 11.1, sideEffects: { gi: 0.1, cv: 0.4, renal: 0.25, bone: 0, endocrine: 0, immune: 0 }, routes: ["VO"] },
  { name: "Meloxicam", class: "AINE COX-2 preferencial", category: "AINE", doseMin: 7.5, doseMax: 15, doseUnit: "mg", intervalMin: 24, intervalMax: 24, bioavailability: 0.89, tmax: 5, halfLife: 20, potency: 0.5, cox1Selectivity: 0.15, pKa: 4.1, sideEffects: { gi: 0.15, cv: 0.3, renal: 0.2, bone: 0, endocrine: 0, immune: 0 }, routes: ["VO"] },
  // Corticoides
  { name: "Hidrocortisona", class: "Corticoide", category: "Corticoide", doseMin: 10, doseMax: 300, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.95, tmax: 1, halfLife: 1.5, potency: 0.3, efficacyRefDose: 40, residualAntiInflamFloor: 0.12, cox1Selectivity: 0, pKa: 0, sideEffects: { gi: 0.1, cv: 0.15, renal: 0.1, bone: 0.3, endocrine: 0.5, immune: 0.4 }, routes: ["VO", "EV"] },
  { name: "Prednisona", class: "Corticoide", category: "Corticoide", doseMin: 2.5, doseMax: 60, doseUnit: "mg", intervalMin: 12, intervalMax: 24, bioavailability: 0.8, tmax: 1.5, halfLife: 3.5, potency: 0.6, efficacyRefDose: 12.5, residualAntiInflamFloor: 0.3, cox1Selectivity: 0, pKa: 0, sideEffects: { gi: 0.15, cv: 0.25, renal: 0.1, bone: 0.5, endocrine: 0.6, immune: 0.5 }, routes: ["VO"] },
  { name: "Prednisolona", class: "Corticoide", category: "Corticoide", doseMin: 2.5, doseMax: 60, doseUnit: "mg", intervalMin: 12, intervalMax: 24, bioavailability: 0.9, tmax: 1.5, halfLife: 3.5, potency: 0.6, efficacyRefDose: 12.5, residualAntiInflamFloor: 0.3, cox1Selectivity: 0, pKa: 0, sideEffects: { gi: 0.15, cv: 0.25, renal: 0.1, bone: 0.5, endocrine: 0.6, immune: 0.5 }, routes: ["VO"] },
  { name: "Metilprednisolona", class: "Corticoide", category: "Corticoide", doseMin: 4, doseMax: 48, doseUnit: "mg", intervalMin: 12, intervalMax: 24, bioavailability: 0.85, tmax: 1.5, halfLife: 3, potency: 0.65, efficacyRefDose: 10, residualAntiInflamFloor: 0.32, cox1Selectivity: 0, pKa: 0, sideEffects: { gi: 0.12, cv: 0.2, renal: 0.1, bone: 0.45, endocrine: 0.55, immune: 0.45 }, routes: ["VO", "EV", "Intra-articular"] },
  { name: "Dexametasona", class: "Corticoide", category: "Corticoide", doseMin: 0.5, doseMax: 16, doseUnit: "mg", intervalMin: 24, intervalMax: 24, bioavailability: 0.8, tmax: 1, halfLife: 36, potency: 0.9, efficacyRefDose: 1.5, residualAntiInflamFloor: 0.45, cox1Selectivity: 0, pKa: 0, sideEffects: { gi: 0.15, cv: 0.3, renal: 0.1, bone: 0.7, endocrine: 0.8, immune: 0.65 }, routes: ["VO", "EV"] },
  // Tópico
  { name: "Diclofenaco gel", class: "AINE tópico", category: "Tópico", doseMin: 1, doseMax: 4, doseUnit: "aplicações", intervalMin: 8, intervalMax: 12, bioavailability: 0.06, tmax: 10, halfLife: 1.5, potency: 0.3, cox1Selectivity: 0.35, pKa: 4.0, sideEffects: { gi: 0.02, cv: 0.02, renal: 0.02, bone: 0, endocrine: 0, immune: 0 }, routes: ["Tópico"] },
];

// ─── Case Type ──────────────────────────────────────────────────────────────
interface InflamCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; comorbidities: string[] };
  condition: "osteoartrite" | "artrite-reumatoide" | "desmame-corticoide";
  scenario: string;
  initialEVA: number;
  expectedDrug: string;
  gastroprotection: boolean;
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: InflamCase[] = [
  {
    title: "Caso 1: OA de Joelho — Seleção de AINE",
    difficulty: "Médio",
    patient: { name: "Roberto Torres", age: 60, weight: 85, sex: "M", comorbidities: ["HAS", "Dislipidemia", "Úlcera péptica prévia"] },
    condition: "osteoartrite",
    scenario: "Paciente 60 anos com dor no joelho direito há 6 meses, piora com atividade física e escadas. Crepitação palpável, sem sinais inflamatórios intensos. EVA 6/10. HAS controlada com losartana e HCTZ. História de úlcera péptica há 3 anos (erradicou H. pylori). Paracetamol 1g 8/8h por 4 semanas sem melhora satisfatória. O aluno deve selecionar AINE considerando: risco GI (úlcera prévia → IBP obrigatório ou COX-2 seletivo), risco CV (HAS → naproxeno é o de menor risco CV), pKa ácido acumula na sinóvia inflamada, meia-vida curta pode ser insuficiente.",
    initialEVA: 6,
    expectedDrug: "Naproxeno",
    gastroprotection: true,
    clinicalTip: "Na OA com risco GI, o naproxeno + IBP é uma boa opção por ter o menor risco cardiovascular entre os AINEs e boa eficácia. A seletividade COX-2 (celecoxibe) reduz o risco GI, mas aumenta o risco CV. AINEs com pKa baixo (4.0-4.5) acumulam-se no líquido sinovial inflamado (pH mais ácido), o que é desejável. A meia-vida do naproxeno (14h) permite 12/12h, melhorando a adesão.",
    references: ["Aula 8 – Uso de AINE na Osteoartrite", "McGettigan P, Henry D. PLoS Med 2011", "NICE OA Guidelines 2022"],
  },
  {
    title: "Caso 2: OA em Idosa Polimedicada",
    difficulty: "Difícil",
    patient: { name: "Sônia Lima", age: 67, weight: 72, sex: "F", comorbidities: ["HAS", "Osteopenia", "Depressão", "DRGE"] },
    condition: "osteoartrite",
    scenario: "Mulher 67 anos, dor no joelho esquerdo (OA grau III de Kellgren-Lawrence). Em uso de metoprolol 50mg 12/12h, citalopram 20mg/dia, omeprazol 20mg/dia, cálcio + vitamina D. Paracetamol 4g/dia por 2 meses com melhora parcial insuficiente. O aluno deve considerar: interação AINE + metoprolol (redução do efeito anti-hipertensivo por retenção de Na⁺), risco renal em idosa, critérios de pKa para acúmulo sinovial, opção tópica como alternativa mais segura (diclofenaco gel com baixa absorção sistêmica ~6%).",
    initialEVA: 5,
    expectedDrug: "Diclofenaco gel",
    gastroprotection: false,
    clinicalTip: "Em idosos polimedicados com OA, a via tópica (diclofenaco gel) é primeira linha segundo guidelines OARSI/EULAR: eficácia local comparável com absorção sistêmica de apenas 6%, minimizando riscos GI, CV e renais. Interação AINEs + β-bloqueadores e IECAs/BRA: retenção hidrossalina antagoniza o efeito anti-hipertensivo. O pKa do diclofenaco (4.0) é ideal para acúmulo em tecido inflamado.",
    references: ["Aula 8 – Uso de AINE na Osteoartrite", "OARSI Guidelines 2019", "EULAR OA Recommendations"],
  },
  {
    title: "Caso 3: AR Inicial — Introdução de Corticoide",
    difficulty: "Médio",
    patient: { name: "Tereza Wolff", age: 42, weight: 65, sex: "F", comorbidities: ["Olhos secos (Sjögren secundário)"] },
    condition: "artrite-reumatoide",
    scenario: "Mulher 42 anos com rigidez matinal >1h, edema simétrico em MCF e IFP bilaterais, punhos e MTF. Fator reumatoide e anti-CCP positivos. DAS28 = 5.2 (alta atividade). Iniciou metotrexato 15mg/semana há 2 semanas, mas efeito pleno demora 8-12 semanas. O aluno deve introduzir prednisona como ponte terapêutica ('bridge therapy'), ajustar dose e horário considerando o ciclo circadiano do cortisol — administrar à noite (22h) para que o pico plasmático coincida com o pico da IL-6 matinal, reduzindo a rigidez matinal.",
    initialEVA: 7,
    expectedDrug: "Prednisona",
    gastroprotection: false,
    clinicalTip: "Na AR ativa, a prednisona 7,5-10mg/dia é usada como 'bridge therapy' enquanto o DMARD (metotrexato) atinge efeito pleno (8-12 semanas). A cronoterapia é fundamental: administrar à noite (22h) para que o pico plasmático coincida com o pico matinal de IL-6, reduzindo significativamente a rigidez matinal. Dose ≤7,5mg/dia tem menor risco de EA dose-dependentes. O corticoide bloqueia a fosfolipase A₂ via lipocortina, inibindo toda a cascata do ácido araquidônico (COX + LOX).",
    references: ["Aula 9 – Tratamento da AR com Corticoide", "EULAR RA Guidelines 2022", "Buttgereit F et al. Ann Rheum Dis 2013"],
  },
  {
    title: "Caso 4: EA do Corticoide — Dose vs. Tempo-Dependentes",
    difficulty: "Difícil",
    patient: { name: "Wilson Mendes", age: 55, weight: 90, sex: "M", comorbidities: ["AR há 5 anos", "HAS descompensada", "Insônia", "Ganho ponderal"] },
    condition: "artrite-reumatoide",
    scenario: "Paciente em uso de prednisona 10mg/dia VO há 1 ano para AR. PA 155/95 mmHg (estava controlada), ganho de 8kg, insônia, fácies cushingoide. Glicemia de jejum 112 mg/dL (pré-diabetes). DEXA: T-score -2.1 em coluna lombar (osteopenia). O aluno deve identificar: EA dose-dependentes (HAS por retenção de Na⁺, hiperglicemia, ganho ponderal, insônia, redistribuição gordura) vs EA tempo-dependentes (osteoporose, supressão adrenal, catarata, imunossupressão). Planejar redução para ≤5mg/dia e suplementação de Ca²⁺/Vit D.",
    initialEVA: 4,
    expectedDrug: "Prednisona",
    gastroprotection: false,
    clinicalTip: "Os EA dos corticoides se dividem em DOSE-dependentes (reversíveis com redução: HAS, hiperglicemia, insônia, psicose, miopatia proximal, redistribuição de gordura) e TEMPO-dependentes (instalação lenta, potencialmente irreversíveis: osteoporose, supressão adrenal, catarata, glaucoma, atrofia cutânea). A dose limiar para EA significativos é >7,5mg/dia de prednisona. Suplementação com Ca²⁺ 1200mg + Vit D 800UI/dia é obrigatória em uso crônico.",
    references: ["Aula 10 – Efeitos Adversos dos Corticoides", "Da Silva et al. Ann Rheum Dis 2006", "ACR Glucocorticoid Guidelines"],
  },
  {
    title: "Caso 5: Desmame de Corticoide e Síndrome de Abstinência",
    difficulty: "Difícil",
    patient: { name: "Wilson Mendes (continuação)", age: 55, weight: 90, sex: "M", comorbidities: ["AR há 5 anos", "Prednisona 10mg/dia há 1 ano", "Supressão adrenal provável"] },
    condition: "desmame-corticoide",
    scenario: "Continuação do caso anterior: após controle da AR com metotrexato + leflunomida, decidiu-se desmamar o corticoide. O aluno deve planejar: redução gradual de 1-2,5mg a cada 2-4 semanas até dose fisiológica (5mg prednisona ≈ 20mg cortisol endógeno). Abaixo de 5mg, redução ainda mais lenta (0,5-1mg/mês). Monitorar sinais de insuficiência adrenal: fadiga, hipotensão ortostática, náusea, mialgia. Diferenciar reativação da AR (dor articular + sinais inflamatórios) vs síndrome de abstinência esteroide (mialgia difusa, fadiga, SEM inflamação articular).",
    initialEVA: 3,
    expectedDrug: "Prednisona",
    gastroprotection: false,
    clinicalTip: "O eixo HPA é suprimido após uso de prednisona >5mg/dia por >3 semanas. A recuperação adrenal pode levar 6-12 meses. Desmame: ↓1-2,5mg a cada 2-4 semanas até 5mg/dia, depois ↓0,5-1mg a cada 4 semanas. Síndrome de abstinência (fadiga, mialgia, artralgia SEM inflamação) ≠ reativação da doença (edema articular, rigidez matinal, ↑PCR). Em situações de estresse (cirurgia, infecção), administrar dose de estresse (hidrocortisona 100mg EV).",
    references: ["Aula 10 – Efeitos Adversos dos Corticoides", "Prete A et al. Lancet 2021", "Hopkins RL, Leinung MC. Endocr Pract 2005"],
  },
];

// ─── Simulation Engine ──────────────────────────────────────────────────────
function getEfficacyDoseFraction(drug: AntiInflamDrug, dose: number) {
  const referenceDose = drug.efficacyRefDose ?? drug.doseMax;
  const maxFraction = drug.category === "Corticoide" ? 1.2 : 1.0;
  return Math.min(dose / referenceDose, maxFraction);
}

function getResidualCorticoidActivity(drug: AntiInflamDrug, efficacyDoseFraction: number) {
  if (drug.category !== "Corticoide") return 0;
  return Math.min((drug.residualAntiInflamFloor ?? 0) * Math.min(efficacyDoseFraction, 1.1), 0.5);
}

function computeSimulation(
  drug: AntiInflamDrug, dose: number, interval: number, route: string,
  gastroprotection: boolean, comorbidities: { has: boolean; drc: boolean; ulcer: boolean; osteoporosis: boolean; diabetes: boolean },
  condition: string, initialEVA: number
) {
  const hours = Array.from({ length: 73 }, (_, i) => i);
  const doseFraction = dose / drug.doseMax;
  const efficacyDoseFraction = getEfficacyDoseFraction(drug, dose);
  const isIntraArticular = route === "Intra-articular";

  // Anti-inflammatory effectiveness depends on condition.
  // In RA, NSAIDs are markedly less effective (autoimmune cascade beyond COX) and corticosteroids are amplified.
  const conditionMultiplier = condition === "artrite-reumatoide" && drug.category === "AINE" ? 0.25
    : condition === "artrite-reumatoide" && drug.category === "Corticoide" ? 1.4
    : condition === "desmame-corticoide" ? 0.6
    : 1.0;

  const effectivePotency = drug.potency * efficacyDoseFraction * conditionMultiplier;
  const residualCorticoidActivity = getResidualCorticoidActivity(drug, efficacyDoseFraction);

  // ── Dose-dependent dissociation: analgesic vs anti-inflammatory thresholds ──
  // Low doses achieve analgesia (cpRatio ~0.3 sufficient) but NOT anti-inflammation (needs cpRatio ~0.7)
  const analyticThreshold = 0.3;  // cpRatio above which analgesic effect is near-maximal
  const antiInflamThreshold = 0.7; // cpRatio above which anti-inflammatory effect kicks in fully

  const evaData: { hour: number; eva: number; cp: number; inflammation: number; toxicLimit: number; therapeuticMin: number; therapeuticMax: number }[] = [];

  for (const h of hours) {
    let cp = 0;
    const nDoses = Math.floor(h / interval) + 1;
    for (let d = 0; d < nDoses; d++) {
      const tSinceDose = h - d * interval;
      if (tSinceDose < 0) continue;
      const absorption = drug.bioavailability * (1 - Math.exp(-tSinceDose / drug.tmax));
      const elimination = Math.exp(-0.693 * tSinceDose / drug.halfLife);
      cp += absorption * elimination;
    }
    cp = cp * doseFraction * 100;

    // cpRatio scaled so therapeutic doses (>=30% of doseMax) reach effective range
    // For topical drugs, use local tissue effect (independent of systemic Cp)
    const isTopical = drug.category === "Tópico";
    const cpRatio = isTopical
      ? Math.min(doseFraction * 1.2, 1.2) // local effect proportional to applications
      : Math.min(cp / 40, 1.2);

    // Analgesic effect: kicks in early at lower concentrations
    const analgesicEffect = effectivePotency * Math.min(cpRatio / analyticThreshold, 1);
    const eva = Math.max(0, initialEVA - initialEVA * analgesicEffect * 0.9);

    // Anti-inflammatory effect: requires higher concentrations but still dose-responsive
    let antiInflamEffect: number;
    if (drug.category === "Corticoide") {
      // Corticoids retain genomic anti-inflammatory activity beyond plasma t½, especially relevant in RA bridge therapy.
      const corticoidExposure = Math.max(Math.min(cpRatio / 0.4, 1), residualCorticoidActivity);
      antiInflamEffect = effectivePotency * corticoidExposure;
    } else if (isTopical) {
      // Tópico: efeito local progressivo, sem threshold sistêmico
      antiInflamEffect = effectivePotency * Math.min(cpRatio / 0.4, 1);
    } else {
      // AINEs: progressive dose-dependent effect (no hard threshold that zeroes out lower doses)
      const antiInflamRatio = Math.min(cpRatio / antiInflamThreshold, 1);
      antiInflamEffect = effectivePotency * antiInflamRatio;
    }
    const inflammation = Math.max(0, 100 - antiInflamEffect * 100 * 0.85);

    evaData.push({
      hour: h,
      eva: Math.round(eva * 10) / 10,
      cp: Math.round(cp * 10) / 10,
      inflammation: Math.round(inflammation * 10) / 10,
      toxicLimit: 120,
      therapeuticMin: 30,
      therapeuticMax: 100,
    });
  }

  // Side effects adjusted by comorbidities, gastroprotection, route and corticoid potency × t½ exposure.
  // Intra-articular route drastically reduces all systemic side effects (concentrated local action).
  const routeSystemicFactor = isIntraArticular ? 0.15 : 1.0;
  const doseRatio = doseFraction;
  const se = { ...drug.sideEffects };
  // Corticoid systemic burden scales with potency × halfLife (longer-acting = more HPA suppression).
  // Reference exposure: prednisone (potency 0.6 × t½ 3.5h = 2.1). Dexamethasone (0.9 × 36 = 32.4) ≈ 5x.
  const corticoidExposureMultiplier = drug.category === "Corticoide"
    ? Math.min(0.7 + (drug.potency * drug.halfLife) / 6, 3.0)
    : 1.0;

  let giRisk = se.gi * doseRatio * 100 * routeSystemicFactor;
  if (gastroprotection && drug.category === "AINE") giRisk *= 0.35; // IBP reduces GI risk by ~65%
  if (comorbidities.ulcer) giRisk *= 1.8;
  let cvRisk = se.cv * doseRatio * 100 * routeSystemicFactor;
  if (comorbidities.has) cvRisk *= 1.6;
  let renalRisk = se.renal * doseRatio * 100 * routeSystemicFactor;
  if (comorbidities.drc) renalRisk *= 2.5;
  // Bone risk (osteoporosis) is predominantly TIME-dependent for corticoids: a large baseline
  // floor accumulates with chronic use and only partially scales with dose. This ensures even
  // low doses (e.g. Prednisona 5mg) maintain elevated bone risk, while higher doses add modestly.
  const boneTimeDependentFloor = drug.category === "Corticoide" ? 0.65 : 0;
  const boneDoseFactor = boneTimeDependentFloor + (1 - boneTimeDependentFloor) * doseRatio;
  let boneRisk = se.bone * boneDoseFactor * 100 * corticoidExposureMultiplier * routeSystemicFactor;
  if (comorbidities.osteoporosis) boneRisk *= 1.8;
  let endoRisk = se.endocrine * doseRatio * 100 * corticoidExposureMultiplier * routeSystemicFactor;
  if (comorbidities.diabetes) endoRisk *= 1.5;
  const immuneRisk = se.immune * doseRatio * 100 * corticoidExposureMultiplier * routeSystemicFactor;

  const sideEffectData = [
    { name: "GI", risco: Math.round(Math.min(giRisk, 100)) },
    { name: "CV", risco: Math.round(Math.min(cvRisk, 100)) },
    { name: "Renal", risco: Math.round(Math.min(renalRisk, 100)) },
    { name: "Ósseo", risco: Math.round(Math.min(boneRisk, 100)) },
    { name: "Endócrino", risco: Math.round(Math.min(endoRisk, 100)) },
    { name: "Imune", risco: Math.round(Math.min(immuneRisk, 100)) },
  ];

  // Vital signs — PA more responsive with HAS + AINE
  const lastEVA = evaData[evaData.length - 1]?.eva ?? initialEVA;
  const paAineBoost = drug.category === "AINE" ? doseRatio * 18 : drug.category === "Corticoide" ? doseRatio * 10 : 0;
  const paHasBoost = comorbidities.has ? 15 : 0;
  const vitals = {
    pas: Math.round(120 + paAineBoost + paHasBoost),
    pad: Math.round(80 + (drug.category === "AINE" ? doseRatio * 8 : 0) + (comorbidities.has ? 5 : 0)),
    fc: Math.round(72 + (lastEVA / 10) * 10),
    tfg: Math.round(Math.max(25, 90 - (drug.category === "AINE" ? doseRatio * 35 : 0) - (comorbidities.drc ? 30 : 0))),
    glicemia: Math.round(95 + (drug.category === "Corticoide" ? doseRatio * 45 : 0) + (comorbidities.diabetes ? 25 : 0)),
  };

  return { evaData, sideEffectData, vitals, finalEVA: lastEVA };
}

export default function SimuladorInflamacaoAINEs() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<InflamCase | null>(null);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(200);
  const [interval, setInterval_] = useState(8);
  const [route, setRoute] = useState<string>("VO");
  const [gastroprotection, setGastroprotection] = useState(false);
  const [comorbidities, setComorbidities] = useState({ has: false, drc: false, ulcer: false, osteoporosis: false, diabetes: false });
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  // Determine active case index for case-specific challenges
  const activeCaseIndex = useMemo(() => {
    if (!activeCase) return undefined;
    const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
    return idx >= 0 ? idx : undefined;
  }, [activeCase]);

  const drug = DRUGS[selectedDrugIdx];

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", comorbidities: [] },
        condition: cd.condition ?? "osteoartrite",
        scenario: cd.scenario ?? "",
        initialEVA: cd.initialEVA ?? 6,
        expectedDrug: cd.expectedDrug ?? "",
        gastroprotection: cd.gastroprotection ?? false,
        clinicalTip: cd.clinicalTip ?? "",
        references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  const resetToInitial = useCallback(() => {
    if (!activeCase) return;
    setSelectedDrugIdx(0);
    setDose(DRUGS[0].doseMin);
    setInterval_(DRUGS[0].intervalMin);
    setRoute(DRUGS[0].routes[0]);
    setGastroprotection(false);
    const patientComorbidities = activeCase.patient.comorbidities.map(c => c.toLowerCase());
    setComorbidities({
      has: patientComorbidities.some(c => c.includes("has") || c.includes("hipertens")),
      drc: patientComorbidities.some(c => c.includes("renal") || c.includes("drc")),
      ulcer: patientComorbidities.some(c => c.includes("úlcera") || c.includes("péptica")),
      osteoporosis: patientComorbidities.some(c => c.includes("osteo")),
      diabetes: patientComorbidities.some(c => c.includes("diabet")),
    });
    setRunning(false);
    setAnimStep(0);
  }, [activeCase]);

  useEffect(() => {
    resetToInitial();
  }, [activeCase]);

  useEffect(() => {
    if (selectedDrugIdx >= 0) {
      setDose(Math.max(drug.doseMin, Math.min(dose, drug.doseMax)));
      setInterval_(Math.max(drug.intervalMin, Math.min(interval, drug.intervalMax)));
      // Reset route to first available when drug changes
      if (!drug.routes.includes(route)) setRoute(drug.routes[0]);
    }
  }, [selectedDrugIdx]);

  const simulation = useMemo(() =>
    computeSimulation(drug, dose, interval, route, gastroprotection, comorbidities, activeCase?.condition ?? "osteoartrite", activeCase?.initialEVA ?? 6),
    [drug, dose, interval, route, gastroprotection, comorbidities, activeCase?.condition, activeCase?.initialEVA]
  );

  const displayedEvaData = useMemo(() =>
    running ? simulation.evaData.slice(0, animStep + 1) : simulation.evaData,
    [running, animStep, simulation.evaData]
  );

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.evaData.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 1), 40);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.evaData.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const drugOk = drug.name === activeCase.expectedDrug;
    const gastropOk = activeCase.gastroprotection === gastroprotection;
    const evaReduced = simulation.finalEVA <= activeCase.initialEVA * 0.5;
    const s = (drugOk ? 40 : 0) + (gastropOk ? 30 : 0) + (evaReduced ? 30 : 0);
    setLastScore(s);
    const decisions: SimDecision[] = [
      { label: "AINE selecionado", userChoice: drug.name, idealChoice: activeCase.expectedDrug, correct: drugOk, category: "Seleção" },
      { label: "Gastroproteção", userChoice: gastroprotection ? "Sim" : "Não", idealChoice: activeCase.gastroprotection ? "Sim" : "Não", correct: gastropOk, category: "Segurança", explanation: !gastropOk ? "Avalie fatores de risco GI para decidir gastroproteção" : undefined },
      { label: "Dose", userChoice: `${dose} ${drug.doseUnit}`, idealChoice: `${drug.doseMin}-${drug.doseMax} ${drug.doseUnit}`, correct: true, category: "Posologia" },
      { label: "Redução da EVA", userChoice: `EVA final: ${simulation.finalEVA.toFixed(1)}`, idealChoice: `EVA ≤ ${(activeCase.initialEVA * 0.5).toFixed(1)}`, correct: evaReduced, category: "Desfecho clínico" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions("inflamacao-aines", decisions) });
    return s;
  }, [activeCase, drug, dose, interval, gastroprotection, simulation.finalEVA, submitted, submitResults]);

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
    patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", comorbidities: [] },
    condition: c.condition ?? "osteoartrite", scenario: c.scenario ?? "",
    initialEVA: c.initialEVA ?? 6, expectedDrug: c.expectedDrug ?? "",
    gastroprotection: c.gastroprotection ?? false, clinicalTip: c.clinicalTip ?? "",
    references: c.references ?? [],
  });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Inflamação e Anti-inflamatórios</h1>
            <p className="text-muted-foreground">Selecione AINEs e corticoides considerando seletividade COX, pKa, meia-vida, comorbidades e riscos.</p>
            <AdminPromptViewer toolSlug="sim-inflamacao-aines" toolName="Inflamação e Anti-inflamatórios" toolType="simulator" prompt={getNativePrompt("sim-inflamacao-aines") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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

  const conditionLabel: Record<string, string> = { osteoartrite: "Osteoartrite", "artrite-reumatoide": "Artrite Reumatoide", "desmame-corticoide": "Desmame de Corticoide" };

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{conditionLabel[activeCase.condition] ?? activeCase.condition}</Badge>
      </div>

      {/* Patient Info */}
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg, {activeCase.patient.sex}</p>
        {activeCase.patient.comorbidities.length > 0 && <p className="text-sm"><strong>Comorbidades:</strong> {activeCase.patient.comorbidities.join(", ")}</p>}
        <p className="text-sm"><strong>EVA Inicial:</strong> <span className="font-bold text-destructive">{activeCase.initialEVA}/10</span></p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Fármaco</label>
              <Select value={String(selectedDrugIdx)} onValueChange={v => setSelectedDrugIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRUGS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d.name} ({d.class})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {drug.category === "AINE" ? `COX-1: ${Math.round(drug.cox1Selectivity * 100)}% • pKa: ${drug.pKa} • t½: ${drug.halfLife}h` :
                  drug.category === "Corticoide" ? `Potência: ${drug.potency} • t½: ${drug.halfLife}h` :
                    `Tópico • Absorção sistêmica: ${Math.round(drug.bioavailability * 100)}%`}
                {" • Via: "}{drug.routes.join(", ")}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Dose</label><span className="text-sm font-bold">{dose} {drug.doseUnit}</span></div>
              <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={drug.doseMin} max={drug.doseMax} step={drug.doseMax <= 20 ? 0.5 : drug.doseMax <= 100 ? 2.5 : drug.doseMax <= 500 ? 25 : 50} />
              <p className="text-xs text-muted-foreground">Faixa: {drug.doseMin}–{drug.doseMax} {drug.doseUnit}</p>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Intervalo</label><span className="text-sm font-bold">{interval}h</span></div>
              <Slider value={[interval]} onValueChange={([v]) => setInterval_(v)} min={drug.intervalMin} max={drug.intervalMax} step={1} />
            </div>
            {drug.routes.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Via de Administração</label>
                <Select value={route} onValueChange={setRoute}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {drug.routes.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {route === "Intra-articular" && <p className="text-xs text-chart-3 mt-1">⓵ Infiltração local — riscos sistêmicos drasticamente reduzidos</p>}
              </div>
            )}
            {drug.category === "AINE" && (
              <div className="flex items-center gap-2">
                <Switch checked={gastroprotection} onCheckedChange={setGastroprotection} id="ibp" />
                <label htmlFor="ibp" className="text-sm font-medium cursor-pointer">Gastroproteção (IBP)</label>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Comorbidades do paciente</p>
              {[
                { key: "has" as const, label: "HAS" },
                { key: "drc" as const, label: "DRC" },
                { key: "ulcer" as const, label: "Úlcera péptica" },
                { key: "osteoporosis" as const, label: "Osteoporose" },
                { key: "diabetes" as const, label: "Diabetes" },
              ].map(c => (
                <div key={c.key} className="flex items-center gap-2">
                  <Switch checked={comorbidities[c.key]} onCheckedChange={v => setComorbidities(prev => ({ ...prev, [c.key]: v }))} id={`comorb-${c.key}`} />
                  <label htmlFor={`comorb-${c.key}`} className="text-xs cursor-pointer">{c.label}</label>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}>
              <Play className="h-4 w-4" /> {running ? "Simulando..." : "Iniciar Simulação"}
            </Button>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Sinais Vitais e Monitoramento</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <Activity className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">PA</p>
                <p className={`text-lg font-bold ${simulation.vitals.pas > 140 ? "text-destructive" : ""}`}>{simulation.vitals.pas}/{simulation.vitals.pad}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Heart className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">FC</p>
                <p className="text-lg font-bold">{simulation.vitals.fc} <span className="text-xs">bpm</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Droplets className="h-4 w-4 mx-auto text-chart-4 mb-1" />
                <p className="text-xs text-muted-foreground">TFG</p>
                <p className={`text-lg font-bold ${simulation.vitals.tfg < 60 ? "text-destructive" : ""}`}>{simulation.vitals.tfg} <span className="text-xs">mL/min</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Flame className="h-4 w-4 mx-auto text-chart-5 mb-1" />
                <p className="text-xs text-muted-foreground">Glicemia</p>
                <p className={`text-lg font-bold ${simulation.vitals.glicemia > 126 ? "text-destructive" : ""}`}>{simulation.vitals.glicemia} <span className="text-xs">mg/dL</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <FlaskConical className="h-4 w-4 mx-auto text-chart-3 mb-1" />
                <p className="text-xs text-muted-foreground">COX-1/COX-2</p>
                <p className="text-sm font-bold">{drug.category === "AINE" ? `${Math.round(drug.cox1Selectivity * 100)}/${Math.round((1 - drug.cox1Selectivity) * 100)}` : "N/A"}</p>
              </div>
            </div>

            {/* EVA + Inflammation Chart */}
            <p className="text-sm font-semibold mb-2">Dor (EVA) e Inflamação ao longo de 72h</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayedEvaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" domain={[0, 10]} label={{ value: "EVA", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: "Inflam. (%)", angle: 90, position: "insideRight" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceArea yAxisId="left" y1={7} y2={10} fill="hsl(var(--destructive))" fillOpacity={0.08} />
                <ReferenceArea yAxisId="left" y1={0} y2={4} fill="hsl(var(--chart-3))" fillOpacity={0.06} label={{ value: "Controle adequado", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="eva" name="EVA" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2.5} />
                <Line yAxisId="right" type="monotone" dataKey="inflammation" name="Inflamação (%)" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cp and Side Effects Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Concentração Plasmática ({drug.name})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={displayedEvaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Cp (u.a.)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceArea y1={30} y2={100} fill="hsl(var(--chart-3))" fillOpacity={0.08} label={{ value: "Faixa terapêutica", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <ReferenceLine y={120} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Toxicidade", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <Line type="monotone" dataKey="cp" name="Cp" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Risco de Efeitos Adversos por Sistema</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={simulation.sideEffectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
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
        challengeSet={getInflamacaoAINEsChallenges(activeCaseIndex)}
        simulatorState={{ drug: drug.name, drugClass: drug.class, drugCategory: drug.category, dose, interval, gastroprotection, comorbidities, condition: activeCase.condition, finalEVA: simulation.finalEVA, vitals: simulation.vitals, cox1: drug.cox1Selectivity, pKa: drug.pKa, halfLife: drug.halfLife, sideEffectData: simulation.sideEffectData, inflammation: simulation.evaData[simulation.evaData.length - 1]?.inflammation ?? 100 }}
        onResetForChallenge={resetToInitial}
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
