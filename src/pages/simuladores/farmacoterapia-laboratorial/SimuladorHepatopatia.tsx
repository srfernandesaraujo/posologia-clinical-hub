import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, ShieldAlert, Activity, Beaker } from "lucide-react";
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
import { getHeppatopatiaChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-hepatopatia";

interface HepatoDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { alt: number; ast: number; fa: number; ggt: number; bilirrubinaT: number; albumina: number; inr: number };
  sideEffects: { hepatotox: number; gi: number; nefrotox: number; neurotox: number };
  daysToEffect: number;
}

const DRUGS: HepatoDrug[] = [
  { name: "N-Acetilcisteína (NAC)", class: "Antídoto", doseMin: 70, doseMax: 150, doseUnit: "mg/kg EV", doseStep: 10, effects: { alt: -200, ast: -180, fa: 0, ggt: 0, bilirrubinaT: -1, albumina: 0, inr: -0.3 }, sideEffects: { hepatotox: -0.3, gi: 0.15, nefrotox: 0, neurotox: 0 }, daysToEffect: 1 },
  { name: "Paracetamol", class: "Analgésico", doseMin: 500, doseMax: 4000, doseUnit: "mg/dia", doseStep: 500, effects: { alt: 50, ast: 45, fa: 0, ggt: 5, bilirrubinaT: 0.2, albumina: 0, inr: 0.1 }, sideEffects: { hepatotox: 0.4, gi: 0.05, nefrotox: 0.05, neurotox: 0 }, daysToEffect: 1 },
  { name: "Atorvastatina", class: "Estatina", doseMin: 10, doseMax: 80, doseUnit: "mg/dia", doseStep: 10, effects: { alt: 15, ast: 12, fa: 0, ggt: 0, bilirrubinaT: 0, albumina: 0, inr: 0 }, sideEffects: { hepatotox: 0.1, gi: 0.1, nefrotox: 0, neurotox: 0 }, daysToEffect: 7 },
  { name: "Isoniazida", class: "Tuberculostático", doseMin: 5, doseMax: 10, doseUnit: "mg/kg/dia", doseStep: 1, effects: { alt: 80, ast: 70, fa: 10, ggt: 15, bilirrubinaT: 0.5, albumina: -0.1, inr: 0.15 }, sideEffects: { hepatotox: 0.35, gi: 0.2, nefrotox: 0.05, neurotox: 0.15 }, daysToEffect: 14 },
  { name: "Fluconazol", class: "Azólico", doseMin: 100, doseMax: 400, doseUnit: "mg/dia", doseStep: 50, effects: { alt: 30, ast: 25, fa: 15, ggt: 20, bilirrubinaT: 0.3, albumina: 0, inr: 0.3 }, sideEffects: { hepatotox: 0.2, gi: 0.15, nefrotox: 0.1, neurotox: 0 }, daysToEffect: 3 },
  { name: "Lactulose", class: "Laxativo osmótico", doseMin: 15, doseMax: 60, doseUnit: "mL 8/8h", doseStep: 15, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: -0.2, albumina: 0, inr: 0 }, sideEffects: { hepatotox: 0, gi: 0.3, nefrotox: 0, neurotox: -0.3 }, daysToEffect: 1 },
  { name: "Rifaximina", class: "ATB intestinal", doseMin: 400, doseMax: 550, doseUnit: "mg 12/12h", doseStep: 50, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: -0.1, albumina: 0.1, inr: 0 }, sideEffects: { hepatotox: 0, gi: 0.1, nefrotox: 0, neurotox: -0.2 }, daysToEffect: 3 },
  { name: "Vitamina K (Fitomenadiona)", class: "Hemostático", doseMin: 5, doseMax: 20, doseUnit: "mg EV", doseStep: 5, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: 0, albumina: 0, inr: -0.5 }, sideEffects: { hepatotox: 0, gi: 0, nefrotox: 0, neurotox: 0 }, daysToEffect: 1 },
  { name: "Albumina Humana 20%", class: "Expansor plasmático", doseMin: 50, doseMax: 200, doseUnit: "mL EV", doseStep: 50, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: -0.1, albumina: 0.5, inr: 0 }, sideEffects: { hepatotox: 0, gi: 0.02, nefrotox: 0, neurotox: 0 }, daysToEffect: 0.5 },
];

interface HepatoCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: { alt: number; ast: number; fa: number; ggt: number; bilirrubinaD: number; bilirrubinaI: number; bilirrubinaT: number; albumina: number; tp: number; inr: number };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: HepatoCase[] = [
  {
    title: "Caso 1: Hepatotoxicidade por Paracetamol",
    difficulty: "Médio",
    patient: { name: "Lucas Martins", age: 22, weight: 70, sex: "M", specialGroup: [] },
    scenario: "Homem 22 anos, tentativa de suicídio com ingestão de 15g de paracetamol há 10 horas. Apresenta náuseas e dor em hipocôndrio direito. ALT e AST extremamente elevadas (padrão hepatocelular), INR alargado. Usar nomograma de Rumack-Matthew.",
    baseLab: { alt: 3500, ast: 3200, fa: 120, ggt: 85, bilirrubinaD: 2.5, bilirrubinaI: 1.5, bilirrubinaT: 4.0, albumina: 3.5, tp: 45, inr: 2.1 },
    expectedDrugs: ["N-Acetilcisteína (NAC)"],
    clinicalTip: "Hepatotoxicidade por paracetamol: ALT/AST podem ultrapassar 10.000. NAC é antídoto — repõe glutationa hepática. Máxima eficácia se iniciada <8h da ingestão, mas benefício até 24-72h. Dose Prescott: 150 mg/kg em 1h → 50 mg/kg em 4h → 100 mg/kg em 16h.",
    references: ["Rumack BH et al. Pediatrics 1975", "Bernal W et al. Lancet 2010"],
  },
  {
    title: "Caso 2: Hepatite Medicamentosa por Isoniazida",
    difficulty: "Médio",
    patient: { name: "Roberto Silva", age: 55, weight: 68, sex: "M", specialGroup: ["Etilista"] },
    scenario: "Homem 55 anos em tratamento para TB latente com isoniazida há 8 semanas. Etilista crônico. Apresenta icterícia, fadiga e inapetência. Hepatograma mostra padrão hepatocelular (ALT >5× LSN). Decisão: suspender INH?",
    baseLab: { alt: 520, ast: 480, fa: 140, ggt: 220, bilirrubinaD: 3.0, bilirrubinaI: 2.0, bilirrubinaT: 5.0, albumina: 3.2, tp: 55, inr: 1.5 },
    expectedDrugs: [],
    clinicalTip: "Hepatotoxicidade por INH: suspender se ALT >5× LSN assintomático ou >3× LSN com sintomas. Etilismo é fator de risco (indução CYP2E1 → mais hidrazina tóxica). Monitorar ALT mensalmente nos primeiros 3 meses. Não reintroduzir sem resolução completa.",
    references: ["ATS/IDSA Guidelines 2006", "Saukkonen JJ et al. AJRCCM 2006"],
  },
  {
    title: "Caso 3: Cirrose Child-Pugh C — Ajuste de Doses",
    difficulty: "Difícil",
    patient: { name: "Dona Aparecida", age: 62, weight: 55, sex: "F", specialGroup: ["Cirrose", "Ascite"] },
    scenario: "Mulher 62 anos com cirrose alcoólica avançada. Ascite volumosa, icterícia, encefalopatia grau II. Child-Pugh C (12 pontos). Albumina muito baixa, INR alargado, bilirrubina elevada. Necessita ajuste de todos os fármacos metabolizados pelo fígado.",
    baseLab: { alt: 85, ast: 120, fa: 180, ggt: 95, bilirrubinaD: 5.0, bilirrubinaI: 3.0, bilirrubinaT: 8.0, albumina: 2.0, tp: 35, inr: 2.5 },
    expectedDrugs: ["Lactulose", "Rifaximina", "Albumina Humana 20%"],
    clinicalTip: "Child-Pugh C: evitar hepatotóxicos, ajustar doses (paracetamol ≤2g/dia), preferir fármacos de eliminação renal. Encefalopatia hepática: lactulose (alvo 2-3 evacuações pastosas/dia) + rifaximina. Paracentese de alívio com reposição de albumina (8g/L removido).",
    references: ["Pugh RNH et al. Br J Surg 1973", "AASLD Practice Guidelines 2021"],
  },
  {
    title: "Caso 4: Interação Fluconazol + Estatina",
    difficulty: "Médio",
    patient: { name: "Marcos Oliveira", age: 48, weight: 82, sex: "M", specialGroup: ["DM2", "Dislipidemia"] },
    scenario: "Homem 48 anos em uso de atorvastatina 40 mg/dia. Inicia fluconazol 200 mg/dia para onicomicose. Após 2 semanas, apresenta mialgia intensa e elevação de ALT/AST/CPK. Risco de rabdomiólise por inibição do CYP3A4.",
    baseLab: { alt: 180, ast: 210, fa: 95, ggt: 65, bilirrubinaD: 0.3, bilirrubinaI: 0.5, bilirrubinaT: 0.8, albumina: 4.2, tp: 85, inr: 1.0 },
    expectedDrugs: [],
    clinicalTip: "Fluconazol inibe CYP3A4 e CYP2C9 → aumenta níveis de atorvastatina (substrato CYP3A4) → risco de rabdomiólise. Conduta: suspender estatina durante azólico ou trocar por pravastatina/rosuvastatina (menos CYP3A4-dependentes). Monitorar CPK e função renal.",
    references: ["Neuvonen PJ et al. Clin Pharmacol Ther 2006"],
  },
  {
    title: "Caso 5: Encefalopatia Hepática",
    difficulty: "Difícil",
    patient: { name: "Seu Joaquim", age: 68, weight: 60, sex: "M", specialGroup: ["Cirrose", "HDA prévia"] },
    scenario: "Homem 68 anos com cirrose por hepatite C. Admitido com confusão mental, flapping, inversão do ciclo sono-vigília. Amônia sérica elevada. Precipitante: constipação (3 dias sem evacuar) + infecção urinária. Hepatograma mostra função hepática muito comprometida.",
    baseLab: { alt: 60, ast: 95, fa: 160, ggt: 70, bilirrubinaD: 3.5, bilirrubinaI: 2.5, bilirrubinaT: 6.0, albumina: 2.3, tp: 40, inr: 2.2 },
    expectedDrugs: ["Lactulose", "Rifaximina"],
    clinicalTip: "Encefalopatia hepática: lactulose 15-30 mL 8/8h (alvo: 2-3 evacuações pastosas/dia) é 1ª linha. Rifaximina 550 mg 12/12h reduz recorrência em 50%. Identificar e tratar precipitante (constipação, infecção, HDA, desidratação, BZD). NÃO restringir proteínas.",
    references: ["Vilstrup H et al. Hepatology 2014", "Bass NM et al. NEJM 2010"],
  },
];

// ─── Child-Pugh Calculator ───────────────────────────────────────────
function calcChildPugh(lab: HepatoCase["baseLab"], encefalopatia: number, ascite: number): { score: number; class: string } {
  let score = 0;
  // Bilirrubina
  if (lab.bilirrubinaT < 2) score += 1; else if (lab.bilirrubinaT <= 3) score += 2; else score += 3;
  // Albumina
  if (lab.albumina > 3.5) score += 1; else if (lab.albumina >= 2.8) score += 2; else score += 3;
  // INR
  if (lab.inr < 1.7) score += 1; else if (lab.inr <= 2.3) score += 2; else score += 3;
  // Ascite
  score += ascite; // 1=ausente, 2=leve, 3=moderada-grave
  // Encefalopatia
  score += encefalopatia; // 1=ausente, 2=grau I-II, 3=grau III-IV
  const cls = score <= 6 ? "A" : score <= 9 ? "B" : "C";
  return { score, class: cls };
}

export default function SimuladorHepatopatia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { roomCase, isExam, enunciado } = useVirtualRoomCase(SLUG);
  const { cases: aiCases, isLoading: casesLoading, generateCase, isGenerating } = useSimulatorCases(SLUG);

  const [activeCase, setActiveCase] = useState<HepatoCase | null>(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
  const [selectedDrug, setSelectedDrug] = useState<HepatoDrug>(DRUGS[0]);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [encefalopatia, setEncefalopatia] = useState(1);
  const [ascite, setAscite] = useState(1);
  const [running, setRunning] = useState(false);
  const [day, setDay] = useState(0);

  // Lab state
  const [labValues, setLabValues] = useState<HepatoCase["baseLab"] | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  // ─── Virtual room auto-load ─────────────────────────────────────
  useEffect(() => {
    if (roomCase) {
      const rc = roomCase as any;
      const c: HepatoCase = {
        title: rc.title || "Caso da Sala Virtual",
        difficulty: rc.difficulty || "Médio",
        patient: rc.patient || { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        scenario: rc.scenario || rc.enunciado || "",
        baseLab: rc.baseLab || BUILT_IN_CASES[0].baseLab,
        expectedDrugs: rc.expectedDrugs || [],
        clinicalTip: rc.clinicalTip || "",
        references: rc.references || [],
        isAI: true,
      };
      setActiveCase(c);
      setLabValues(c.baseLab);
      setTrendData([{ day: 0, alt: c.baseLab.alt, ast: c.baseLab.ast, bilirrubinaT: c.baseLab.bilirrubinaT, albumina: c.baseLab.albumina, inr: c.baseLab.inr }]);
    }
  }, [roomCase]);

  const loadCase = useCallback((c: HepatoCase, idx: number) => {
    setActiveCase(c);
    setActiveCaseIndex(idx);
    setLabValues(c.baseLab);
    setDay(0);
    setRunning(false);
    setTrendData([{ day: 0, alt: c.baseLab.alt, ast: c.baseLab.ast, bilirrubinaT: c.baseLab.bilirrubinaT, albumina: c.baseLab.albumina, inr: c.baseLab.inr }]);
    setSelectedDrug(DRUGS[0]);
    setDose(DRUGS[0].doseMin);
    setEncefalopatia(1);
    setAscite(1);
  }, []);

  // ─── Simulate ──────────────────────────────────────────────────
  const simulate = useCallback(() => {
    if (!labValues || !activeCase) return;
    setRunning(true);
    const baseLab = activeCase.baseLab;
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    const intensity = 0.3 + doseFraction * 0.7;

    const newTrend: any[] = [...trendData];
    let current = { ...labValues };

    for (let d = 1; d <= 7; d++) {
      const progress = d >= selectedDrug.daysToEffect ? Math.min((d - selectedDrug.daysToEffect + 1) / 5, 1) : 0;
      const alt = Math.max(5, baseLab.alt + selectedDrug.effects.alt * intensity * progress);
      const ast = Math.max(5, baseLab.ast + selectedDrug.effects.ast * intensity * progress);
      const bilirrubinaT = Math.max(0.2, baseLab.bilirrubinaT + selectedDrug.effects.bilirrubinaT * intensity * progress);
      const albumina = Math.min(5.5, Math.max(1.0, baseLab.albumina + selectedDrug.effects.albumina * intensity * progress));
      const inr = Math.max(0.8, baseLab.inr + selectedDrug.effects.inr * intensity * progress);
      const fa = Math.max(20, baseLab.fa + selectedDrug.effects.fa * intensity * progress);
      const ggt = Math.max(5, baseLab.ggt + selectedDrug.effects.ggt * intensity * progress);

      current = { ...baseLab, alt, ast, fa, ggt, bilirrubinaT, bilirrubinaD: bilirrubinaT * 0.6, bilirrubinaI: bilirrubinaT * 0.4, albumina, inr, tp: Math.max(10, 100 / inr) };
      newTrend.push({ day: trendData.length + d - 1, alt: Math.round(alt), ast: Math.round(ast), bilirrubinaT: +bilirrubinaT.toFixed(1), albumina: +albumina.toFixed(1), inr: +inr.toFixed(1) });
    }

    setLabValues(current);
    setTrendData(newTrend);
    setDay(prev => prev + 7);
  }, [labValues, activeCase, dose, selectedDrug, trendData]);

  // ─── Side effects ────────────────────────────────────────────────
  const sideEffectData = useMemo(() => {
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    return Object.entries(selectedDrug.sideEffects).map(([key, val]) => ({
      name: key === "hepatotox" ? "Hepatotoxicidade" : key === "gi" ? "GI" : key === "nefrotox" ? "Nefrotoxicidade" : "Neurotoxicidade",
      value: Math.round(Math.max(0, val * (0.5 + doseFraction * 0.8)) * 100),
    }));
  }, [selectedDrug, dose]);

  // ─── Child-Pugh ──────────────────────────────────────────────────
  const childPugh = useMemo(() => {
    if (!labValues) return { score: 5, class: "A" };
    return calcChildPugh(labValues, encefalopatia, ascite);
  }, [labValues, encefalopatia, ascite]);

  // ─── SimulatorState for challenges ──────────────────────────────
  const simulatorState = useMemo(() => ({
    selectedDrug: selectedDrug.name,
    dose,
    labValues,
    childPugh,
    encefalopatia,
    ascite,
    sideEffectData,
    day,
  }), [selectedDrug, dose, labValues, childPugh, encefalopatia, ascite, sideEffectData, day]);

  // ─── Decisions ──────────────────────────────────────────────────
  const decisions: SimDecision[] = useMemo(() => {
    if (!activeCase || !labValues) return [];
    return buildSimulatorDecisions({
      drug: selectedDrug.name,
      dose: `${dose} ${selectedDrug.doseUnit}`,
      encefalopatia: encefalopatia === 1 ? "Ausente" : encefalopatia === 2 ? "Grau I-II" : "Grau III-IV",
      ascite: ascite === 1 ? "Ausente" : ascite === 2 ? "Leve" : "Mod-Grave",
      childPugh: `${childPugh.class} (${childPugh.score} pts)`,
      alt: labValues.alt,
      ast: labValues.ast,
      inr: labValues.inr,
      albumina: labValues.albumina,
      bilirrubinaT: labValues.bilirrubinaT,
    });
  }, [activeCase, labValues, selectedDrug, dose, encefalopatia, ascite, childPugh]);

  // ─── Gauge helper ───────────────────────────────────────────────
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

  // ─── Child-Pugh Badge ──────────────────────────────────────────
  const childPughColor = childPugh.class === "A" ? "bg-green-500/20 text-green-400" : childPugh.class === "B" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400";

  // ─── RENDER ────────────────────────────────────────────────────
  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Hepatopatias e Ajuste Terapêutico</h1>
            <p className="text-sm text-muted-foreground">Interprete hepatograma, calcule Child-Pugh e ajuste doses em hepatopatas</p>
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
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4 text-primary" /> Controles</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium">Fármaco</label>
              <Select value={selectedDrug.name} onValueChange={v => { const d = DRUGS.find(x => x.name === v)!; setSelectedDrug(d); setDose(d.doseMin); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Dose: {dose} {selectedDrug.doseUnit}</label>
              <Slider min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} value={[dose]} onValueChange={v => setDose(v[0])} />
            </div>
            <div>
              <label className="text-xs font-medium">Encefalopatia</label>
              <Select value={String(encefalopatia)} onValueChange={v => setEncefalopatia(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ausente</SelectItem>
                  <SelectItem value="2">Grau I-II</SelectItem>
                  <SelectItem value="3">Grau III-IV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Ascite</label>
              <Select value={String(ascite)} onValueChange={v => setAscite(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ausente</SelectItem>
                  <SelectItem value="2">Leve</SelectItem>
                  <SelectItem value="3">Moderada-Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={simulate} className="w-full gap-2"><Play className="h-4 w-4" /> Simular 7 dias</Button>
          </CardContent>
        </Card>

        {/* Lab Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Hepatograma
              <Badge className={`ml-auto ${childPughColor}`}>Child-Pugh {childPugh.class} ({childPugh.score} pts)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {labValues && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {labGauge("ALT", labValues.alt, "U/L", 7, 56, 5000)}
                {labGauge("AST", labValues.ast, "U/L", 10, 40, 5000)}
                {labGauge("FA", labValues.fa, "U/L", 44, 147, 800)}
                {labGauge("GGT", labValues.ggt, "U/L", 9, 48, 500)}
                {labGauge("Bili T", labValues.bilirrubinaT, "mg/dL", 0.1, 1.2, 20)}
                {labGauge("Bili D", labValues.bilirrubinaD, "mg/dL", 0, 0.3, 10)}
                {labGauge("Albumina", labValues.albumina, "g/dL", 3.5, 5.5, 6)}
                {labGauge("TP", labValues.tp, "%", 70, 100, 100)}
                {labGauge("INR", labValues.inr, "", 0.8, 1.2, 5)}
              </div>
            )}

            {/* Trend chart */}
            {trendData.length > 1 && (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Dia", position: "insideBottom", offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="alt" name="ALT" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="ast" name="AST" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="bilirrubinaT" name="Bili T" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="inr" name="INR" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 2 }} />
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
          <div className="h-[120px]">
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

      {/* Clinical Tip */}
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

      {/* Challenges */}
      <SimulatorChallengeMode
        simulatorSlug={SLUG}
        getChallenges={getHeppatopatiaChallenges}
        activeCaseIndex={activeCaseIndex >= 0 ? activeCaseIndex : undefined}
        simulatorState={simulatorState}
        decisions={decisions}
      />
      {isExam && <ExamFeedbackOverlay decisions={decisions} />}
    </div>
  );
}
