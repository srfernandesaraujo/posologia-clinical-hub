import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye, Play, Heart, Activity, Droplets, Bug, Thermometer, ShieldAlert } from "lucide-react";
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
import { ShareToolButton } from "@/components/ShareToolButton";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getInfeccoesAntibioticosChallenges } from "@/data/simulatorChallenges";

const SLUG = "infeccoes-antibioticos";

// ─── Drug Database ──────────────────────────────────────────────────────────
interface Antibiotic {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string;
  intervalMin: number; intervalMax: number;
  bioavailability: number; tmax: number; halfLife: number;
  urinaryConcentration: number; // 0-1 (fraction reaching urine)
  intestinalConcentration: number; // 0-1 (fraction reaching intestine)
  spectrum: number; // 0-1 breadth of spectrum
  mic: number; // typical MIC for target pathogen (arbitrary units)
  sideEffects: { gi: number; tendinite: number; nefro: number; disbiose: number; foto: number; qt: number };
  routes: string[];
  safePregnancy: boolean;
  safeDRC: boolean;
  safeElderly: boolean;
}

// MIC values are calibrated in same arbitrary units as Cp (peak Cp at standard dose ~ 30-200 u.a.)
// urinaryConcentration / intestinalConcentration are TISSUE PENETRATION FACTORS (site-vs-plasma) — values >1 mean drug concentrates in that compartment beyond plasma (e.g., nitrofurantoin in urine).
const DRUGS: Antibiotic[] = [
  // ITU drugs
  { name: "Nitrofurantoína", class: "Nitrofurano", doseMin: 50, doseMax: 100, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.9, tmax: 1, halfLife: 0.5, urinaryConcentration: 50, intestinalConcentration: 0.05, spectrum: 0.3, mic: 20, sideEffects: { gi: 0.3, tendinite: 0, nefro: 0.15, disbiose: 0.1, foto: 0.05, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: false, safeElderly: true },
  { name: "Fosfomicina", class: "Fosfomicina", doseMin: 3000, doseMax: 3000, doseUnit: "mg", intervalMin: 24, intervalMax: 24, bioavailability: 0.4, tmax: 2, halfLife: 36, urinaryConcentration: 40, intestinalConcentration: 0.1, spectrum: 0.4, mic: 25, sideEffects: { gi: 0.2, tendinite: 0, nefro: 0.05, disbiose: 0.08, foto: 0, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
  { name: "SMX-TMP", class: "Sulfonamida", doseMin: 400, doseMax: 800, doseUnit: "mg", intervalMin: 12, intervalMax: 12, bioavailability: 0.85, tmax: 2, halfLife: 10, urinaryConcentration: 8, intestinalConcentration: 0.4, spectrum: 0.5, mic: 15, sideEffects: { gi: 0.2, tendinite: 0, nefro: 0.2, disbiose: 0.15, foto: 0.15, qt: 0.05 }, routes: ["VO"], safePregnancy: false, safeDRC: false, safeElderly: false },
  { name: "Ciprofloxacino", class: "Fluoroquinolona", doseMin: 250, doseMax: 750, doseUnit: "mg", intervalMin: 12, intervalMax: 12, bioavailability: 0.7, tmax: 1.5, halfLife: 4, urinaryConcentration: 6, intestinalConcentration: 1.5, spectrum: 0.7, mic: 8, sideEffects: { gi: 0.25, tendinite: 0.3, nefro: 0.1, disbiose: 0.35, foto: 0.2, qt: 0.15 }, routes: ["VO", "EV"], safePregnancy: false, safeDRC: true, safeElderly: false },
  { name: "Norfloxacino", class: "Fluoroquinolona", doseMin: 400, doseMax: 400, doseUnit: "mg", intervalMin: 12, intervalMax: 12, bioavailability: 0.4, tmax: 1.5, halfLife: 4, urinaryConcentration: 8, intestinalConcentration: 0.6, spectrum: 0.5, mic: 10, sideEffects: { gi: 0.2, tendinite: 0.25, nefro: 0.1, disbiose: 0.3, foto: 0.15, qt: 0.1 }, routes: ["VO"], safePregnancy: false, safeDRC: true, safeElderly: false },
  { name: "Amoxicilina", class: "Betalactâmico", doseMin: 250, doseMax: 1000, doseUnit: "mg", intervalMin: 8, intervalMax: 8, bioavailability: 0.9, tmax: 1.5, halfLife: 1.3, urinaryConcentration: 5, intestinalConcentration: 0.4, spectrum: 0.4, mic: 12, sideEffects: { gi: 0.15, tendinite: 0, nefro: 0.05, disbiose: 0.15, foto: 0, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
  { name: "Cefalexina", class: "Cefalosporina 1ª", doseMin: 250, doseMax: 1000, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.95, tmax: 1, halfLife: 1, urinaryConcentration: 12, intestinalConcentration: 0.2, spectrum: 0.45, mic: 14, sideEffects: { gi: 0.1, tendinite: 0, nefro: 0.05, disbiose: 0.1, foto: 0, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
  { name: "Ceftriaxona", class: "Cefalosporina 3ª", doseMin: 1000, doseMax: 2000, doseUnit: "mg", intervalMin: 24, intervalMax: 24, bioavailability: 1.0, tmax: 0.5, halfLife: 8, urinaryConcentration: 6, intestinalConcentration: 1.2, spectrum: 0.75, mic: 6, sideEffects: { gi: 0.15, tendinite: 0, nefro: 0.1, disbiose: 0.3, foto: 0, qt: 0 }, routes: ["EV", "IM"], safePregnancy: true, safeDRC: true, safeElderly: true },
  // Diarrhea drugs
  { name: "Azitromicina", class: "Macrolídeo", doseMin: 250, doseMax: 500, doseUnit: "mg", intervalMin: 24, intervalMax: 24, bioavailability: 0.4, tmax: 2, halfLife: 68, urinaryConcentration: 0.5, intestinalConcentration: 8, spectrum: 0.55, mic: 6, sideEffects: { gi: 0.2, tendinite: 0, nefro: 0.05, disbiose: 0.15, foto: 0, qt: 0.2 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
  { name: "Metronidazol", class: "Nitroimidazol", doseMin: 250, doseMax: 500, doseUnit: "mg", intervalMin: 8, intervalMax: 8, bioavailability: 0.95, tmax: 1, halfLife: 8, urinaryConcentration: 0.8, intestinalConcentration: 5, spectrum: 0.35, mic: 10, sideEffects: { gi: 0.3, tendinite: 0, nefro: 0.05, disbiose: 0.05, foto: 0, qt: 0.05 }, routes: ["VO", "EV"], safePregnancy: false, safeDRC: true, safeElderly: true },
  { name: "Doxiciclina", class: "Tetraciclina", doseMin: 100, doseMax: 200, doseUnit: "mg", intervalMin: 12, intervalMax: 24, bioavailability: 0.95, tmax: 2, halfLife: 18, urinaryConcentration: 1.5, intestinalConcentration: 3, spectrum: 0.55, mic: 8, sideEffects: { gi: 0.25, tendinite: 0, nefro: 0.05, disbiose: 0.2, foto: 0.35, qt: 0 }, routes: ["VO"], safePregnancy: false, safeDRC: true, safeElderly: true },
  { name: "Vancomicina oral", class: "Glicopeptídeo", doseMin: 125, doseMax: 500, doseUnit: "mg", intervalMin: 6, intervalMax: 6, bioavailability: 0.0, tmax: 0, halfLife: 0, urinaryConcentration: 0.0, intestinalConcentration: 50, spectrum: 0.6, mic: 8, sideEffects: { gi: 0.15, tendinite: 0, nefro: 0.0, disbiose: 0.05, foto: 0, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
  { name: "SRO (Soro de Reidratação)", class: "Reidratação", doseMin: 200, doseMax: 1000, doseUnit: "mL", intervalMin: 1, intervalMax: 4, bioavailability: 1.0, tmax: 0.5, halfLife: 0, urinaryConcentration: 0, intestinalConcentration: 0, spectrum: 0, mic: 999, sideEffects: { gi: 0, tendinite: 0, nefro: 0, disbiose: 0, foto: 0, qt: 0 }, routes: ["VO"], safePregnancy: true, safeDRC: true, safeElderly: true },
];

// ─── Case Type ──────────────────────────────────────────────────────────────
interface InfectionCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  infectionType: "itu-nao-complicada" | "itu-complicada" | "pielonefrite" | "diarreia-aquosa" | "disenteria" | "c-difficile";
  scenario: string;
  labResults: { nitrito?: boolean; esterase?: boolean; leucocitos?: string; urocultura?: string; coprocultura?: string; leucocitosFecais?: boolean; toxinaCD?: boolean };
  initialBacterialLoad: number; // log10 UFC/mL
  expectedDrug: string;
  expectedHydration: boolean;
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: InfectionCase[] = [
  {
    title: "Caso 1: Cistite em Mulher Jovem — Seleção de Antibiótico",
    difficulty: "Médio",
    patient: { name: "Vanessa Queiroz", age: 20, weight: 58, sex: "F", specialGroup: [] },
    infectionType: "itu-nao-complicada",
    scenario: "Mulher 20 anos, disúria, polaciúria e dor suprapúbica há 2 dias, sem febre, sem dor lombar. Vida sexual ativa, sem comorbidades. Urinálise: nitrito positivo, esterase leucocitária positiva, leucócitos 10-15/campo, bastonetes gram-negativos. Sem necessidade de urocultura na ITU não-complicada. O aluno deve selecionar entre nitrofurantoína 100mg 6/6h por 5 dias, fosfomicina 3g dose única, ou SMX-TMP (se resistência local <20%). Fluoroquinolonas devem ser EVITADAS na ITU não-complicada (reservar para infecções complicadas).",
    labResults: { nitrito: true, esterase: true, leucocitos: "10-15/campo", urocultura: "Não solicitada" },
    initialBacterialLoad: 5.5,
    expectedDrug: "Nitrofurantoína",
    expectedHydration: false,
    clinicalTip: "Na ITU não-complicada, a escolha de 1ª linha inclui nitrofurantoína (100mg 6/6h × 5d), fosfomicina (3g dose única) ou SMX-TMP (se resistência local <20%). Fluoroquinolonas NÃO são 1ª linha (risco de tendinopatia, disbiose, seleção de resistência, prolongamento de QT). Nitrofurantoína atinge concentrações urinárias altas (>100× a CIM) mas não trata pielonefrite por não atingir parênquima renal. O diagnóstico é clínico — urocultura não é necessária em cistite não-complicada.",
    references: ["Aula 11 – Conhecendo a ITU", "Aula 12 – Tratando a ITU", "IDSA Guidelines 2011"],
  },
  {
    title: "Caso 2: Pielonefrite com E. coli ESBL — Escalonamento",
    difficulty: "Difícil",
    patient: { name: "Marcos Rodrigues", age: 35, weight: 80, sex: "M", specialGroup: [] },
    infectionType: "pielonefrite",
    scenario: "Homem 35 anos, febre 38.8°C, calafrios, dor lombar esquerda, náusea e vômito há 2 dias. Giordano positivo à esquerda. Hemograma: leucocitose 15.000 com desvio. Urinálise: piúria intensa, nitrito positivo. Urocultura pendente — iniciou ciprofloxacino 500mg VO 12/12h. Após 48h, urocultura: E. coli ESBL, resistente a ciprofloxacino e SMX-TMP, sensível a ceftriaxona, ertapenem e amicacina. Paciente persistindo febril. O aluno deve escalonar para ceftriaxona 1g EV ou ertapenem (ESBL), interpretar antibiograma e planejar step-down para VO quando afebril por 48h.",
    labResults: { nitrito: true, esterase: true, leucocitos: "Intensa piúria", urocultura: "E. coli ESBL (R: cipro, SMX-TMP; S: ceftriaxona, ertapenem, amicacina)" },
    initialBacterialLoad: 7,
    expectedDrug: "Ceftriaxona",
    expectedHydration: false,
    clinicalTip: "Na pielonefrite com E. coli ESBL, o escalonamento para carbapenêmico (ertapenem) ou cefalosporina de 3ª geração (se sensível no antibiograma) é necessário. A ceftriaxona é opção se CIM favorável. O step-down para VO é possível após 48-72h afebril, guiado pelo antibiograma. A fosfomicina EV pode ser alternativa em alguns cenários. ESBL hidrolisa penicilinas e cefalosporinas de 1ª/2ª geração, mas geralmente poupa carbapenêmicos.",
    references: ["Aula 12 – Tratando a ITU", "Aula 13 – ITU em Grupos Especiais", "Gupta K et al. CID 2011"],
  },
  {
    title: "Caso 3: ITU na Gestação — Antibióticos Seguros",
    difficulty: "Médio",
    patient: { name: "Ana Luísa", age: 28, weight: 68, sex: "F", specialGroup: ["Gestante (24 sem)"] },
    infectionType: "itu-nao-complicada",
    scenario: "Gestante 28 anos, 24 semanas de gestação, assintomática. Urocultura de rotina do pré-natal: E. coli >100.000 UFC/mL. Bacteriúria assintomática. Na gestação, bacteriúria assintomática DEVE ser tratada (risco de pielonefrite e parto prematuro). O aluno deve selecionar antibiótico seguro na gestação: cefalexina 500mg 6/6h × 7d, amoxicilina 500mg 8/8h × 7d, ou nitrofurantoína (segura até 36 semanas). Contraindica: SMX-TMP (1º trimestre: defeitos do tubo neural; 3º trimestre: kernicterus), fluoroquinolonas (artropatia fetal), tetraciclinas (hipoplasia do esmalte dentário).",
    labResults: { nitrito: true, esterase: false, leucocitos: "Normal", urocultura: "E. coli >100.000 UFC/mL (sensível a cefalexina, amoxicilina, nitrofurantoína)" },
    initialBacterialLoad: 5,
    expectedDrug: "Cefalexina",
    expectedHydration: false,
    clinicalTip: "Na gestação, a bacteriúria assintomática deve SEMPRE ser tratada (diferente da população geral) devido ao risco de 20-40% de progressão para pielonefrite e associação com parto prematuro. Antibióticos seguros: betalactâmicos (amoxicilina, cefalexina), nitrofurantoína (evitar após 36 sem — risco de anemia hemolítica neonatal). CONTRAINDICADOS: fluoroquinolonas (lesão cartilagem fetal), SMX-TMP (1º tri: anti-folato teratogênico; 3º tri: competição com bilirrubina → kernicterus), tetraciclinas (deposição dentária).",
    references: ["Aula 13 – ITU em Grupos Especiais", "Smaill FM, Vazquez JC. Cochrane 2019", "NICE Antenatal Care Guidelines"],
  },
  {
    title: "Caso 4: Diarreia Aquosa vs Disenteria — Algoritmo de Conduta",
    difficulty: "Médio",
    patient: { name: "João Santos", age: 45, weight: 78, sex: "M", specialGroup: [] },
    infectionType: "diarreia-aquosa",
    scenario: "Homem 45 anos, diarreia aquosa há 3 dias (6-8 episódios/dia), sem sangue, sem febre, sem muco. Viajou recentemente. Desidratação leve (mucosas secas, turgor diminuído). O aluno deve diferenciar diarreia aquosa (viral/toxigênica — não requer antibiótico) de disenteria (invasiva — requer antibiótico). Conduta inicial: SRO + medidas não-farmacológicas (dieta BRAT, evitar laticínios e cafeína). EVOLUÇÃO: após 2 dias, retorna com fezes sanguinolentas, febre 38.5°C e tenesmo → agora é disenteria! Aluno deve selecionar ciprofloxacino 500mg 12/12h × 3d ou azitromicina 500mg/dia × 3d.",
    labResults: { coprocultura: "Pendente", leucocitosFecais: false },
    initialBacterialLoad: 4,
    expectedDrug: "SRO (Soro de Reidratação)",
    expectedHydration: true,
    clinicalTip: "O algoritmo de decisão para diarreia infecciosa: 1) Diarreia aquosa SEM sangue/febre → provavelmente viral ou toxigênica (ETEC, cólera) → NÃO usar antibiótico, apenas SRO + suporte. 2) Disenteria (sangue, muco, febre, tenesmo) → provável invasão bacteriana (Shigella, EIEC, Campylobacter, Salmonella) → antibiótico indicado (ciprofloxacino ou azitromicina). A hidratação com SRO é SEMPRE a base do tratamento. Loperamida é contraindicada na disenteria (risco de megacólon tóxico). Zinco é recomendado em crianças <5 anos.",
    references: ["Aula 14 – Entendendo a Diarreia Infecciosa", "Aula 15 – Disenteria vs Diarreia", "WHO ORS Guidelines 2005"],
  },
  {
    title: "Caso 5: Diarreia por C. difficile — Complicações",
    difficulty: "Difícil",
    patient: { name: "Fernando Torres", age: 72, weight: 70, sex: "M", specialGroup: ["Idoso", "Internado"] },
    infectionType: "c-difficile",
    scenario: "Homem 72 anos, internado há 10 dias por pneumonia (tratado com clindamicina). Desenvolveu diarreia aquosa profusa (10-12 episódios/dia) há 3 dias, dor abdominal difusa, febre 38.2°C. Leucocitose 22.000, PCR elevada. Toxina A/B de C. difficile positiva no ELISA. Desidratação moderada: taquicardia (FC 105), hipotensão ortostática, Na⁺ 132 mEq/L. O aluno deve: 1) Suspender clindamicina (antibiótico causador); 2) Corrigir desidratação (SRO/EV); 3) Iniciar metronidazol 500mg VO 8/8h (episódio leve-moderado) ou vancomicina oral 125mg 6/6h (episódio grave ou 1ª recorrência). Monitorar complicações: megacólon tóxico, distúrbio eletrolítico, choque séptico.",
    labResults: { toxinaCD: true, leucocitosFecais: true, coprocultura: "C. difficile toxigênico" },
    initialBacterialLoad: 6,
    expectedDrug: "Vancomicina oral",
    expectedHydration: true,
    clinicalTip: "C. difficile: principal causa de diarreia nosocomial associada a antibióticos. Fatores de risco: antibióticos de amplo espectro (clindamicina, fluoroquinolonas, cefalosporinas), idade >65 anos, internação prolongada, IBPs. Tratamento: SUSPENDER o antibiótico causador + metronidazol 500mg VO 8/8h × 10-14d (episódio inicial leve-moderado) OU vancomicina oral 125mg 6/6h × 10d (grave: leucocitose >15.000, creatinina >1.5×, febre). Vancomicina oral NÃO é absorvida → age localmente no intestino. Fidaxomicina é alternativa. Recorrências: vancomicina em esquema pulsado. Complicações: megacólon tóxico (distensão >6cm, íleo paralítico → colectomia de emergência).",
    references: ["Aula 16 – Complicações da Diarreia", "McDonald LC et al. CID 2018 (IDSA/SHEA Guidelines)", "Leffler DA, Lamont JT. NEJM 2015"],
  },
];

// ─── Simulation Engine ──────────────────────────────────────────────────────
function computeSimulation(
  drug: Antibiotic, dose: number, interval: number,
  hydration: boolean, specialGroups: { gestante: boolean; idoso: boolean; drc: boolean; crianca: boolean; cateter: boolean; imunossuprimido: boolean },
  infectionType: string, initialBacterialLoad: number
) {
  const hours = Array.from({ length: 337 }, (_, i) => i * 0.5); // 0-168h (7 days) in 0.5h steps
  // Dose multiplier: how many "standard doses" the user prescribed (1.0 = clinical minimum / standard)
  const doseMultiplier = dose / drug.doseMin;
  const isSRO = drug.name.startsWith("SRO");
  const isVancoOral = drug.bioavailability === 0 && drug.intestinalConcentration > 0;
  const isFosfomicina = drug.name.includes("Fosfomicina");

  // Determine if drug targets urine or intestine
  const isUTI = ["itu-nao-complicada", "itu-complicada", "pielonefrite"].includes(infectionType);

  // Fosfomicina: single dose
  const isSingleDose = isFosfomicina;

  // DRC penalty for urinary concentration (drug doesn't reach urine adequately)
  let effectiveUrinaryFactor = drug.urinaryConcentration;
  if (specialGroups.drc && !drug.safeDRC) {
    effectiveUrinaryFactor *= 0.15;
  }

  const tissueFactor = isUTI ? effectiveUrinaryFactor : drug.intestinalConcentration;

  const data: { hour: number; bacterialLoad: number; cpPlasma: number; cpSite: number; micLine: number; temperature: number; leucocitos: number; pcr: number }[] = [];

  let currentBacterialLoad = initialBacterialLoad;
  const bacterialGrowthRate = 0.18; // log10/h regrowth when Cp < MIC
  const maxBacterialLoad = initialBacterialLoad + 0.5;

  // Cp scale: peak plasma at standard dose ≈ 30 u.a. (chosen so MICs 6-25 are reachable but not trivially)
  const PLASMA_SCALE = 30;

  for (let idx = 0; idx < hours.length; idx++) {
    const h = hours[idx];

    // Plasma concentration (superposition of doses)
    let cpPlasma = 0;
    if (!isSRO && drug.halfLife > 0) {
      const maxDoses = isSingleDose ? 1 : Math.floor(h / interval) + 1;
      for (let d = 0; d < maxDoses; d++) {
        const tSinceDose = h - d * interval;
        if (tSinceDose < 0) continue;
        const absorption = drug.bioavailability * (1 - Math.exp(-tSinceDose / Math.max(drug.tmax, 0.1)));
        const elimination = Math.exp(-0.693 * tSinceDose / drug.halfLife);
        cpPlasma += absorption * elimination;
      }
      cpPlasma = cpPlasma * doseMultiplier * PLASMA_SCALE;
    }

    // Site (tissue) concentration
    let cpSite: number;
    if (isVancoOral) {
      // Vancomycin oral: 0% absorption — concentrate in gut lumen
      const maxDoses = Math.floor(h / interval) + 1;
      let intestinalCp = 0;
      const gutHalfLife = 8;
      for (let d = 0; d < maxDoses; d++) {
        const tSinceDose = h - d * interval;
        if (tSinceDose < 0) continue;
        const absorption = 1 - Math.exp(-tSinceDose / 0.5);
        const elimination = Math.exp(-0.693 * tSinceDose / gutHalfLife);
        intestinalCp += absorption * elimination;
      }
      cpPlasma = 0;
      cpSite = intestinalCp * doseMultiplier * (drug.intestinalConcentration * 4);
    } else if (isSRO) {
      cpPlasma = 0;
      cpSite = 0;
    } else if (isFosfomicina && isUTI) {
      // Fosfomicina: long urinary terminal half-life (~36h) gives sustained urinary concentration after single 3g dose
      const urinaryHalfLife = 36;
      const tSinceDose = h;
      const absorption = drug.bioavailability * (1 - Math.exp(-tSinceDose / drug.tmax));
      const slowElim = Math.exp(-0.693 * tSinceDose / urinaryHalfLife);
      cpSite = absorption * slowElim * doseMultiplier * effectiveUrinaryFactor * 4;
    } else {
      cpSite = cpPlasma * tissueFactor / 4; // tissueFactor scaled (1 ≈ same as plasma)
    }

    // Bacterial dynamics: kill if cpSite > MIC, else regrow
    if (idx > 0) {
      const dt = 0.5;
      if (isSRO) {
        currentBacterialLoad = Math.min(maxBacterialLoad, currentBacterialLoad + bacterialGrowthRate * dt * 0.2);
      } else if (cpSite > drug.mic) {
        const ratio = cpSite / drug.mic;
        // Hill-like kill: more aggressive when well above MIC
        const killFactor = Math.min(0.04 * ratio * (0.4 + drug.spectrum), 0.6);
        currentBacterialLoad = Math.max(0, currentBacterialLoad - killFactor * dt);
      } else if (currentBacterialLoad > 0.5) {
        currentBacterialLoad = Math.min(maxBacterialLoad, currentBacterialLoad + bacterialGrowthRate * dt);
      }
    }

    const infectionSeverity = currentBacterialLoad / Math.max(initialBacterialLoad, 0.1);
    const hydrationBonus = hydration ? 0.15 : 0;
    const temperature = 36.5 + infectionSeverity * 2.5 - hydrationBonus;
    const leucocitos = 5000 + infectionSeverity * 15000;
    const pcr = 5 + infectionSeverity * 150;

    data.push({
      hour: Math.round(h * 10) / 10,
      bacterialLoad: Math.round(currentBacterialLoad * 100) / 100,
      cpPlasma: Math.round(cpPlasma * 10) / 10,
      cpSite: Math.round(cpSite * 10) / 10,
      micLine: drug.mic,
      temperature: Math.round(temperature * 10) / 10,
      leucocitos: Math.round(leucocitos),
      pcr: Math.round(pcr * 10) / 10,
    });
  }

  // Side effects: use clinical doseRatio (1.0 at standard dose), capped at 1.5 to allow some dose-dependence
  const clinicalRatio = Math.min(1.5, dose / drug.doseMin);
  const se = drug.sideEffects;
  let giRisk = se.gi * clinicalRatio * 100;
  let tendiniteRisk = se.tendinite * clinicalRatio * 100;
  if (specialGroups.idoso) tendiniteRisk *= 2.0;
  let nefroRisk = se.nefro * clinicalRatio * 100;
  if (specialGroups.drc) nefroRisk *= 2.5;
  let disbioseRisk = se.disbiose * clinicalRatio * 100;
  if (specialGroups.imunossuprimido) disbioseRisk *= 1.8;
  const fotoRisk = se.foto * clinicalRatio * 100;
  const qtRisk = se.qt * clinicalRatio * 100;

  const sideEffectData: { name: string; risco: number }[] = [
    { name: "GI", risco: Math.round(Math.min(giRisk, 100)) },
    { name: "Tendinite", risco: Math.round(Math.min(tendiniteRisk, 100)) },
    { name: "Nefro", risco: Math.round(Math.min(nefroRisk, 100)) },
    { name: "Disbiose", risco: Math.round(Math.min(disbioseRisk, 100)) },
    { name: "Fotosens.", risco: Math.round(Math.min(fotoRisk, 100)) },
    { name: "QT", risco: Math.round(Math.min(qtRisk, 100)) },
  ];

  if (specialGroups.gestante && !drug.safePregnancy) {
    sideEffectData.push({ name: "Teratogen.", risco: Math.round(Math.min(85 + clinicalRatio * 10, 100)) });
  }

  const warnings: string[] = [];
  if (specialGroups.gestante && !drug.safePregnancy) warnings.push(`⚠️ ${drug.name} é CONTRAINDICADO na gestação!`);
  if (specialGroups.drc && !drug.safeDRC) warnings.push(`⚠️ ${drug.name} requer ajuste/evitar na DRC!`);
  if (specialGroups.idoso && !drug.safeElderly) warnings.push(`⚠️ ${drug.name} tem riscos aumentados em idosos!`);
  if (drug.class === "Fluoroquinolona" && infectionType === "itu-nao-complicada") warnings.push("⚠️ Fluoroquinolonas NÃO são 1ª linha na ITU não-complicada!");

  const lastData = data[data.length - 1];
  const vitals = {
    temp: lastData?.temperature ?? 37,
    fc: Math.round(72 + (lastData?.temperature ?? 37 - 37) * 15 + (hydration ? 0 : 10)),
    leucocitos: lastData?.leucocitos ?? 8000,
    pcr: lastData?.pcr ?? 5,
  };

  return { data, sideEffectData, vitals, warnings, finalBacterialLoad: lastData?.bacterialLoad ?? initialBacterialLoad };
}

export default function SimuladorInfeccoesAntibioticos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<InfectionCase | null>(null);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(100);
  const [interval, setInterval_] = useState(8);
  const [hydration, setHydration] = useState(false);
  const [specialGroups, setSpecialGroups] = useState({ gestante: false, idoso: false, drc: false, crianca: false, cateter: false, imunossuprimido: false });
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const drug = DRUGS[selectedDrugIdx];

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        infectionType: cd.infectionType ?? "itu-nao-complicada",
        scenario: cd.scenario ?? "",
        labResults: cd.labResults ?? {},
        initialBacterialLoad: cd.initialBacterialLoad ?? 5,
        expectedDrug: cd.expectedDrug ?? "",
        expectedHydration: cd.expectedHydration ?? false,
        clinicalTip: cd.clinicalTip ?? "",
        references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedDrugIdx(0);
      setDose(DRUGS[0].doseMin);
      setInterval_(DRUGS[0].intervalMin);
      setHydration(false);
      const groups = activeCase.patient.specialGroup.map(g => g.toLowerCase());
      setSpecialGroups({
        gestante: groups.some(g => g.includes("gestante") || g.includes("gravidez")),
        idoso: groups.some(g => g.includes("idoso")) || activeCase.patient.age >= 65,
        drc: groups.some(g => g.includes("renal") || g.includes("drc")),
        crianca: groups.some(g => g.includes("criança") || g.includes("pediatr")) || activeCase.patient.age < 12,
        cateter: groups.some(g => g.includes("cateter")),
        imunossuprimido: groups.some(g => g.includes("imuno")),
      });
      setRunning(false);
      setAnimStep(0);
    }
  }, [activeCase]);

  useEffect(() => {
    if (selectedDrugIdx >= 0) {
      setDose(Math.max(drug.doseMin, Math.min(dose, drug.doseMax)));
      setInterval_(Math.max(drug.intervalMin, Math.min(interval, drug.intervalMax)));
    }
  }, [selectedDrugIdx]);

  const simulation = useMemo(() =>
    computeSimulation(drug, dose, interval, hydration, specialGroups, activeCase?.infectionType ?? "itu-nao-complicada", activeCase?.initialBacterialLoad ?? 5),
    [drug, dose, interval, hydration, specialGroups, activeCase?.infectionType, activeCase?.initialBacterialLoad]
  );

  // Subsample data for display (every 4th point = ~2h intervals)
  const displayData = useMemo(() => {
    const src = running ? simulation.data.slice(0, animStep + 1) : simulation.data;
    return src.filter((_, i) => i % 4 === 0 || i === src.length - 1);
  }, [running, animStep, simulation.data]);

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.data.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 2), 25);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.data.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const drugOk = drug.name === activeCase.expectedDrug;
    const hydOk = activeCase.expectedHydration === hydration;
    const loadReduced = simulation.finalBacterialLoad < activeCase.initialBacterialLoad * 0.5;
    const noContraindication = simulation.warnings.length === 0;
    const s = (drugOk ? 35 : 0) + (hydOk ? 20 : 0) + (loadReduced ? 25 : 0) + (noContraindication ? 20 : 0);
    setLastScore(s);
    const decisions: SimDecision[] = [
      { label: "Antibiótico selecionado", userChoice: drug.name, idealChoice: activeCase.expectedDrug, correct: drugOk, category: "Seleção" },
      { label: "Dose", userChoice: `${dose} ${drug.doseUnit}`, idealChoice: `${drug.doseMin}-${drug.doseMax} ${drug.doseUnit}`, correct: true, category: "Posologia" },
      { label: "Hidratação", userChoice: `${hydration} mL/dia`, idealChoice: `${activeCase.expectedHydration} mL/dia`, correct: hydOk, category: "Suporte clínico" },
      { label: "Redução da carga bacteriana", userChoice: `${simulation.finalBacterialLoad.toFixed(0)} UFC`, idealChoice: `< ${(activeCase.initialBacterialLoad * 0.5).toFixed(0)} UFC`, correct: loadReduced, category: "Desfecho clínico" },
      { label: "Contraindicações", userChoice: simulation.warnings.length === 0 ? "Nenhuma" : simulation.warnings.join("; "), idealChoice: "Nenhuma", correct: noContraindication, category: "Segurança" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions("infeccoes-antibioticos", decisions) });
    return s;
  }, [activeCase, drug, dose, interval, hydration, simulation.finalBacterialLoad, simulation.warnings, submitted, submitResults]);

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
    patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
    infectionType: c.infectionType ?? "itu-nao-complicada", scenario: c.scenario ?? "",
    labResults: c.labResults ?? {},
    initialBacterialLoad: c.initialBacterialLoad ?? 5, expectedDrug: c.expectedDrug ?? "",
    expectedHydration: c.expectedHydration ?? false, clinicalTip: c.clinicalTip ?? "",
    references: c.references ?? [],
  });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Infecções e Antibioticoterapia</h1>
            <p className="text-muted-foreground">Selecione antibióticos considerando tipo de infecção, espectro, resistência, grupos especiais e efeitos adversos.</p>
            <ShareToolButton toolSlug="infeccoes-antibioticos" toolName="Infecções e Antibioticoterapia" /><AdminPromptViewer toolSlug="sim-infeccoes-antibioticos" toolName="Infecções e Antibioticoterapia" toolType="simulator" prompt={getNativePrompt("sim-infeccoes-antibioticos") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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

  const typeLabels: Record<string, string> = {
    "itu-nao-complicada": "ITU Não-Complicada",
    "itu-complicada": "ITU Complicada",
    "pielonefrite": "Pielonefrite",
    "diarreia-aquosa": "Diarreia Aquosa",
    "disenteria": "Disenteria",
    "c-difficile": "C. difficile",
  };

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{typeLabels[activeCase.infectionType] ?? activeCase.infectionType}</Badge>
      </div>

      {/* Patient Info + Lab Results */}
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm"><strong>Carga bacteriana inicial:</strong> <span className="font-bold text-destructive">10^{activeCase.initialBacterialLoad} UFC/mL</span></p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        {Object.keys(activeCase.labResults).length > 0 && (
          <div className="mt-2 rounded-lg bg-muted/50 p-3 border border-border">
            <p className="text-xs font-semibold mb-1">🔬 Resultados Laboratoriais:</p>
            {activeCase.labResults.nitrito !== undefined && <p className="text-xs">Nitrito: {activeCase.labResults.nitrito ? "✅ Positivo" : "❌ Negativo"}</p>}
            {activeCase.labResults.esterase !== undefined && <p className="text-xs">Esterase leucocitária: {activeCase.labResults.esterase ? "✅ Positiva" : "❌ Negativa"}</p>}
            {activeCase.labResults.leucocitos && <p className="text-xs">Leucócitos: {activeCase.labResults.leucocitos}</p>}
            {activeCase.labResults.urocultura && <p className="text-xs">Urocultura: {activeCase.labResults.urocultura}</p>}
            {activeCase.labResults.coprocultura && <p className="text-xs">Coprocultura: {activeCase.labResults.coprocultura}</p>}
            {activeCase.labResults.leucocitosFecais !== undefined && <p className="text-xs">Leucócitos fecais: {activeCase.labResults.leucocitosFecais ? "✅ Positivo" : "❌ Negativo"}</p>}
            {activeCase.labResults.toxinaCD !== undefined && <p className="text-xs">Toxina C. difficile: {activeCase.labResults.toxinaCD ? "✅ Positiva" : "❌ Negativa"}</p>}
          </div>
        )}
      </CardContent></Card>

      {/* Warnings */}
      {simulation.warnings.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 space-y-1">
            {simulation.warnings.map((w, i) => <p key={i} className="text-sm font-medium text-destructive">{w}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Antibiótico</label>
              <Select value={String(selectedDrugIdx)} onValueChange={v => setSelectedDrugIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRUGS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d.name} ({d.class})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {drug.class !== "Reidratação"
                  ? `Espectro: ${Math.round(drug.spectrum * 100)}% • t½: ${drug.halfLife}h • Via: ${drug.routes.join(", ")} • Penetração urinária: ${drug.urinaryConcentration}× • Penetração intestinal: ${drug.intestinalConcentration}× • MIC alvo: ${drug.mic} u.a.`
                  : "Solução de reidratação oral — base do tratamento da diarreia"}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Dose</label><span className="text-sm font-bold">{dose} {drug.doseUnit}</span></div>
              <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={drug.doseMin} max={drug.doseMax} step={(drug.doseMax - drug.doseMin) <= 100 ? 10 : drug.doseMax <= 500 ? 25 : drug.doseMax <= 1000 ? 50 : 100} />
              <p className="text-xs text-muted-foreground">Faixa: {drug.doseMin}–{drug.doseMax} {drug.doseUnit}</p>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Intervalo</label><span className="text-sm font-bold">{interval}h</span></div>
              <Slider value={[interval]} onValueChange={([v]) => setInterval_(v)} min={drug.intervalMin} max={Math.max(drug.intervalMax, 24)} step={1} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={hydration} onCheckedChange={setHydration} id="hid" />
              <label htmlFor="hid" className="text-sm font-medium cursor-pointer">Hidratação (SRO/EV)</label>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Grupo especial do paciente</p>
              {([
                { key: "gestante" as const, label: "Gestante" },
                { key: "idoso" as const, label: "Idoso (>65a)" },
                { key: "drc" as const, label: "DRC" },
                { key: "crianca" as const, label: "Criança" },
                { key: "cateter" as const, label: "Cateter vesical" },
                { key: "imunossuprimido" as const, label: "Imunossuprimido" },
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
                <Thermometer className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">Temperatura</p>
                <p className={`text-lg font-bold ${simulation.vitals.temp > 37.8 ? "text-destructive" : ""}`}>{simulation.vitals.temp}°C</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Heart className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">FC</p>
                <p className="text-lg font-bold">{simulation.vitals.fc} <span className="text-xs">bpm</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Activity className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Leucócitos</p>
                <p className={`text-lg font-bold ${simulation.vitals.leucocitos > 12000 ? "text-destructive" : ""}`}>{(simulation.vitals.leucocitos / 1000).toFixed(1)}k</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <ShieldAlert className="h-4 w-4 mx-auto text-chart-5 mb-1" />
                <p className="text-xs text-muted-foreground">PCR</p>
                <p className={`text-lg font-bold ${simulation.vitals.pcr > 50 ? "text-destructive" : ""}`}>{simulation.vitals.pcr} <span className="text-xs">mg/L</span></p>
              </div>
            </div>

            {/* Bacterial Load Chart */}
            <p className="text-sm font-semibold mb-2">Carga Bacteriana (log₁₀ UFC/mL) ao longo de 7 dias</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 8]} label={{ value: "log₁₀ UFC/mL", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine y={5} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Limiar ITU (10⁵)", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <ReferenceArea y1={0} y2={3} fill="hsl(var(--chart-3))" fillOpacity={0.06} label={{ value: "Erradicação", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <Line type="monotone" dataKey="bacterialLoad" name="Carga Bacteriana" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Concentration and Side Effects Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Concentração no Sítio ({drug.name})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Cp (u.a.)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine y={drug.mic} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: `MIC (${drug.mic})`, fill: "hsl(var(--chart-5))", fontSize: 10 }} />
                <Line type="monotone" dataKey="cpPlasma" name="Plasma" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="cpSite" name="Sítio-alvo" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
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
      {(() => {
        const activeCaseIndex = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
        return (
          <SimulatorChallengeMode
            challengeSet={getInfeccoesAntibioticosChallenges(activeCaseIndex >= 0 ? activeCaseIndex : undefined)}
            simulatorState={{ drug: drug.name, drugClass: drug.class, dose, interval, hydration, infectionType: activeCase.infectionType, finalBacterialLoad: simulation.finalBacterialLoad, vitals: simulation.vitals, warnings: simulation.warnings, safePregnancy: drug.safePregnancy, safeDRC: drug.safeDRC, safeElderly: drug.safeElderly, urinaryConcentration: drug.urinaryConcentration, intestinalConcentration: drug.intestinalConcentration, spectrum: drug.spectrum, halfLife: drug.halfLife, bioavailability: drug.bioavailability, sideEffectData: simulation.sideEffectData, specialGroups }}
            onComplete={() => setChallengeCompleted(true)}
          />
        );
      })()}

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
