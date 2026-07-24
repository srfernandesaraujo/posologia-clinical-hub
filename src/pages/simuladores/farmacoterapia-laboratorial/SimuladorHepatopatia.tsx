import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Beaker, Activity, ShieldAlert } from "lucide-react";
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
import { ShareToolButton } from "@/components/ShareToolButton";
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
  { name: "Vitamina K", class: "Hemostático", doseMin: 5, doseMax: 20, doseUnit: "mg EV", doseStep: 5, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: 0, albumina: 0, inr: -0.5 }, sideEffects: { hepatotox: 0, gi: 0, nefrotox: 0, neurotox: 0 }, daysToEffect: 1 },
  { name: "Albumina 20%", class: "Expansor plasmático", doseMin: 50, doseMax: 200, doseUnit: "mL EV", doseStep: 50, effects: { alt: 0, ast: 0, fa: 0, ggt: 0, bilirrubinaT: -0.1, albumina: 0.5, inr: 0 }, sideEffects: { hepatotox: 0, gi: 0.02, nefrotox: 0, neurotox: 0 }, daysToEffect: 0.5 },
];

interface HepatoCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
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
    patient: { name: "Lucas Martins", age: 22, weight: 70, sex: "M", specialGroup: [], diagnosis: "Intoxicação por paracetamol — ALT/AST >3000, INR 2.1" },
    scenario: "Homem 22a, ingestão de 15g de paracetamol há 10h. Náuseas e dor em HCD. ALT/AST extremamente elevadas, INR alargado.",
    baseLab: { alt: 3500, ast: 3200, fa: 120, ggt: 85, bilirrubinaD: 2.5, bilirrubinaI: 1.5, bilirrubinaT: 4.0, albumina: 3.5, tp: 45, inr: 2.1 },
    expectedDrugs: ["N-Acetilcisteína (NAC)"],
    clinicalTip: "Hepatotoxicidade por paracetamol: NAC repõe glutationa. Máxima eficácia <8h. Dose Prescott: 150→50→100 mg/kg. ALT/AST podem ultrapassar 10.000.",
    references: ["Rumack BH et al. Pediatrics 1975", "Bernal W et al. Lancet 2010"],
  },
  {
    title: "Caso 2: Hepatite por Isoniazida",
    difficulty: "Médio",
    patient: { name: "Roberto Silva", age: 55, weight: 68, sex: "M", specialGroup: ["Etilista"], diagnosis: "Hepatite medicamentosa — ALT >5×LSN + icterícia" },
    scenario: "Homem 55a, TB latente com INH há 8 semanas. Etilista. Icterícia, fadiga. ALT >5× LSN.",
    baseLab: { alt: 520, ast: 480, fa: 140, ggt: 220, bilirrubinaD: 3.0, bilirrubinaI: 2.0, bilirrubinaT: 5.0, albumina: 3.2, tp: 55, inr: 1.5 },
    expectedDrugs: [],
    clinicalTip: "Hepatotoxicidade por INH: suspender se ALT >5× assintomático ou >3× com sintomas. Etilismo = fator de risco (CYP2E1).",
    references: ["ATS/IDSA 2006"],
  },
  {
    title: "Caso 3: Cirrose Child-Pugh C",
    difficulty: "Difícil",
    patient: { name: "Dona Aparecida", age: 62, weight: 55, sex: "F", specialGroup: ["Cirrose", "Ascite"], diagnosis: "Cirrose avançada Child C — encefalopatia grau II" },
    scenario: "Mulher 62a, cirrose alcoólica. Ascite volumosa, icterícia, encefalopatia grau II. Child-Pugh C (12 pts). Albumina baixa, INR alto.",
    baseLab: { alt: 85, ast: 120, fa: 180, ggt: 95, bilirrubinaD: 5.0, bilirrubinaI: 3.0, bilirrubinaT: 8.0, albumina: 2.0, tp: 35, inr: 2.5 },
    expectedDrugs: ["Lactulose", "Rifaximina", "Albumina 20%"],
    clinicalTip: "Child C: evitar hepatotóxicos, paracetamol ≤2g/dia. Encefalopatia: lactulose 15-30mL 8/8h + rifaximina 550mg 12/12h.",
    references: ["AASLD 2021"],
  },
  {
    title: "Caso 4: Interação Fluconazol + Estatina",
    difficulty: "Médio",
    patient: { name: "Marcos Oliveira", age: 48, weight: 82, sex: "M", specialGroup: ["DM2"], diagnosis: "Mialgia + elevação ALT/AST/CPK por interação CYP3A4" },
    scenario: "Homem 48a em atorvastatina 40mg. Inicia fluconazol 200mg para onicomicose. Após 2 semanas: mialgia intensa, ALT/AST/CPK elevados.",
    baseLab: { alt: 180, ast: 210, fa: 95, ggt: 65, bilirrubinaD: 0.3, bilirrubinaI: 0.5, bilirrubinaT: 0.8, albumina: 4.2, tp: 85, inr: 1.0 },
    expectedDrugs: [],
    clinicalTip: "Fluconazol inibe CYP3A4 → aumenta atorvastatina → risco rabdomiólise. Suspender estatina ou trocar para pravastatina/rosuvastatina.",
    references: ["Neuvonen PJ et al. 2006"],
  },
  {
    title: "Caso 5: Encefalopatia Hepática",
    difficulty: "Difícil",
    patient: { name: "Seu Joaquim", age: 68, weight: 60, sex: "M", specialGroup: ["Cirrose"], diagnosis: "Encefalopatia hepática — confusão + flapping + amônia↑" },
    scenario: "Homem 68a, cirrose HCV. Confusão mental, flapping. Precipitante: constipação 3 dias + ITU.",
    baseLab: { alt: 60, ast: 95, fa: 160, ggt: 70, bilirrubinaD: 3.5, bilirrubinaI: 2.5, bilirrubinaT: 6.0, albumina: 2.3, tp: 40, inr: 2.2 },
    expectedDrugs: ["Lactulose", "Rifaximina"],
    clinicalTip: "Lactulose 1ª linha (alvo 2-3 evacuações/dia) + rifaximina reduz recorrência 50%. Tratar precipitante. NÃO restringir proteínas.",
    references: ["Vilstrup H et al. Hepatology 2014"],
  },
];

function calcChildPugh(lab: HepatoCase["baseLab"], encefalopatia: number, ascite: number) {
  let s = 0;
  s += lab.bilirrubinaT < 2 ? 1 : lab.bilirrubinaT <= 3 ? 2 : 3;
  s += lab.albumina > 3.5 ? 1 : lab.albumina >= 2.8 ? 2 : 3;
  s += lab.inr < 1.7 ? 1 : lab.inr <= 2.3 ? 2 : 3;
  s += ascite; s += encefalopatia;
  return { score: s, class: s <= 6 ? "A" : s <= 9 ? "B" : "C" as string };
}

function computeSimulation(drug: HepatoDrug, dose: number, baseLab: HepatoCase["baseLab"]) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.3 + doseFrac * 0.7;
  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = d >= drug.daysToEffect ? Math.min((d - drug.daysToEffect + 1) / 5, 1) : 0;
    trend.push({
      day: d,
      alt: Math.max(5, Math.round(baseLab.alt + drug.effects.alt * intensity * p)),
      ast: Math.max(5, Math.round(baseLab.ast + drug.effects.ast * intensity * p)),
      bilirrubinaT: Math.max(0.2, +(baseLab.bilirrubinaT + drug.effects.bilirrubinaT * intensity * p).toFixed(1)),
      albumina: Math.max(1, +(baseLab.albumina + drug.effects.albumina * intensity * p).toFixed(1)),
      inr: Math.max(0.8, +(baseLab.inr + drug.effects.inr * intensity * p).toFixed(1)),
    });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({
    name: k === "hepatotox" ? "Hepatotoxicidade" : k === "gi" ? "GI" : k === "nefrotox" ? "Nefrotoxicidade" : "Neurotoxicidade",
    risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100),
  }));
  const labGauges = [
    { name: "ALT", value: last.alt, unit: "U/L", refLow: 7, refHigh: 56, status: last.alt > 56 ? "alto" : "normal" },
    { name: "AST", value: last.ast, unit: "U/L", refLow: 10, refHigh: 40, status: last.ast > 40 ? "alto" : "normal" },
    { name: "Bili T", value: last.bilirrubinaT, unit: "mg/dL", refLow: 0.1, refHigh: 1.2, status: last.bilirrubinaT > 1.2 ? "alto" : "normal" },
    { name: "Albumina", value: last.albumina, unit: "g/dL", refLow: 3.5, refHigh: 5.5, status: last.albumina < 3.5 ? "baixo" : "normal" },
    { name: "INR", value: last.inr, unit: "", refLow: 0.8, refHigh: 1.2, status: last.inr > 1.2 ? "alto" : "normal" },
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

export default function SimuladorHepatopatia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<HepatoCase | null>(null);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [encefalopatia, setEncefalopatia] = useState(1);
  const [ascite, setAscite] = useState(1);
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
  const childPugh = useMemo(() => {
    const lab = activeCase ? { ...activeCase.baseLab, ...simulation.lastLab, bilirrubinaT: simulation.lastLab.bilirrubinaT } : BUILT_IN_CASES[0].baseLab;
    return calcChildPugh(lab as any, encefalopatia, ascite);
  }, [activeCase, simulation.lastLab, encefalopatia, ascite]);
  const cpColor = childPugh.class === "A" ? "text-green-500" : childPugh.class === "B" ? "text-yellow-500" : "text-destructive";

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
            <h1 className="text-2xl font-bold">Hepatopatias e Ajuste Terapêutico</h1>
            <p className="text-muted-foreground">Interprete hepatograma, calcule Child-Pugh e ajuste doses em hepatopatas.</p>
            <ShareToolButton toolSlug="farmacoterapia-hepatopatia" toolName="Hepatopatias e Ajuste Hepático" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Hepatopatias" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
        <Badge className={`ml-auto ${cpColor}`}>Child-Pugh {childPugh.class} ({childPugh.score}pts)</Badge>
        <ShareToolButton toolSlug="farmacoterapia-hepatopatia" toolName="Hepatopatias e Ajuste Hepático" />
      </div>

      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Lab Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Hepatograma (após tratamento)</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent>
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
            <div>
              <label className="text-xs font-medium">Encefalopatia</label>
              <Select value={String(encefalopatia)} onValueChange={v => setEncefalopatia(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Ausente</SelectItem><SelectItem value="2">Grau I-II</SelectItem><SelectItem value="3">Grau III-IV</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Ascite</label>
              <Select value={String(ascite)} onValueChange={v => setAscite(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Ausente</SelectItem><SelectItem value="2">Leve</SelectItem><SelectItem value="3">Mod-Grave</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 7 dias"}</Button>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tendência Laboratorial (7 dias)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={displayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="alt" name="ALT" stroke="hsl(var(--chart-1))" strokeWidth={2} dot />
                <Line type="monotone" dataKey="ast" name="AST" stroke="hsl(var(--chart-2))" strokeWidth={2} dot />
                <Line type="monotone" dataKey="inr" name="INR" stroke="hsl(var(--chart-4))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} />
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
        return <SimulatorChallengeMode challengeSet={getHeppatopatiaChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, childPugh, encefalopatia, ascite }} onComplete={() => setChallengeCompleted(true)} />;
      })()}

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando em 15s...</p></div>
      ) : (
        <div className="space-y-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div></div><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ))}
    </div>
  );
}
