import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye, Play, Heart, Activity, Droplets, Wind } from "lucide-react";
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
import { getManejoDorChallenges } from "@/data/simulatorChallenges";

const SLUG = "manejo-dor";

// ─── Drug Database ──────────────────────────────────────────────────────────
interface Drug {
  name: string; class: string; category: string;
  doseMin: number; doseMax: number; doseUnit: string;
  intervalMin: number; intervalMax: number;
  bioavailability: number; tmax: number; halfLife: number;
  analgesicPotency: number; // 0-1 relative
  ceilingEffect: boolean;
  sideEffects: { constipation: number; nausea: number; respiratoryDep: number; nephrotox: number; hepatotox: number; sedation: number };
  routes: string[];
}

const DRUGS: Drug[] = [
  { name: "Paracetamol", class: "Não-opioide", category: "Degrau 1", doseMin: 500, doseMax: 4000, doseUnit: "mg", intervalMin: 4, intervalMax: 8, bioavailability: 0.85, tmax: 1, halfLife: 2.5, analgesicPotency: 0.3, ceilingEffect: true, sideEffects: { constipation: 0, nausea: 0.05, respiratoryDep: 0, nephrotox: 0.02, hepatotox: 0.6, sedation: 0 }, routes: ["VO", "EV"] },
  { name: "Ibuprofeno", class: "AINE", category: "Degrau 1", doseMin: 200, doseMax: 2400, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.9, tmax: 1.5, halfLife: 2, analgesicPotency: 0.35, ceilingEffect: true, sideEffects: { constipation: 0, nausea: 0.15, respiratoryDep: 0, nephrotox: 0.4, hepatotox: 0.1, sedation: 0 }, routes: ["VO"] },
  { name: "Dipirona", class: "Não-opioide", category: "Degrau 1", doseMin: 500, doseMax: 4000, doseUnit: "mg", intervalMin: 6, intervalMax: 8, bioavailability: 0.9, tmax: 1, halfLife: 3, analgesicPotency: 0.35, ceilingEffect: true, sideEffects: { constipation: 0, nausea: 0.05, respiratoryDep: 0, nephrotox: 0.05, hepatotox: 0.05, sedation: 0.05 }, routes: ["VO", "EV"] },
  { name: "Codeína", class: "Opioide fraco", category: "Degrau 2", doseMin: 30, doseMax: 360, doseUnit: "mg", intervalMin: 4, intervalMax: 6, bioavailability: 0.5, tmax: 1.5, halfLife: 3, analgesicPotency: 0.4, ceilingEffect: true, sideEffects: { constipation: 0.4, nausea: 0.3, respiratoryDep: 0.1, nephrotox: 0, hepatotox: 0, sedation: 0.2 }, routes: ["VO"] },
  { name: "Tramadol", class: "Opioide fraco", category: "Degrau 2", doseMin: 50, doseMax: 400, doseUnit: "mg", intervalMin: 4, intervalMax: 8, bioavailability: 0.7, tmax: 2, halfLife: 6, analgesicPotency: 0.45, ceilingEffect: true, sideEffects: { constipation: 0.2, nausea: 0.35, respiratoryDep: 0.05, nephrotox: 0, hepatotox: 0, sedation: 0.15 }, routes: ["VO", "EV"] },
  { name: "Morfina", class: "Opioide forte", category: "Degrau 3", doseMin: 5, doseMax: 200, doseUnit: "mg", intervalMin: 4, intervalMax: 6, bioavailability: 0.3, tmax: 1, halfLife: 3, analgesicPotency: 0.8, ceilingEffect: false, sideEffects: { constipation: 0.7, nausea: 0.4, respiratoryDep: 0.5, nephrotox: 0.05, hepatotox: 0, sedation: 0.4 }, routes: ["VO", "EV", "SC"] },
  { name: "Fentanil TD", class: "Opioide forte", category: "Degrau 3", doseMin: 12, doseMax: 200, doseUnit: "mcg/h", intervalMin: 72, intervalMax: 72, bioavailability: 0.92, tmax: 24, halfLife: 20, analgesicPotency: 0.95, ceilingEffect: false, sideEffects: { constipation: 0.5, nausea: 0.25, respiratoryDep: 0.6, nephrotox: 0, hepatotox: 0, sedation: 0.3 }, routes: ["TD"] },
  { name: "Metadona", class: "Opioide forte", category: "Degrau 3", doseMin: 2.5, doseMax: 80, doseUnit: "mg", intervalMin: 8, intervalMax: 12, bioavailability: 0.8, tmax: 3, halfLife: 25, analgesicPotency: 0.85, ceilingEffect: false, sideEffects: { constipation: 0.5, nausea: 0.3, respiratoryDep: 0.55, nephrotox: 0, hepatotox: 0.1, sedation: 0.35 }, routes: ["VO"] },
];

const ADJUVANTS = [
  { name: "Nenhum", potencyBonus: 0, neuropathicBonus: 0, fibroBonus: 0, sideEffects: {} },
  { name: "Gabapentina 300mg", potencyBonus: 0.05, neuropathicBonus: 0.3, fibroBonus: 0.1, sideEffects: { sedation: 0.3 } },
  { name: "Pregabalina 75mg", potencyBonus: 0.08, neuropathicBonus: 0.35, fibroBonus: 0.25, sideEffects: { sedation: 0.25 } },
  { name: "Duloxetina 60mg", potencyBonus: 0.1, neuropathicBonus: 0.3, fibroBonus: 0.35, sideEffects: { nausea: 0.2 } },
  { name: "Amitriptilina 25mg", potencyBonus: 0.08, neuropathicBonus: 0.25, fibroBonus: 0.2, sideEffects: { sedation: 0.4, constipation: 0.15 } },
];

// ─── Case Type ──────────────────────────────────────────────────────────────
interface PainCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; comorbidities: string[] };
  painType: "aguda" | "neuropatica" | "fibromialgia" | "oncologica";
  scenario: string;
  initialEVA: number;
  expectedDrug: string;
  expectedAdjuvant?: string;
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: PainCase[] = [
  {
    title: "Caso 1: Dor Aguda Pós-Operatória",
    difficulty: "Fácil",
    patient: { name: "Marcos Silva", age: 45, weight: 82, sex: "M", comorbidities: [] },
    painType: "aguda",
    scenario: "Paciente 45 anos, pós-colecistectomia videolaparoscópica há 6h. EVA 7/10 em repouso, piora à mobilização. Sem comorbidades. Prescrição atual: dipirona 1g EV 6/6h isolada, sem melhora. O aluno deve escalonar a analgesia seguindo a escada da OMS, associando não-opioide + opioide fraco (Degrau 2).",
    initialEVA: 7,
    expectedDrug: "Tramadol",
    expectedAdjuvant: "Nenhum",
    clinicalTip: "Na dor aguda pós-operatória, a analgesia multimodal (AINE + opioide fraco) é superior à monoterapia. A dipirona isolada tem efeito-teto. O tramadol 50-100mg EV 6/6h é opção adequada no Degrau 2. Evitar AINEs se risco renal ou sangramento.",
    references: ["OMS – Escada Analgésica", "Kehlet H, Dahl JB. Lancet 2003"],
  },
  {
    title: "Caso 2: Dor Neuropática – Lombalgia com Radiculopatia",
    difficulty: "Médio",
    patient: { name: "João Pedro", age: 62, weight: 95, sex: "M", comorbidities: ["HAS", "Obesidade", "Depressão"] },
    painType: "neuropatica",
    scenario: "Paciente 62 anos, HAS, obeso, com depressão em tratamento. Lombalgia crônica com irradiação para MID, parestesia em dermátomo L5. EVA 6/10, tipo queimação. Em uso de paracetamol 4g/dia há 3 meses sem melhora. O paracetamol em dose máxima já ultrapassou o efeito-teto e há risco hepatotóxico. O aluno deve reconhecer a dor neuropática e iniciar adjuvante (gabapentinoides ou antidepressivos duais).",
    initialEVA: 6,
    expectedDrug: "Paracetamol",
    expectedAdjuvant: "Duloxetina 60mg",
    clinicalTip: "A dor neuropática responde mal a analgésicos comuns e AINEs. A duloxetina é primeira linha (NNT ~6) e trata também a depressão comórbida. Gabapentina/pregabalina são alternativas. A dose máxima de paracetamol (4g/dia) não deve ser mantida cronicamente por risco hepático.",
    references: ["Finnerup NB et al. Lancet Neurol 2015", "NICE CG173 – Neuropathic Pain"],
  },
  {
    title: "Caso 3: Fibromialgia com Insônia e Fadiga",
    difficulty: "Médio",
    patient: { name: "Ana Beatriz", age: 38, weight: 64, sex: "F", comorbidities: ["Insônia", "Síndrome do intestino irritável"] },
    painType: "fibromialgia",
    scenario: "Mulher 38 anos, dor difusa há >3 meses em ≥4 de 5 regiões corporais, fadiga intensa, sono não-reparador. Tender points positivos. WPI=12, SSS=8 (critérios ACR 2016). Já usou ibuprofeno e tramadol sem melhora relevante. O aluno deve reconhecer que opioides são contraindicados na fibromialgia (sensibilização central, não periférica) e que o tratamento farmacológico ideal combina duloxetina ou pregabalina com medidas não-farmacológicas.",
    initialEVA: 5,
    expectedDrug: "Dipirona",
    expectedAdjuvant: "Pregabalina 75mg",
    clinicalTip: "Na fibromialgia, a dor é central (sensibilização central), não nociceptiva periférica. Opioides são ineficazes e aumentam o risco de hiperalgesia opioide. Pregabalina (liga-se à subunidade α2δ do canal de Ca²⁺), duloxetina (IRSN) e amitriptilina em dose baixa são as opções com melhor evidência. Exercício aeróbico regular é tão eficaz quanto fármacos.",
    references: ["Häuser W et al. BMJ 2014", "Macfarlane GJ et al. EULAR 2017"],
  },
  {
    title: "Caso 4: Dor Oncológica — Escalonamento pela Escada OMS",
    difficulty: "Difícil",
    patient: { name: "Luciana Vieira", age: 58, weight: 68, sex: "F", comorbidities: ["Carcinoma pulmonar estágio IV", "Metástases ósseas"] },
    painType: "oncologica",
    scenario: "Paciente 58 anos, carcinoma pulmonar com metástases ósseas (coluna e fêmur). Dor mista: nociceptiva somática (óssea, contínua, EVA 8/10) + componente neuropático (queimação em hemitórax direito por invasão pleural). Em uso de tramadol 100mg 6/6h + paracetamol sem controle adequado. O aluno deve escalonar para Degrau 3 (morfina ou equivalente) e associar adjuvante para componente neuropático.",
    initialEVA: 8,
    expectedDrug: "Morfina",
    expectedAdjuvant: "Gabapentina 300mg",
    clinicalTip: "Na dor oncológica, não se deve hesitar em escalonar para opioides fortes (Degrau 3 OMS) quando o Degrau 2 falha. Morfina VO é o padrão-ouro inicial. A dose é titulada individualmente ('by the patient'). Gabapentina/pregabalina devem ser adicionadas para o componente neuropático. Laxantes profiláticos são obrigatórios com opioides.",
    references: ["OMS – Cancer Pain Relief (1986/1996)", "NCCN Guidelines – Adult Cancer Pain"],
  },
  {
    title: "Caso 5: Rotação de Opioides e Manejo de Tolerância",
    difficulty: "Difícil",
    patient: { name: "Luciana Vieira (continuação)", age: 58, weight: 68, sex: "F", comorbidities: ["Carcinoma pulmonar estágio IV", "Metástases ósseas", "Uso crônico de opioides"] },
    painType: "oncologica",
    scenario: "Continuação do caso anterior: após 8 semanas com morfina 30mg VO 4/4h (180mg/dia), a paciente desenvolveu tolerância. EVA voltou a 7/10 apesar de aumento da dose. Apresenta mioclonias e náuseas intensas. O aluno deve realizar rotação de opioide para fentanil TD ou metadona, calcular a dose equianalgésica com redução de 25-50% pela tolerância cruzada incompleta.",
    initialEVA: 7,
    expectedDrug: "Fentanil TD",
    expectedAdjuvant: "Gabapentina 300mg",
    clinicalTip: "A rotação de opioides é indicada quando há tolerância, efeitos adversos intratáveis ou dor refratária. Morfina 180mg/dia VO ≈ Fentanil TD 75mcg/h (com redução de 25-50% por tolerância cruzada incompleta). A metadona é alternativa potente (antagonista NMDA), mas requer experiência pela meia-vida longa e variável. Nunca interromper opioides abruptamente: risco de síndrome de abstinência.",
    references: ["Mercadante S, Bruera E. Cancer Treat Rev 2006", "Fine PG, Portenoy RK. J Pain Symptom Manage 2009"],
  },
];

// ─── Route Modifiers ────────────────────────────────────────────────────────
interface RouteModifier { bioavailability: number; tmaxMultiplier: number; label: string; }
const ROUTE_MODIFIERS: Record<string, RouteModifier> = {
  VO: { bioavailability: 1.0, tmaxMultiplier: 1.0, label: "Via Oral" }, // uses drug default
  EV: { bioavailability: 1.0, tmaxMultiplier: 0.05, label: "Endovenosa" }, // instant peak, 100% F
  SC: { bioavailability: 0.9, tmaxMultiplier: 0.5, label: "Subcutânea" },
  TD: { bioavailability: 1.0, tmaxMultiplier: 1.0, label: "Transdérmica" }, // uses drug default (Fentanil)
};

// ─── Simulation Engine ──────────────────────────────────────────────────────
interface SimOptions {
  route?: string;
  renalInsufficiency?: boolean;
  hepaticInsufficiency?: boolean;
}

function computeSimulation(drug: Drug, dose: number, interval: number, adjuvant: typeof ADJUVANTS[number], painType: string, initialEVA: number, options?: SimOptions) {
  const hours = Array.from({ length: 73 }, (_, i) => i);
  const doseFraction = dose / drug.doseMax;

  // Potency: drug's inherent analgesic power + adjuvant bonus
  // Dose dependency comes solely from Cp curve (doseFraction already in cp calc line 201)
  const adjBonus = adjuvant.potencyBonus
    + (painType === "neuropatica" ? adjuvant.neuropathicBonus : 0)
    + (painType === "fibromialgia" ? adjuvant.fibroBonus : 0);
  const totalPotency = drug.analgesicPotency + adjBonus;

  // Pain reduction effectiveness by pain type
  const typeMultiplier = painType === "fibromialgia" && drug.class === "Opioide forte" ? 0.15
    : painType === "fibromialgia" && drug.class === "Opioide fraco" ? 0.2
    : painType === "neuropatica" && drug.class === "Não-opioide" && adjuvant.name === "Nenhum" ? 0.2
    : painType === "neuropatica" && drug.class === "AINE" ? 0.15
    : 1;

  // Route modifiers
  const route = options?.route || drug.routes[0];
  const effectiveBio = route === "EV" ? 1.0 : route === "SC" ? 0.9 : drug.bioavailability * (options?.hepaticInsufficiency ? 1.3 : 1.0);
  const effectiveTmax = route === "EV" ? 0.05 : route === "SC" ? drug.tmax * 0.5 : drug.tmax;

  // Insufficiency modifiers on half-life
  let effectiveHalfLife = drug.halfLife;
  if (options?.renalInsufficiency) effectiveHalfLife *= 2.5;
  if (options?.hepaticInsufficiency) effectiveHalfLife *= 2.0;

  // Fixed Cp threshold — NOT bio-dependent so route differences matter in EVA
  const cpThreshold = 25;

  const evaData: { hour: number; eva: number; cp: number; toxicLimit: number; therapeuticMin: number; therapeuticMax: number }[] = [];

  for (const h of hours) {
    let cp = 0;
    const nDoses = Math.floor(h / interval) + 1;
    for (let d = 0; d < nDoses; d++) {
      const tSinceDose = h - d * interval;
      if (tSinceDose < 0) continue;
      const absorption = effectiveBio * (1 - Math.exp(-tSinceDose / effectiveTmax));
      const elimination = Math.exp(-0.693 * tSinceDose / effectiveHalfLife);
      cp += absorption * elimination;
    }
    cp = cp * doseFraction * 100;

    // Ceiling effect: cap cpRatio so increasing dose/Cp stops adding analgesia
    let cpRatio = Math.min(cp / cpThreshold, 1);
    if (drug.ceilingEffect) cpRatio = Math.min(cpRatio, 0.5);

    const reduction = totalPotency * typeMultiplier * cpRatio;
    const eva = Math.max(0, initialEVA - initialEVA * reduction * 0.95);

    evaData.push({
      hour: h,
      eva: Math.round(eva * 10) / 10,
      cp: Math.round(cp * 10) / 10,
      toxicLimit: 120,
      therapeuticMin: 30,
      therapeuticMax: 100,
    });
  }

  // Side effects
  const doseRatio = doseFraction;
  const se = { ...drug.sideEffects };
  Object.keys(adjuvant.sideEffects).forEach(k => {
    (se as any)[k] = ((se as any)[k] || 0) + (adjuvant.sideEffects as any)[k];
  });

  // Route EV amplifies acute toxicity
  const routeToxMult = route === "EV" ? 1.3 : 1.0;
  // Bio ratio: how much more drug exposure vs default oral route
  const bioRatio = effectiveBio / drug.bioavailability;

  // Insufficiency amplifies specific toxicities
  const renalToxBonus = options?.renalInsufficiency ? 0.3 : 0;
  const hepaticToxBonus = options?.hepaticInsufficiency ? 0.4 : 0;

  const sideEffectData = [
    { name: "Constipação", risco: Math.round(Math.min(se.constipation * doseRatio * 100 * routeToxMult * bioRatio, 100)) },
    { name: "Náusea", risco: Math.round(Math.min(se.nausea * doseRatio * 100 * routeToxMult * bioRatio, 100)) },
    { name: "Dep. Resp.", risco: Math.round(Math.min((se.respiratoryDep * doseRatio * routeToxMult * bioRatio + (options?.renalInsufficiency ? 0.15 : 0)) * 100, 100)) },
    { name: "Nefrotox.", risco: Math.round(Math.min((se.nephrotox * doseRatio * bioRatio + renalToxBonus) * 100, 100)) },
    { name: "Hepatotox.", risco: Math.round(Math.min((se.hepatotox * doseRatio * bioRatio + hepaticToxBonus) * 100, 100)) },
    { name: "Sedação", risco: Math.round(Math.min((se.sedation || 0) * doseRatio * 100 * routeToxMult * bioRatio, 100)) },
  ];

  // Vital signs — use actual peak Cp and bioRatio for realistic response
  const peakCp = Math.max(...evaData.map(d => d.cp));
  const lastEVA = evaData[evaData.length - 1]?.eva ?? initialEVA;
  const cpExposure = Math.min(peakCp / (effectiveBio * 80), 1); // normalized drug exposure 0-1
  const respDep = se.respiratoryDep * doseRatio * routeToxMult * bioRatio + (options?.renalInsufficiency ? 0.15 : 0);
  const vitals = {
    fc: Math.round(72 + (lastEVA / 10) * 20 - respDep * 15),
    pas: Math.round(120 + (lastEVA / 10) * 15 + (drug.class === "AINE" ? doseRatio * 10 : 0)),
    pad: Math.round(80 + (lastEVA / 10) * 8),
    fr: Math.round(Math.max(6, 16 - respDep * 12)),
    spo2: Math.round(Math.max(82, 98 - respDep * 15)),
  };

  return { evaData, sideEffectData, vitals, finalEVA: lastEVA };
}

export default function SimuladorManejoDor() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<PainCase | null>(null);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(500);
  const [interval, setInterval_] = useState(6);
  const [adjuvantIdx, setAdjuvantIdx] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState("VO");
  const [renalInsufficiency, setRenalInsufficiency] = useState(false);
  const [hepaticInsufficiency, setHepticInsufficiency] = useState(false);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const drug = DRUGS[selectedDrugIdx];
  const adjuvant = ADJUVANTS[adjuvantIdx];

  // Determine active case index for case-specific challenges
  const activeCaseIndex = useMemo(() => {
    if (!activeCase) return undefined;
    const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
    return idx >= 0 ? idx : undefined;
  }, [activeCase]);

  // AI case challenges (from case_data.challenges)
  const aiChallengeSet = useMemo(() => {
    if (!activeCase || !activeCase.isAI) return null;
    const cd = activeCase as any;
    if (!cd.challenges || !Array.isArray(cd.challenges) || cd.challenges.length === 0) return null;
    return {
      title: `Desafio: ${activeCase.title}`,
      description: "Desafios específicos gerados para este caso clínico.",
      challenges: cd.challenges,
    };
  }, [activeCase]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", comorbidities: [] },
        painType: cd.painType ?? "aguda",
        scenario: cd.scenario ?? "",
        initialEVA: cd.initialEVA ?? 6,
        expectedDrug: cd.expectedDrug ?? "",
        expectedAdjuvant: cd.expectedAdjuvant ?? "Nenhum",
        clinicalTip: cd.clinicalTip ?? "",
        references: cd.references ?? [],
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      const defaultIdx = 0; // Start at first drug, student must choose
      setSelectedDrugIdx(defaultIdx);
      setDose(DRUGS[defaultIdx].doseMin);
      setInterval_(DRUGS[defaultIdx].intervalMin);
      setAdjuvantIdx(0);
      setSelectedRoute(DRUGS[defaultIdx].routes[0]);
      setRenalInsufficiency(false);
      setHepticInsufficiency(false);
      setRunning(false);
      setAnimStep(0);
    }
  }, [activeCase]);

  useEffect(() => {
    if (selectedDrugIdx >= 0) {
      setDose(Math.max(drug.doseMin, Math.min(dose, drug.doseMax)));
      setInterval_(Math.max(drug.intervalMin, Math.min(interval, drug.intervalMax)));
      // Reset route if not available for new drug
      if (!drug.routes.includes(selectedRoute)) {
        setSelectedRoute(drug.routes[0]);
      }
    }
  }, [selectedDrugIdx]);

  const doseStep = useMemo(() => {
    if (drug.doseUnit === "mcg/h") return 12.5;
    return Math.max(1, Math.round((drug.doseMax - drug.doseMin) / 40));
  }, [drug]);

  const simulation = useMemo(() =>
    computeSimulation(drug, dose, interval, adjuvant, activeCase?.painType ?? "aguda", activeCase?.initialEVA ?? 6, {
      route: selectedRoute,
      renalInsufficiency,
      hepaticInsufficiency,
    }),
    [drug, dose, interval, adjuvant, activeCase?.painType, activeCase?.initialEVA, selectedRoute, renalInsufficiency, hepaticInsufficiency]
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

  const handleStart = () => {
    setAnimStep(0);
    setRunning(true);
  };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const drugOk = drug.name === activeCase.expectedDrug;
    const adjOk = !activeCase.expectedAdjuvant || adjuvant.name === activeCase.expectedAdjuvant || (activeCase.expectedAdjuvant === "Nenhum" && adjuvantIdx === 0);
    const evaReduced = simulation.finalEVA <= activeCase.initialEVA * 0.5;
    const s = (drugOk ? 40 : 0) + (adjOk ? 30 : 0) + (evaReduced ? 30 : 0);
    setLastScore(s);
    const decisions: SimDecision[] = [
      { label: "Fármaco selecionado", userChoice: drug.name, idealChoice: activeCase.expectedDrug, correct: drugOk, category: "Seleção" },
      { label: "Classe do fármaco", userChoice: drug.class, idealChoice: DRUGS.find(d => d.name === activeCase.expectedDrug)?.class || "—", correct: drugOk, category: "Seleção" },
      { label: "Dose", userChoice: `${dose} ${drug.doseUnit}`, idealChoice: `Faixa: ${drug.doseMin}-${drug.doseMax} ${drug.doseUnit}`, correct: dose >= drug.doseMin && dose <= drug.doseMax, category: "Posologia" },
      { label: "Intervalo", userChoice: `${interval}h`, idealChoice: `${drug.intervalMin}-${drug.intervalMax}h`, correct: interval >= drug.intervalMin && interval <= drug.intervalMax, category: "Posologia" },
      { label: "Adjuvante", userChoice: adjuvant.name, idealChoice: activeCase.expectedAdjuvant || "Nenhum", correct: adjOk, category: "Terapia adjuvante", explanation: !adjOk ? "Adjuvante inadequado para este tipo de dor" : undefined },
      { label: "Redução da EVA", userChoice: `EVA final: ${simulation.finalEVA.toFixed(1)}`, idealChoice: `EVA ≤ ${(activeCase.initialEVA * 0.5).toFixed(1)}`, correct: evaReduced, category: "Desfecho clínico" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions("manejo-dor", decisions) });
    return s;
  }, [activeCase, drug, dose, interval, adjuvant, adjuvantIdx, simulation.finalEVA, submitted, submitResults]);

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
    painType: c.painType ?? "aguda", scenario: c.scenario ?? "",
    initialEVA: c.initialEVA ?? 6, expectedDrug: c.expectedDrug ?? "",
    expectedAdjuvant: c.expectedAdjuvant ?? "Nenhum", clinicalTip: c.clinicalTip ?? "",
    references: c.references ?? [],
  });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Manejo da Dor e Analgesia</h1>
            <p className="text-muted-foreground">Classifique a dor, selecione o tratamento pela Escada da OMS e observe os desfechos clínicos.</p>
            <AdminPromptViewer toolSlug="sim-manejo-dor" toolName="Manejo da Dor e Analgesia" toolType="simulator" prompt={getNativePrompt("sim-manejo-dor") || ""} />
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

  const painTypeLabel: Record<string, string> = { aguda: "Dor Aguda", neuropatica: "Dor Neuropática", fibromialgia: "Fibromialgia", oncologica: "Dor Oncológica" };

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{painTypeLabel[activeCase.painType] ?? activeCase.painType}</Badge>
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
                    <SelectItem key={i} value={String(i)}>{d.name} ({d.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Classe: {drug.class}</p>
            </div>
            {drug.routes.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Via de Administração</label>
                <Select value={selectedRoute} onValueChange={v => setSelectedRoute(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {drug.routes.map(r => (
                      <SelectItem key={r} value={r}>{ROUTE_MODIFIERS[r]?.label || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {drug.routes.length === 1 && (
              <p className="text-xs text-muted-foreground">Via: {ROUTE_MODIFIERS[drug.routes[0]]?.label || drug.routes[0]}</p>
            )}
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Dose</label><span className="text-sm font-bold">{dose} {drug.doseUnit}</span></div>
              <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={drug.doseMin} max={drug.doseMax} step={doseStep} />
              <p className="text-xs text-muted-foreground">Faixa: {drug.doseMin}–{drug.doseMax} {drug.doseUnit}</p>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Intervalo</label><span className="text-sm font-bold">{interval}h</span></div>
              <Slider value={[interval]} onValueChange={([v]) => setInterval_(v)} min={drug.intervalMin} max={drug.intervalMax} step={drug.intervalMax > 24 ? 24 : 1} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Adjuvante</label>
              <Select value={String(adjuvantIdx)} onValueChange={v => setAdjuvantIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADJUVANTS.map((a, i) => (
                    <SelectItem key={i} value={String(i)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Clinical toggles */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condições Clínicas</p>
              <div className="flex items-center justify-between">
                <label className="text-sm">Insuficiência Renal (ClCr &lt; 30)</label>
                <Switch checked={renalInsufficiency} onCheckedChange={setRenalInsufficiency} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Insuficiência Hepática (Child-Pugh C)</label>
                <Switch checked={hepaticInsufficiency} onCheckedChange={setHepticInsufficiency} />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}>
              <Play className="h-4 w-4" /> {running ? "Simulando..." : "Iniciar Simulação"}
            </Button>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Sinais Vitais (72h)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <Heart className="h-4 w-4 mx-auto text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">FC</p>
                <p className="text-lg font-bold">{simulation.vitals.fc} <span className="text-xs">bpm</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Activity className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">PA</p>
                <p className="text-lg font-bold">{simulation.vitals.pas}/{simulation.vitals.pad}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Wind className="h-4 w-4 mx-auto text-chart-3 mb-1" />
                <p className="text-xs text-muted-foreground">FR</p>
                <p className={`text-lg font-bold ${simulation.vitals.fr < 12 ? "text-destructive" : ""}`}>{simulation.vitals.fr} <span className="text-xs">irpm</span></p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Droplets className="h-4 w-4 mx-auto text-chart-4 mb-1" />
                <p className="text-xs text-muted-foreground">SpO₂</p>
                <p className={`text-lg font-bold ${simulation.vitals.spo2 < 92 ? "text-destructive" : ""}`}>{simulation.vitals.spo2}%</p>
              </div>
            </div>

            {/* EVA Chart */}
            <p className="text-sm font-semibold mb-2">Escala Visual Analógica (EVA) ao longo de 72h</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayedEvaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 10]} label={{ value: "EVA", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceArea y1={7} y2={10} fill="hsl(var(--destructive))" fillOpacity={0.08} label={{ value: "Dor intensa", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <ReferenceArea y1={4} y2={7} fill="hsl(var(--chart-5))" fillOpacity={0.06} />
                <ReferenceArea y1={0} y2={4} fill="hsl(var(--chart-3))" fillOpacity={0.06} label={{ value: "Controle adequado", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <Line type="monotone" dataKey="eva" name="EVA" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2.5} />
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
      <SimulatorChallengeMode
        challengeSet={getManejoDorChallenges(activeCaseIndex)}
        customChallengeSet={aiChallengeSet}
        simulatorState={{ drug: drug.name, drugClass: drug.class, dose, interval, adjuvant: adjuvant.name, painType: activeCase.painType, finalEVA: simulation.finalEVA, vitals: simulation.vitals, gastroprotection: !!(adjuvant.name !== "Nenhum"), route: selectedRoute, renalInsufficiency, hepaticInsufficiency }}
        onResetForChallenge={() => {
          const defaultIdx = 0;
          setSelectedDrugIdx(defaultIdx);
          setDose(DRUGS[defaultIdx].doseMin);
          setInterval_(DRUGS[defaultIdx].intervalMin);
          setAdjuvantIdx(0);
          setSelectedRoute(DRUGS[defaultIdx].routes[0]);
          setRenalInsufficiency(false);
          setHepticInsufficiency(false);
          setRunning(false);
          setAnimStep(0);
        }}
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
