import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Droplets, Activity, ShieldAlert } from "lucide-react";
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
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getRenalChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-renal";

interface RenalDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { creatinina: number; ureia: number; k: number; na: number };
  sideEffects: { nefrotox: number; ototox: number; gi: number; hipocalemia: number; hipoglicemia: number };
  contraindicatedBelow: number;
}

const DRUGS: RenalDrug[] = [
  { name: "Vancomicina", class: "Glicopeptídeo", doseMin: 500, doseMax: 2000, doseUnit: "mg EV 12/12h", doseStep: 250, effects: { creatinina: 0.3, ureia: 5, k: 0.1, na: 0 }, sideEffects: { nefrotox: 0.3, ototox: 0.15, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, contraindicatedBelow: 0 },
  { name: "Gentamicina", class: "Aminoglicosídeo", doseMin: 1, doseMax: 7, doseUnit: "mg/kg/dia", doseStep: 0.5, effects: { creatinina: 0.5, ureia: 8, k: -0.2, na: 0 }, sideEffects: { nefrotox: 0.45, ototox: 0.25, gi: 0.05, hipocalemia: 0.1, hipoglicemia: 0 }, contraindicatedBelow: 0 },
  { name: "Metformina", class: "Biguanida", doseMin: 500, doseMax: 2550, doseUnit: "mg/dia", doseStep: 250, effects: { creatinina: 0, ureia: 0, k: 0, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.3, hipocalemia: 0, hipoglicemia: 0.05 }, contraindicatedBelow: 30 },
  { name: "Digoxina", class: "Glicosídeo cardíaco", doseMin: 0.0625, doseMax: 0.25, doseUnit: "mg/dia", doseStep: 0.0625, effects: { creatinina: 0, ureia: 0, k: -0.1, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.2, hipocalemia: 0.1, hipoglicemia: 0 }, contraindicatedBelow: 0 },
  { name: "Ibuprofeno", class: "AINE", doseMin: 200, doseMax: 1200, doseUnit: "mg/dia", doseStep: 200, effects: { creatinina: 0.4, ureia: 6, k: 0.3, na: -2 }, sideEffects: { nefrotox: 0.4, ototox: 0, gi: 0.25, hipocalemia: 0, hipoglicemia: 0 }, contraindicatedBelow: 30 },
  { name: "Alopurinol", class: "Inib. XO", doseMin: 100, doseMax: 600, doseUnit: "mg/dia", doseStep: 100, effects: { creatinina: 0, ureia: -3, k: 0, na: 0 }, sideEffects: { nefrotox: 0.05, ototox: 0, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, contraindicatedBelow: 0 },
  { name: "Gabapentina", class: "Anticonvulsivante", doseMin: 100, doseMax: 1200, doseUnit: "mg 8/8h", doseStep: 100, effects: { creatinina: 0, ureia: 0, k: 0, na: -1 }, sideEffects: { nefrotox: 0, ototox: 0, gi: 0.1, hipocalemia: 0, hipoglicemia: 0 }, contraindicatedBelow: 0 },
  { name: "Lítio", class: "Estabilizador humor", doseMin: 300, doseMax: 1200, doseUnit: "mg/dia", doseStep: 150, effects: { creatinina: 0.15, ureia: 2, k: 0, na: -1 }, sideEffects: { nefrotox: 0.2, ototox: 0, gi: 0.2, hipocalemia: 0, hipoglicemia: 0 }, contraindicatedBelow: 0 },
];

interface RenalCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: { creatinina: number; ureia: number; k: number; na: number; ca: number; fosforo: number; hb: number };
  expectedDrugs: string[]; clinicalTip: string; references: string[];
}

const BUILT_IN_CASES: RenalCase[] = [
  { title: "Caso 1: Vancomicina em DRC G3", difficulty: "Médio", patient: { name: "Carlos Eduardo", age: 58, weight: 75, sex: "M", specialGroup: ["DRC G3b", "DM2"], diagnosis: "Osteomielite MRSA — ajuste de vancomicina por ClCr" }, scenario: "Homem 58a, DRC G3b (TFG 38), DM2, osteomielite por MRSA. Cr 2.1. Ajustar dose e intervalo.", baseLab: { creatinina: 2.1, ureia: 68, k: 4.8, na: 138, ca: 8.5, fosforo: 5.2, hb: 10.5 }, expectedDrugs: ["Vancomicina"], clinicalTip: "Vancomicina em DRC: vale 15-20 mcg/mL para MRSA. ClCr 30-50: 15mg/kg a cada 24-48h.", references: ["IDSA MRSA 2011", "Rybak MJ 2020"] },
  { title: "Caso 2: Metformina em DRC G4", difficulty: "Fácil", patient: { name: "Dona Maria", age: 72, weight: 62, sex: "F", specialGroup: ["DRC G4", "DM2"], diagnosis: "DM2 com TFG 18 — metformina contraindicada" }, scenario: "Mulher 72a, DM2, metformina 2g/dia. Cr subiu para 2.8 (TFG ~18). Metformina CONTRAINDICADA.", baseLab: { creatinina: 2.8, ureia: 95, k: 5.2, na: 136, ca: 8.0, fosforo: 6.1, hb: 9.8 }, expectedDrugs: [], clinicalTip: "Metformina: CI se TFG <30 (risco acidose láctica). Alternativas: linagliptina, insulina.", references: ["ADA 2023", "KDIGO 2022"] },
  { title: "Caso 3: Nefrotoxicidade por Gentamicina", difficulty: "Difícil", patient: { name: "José Antônio", age: 65, weight: 70, sex: "M", specialGroup: ["DRC G2"], diagnosis: "Endocardite — Cr subindo com aminoglicosídeo" }, scenario: "Homem 65a, endocardite. Gentamicina+ampicilina há 10 dias. Cr: 1.3→1.8→2.5.", baseLab: { creatinina: 2.5, ureia: 72, k: 4.5, na: 140, ca: 9.0, fosforo: 4.5, hb: 11.5 }, expectedDrugs: ["Gentamicina"], clinicalTip: "Nefrotoxicidade por aminoglicosídeo: 10-25% dos pacientes. FR: uso >7d, desidratação, AINEs.", references: ["Beaucaire G 2000"] },
  { title: "Caso 4: AINE em Idoso — DRC G2→G4", difficulty: "Médio", patient: { name: "Dona Francisca", age: 78, weight: 55, sex: "F", specialGroup: ["HAS"], diagnosis: "IRA pré-renal por AINE — triplo whammy" }, scenario: "Mulher 78a, osteoartrose, ibuprofeno 1200mg/dia há 3 meses. Cr: 1.1→2.3.", baseLab: { creatinina: 2.3, ureia: 78, k: 5.5, na: 134, ca: 8.8, fosforo: 5.0, hb: 10.8 }, expectedDrugs: [], clinicalTip: "AINEs causam IRA pré-renal (inibição PGE2). Triplo whammy: AINE+IECA+diurético. Alternativas: paracetamol.", references: ["Harirforoosh S 2009"] },
  { title: "Caso 5: Toxicidade Digitálica por DRC", difficulty: "Difícil", patient: { name: "Seu Benedito", age: 82, weight: 65, sex: "M", specialGroup: ["ICC", "FA", "DRC G3a"], diagnosis: "Digoxina 3.2 ng/mL — bradicardia + visão amarelada" }, scenario: "Homem 82a, ICC+FA, digoxina 0.25mg/dia. TFG 42. Náusea, visão amarelada, FC 48. Nível: 3.2 ng/mL.", baseLab: { creatinina: 1.8, ureia: 58, k: 3.2, na: 140, ca: 9.2, fosforo: 4.0, hb: 12.0 }, expectedDrugs: ["Digoxina"], clinicalTip: "Digoxina: 85% renal. Em DRC: 0.0625-0.125mg/dia. Hipocalemia potencializa toxicidade.", references: ["Bauman JL 2006"] },
];

function calcClCr(age: number, weight: number, cr: number, sex: string) {
  const b = ((140 - age) * weight) / (72 * cr);
  return Math.round(sex === "F" ? b * 0.85 : b);
}
function drcStage(c: number) {
  if (c >= 90) return { stage: "G1", color: "text-green-500" };
  if (c >= 60) return { stage: "G2", color: "text-green-400" };
  if (c >= 45) return { stage: "G3a", color: "text-yellow-400" };
  if (c >= 30) return { stage: "G3b", color: "text-orange-400" };
  if (c >= 15) return { stage: "G4", color: "text-red-400" };
  return { stage: "G5", color: "text-red-600" };
}

function computeSimulation(drug: RenalDrug, dose: number, baseLab: RenalCase["baseLab"], clCr: number) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.3 + doseFrac * 0.7;
  const accumFactor = clCr < 30 ? 2.0 : clCr < 60 ? 1.5 : 1.0;
  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = Math.min(d / 5, 1);
    trend.push({
      day: d,
      creatinina: +(Math.max(0.5, baseLab.creatinina + drug.effects.creatinina * intensity * p * accumFactor)).toFixed(2),
      ureia: Math.round(Math.max(10, baseLab.ureia + drug.effects.ureia * intensity * p * accumFactor)),
      k: +(Math.max(2.5, Math.min(7, baseLab.k + drug.effects.k * intensity * p))).toFixed(1),
    });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({
    name: k === "nefrotox" ? "Nefrotoxicidade" : k === "ototox" ? "Ototoxicidade" : k === "gi" ? "GI" : k === "hipocalemia" ? "Hipocalemia" : "Hipoglicemia",
    risco: Math.min(100, Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8) * accumFactor) * 100)),
  }));
  const labGauges = [
    { name: "Creatinina", value: last.creatinina, unit: "mg/dL", status: last.creatinina > 1.3 ? "alto" : "normal" },
    { name: "Ureia", value: last.ureia, unit: "mg/dL", status: last.ureia > 45 ? "alto" : "normal" },
    { name: "K⁺", value: last.k, unit: "mEq/L", status: last.k > 5.0 ? "alto" : last.k < 3.5 ? "baixo" : "normal" },
    { name: "Na⁺", value: baseLab.na, unit: "mEq/L", status: baseLab.na < 135 ? "baixo" : "normal" },
    { name: "Ca²⁺", value: baseLab.ca, unit: "mg/dL", status: baseLab.ca < 8.5 ? "baixo" : "normal" },
    { name: "Hb", value: baseLab.hb, unit: "g/dL", status: baseLab.hb < 12 ? "baixo" : "normal" },
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

export default function SimuladorRenal() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<RenalCase | null>(null);
  const isEmbed = useIsEmbed();
  const embedCaseId = useEmbedCaseId();
  useEffect(() => {
    if (isEmbed && embedCaseId && !activeCase) {
      const decoded = decodeURIComponent(embedCaseId);
      const found = BUILT_IN_CASES.find((c: any) => c.title === decoded);
      if (found) setActiveCase(found as any);
    }
  }, [isEmbed, embedCaseId, activeCase]);
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
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient ?? { name: "Paciente", age: 60, weight: 70, sex: "M", specialGroup: [] }, scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [] });
    }
  }, [virtualRoomCase]);

  const clCr = useMemo(() => activeCase ? calcClCr(activeCase.patient.age, activeCase.patient.weight, activeCase.baseLab.creatinina, activeCase.patient.sex) : 90, [activeCase]);
  const drc = useMemo(() => drcStage(clCr), [clCr]);
  const isContraindicated = selectedDrug.contraindicatedBelow > 0 && clCr < selectedDrug.contraindicatedBelow;

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab, clCr), [selectedDrug, dose, activeCase?.baseLab, clCr]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);

  useEffect(() => { if (!running) return; if (animStep >= simulation.trend.length - 1) { setRunning(false); return; } const t = setTimeout(() => setAnimStep(s => s + 1), 300); return () => clearTimeout(t); }, [running, animStep, simulation.trend.length]);
  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const s = lastScore || 70;
    const decisions: SimDecision[] = [{ label: "Fármaco", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" }];
    submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) });
  }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 60, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [] });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Disfunção Renal e Ajuste de Dose</h1>
            <p className="text-muted-foreground">Calcule ClCr/TFG, classifique DRC e ajuste doses de nefrotóxicos.</p>
            <ShareToolButton toolSlug="farmacoterapia-renal" toolName="Função Renal e Ajuste de Dose" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Disfunção Renal" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader><CardContent className="space-y-3">
          {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
          {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />)}
          {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
        </CardContent></Card>
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
        <div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-renal" toolName="Função Renal e Ajuste de Dose" caseId={activeCase.title} /></div>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* ClCr + DRC */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 flex items-center gap-4 flex-wrap">
          <div><p className="text-xs text-muted-foreground">Cockcroft-Gault</p><p className="text-2xl font-mono font-bold text-primary">{clCr} <span className="text-xs">mL/min</span></p></div>
          <Badge className={drc.color}>DRC {drc.stage}</Badge>
          {isContraindicated && <Badge variant="destructive">⚠️ CI com ClCr &lt;{selectedDrug.contraindicatedBelow}</Badge>}
        </CardContent>
      </Card>

      {/* Lab Gauges */}
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Função Renal (após tratamento)</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader><CardContent className="space-y-4">
          <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent></Select>
          <div><div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} /></div>
          <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 7 dias"}</Button>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Tendência (7 dias)</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={displayTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Line type="monotone" dataKey="creatinina" name="Cr" stroke="hsl(var(--chart-1))" strokeWidth={2} dot /><Line type="monotone" dataKey="k" name="K⁺" stroke="hsl(var(--chart-3))" strokeWidth={2} dot /><ReferenceLine y={1.3} stroke="hsl(var(--destructive))" strokeDasharray="3 3" /></LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> EA</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={140}><BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar></BarChart></ResponsiveContainer>
      </CardContent></Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>{activeCase.references?.length > 0 && <div className="mt-2">{activeCase.references.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}</div>}</CardContent></Card>

      {(() => { const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title); return <SimulatorChallengeMode challengeSet={getRenalChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, clCr, drcStage: drc.stage, isContraindicated }} onComplete={() => setChallengeCompleted(true)} />; })()}

      {isVirtualRoom && submitted && (!showFeedback ? <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Resultados enviados ✓</p></div> : <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-yellow-600"}`}>{lastScore}%</div></div>)}
    </div>
  );
}
