import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Droplets, Activity, Heart, ShieldAlert, Thermometer } from "lucide-react";
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
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getHemogramaChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-hemograma";

// ─── Drug Database ──────────────────────────────────────────────────
interface HemoDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: {
    hb: number; vcm: number; leucocitos: number; neutrofilos: number; plaquetas: number;
    reticulocitos: number;
  };
  sideEffects: { gi: number; alergia: number; sobrecargaFerro: number; febre: number; hipotensao: number };
  weekToEffect: number;
}

const DRUGS: HemoDrug[] = [
  { name: "Sulfato Ferroso", class: "Ferro oral", doseMin: 40, doseMax: 200, doseUnit: "mg Fe elem/dia", doseStep: 20, effects: { hb: 1.0, vcm: 5, leucocitos: 0, neutrofilos: 0, plaquetas: 0, reticulocitos: 3 }, sideEffects: { gi: 0.4, alergia: 0.05, sobrecargaFerro: 0.1, febre: 0, hipotensao: 0 }, weekToEffect: 2 },
  { name: "Ferro IV (Sacarato)", class: "Ferro parenteral", doseMin: 100, doseMax: 500, doseUnit: "mg/dose", doseStep: 50, effects: { hb: 1.5, vcm: 7, leucocitos: 0, neutrofilos: 0, plaquetas: 0, reticulocitos: 5 }, sideEffects: { gi: 0.05, alergia: 0.15, sobrecargaFerro: 0.2, febre: 0.1, hipotensao: 0.1 }, weekToEffect: 1 },
  { name: "Ácido Fólico", class: "Vitamina B9", doseMin: 1, doseMax: 5, doseUnit: "mg/dia", doseStep: 1, effects: { hb: 0.5, vcm: -8, leucocitos: 0, neutrofilos: 0, plaquetas: 5, reticulocitos: 2 }, sideEffects: { gi: 0.05, alergia: 0.02, sobrecargaFerro: 0, febre: 0, hipotensao: 0 }, weekToEffect: 2 },
  { name: "Vitamina B12 (Cianocobalamina)", class: "Vitamina B12", doseMin: 1000, doseMax: 5000, doseUnit: "mcg IM", doseStep: 500, effects: { hb: 0.8, vcm: -12, leucocitos: 0.5, neutrofilos: 0.5, plaquetas: 8, reticulocitos: 4 }, sideEffects: { gi: 0.02, alergia: 0.05, sobrecargaFerro: 0, febre: 0, hipotensao: 0 }, weekToEffect: 1 },
  { name: "Eritropoetina (EPO)", class: "Estimulante eritropoiese", doseMin: 2000, doseMax: 10000, doseUnit: "UI SC 3x/sem", doseStep: 1000, effects: { hb: 1.2, vcm: 2, leucocitos: 0, neutrofilos: 0, plaquetas: 0, reticulocitos: 6 }, sideEffects: { gi: 0.02, alergia: 0.05, sobrecargaFerro: 0, febre: 0.05, hipotensao: 0.15 }, weekToEffect: 4 },
  { name: "Filgrastim (G-CSF)", class: "Fator estimulante colônias", doseMin: 5, doseMax: 20, doseUnit: "mcg/kg/dia SC", doseStep: 1, effects: { hb: 0, vcm: 0, leucocitos: 8, neutrofilos: 6, plaquetas: 0, reticulocitos: 0 }, sideEffects: { gi: 0.05, alergia: 0.05, sobrecargaFerro: 0, febre: 0.2, hipotensao: 0 }, weekToEffect: 0.5 },
  { name: "Ácido Tranexâmico", class: "Antifibrinolítico", doseMin: 250, doseMax: 1500, doseUnit: "mg 8/8h", doseStep: 250, effects: { hb: 0.3, vcm: 0, leucocitos: 0, neutrofilos: 0, plaquetas: 0, reticulocitos: 0 }, sideEffects: { gi: 0.15, alergia: 0.05, sobrecargaFerro: 0, febre: 0, hipotensao: 0 }, weekToEffect: 0.5 },
  { name: "Transfusão CH", class: "Concentrado hemácias", doseMin: 1, doseMax: 4, doseUnit: "unidades", doseStep: 1, effects: { hb: 1.0, vcm: 0, leucocitos: 0, neutrofilos: 0, plaquetas: 0, reticulocitos: -2 }, sideEffects: { gi: 0, alergia: 0.15, sobrecargaFerro: 0.25, febre: 0.2, hipotensao: 0.05 }, weekToEffect: 0 },
  { name: "Transfusão Plaquetas", class: "Concentrado plaquetas", doseMin: 1, doseMax: 10, doseUnit: "unidades", doseStep: 1, effects: { hb: 0, vcm: 0, leucocitos: 0, neutrofilos: 0, plaquetas: 10, reticulocitos: 0 }, sideEffects: { gi: 0, alergia: 0.1, sobrecargaFerro: 0.05, febre: 0.15, hipotensao: 0 }, weekToEffect: 0 },
];

// ─── Case Type ──────────────────────────────────────────────────────
interface HemoCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: { hb: number; ht: number; vcm: number; hcm: number; chcm: number; rdw: number;
    leucocitos: number; neutrofilos: number; linfocitos: number; monocitos: number; eosinofilos: number; basofilos: number;
    plaquetas: number; reticulocitos: number; ferritina: number; ferro: number; tibc: number; b12: number; folato: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: HemoCase[] = [
  {
    title: "Caso 1: Anemia Microcítica Ferropriva",
    difficulty: "Fácil",
    patient: { name: "Carla Souza", age: 28, weight: 58, sex: "F", specialGroup: [] },
    scenario: "Mulher 28 anos com fadiga progressiva há 3 meses, palidez cutânea e unhas quebradiças. Dieta pobre em carne vermelha, ciclo menstrual abundante. O hemograma revela anemia microcítica hipocrômica com ferritina baixa e ferro sérico reduzido.",
    baseLab: { hb: 8.5, ht: 28, vcm: 68, hcm: 24, chcm: 30, rdw: 18, leucocitos: 6500, neutrofilos: 3900, linfocitos: 1950, monocitos: 390, eosinofilos: 195, basofilos: 65, plaquetas: 380, reticulocitos: 0.8, ferritina: 5, ferro: 25, tibc: 450, b12: 450, folato: 12 },
    expectedDrugs: ["Sulfato Ferroso"],
    clinicalTip: "Anemia ferropriva: VCM <80, HCM <27, RDW >14%, ferritina <30 ng/mL. O sulfato ferroso (120-200mg Fe elementar/dia em 2-3 doses, jejum) é 1ª linha. Espera-se pico de reticulócitos em 5-10 dias e aumento de Hb de ~1 g/dL/semana. Manter por 3-6 meses após normalização da Hb para repor estoques.",
    references: ["Hoffbrand, Cap. 3", "WHO Guidelines on Iron Supplementation 2020"],
  },
  {
    title: "Caso 2: Anemia Megaloblástica por Deficiência de B12",
    difficulty: "Médio",
    patient: { name: "Antônio Pereira", age: 62, weight: 75, sex: "M", specialGroup: [] },
    scenario: "Homem 62 anos, vegetariano estrito há 15 anos, queixa de formigamento em pés e mãos, dificuldade de marcha e glossite. Hemograma mostra anemia macrocítica com neutrófilos hipersegmentados no esfregaço. B12 muito baixa, folato normal.",
    baseLab: { hb: 7.8, ht: 25, vcm: 115, hcm: 38, chcm: 33, rdw: 16, leucocitos: 3800, neutrofilos: 1900, linfocitos: 1330, monocitos: 342, eosinofilos: 152, basofilos: 76, plaquetas: 120, reticulocitos: 0.5, ferritina: 180, ferro: 90, tibc: 300, b12: 80, folato: 15 },
    expectedDrugs: ["Vitamina B12 (Cianocobalamina)"],
    clinicalTip: "Anemia megaloblástica por B12: VCM >100, neutrófilos hipersegmentados, B12 <200 pg/mL. Causa: absorção (anemia perniciosa, gastrectomia) ou dieta (veganos). Tratar com B12 IM 1000 mcg/dia × 7 dias, depois semanal × 4, depois mensal vitalício. Pico reticulocitário em 5-7 dias. ATENÇÃO: Ácido fólico isolado mascara deficiência de B12 e piora neuropatia!",
    references: ["Hoffbrand, Cap. 5", "Stabler SP. NEJM 2013"],
  },
  {
    title: "Caso 3: Neutropenia Febril Pós-Quimioterapia",
    difficulty: "Difícil",
    patient: { name: "Fernanda Lima", age: 45, weight: 68, sex: "F", specialGroup: ["Pós-QT (mama)"] },
    scenario: "Mulher 45 anos, 10 dias após 3º ciclo de quimioterapia (AC-T) para câncer de mama. Chega ao PS com febre 38.8°C, calafrios e mal-estar. Hemograma mostra pancitopenia grave com neutropenia severa (neutrófilos <500). Urgência: iniciar antibiótico empírico imediato + considerar G-CSF.",
    baseLab: { hb: 9.2, ht: 29, vcm: 88, hcm: 29, chcm: 33, rdw: 14, leucocitos: 800, neutrofilos: 200, linfocitos: 400, monocitos: 100, eosinofilos: 60, basofilos: 40, plaquetas: 65, reticulocitos: 0.3, ferritina: 250, ferro: 80, tibc: 280, b12: 400, folato: 10 },
    expectedDrugs: ["Filgrastim (G-CSF)"],
    clinicalTip: "Neutropenia febril: neutrófilos <500/mm³ + temp ≥38.3°C (ou ≥38°C por >1h). É emergência oncológica: antibiótico empírico em <1h (cefepime ou pipe-tazo). Filgrastim (G-CSF) 5-10 mcg/kg/dia SC se expectativa de neutropenia prolongada (>7 dias) ou infecção documentada. Espera-se aumento de neutrófilos em 24-72h. Não atrasar ATB para colher culturas!",
    references: ["NCCN Neutropenia Febril 2023", "Freifeld AG et al. CID 2011"],
  },
  {
    title: "Caso 4: Plaquetopenia com Sangramento",
    difficulty: "Médio",
    patient: { name: "Rafael Mendes", age: 35, weight: 80, sex: "M", specialGroup: [] },
    scenario: "Homem 35 anos com petéquias difusas, gengivorragia espontânea e epistaxe recorrente há 5 dias. Sem uso de fármacos mielotóxicos. Hemograma: plaquetas 18.000/mm³, Hb e leucócitos normais. Suspeita de PTI (Púrpura Trombocitopênica Imune). O aluno deve avaliar necessidade de transfusão de plaquetas e agentes hemostáticos.",
    baseLab: { hb: 13.5, ht: 41, vcm: 88, hcm: 30, chcm: 34, rdw: 13, leucocitos: 7200, neutrofilos: 4300, linfocitos: 2160, monocitos: 432, eosinofilos: 216, basofilos: 72, plaquetas: 18, reticulocitos: 1.2, ferritina: 120, ferro: 85, tibc: 310, b12: 500, folato: 14 },
    expectedDrugs: ["Ácido Tranexâmico"],
    clinicalTip: "Plaquetopenia isolada (<20.000) com sangramento ativo: avaliar causa (PTI, heparina, aplasia). Transfusão de plaquetas se <10.000 (profilática) ou <20.000 com sangramento ativo ou <50.000 pré-procedimento. Ácido tranexâmico auxilia no controle de sangramento mucoso. Na PTI: 1ª linha = corticoide (prednisona 1 mg/kg), 2ª linha = imunoglobulina EV.",
    references: ["Hoffbrand, Cap. 26", "ASH PTI Guidelines 2019"],
  },
  {
    title: "Caso 5: Leucocitose — Reacional vs Leucemia",
    difficulty: "Difícil",
    patient: { name: "Marcos Oliveira", age: 55, weight: 85, sex: "M", specialGroup: [] },
    scenario: "Homem 55 anos com fadiga, sudorese noturna, perda de peso (8 kg em 2 meses) e esplenomegalia ao exame físico. Hemograma: leucocitose intensa (85.000/mm³) com predomínio de granulócitos em diferentes estágios de maturação (desvio à esquerda escalonado), basofilia e eosinofilia. Anemia leve e plaquetopenia. O aluno deve diferenciar leucocitose reacional (infecção) de neoplásica (LMC).",
    baseLab: { hb: 10.5, ht: 33, vcm: 90, hcm: 30, chcm: 33, rdw: 15, leucocitos: 85000, neutrofilos: 55000, linfocitos: 8500, monocitos: 5100, eosinofilos: 8500, basofilos: 8500, plaquetas: 95, reticulocitos: 1.8, ferritina: 350, ferro: 110, tibc: 250, b12: 1200, folato: 18 },
    expectedDrugs: [],
    clinicalTip: "Leucocitose reacional: neutrofilia madura + desvio à esquerda não escalonado + fosfatase alcalina leucocitária (FAL) alta + PCR/VHS elevados. LMC: leucocitose extrema (>50.000) + desvio escalonado (mielócitos, metamielócitos, bastonetes) + basofilia + eosinofilia + FAL baixa + esplenomegalia + cromossomo Philadelphia (t(9;22)). B12 elevada na LMC (produzida por granulócitos). Encaminhar para mielograma + cariótipo + FISH/PCR para BCR-ABL.",
    references: ["Hoffbrand, Cap. 13", "Cortes J et al. NEJM 2013"],
  },
];

// ─── Engine ──────────────────────────────────────────────────────────
function computeSimulation(drugs: HemoDrug[], doses: number[], baseLab: HemoCase["baseLab"], weeks: number = 8) {
  const timeline = Array.from({ length: weeks + 1 }, (_, i) => i);

  // Compute lab changes over time
  const labTrend: { week: number; hb: number; vcm: number; leucocitos: number; plaquetas: number; reticulocitos: number }[] = [];

  for (const w of timeline) {
    let hb = baseLab.hb;
    let vcm = baseLab.vcm;
    let leuc = baseLab.leucocitos;
    let plaq = baseLab.plaquetas;
    let retic = baseLab.reticulocitos;

    drugs.forEach((d, i) => {
      const doseFrac = doses[i] / d.doseMax;
      const progress = Math.min(1, Math.max(0, (w - d.weekToEffect) / Math.max(1, 4 - d.weekToEffect)));
      if (w >= d.weekToEffect) {
        hb += d.effects.hb * doseFrac * progress * (doses[i] / d.doseMax);
        hb += d.effects.hb * doseFrac * progress; // simplified: each drug contributes additively
        vcm += d.effects.vcm * doseFrac * progress;
        leuc += d.effects.leucocitos * doseFrac * progress * 1000;
        plaq += d.effects.plaquetas * doseFrac * progress * 1000;
        retic += d.effects.reticulocitos * doseFrac * (w <= d.weekToEffect + 2 ? 1 : 0.3); // reticulocyte burst then declines
      }
    });

    hb = Math.max(3, Math.min(18, hb));
    vcm = Math.max(50, Math.min(130, vcm));
    leuc = Math.max(0, leuc);
    plaq = Math.max(0, plaq);
    retic = Math.max(0, Math.min(25, retic));

    labTrend.push({
      week: w,
      hb: Math.round(hb * 10) / 10,
      vcm: Math.round(vcm * 10) / 10,
      leucocitos: Math.round(leuc),
      plaquetas: Math.round(plaq),
      reticulocitos: Math.round(retic * 10) / 10,
    });
  }

  // Side effects
  const sideEffectData: { name: string; risco: number }[] = [];
  const combinedSE = { gi: 0, alergia: 0, sobrecargaFerro: 0, febre: 0, hipotensao: 0 };
  drugs.forEach((d, i) => {
    const doseFrac = doses[i] / d.doseMax;
    (Object.keys(combinedSE) as (keyof typeof combinedSE)[]).forEach(k => {
      combinedSE[k] += d.sideEffects[k] * doseFrac;
    });
  });
  sideEffectData.push(
    { name: "GI (náusea/constipação)", risco: Math.round(Math.min(combinedSE.gi * 100, 100)) },
    { name: "Reação alérgica", risco: Math.round(Math.min(combinedSE.alergia * 100, 100)) },
    { name: "Sobrecarga de ferro", risco: Math.round(Math.min(combinedSE.sobrecargaFerro * 100, 100)) },
    { name: "Febre", risco: Math.round(Math.min(combinedSE.febre * 100, 100)) },
    { name: "Hipotensão", risco: Math.round(Math.min(combinedSE.hipotensao * 100, 100)) },
  );

  // Current lab panel (last week)
  const lastLab = labTrend[labTrend.length - 1];

  // Lab gauge data
  const labGauges = [
    { name: "Hb", value: lastLab.hb, unit: "g/dL", min: 3, max: 18, refLow: 12, refHigh: 16, status: lastLab.hb < 12 ? "baixo" : lastLab.hb > 16 ? "alto" : "normal" },
    { name: "VCM", value: lastLab.vcm, unit: "fL", min: 50, max: 130, refLow: 80, refHigh: 100, status: lastLab.vcm < 80 ? "baixo" : lastLab.vcm > 100 ? "alto" : "normal" },
    { name: "Leucócitos", value: lastLab.leucocitos, unit: "/mm³", min: 0, max: 100000, refLow: 4000, refHigh: 11000, status: lastLab.leucocitos < 4000 ? "baixo" : lastLab.leucocitos > 11000 ? "alto" : "normal" },
    { name: "Plaquetas", value: lastLab.plaquetas * 1000, unit: "/mm³", min: 0, max: 500000, refLow: 150000, refHigh: 400000, status: lastLab.plaquetas * 1000 < 150000 ? "baixo" : lastLab.plaquetas * 1000 > 400000 ? "alto" : "normal" },
    { name: "Reticulócitos", value: lastLab.reticulocitos, unit: "%", min: 0, max: 25, refLow: 0.5, refHigh: 2.5, status: lastLab.reticulocitos < 0.5 ? "baixo" : lastLab.reticulocitos > 2.5 ? "alto" : "normal" },
  ];

  // Differential leucogram
  const lastLeuc = lastLab.leucocitos;
  const neutPct = baseLab.neutrofilos / baseLab.leucocitos;
  const linfPct = baseLab.linfocitos / baseLab.leucocitos;
  const monoPct = baseLab.monocitos / baseLab.leucocitos;
  const eosPct = baseLab.eosinofilos / baseLab.leucocitos;
  const basoPct = baseLab.basofilos / baseLab.leucocitos;

  // Filgrastim shifts differential toward neutrophils
  const hasGCSF = drugs.some(d => d.class === "Fator estimulante colônias");
  const adjNeutPct = hasGCSF ? Math.min(0.9, neutPct + 0.2) : neutPct;
  const remaining = 1 - adjNeutPct;
  const origRemaining = linfPct + monoPct + eosPct + basoPct;

  const leucDifferential = [
    { name: "Neutrófilos", valor: Math.round(lastLeuc * adjNeutPct), pct: Math.round(adjNeutPct * 100) },
    { name: "Linfócitos", valor: Math.round(lastLeuc * (linfPct / origRemaining) * remaining), pct: Math.round((linfPct / origRemaining) * remaining * 100) },
    { name: "Monócitos", valor: Math.round(lastLeuc * (monoPct / origRemaining) * remaining), pct: Math.round((monoPct / origRemaining) * remaining * 100) },
    { name: "Eosinófilos", valor: Math.round(lastLeuc * (eosPct / origRemaining) * remaining), pct: Math.round((eosPct / origRemaining) * remaining * 100) },
    { name: "Basófilos", valor: Math.round(lastLeuc * (basoPct / origRemaining) * remaining), pct: Math.round((basoPct / origRemaining) * remaining * 100) },
  ];

  return { labTrend, sideEffectData, labGauges, leucDifferential, lastLab };
}

// ─── Gauge Component ─────────────────────────────────────────────────
function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : "bg-green-500/10 border-green-500/30";
  const label = status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲ ALTO" : "● NORMAL";
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className="text-xs text-muted-foreground font-medium">{name}</p>
      <p className={`text-xl font-bold ${color}`}>{typeof value === "number" && value > 999 ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      <Badge variant="outline" className={`text-[10px] mt-1 ${color}`}>{label}</Badge>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function SimuladorHemograma() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<HemoCase | null>(null);
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
    const t = setTimeout(() => setAnimStep(s => s + 1), 250);
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
    const hbImproved = simulation.lastLab.hb > (activeCase.baseLab?.hb ?? 10);
    const s = Math.round(drugScore + (hbImproved ? 30 : 0) + 20);
    setLastScore(s);
    const decisions: SimDecision[] = [
      { label: "Fármacos selecionados", userChoice: drugNames.join(", ") || "Nenhum", idealChoice: activeCase.expectedDrugs.join(", "), correct: expectedFound === activeCase.expectedDrugs.length, category: "Seleção farmacológica" },
      { label: "Melhora laboratorial", userChoice: `Hb: ${simulation.lastLab.hb}`, idealChoice: "Hb melhorou", correct: hbImproved, category: "Desfecho" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions("farmacoterapia-hemograma", decisions) });
    return s;
  }, [activeCase, selectedDrugs, simulation, submitted, submitResults]);

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
            <h1 className="text-2xl font-bold">Hemograma e Condutas Hematológicas</h1>
            <p className="text-muted-foreground">Interprete o hemograma completo e ajuste a farmacoterapia com base nos resultados laboratoriais.</p>
            <ShareToolButton toolSlug="farmacoterapia-hemograma" toolName="Hemograma e Condutas Hematológicas" /><AdminPromptViewer toolSlug="sim-farmacoterapia-hemograma" toolName="Hemograma" toolType="simulator" prompt={getNativePrompt("sim-farmacoterapia-hemograma") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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

  const leucColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-hemograma" toolName="Hemograma e Condutas Hematológicas" /></div>
      </div>


      {/* Patient */}
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Lab Panel Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Painel Laboratorial (após tratamento)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader>
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

            {selectedDrugIndices.length < 4 && (
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
              <Play className="h-4 w-4" /> {running ? "Simulando..." : "Iniciar Simulação"}
            </Button>
          </CardContent>
        </Card>

        {/* Trend Charts */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tendência Laboratorial (8 semanas)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Hb Trend */}
            <p className="text-sm font-semibold">Hemoglobina (g/dL)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[3, 18]} label={{ value: "Hb (g/dL)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={12} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "Ref ≥12", fill: "hsl(var(--chart-3))", fontSize: 10 }} />
                <Line type="monotone" dataKey="hb" name="Hb" stroke="hsl(var(--destructive))" dot strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>

            {/* Leucocytes Trend */}
            <p className="text-sm font-semibold">Leucócitos (/mm³)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Leuc/mm³", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={4000} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" />
                <ReferenceLine y={11000} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="leucocitos" name="Leucócitos" stroke="hsl(var(--chart-2))" dot strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leucogram Differential + Side Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Leucograma Diferencial</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={simulation.leucDifferential}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis label={{ value: "/mm³", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any, n: any, p: any) => [`${v.toLocaleString()} (${p.payload.pct}%)`, "Absoluto"]} />
                <Bar dataKey="valor" name="Absoluto" radius={[4, 4, 0, 0]}>
                  {simulation.leucDifferential.map((_, i) => <Cell key={i} fill={leucColors[i % leucColors.length]} />)}
                </Bar>
              </BarChart>
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

      {/* Initial Lab Values */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-2">🔬 Valores Laboratoriais Iniciais</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            <div><strong>Hb:</strong> {activeCase.baseLab.hb} g/dL</div>
            <div><strong>Ht:</strong> {activeCase.baseLab.ht}%</div>
            <div><strong>VCM:</strong> {activeCase.baseLab.vcm} fL</div>
            <div><strong>HCM:</strong> {activeCase.baseLab.hcm} pg</div>
            <div><strong>CHCM:</strong> {activeCase.baseLab.chcm} g/dL</div>
            <div><strong>RDW:</strong> {activeCase.baseLab.rdw}%</div>
            <div><strong>Leucócitos:</strong> {activeCase.baseLab.leucocitos.toLocaleString()}</div>
            <div><strong>Neutrófilos:</strong> {activeCase.baseLab.neutrofilos.toLocaleString()}</div>
            <div><strong>Linfócitos:</strong> {activeCase.baseLab.linfocitos.toLocaleString()}</div>
            <div><strong>Plaquetas:</strong> {(activeCase.baseLab.plaquetas * 1000).toLocaleString()}</div>
            <div><strong>Reticulócitos:</strong> {activeCase.baseLab.reticulocitos}%</div>
            <div><strong>Ferritina:</strong> {activeCase.baseLab.ferritina} ng/mL</div>
            <div><strong>Ferro:</strong> {activeCase.baseLab.ferro} µg/dL</div>
            <div><strong>TIBC:</strong> {activeCase.baseLab.tibc} µg/dL</div>
            <div><strong>B12:</strong> {activeCase.baseLab.b12} pg/mL</div>
            <div><strong>Folato:</strong> {activeCase.baseLab.folato} ng/mL</div>
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
            challengeSet={getHemogramaChallenges(activeCaseIndex >= 0 ? activeCaseIndex : undefined)}
            simulatorState={{
              drugs: selectedDrugs.map(d => d.name),
              drugClasses: selectedDrugs.map(d => d.class),
              doses: drugDoses,
              labGauges: simulation.labGauges,
              leucDifferential: simulation.leucDifferential,
              sideEffectData: simulation.sideEffectData,
              labTrend: simulation.labTrend,
              lastLab: simulation.lastLab,
              baseLab: activeCase.baseLab,
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
