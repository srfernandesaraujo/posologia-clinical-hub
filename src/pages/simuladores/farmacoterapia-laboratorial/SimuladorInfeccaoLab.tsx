import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Bug, Activity, ShieldAlert, Thermometer } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getInfeccaoLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-infeccao-lab";

interface InfDrug { name: string; class: string; doseMin: number; doseMax: number; doseUnit: string; doseStep: number; effects: { leucocitos: number; pcr: number; pct: number; lactato: number; temp: number }; sideEffects: { gi: number; alergia: number; nefrotox: number; cDiff: number }; hoursToEffect: number; spectrum: string; }

const DRUGS: InfDrug[] = [
  { name: "Amoxicilina", class: "Penicilina", doseMin: 500, doseMax: 1500, doseUnit: "mg 8/8h", doseStep: 250, effects: { leucocitos: -2, pcr: -3, pct: -0.3, lactato: -0.2, temp: -0.5 }, sideEffects: { gi: 0.15, alergia: 0.1, nefrotox: 0.02, cDiff: 0.05 }, hoursToEffect: 6, spectrum: "Gram+ e alguns Gram-" },
  { name: "Ceftriaxona", class: "Cef 3ª", doseMin: 1, doseMax: 4, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -3, pcr: -5, pct: -0.5, lactato: -0.3, temp: -0.8 }, sideEffects: { gi: 0.1, alergia: 0.08, nefrotox: 0.03, cDiff: 0.1 }, hoursToEffect: 4, spectrum: "Amplo Gram+/Gram-" },
  { name: "Piperacilina-Tazobactam", class: "Pen+inib βlact", doseMin: 4.5, doseMax: 18, doseUnit: "g/dia EV", doseStep: 4.5, effects: { leucocitos: -4, pcr: -6, pct: -0.8, lactato: -0.5, temp: -1.0 }, sideEffects: { gi: 0.12, alergia: 0.08, nefrotox: 0.05, cDiff: 0.08 }, hoursToEffect: 3, spectrum: "Amplo + anaeróbios" },
  { name: "Vancomicina", class: "Glicopeptídeo", doseMin: 500, doseMax: 2000, doseUnit: "mg EV 12/12h", doseStep: 250, effects: { leucocitos: -2, pcr: -4, pct: -0.4, lactato: -0.2, temp: -0.6 }, sideEffects: { gi: 0.05, alergia: 0.12, nefrotox: 0.2, cDiff: 0.03 }, hoursToEffect: 4, spectrum: "Gram+ (MRSA)" },
  { name: "Meropenem", class: "Carbapenêmico", doseMin: 1, doseMax: 6, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -5, pcr: -8, pct: -1.0, lactato: -0.6, temp: -1.2 }, sideEffects: { gi: 0.08, alergia: 0.05, nefrotox: 0.03, cDiff: 0.12 }, hoursToEffect: 2, spectrum: "Ultra-amplo" },
  { name: "Oseltamivir", class: "Antiviral", doseMin: 75, doseMax: 150, doseUnit: "mg 12/12h", doseStep: 75, effects: { leucocitos: 0.5, pcr: -1, pct: 0, lactato: -0.1, temp: -0.5 }, sideEffects: { gi: 0.2, alergia: 0.02, nefrotox: 0.01, cDiff: 0 }, hoursToEffect: 12, spectrum: "Influenza A/B" },
];

interface InfCase { id?: string; title: string; difficulty: string; isAI?: boolean; patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string }; scenario: string; baseLab: { leucocitos: number; neutrofilos: number; linfocitos: number; bastoes: number; pcr: number; pct: number; lactato: number; temp: number; hemocultura: string }; expectedDrugs: string[]; clinicalTip: string; references: string[]; }

const BUILT_IN_CASES: InfCase[] = [
  { title: "Caso 1: PAC — Leucocitose + PCR Alta", difficulty: "Fácil", patient: { name: "Pedro Almeida", age: 55, weight: 80, sex: "M", specialGroup: ["DM2", "DPOC"], diagnosis: "PAC moderada — CURB-65=2, leucocitose com desvio" }, scenario: "Homem 55a, tosse, febre 39°C, consolidação lobar. Leucocitose 18.500 com bastões. PCR 180, PCT 3.5.", baseLab: { leucocitos: 18500, neutrofilos: 14800, linfocitos: 1850, bastoes: 1480, pcr: 180, pct: 3.5, lactato: 2.2, temp: 39.0, hemocultura: "Pendente" }, expectedDrugs: ["Ceftriaxona"], clinicalTip: "PAC moderada: ceftriaxona 1g/dia + azitro. PCR >100 e PCT >2 favorecem etiologia bacteriana.", references: ["BTS 2015", "IDSA/ATS CAP 2019"] },
  { title: "Caso 2: Sepse — PCT >10 + Lactato >4", difficulty: "Difícil", patient: { name: "Ana Clara", age: 42, weight: 65, sex: "F", specialGroup: [], diagnosis: "Sepse urinária — qSOFA≥2, Hour-1 Bundle" }, scenario: "Mulher 42a, pielonefrite. PA 85/50, FC 120. Leuc 24.000, PCT 15, lactato 5.2.", baseLab: { leucocitos: 24000, neutrofilos: 20400, linfocitos: 1200, bastoes: 2160, pcr: 320, pct: 15, lactato: 5.2, temp: 39.5, hemocultura: "Pendente" }, expectedDrugs: ["Piperacilina-Tazobactam"], clinicalTip: "Sepse Hour-1 Bundle: lactato, hemoculturas, ATB amplo <1h, cristaloide 30mL/kg.", references: ["SSC 2021"] },
  { title: "Caso 3: Viral vs Bacteriana", difficulty: "Fácil", patient: { name: "Juliana Fernandes", age: 30, weight: 58, sex: "F", specialGroup: [], diagnosis: "Síndrome gripal — PCR baixa, PCT <0.1, linfocitose" }, scenario: "Mulher 30a, febre 38.2°C, mialgia, coriza. Leuc normais com linfocitose. PCR 15, PCT 0.08.", baseLab: { leucocitos: 5200, neutrofilos: 2080, linfocitos: 2600, bastoes: 52, pcr: 15, pct: 0.08, lactato: 1.0, temp: 38.2, hemocultura: "Não indicada" }, expectedDrugs: ["Oseltamivir"], clinicalTip: "Perfil viral: leuc normais, linfocitose, PCR <50, PCT <0.25. NÃO usar ATB.", references: ["Schuetz P 2018"] },
  { title: "Caso 4: Neutropenia Febril", difficulty: "Difícil", patient: { name: "Ricardo Campos", age: 48, weight: 72, sex: "M", specialGroup: ["Leucemia", "QT"], diagnosis: "Neutropenia profunda (120/mm³) + febre — emergência" }, scenario: "Homem 48a, QT ciclo 3 dia 10. Febre 38.5°C. Leuc 600, neutr 120.", baseLab: { leucocitos: 600, neutrofilos: 120, linfocitos: 300, bastoes: 0, pcr: 45, pct: 1.2, lactato: 1.8, temp: 38.5, hemocultura: "Colhida" }, expectedDrugs: ["Piperacilina-Tazobactam"], clinicalTip: "Neutropenia febril: ATB empírico <1h. Cefepime ou pipe-tazo monoterapia.", references: ["Freifeld 2011", "NCCN 2023"] },
  { title: "Caso 5: Desescalonamento por Cultura", difficulty: "Médio", patient: { name: "Fátima Souza", age: 60, weight: 70, sex: "F", specialGroup: ["DM2"], diagnosis: "Sepse urinária em melhora — desescalonar ATB" }, scenario: "Mulher 60a, sepse urinária com meropenem. 48h: melhora. Hemocultura: E. coli sensível a ceftriaxona.", baseLab: { leucocitos: 12500, neutrofilos: 8750, linfocitos: 2500, bastoes: 625, pcr: 120, pct: 2.5, lactato: 1.5, temp: 37.2, hemocultura: "E. coli S: Ceftriaxona, Amox, TMP-SMX" }, expectedDrugs: ["Ceftriaxona"], clinicalTip: "Desescalonamento: trocar ATB amplo por dirigido após cultura. Meropenem→Ceftriaxona.", references: ["IDSA UTI 2010", "SSC 2021"] },
];

function computeSimulation(drug: InfDrug, dose: number, baseLab: InfCase["baseLab"]) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.3 + doseFrac * 0.7;
  const trend: any[] = [];
  for (let h = 0; h <= 48; h += 6) {
    const p = h >= drug.hoursToEffect ? Math.min((h - drug.hoursToEffect + 1) / 24, 1) : 0;
    trend.push({ hour: h, pcr: +(Math.max(0.5, baseLab.pcr + drug.effects.pcr * intensity * p * (baseLab.pcr / 10))).toFixed(1), pct: +(Math.max(0.01, baseLab.pct + drug.effects.pct * intensity * p * (baseLab.pct / 2))).toFixed(2), lactato: +(Math.max(0.5, baseLab.lactato + drug.effects.lactato * intensity * p)).toFixed(1), temp: +(Math.max(36, baseLab.temp + drug.effects.temp * intensity * p)).toFixed(1) });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({ name: k === "gi" ? "GI" : k === "alergia" ? "Alergia" : k === "nefrotox" ? "Nefrotoxicidade" : "C. difficile", risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100) }));
  const leucogramData = [{ name: "Neutr", valor: baseLab.neutrofilos }, { name: "Linf", valor: baseLab.linfocitos }, { name: "Bast", valor: baseLab.bastoes }];
  const labGauges = [
    { name: "Leucócitos", value: baseLab.leucocitos, unit: "/mm³", status: baseLab.leucocitos < 4000 ? "baixo" : baseLab.leucocitos > 11000 ? "alto" : "normal" },
    { name: "PCR", value: last.pcr, unit: "mg/L", status: last.pcr > 10 ? "alto" : "normal" },
    { name: "PCT", value: last.pct, unit: "ng/mL", status: last.pct > 0.5 ? "alto" : "normal" },
    { name: "Lactato", value: last.lactato, unit: "mmol/L", status: last.lactato > 2 ? "alto" : "normal" },
    { name: "Temp", value: last.temp, unit: "°C", status: last.temp > 38 ? "alto" : "normal" },
  ];
  return { trend, sideEffects, labGauges, leucogramData, lastLab: last };
}

function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : "bg-green-500/10 border-green-500/30";
  return (<div className={`rounded-lg border p-3 text-center ${bg}`}><p className="text-xs text-muted-foreground font-medium">{name}</p><p className={`text-lg font-mono font-bold ${color}`}>{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p><p className="text-[10px] text-muted-foreground">{unit}</p><p className={`text-[9px] font-semibold ${color}`}>{status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲ ALTO" : "● NORMAL"}</p></div>);
}

export default function SimuladorInfeccaoLab() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<InfCase | null>(null);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedDrug = DRUGS[selectedDrugIdx];

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [] }); } }, [virtualRoomCase]);

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab), [selectedDrug, dose, activeCase?.baseLab]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);

  useEffect(() => { if (!running) return; if (animStep >= simulation.trend.length - 1) { setRunning(false); return; } const t = setTimeout(() => setAnimStep(s => s + 1), 200); return () => clearTimeout(t); }, [running, animStep, simulation.trend.length]);
  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => { if (!activeCase || submitted) return; const s = lastScore || 70; const decisions: SimDecision[] = [{ label: "ATB", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" }]; submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) }); }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);
  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);
  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [] });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold">Sinais Laboratoriais de Infecção</h1><p className="text-muted-foreground">Interprete leucograma, PCR, PCT e lactato para guiar antibioticoterapia.</p><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Infecção Lab" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} /></div></div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader><CardContent className="space-y-3">
          {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
          {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />)}
          {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
        </CardContent></Card>
      </div>
    );
  }

  const leucColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3 flex-wrap"><Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p><p className="text-xs font-mono bg-muted/50 p-2 rounded">Hemocultura: {activeCase.baseLab.hemocultura}</p></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Marcadores (após tratamento)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent></Card>

      {/* Leucogram */}
      <Card><CardHeader><CardTitle className="text-base">Leucograma Diferencial</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={120}><BarChart data={simulation.leucogramData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="valor" name="/mm³">{simulation.leucogramData.map((_, i) => <Cell key={i} fill={leucColors[i % leucColors.length]} />)}</Bar></BarChart></ResponsiveContainer>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Antibioticoterapia</CardTitle></CardHeader><CardContent className="space-y-4">
          <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent></Select>
          <p className="text-[10px] text-muted-foreground">Espectro: {selectedDrug.spectrum}</p>
          <div><div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} /></div>
          <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 48h"}</Button>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Tendência (48h)</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><LineChart data={displayTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="hour" label={{ value: "Horas", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Line type="monotone" dataKey="pcr" name="PCR" stroke="hsl(var(--chart-1))" strokeWidth={2} dot /><Line type="monotone" dataKey="pct" name="PCT" stroke="hsl(var(--chart-2))" strokeWidth={2} dot /><Line type="monotone" dataKey="temp" name="Temp" stroke="hsl(var(--chart-4))" strokeWidth={2} dot /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> EA</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={120}><BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>{activeCase.references?.length > 0 && <div className="mt-2">{activeCase.references.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}</div>}</CardContent></Card>

      {(() => { const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title); return <SimulatorChallengeMode challengeSet={getInfeccaoLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, spectrum: selectedDrug.spectrum, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, leucogramData: simulation.leucogramData }} onComplete={() => setChallengeCompleted(true)} />; })()}

      {isVirtualRoom && submitted && <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button></div>}
    </div>
  );
}
