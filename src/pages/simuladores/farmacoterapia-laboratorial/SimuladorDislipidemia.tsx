import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Heart, Activity, ShieldAlert } from "lucide-react";
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
import { getDislipidemiaLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-dislipidemia";

interface LipidDrug { name: string; class: string; doseMin: number; doseMax: number; doseUnit: string; doseStep: number; effects: { ldl: number; hdl: number; tg: number; ct: number }; sideEffects: { mialgia: number; hepatotox: number; gi: number; rabdomiolise: number }; weeksToEffect: number; }

const DRUGS: LipidDrug[] = [
  { name: "Atorvastatina", class: "Estatina alta potência", doseMin: 10, doseMax: 80, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -50, hdl: 5, tg: -20, ct: -40 }, sideEffects: { mialgia: 0.12, hepatotox: 0.05, gi: 0.08, rabdomiolise: 0.01 }, weeksToEffect: 4 },
  { name: "Rosuvastatina", class: "Estatina alta potência", doseMin: 5, doseMax: 40, doseUnit: "mg/dia", doseStep: 5, effects: { ldl: -55, hdl: 8, tg: -18, ct: -45 }, sideEffects: { mialgia: 0.10, hepatotox: 0.04, gi: 0.06, rabdomiolise: 0.008 }, weeksToEffect: 4 },
  { name: "Sinvastatina", class: "Estatina moderada", doseMin: 10, doseMax: 40, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -35, hdl: 4, tg: -12, ct: -28 }, sideEffects: { mialgia: 0.15, hepatotox: 0.06, gi: 0.1, rabdomiolise: 0.02 }, weeksToEffect: 4 },
  { name: "Ezetimiba", class: "Inib. absorção colesterol", doseMin: 10, doseMax: 10, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -18, hdl: 1, tg: -5, ct: -15 }, sideEffects: { mialgia: 0.03, hepatotox: 0.02, gi: 0.08, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Fenofibrato", class: "Fibrato", doseMin: 160, doseMax: 250, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -5, hdl: 15, tg: -45, ct: -10 }, sideEffects: { mialgia: 0.08, hepatotox: 0.05, gi: 0.1, rabdomiolise: 0.03 }, weeksToEffect: 4 },
  { name: "Evolocumabe", class: "iPCSK9", doseMin: 140, doseMax: 420, doseUnit: "mg SC/mês", doseStep: 140, effects: { ldl: -60, hdl: 3, tg: -8, ct: -50 }, sideEffects: { mialgia: 0.02, hepatotox: 0.01, gi: 0.03, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Ômega-3", class: "Ácido graxo", doseMin: 1, doseMax: 4, doseUnit: "g/dia", doseStep: 1, effects: { ldl: 2, hdl: 2, tg: -30, ct: -3 }, sideEffects: { mialgia: 0, hepatotox: 0, gi: 0.1, rabdomiolise: 0 }, weeksToEffect: 8 },
];

interface LipidCase { id?: string; title: string; difficulty: string; isAI?: boolean; patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string }; scenario: string; baseLab: { ct: number; ldl: number; hdl: number; tg: number; apoB: number; cpk: number }; riskLevel: string; ldlTarget: number; expectedDrugs: string[]; clinicalTip: string; references: string[]; }

const BUILT_IN_CASES: LipidCase[] = [
  { title: "Caso 1: Risco Alto — LDL 180", difficulty: "Médio", patient: { name: "Carlos Mendes", age: 55, weight: 85, sex: "M", specialGroup: ["DM2", "HAS"], diagnosis: "DM2+HAS, ERG>20%, LDL 180 — meta <70" }, scenario: "Homem 55a, DM2+HAS. CT 280, LDL 180, HDL 38, TG 220. Meta LDL <70.", baseLab: { ct: 280, ldl: 180, hdl: 38, tg: 220, apoB: 160, cpk: 120 }, riskLevel: "alto", ldlTarget: 70, expectedDrugs: ["Atorvastatina"], clinicalTip: "Risco alto: atorvastatina 40-80mg reduz LDL 50-60%. Friedewald: LDL = CT - HDL - (TG/5).", references: ["ESC/EAS 2019"] },
  { title: "Caso 2: Intolerância à Estatina", difficulty: "Médio", patient: { name: "Maria Teresa", age: 62, weight: 65, sex: "F", specialGroup: ["Hipotiroidismo"], diagnosis: "Mialgia + CPK 680 com sinvastatina — trocar estatina" }, scenario: "Mulher 62a, LDL 165, sinvastatina 40mg. Mialgia intensa, CPK 680 (3×LSN). Hipotiroidismo.", baseLab: { ct: 250, ldl: 165, hdl: 52, tg: 145, apoB: 135, cpk: 680 }, riskLevel: "intermediário", ldlTarget: 100, expectedDrugs: ["Rosuvastatina"], clinicalTip: "Intolerância: trocar para rosuvastatina ou pravastatina. Se 2+ estatinas: ezetimiba ± iPCSK9.", references: ["ACC 2015"] },
  { title: "Caso 3: TG >500 — Risco de Pancreatite", difficulty: "Difícil", patient: { name: "Roberto Alves", age: 45, weight: 95, sex: "M", specialGroup: ["Etilista", "Obesidade"], diagnosis: "TG 850 — risco pancreatite aguda, fibrato 1ª linha" }, scenario: "Homem 45a, obeso, etilista. TG 850. Prioridade: TG <500 para prevenir pancreatite.", baseLab: { ct: 320, ldl: 0, hdl: 28, tg: 850, apoB: 140, cpk: 90 }, riskLevel: "alto", ldlTarget: 70, expectedDrugs: ["Fenofibrato"], clinicalTip: "TG >500: fibrato 1ª linha. Abstinência alcoólica. NÃO calcular LDL por Friedewald se TG>400.", references: ["Berglund L 2012", "AHA/ACC 2018"] },
  { title: "Caso 4: Pós-IAM — Meta <50", difficulty: "Difícil", patient: { name: "Antônio Ferreira", age: 58, weight: 78, sex: "M", specialGroup: ["IAM prévio", "Stent"], diagnosis: "Pós-IAM com stent, atorva 80mg, LDL 82 — precisa ezetimiba" }, scenario: "Homem 58a, 3m pós-IAM com stent. Atorvastatina 80mg. LDL 82. Meta <50.", baseLab: { ct: 185, ldl: 82, hdl: 45, tg: 160, apoB: 95, cpk: 140 }, riskLevel: "muito alto", ldlTarget: 50, expectedDrugs: ["Ezetimiba"], clinicalTip: "Pós-IAM = risco muito alto. Meta LDL <50. Adicionar ezetimiba; se insuficiente: iPCSK9.", references: ["IMPROVE-IT", "FOURIER", "ESC 2019"] },
  { title: "Caso 5: HF — LDL Refratário", difficulty: "Difícil", patient: { name: "Patrícia Lima", age: 35, weight: 60, sex: "F", specialGroup: ["HF heterozigota"], diagnosis: "HF com LDL 180 em terapia dupla — candidata a iPCSK9" }, scenario: "Mulher 35a, HF heterozigota. Rosuvast 40mg + ezetimiba 10mg, LDL ainda 180. Xantomas.", baseLab: { ct: 380, ldl: 180, hdl: 55, tg: 110, apoB: 180, cpk: 100 }, riskLevel: "muito alto", ldlTarget: 50, expectedDrugs: ["Evolocumabe"], clinicalTip: "HF: prevalência 1:250. Escalonar: estatina max → ezetimiba → iPCSK9. Rastreamento familiar.", references: ["ESC/EAS HF 2020"] },
];

function computeSimulation(drug: LipidDrug, dose: number, baseLab: LipidCase["baseLab"]) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  // Therapeutic intensity: 65% at doseMin, 100% at doseMax — ensures switching
  // drugs produces visibly different curves without requiring dose escalation.
  const intensity = 0.65 + doseFrac * 0.35;
  const trend: any[] = [];
  for (let w = 0; w <= 8; w++) {
    const p = w >= drug.weeksToEffect ? Math.min((w - drug.weeksToEffect + 1) / 6, 1) : 0;
    trend.push({ week: w, ldl: Math.max(20, Math.round(baseLab.ldl + (drug.effects.ldl * intensity * p * baseLab.ldl) / 100)), hdl: Math.max(20, Math.round(baseLab.hdl + (drug.effects.hdl * intensity * p * baseLab.hdl) / 100)), tg: Math.max(30, Math.round(baseLab.tg + (drug.effects.tg * intensity * p * baseLab.tg) / 100)), ct: Math.max(80, Math.round(baseLab.ct + (drug.effects.ct * intensity * p * baseLab.ct) / 100)) });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({ name: k === "mialgia" ? "Mialgia" : k === "hepatotox" ? "Hepatotoxicidade" : k === "gi" ? "GI" : "Rabdomiólise", risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100) }));
  return { trend, sideEffects, lastLab: last };
}

function LabGauge({ name, value, unit, color }: { name: string; value: number; unit: string; color: string }) {
  return (<div className={`rounded-lg border p-3 text-center ${color.includes("destructive") ? "bg-destructive/10 border-destructive/30" : color.includes("green") ? "bg-green-500/10 border-green-500/30" : "bg-chart-5/10 border-chart-5/30"}`}><p className="text-xs text-muted-foreground font-medium">{name}</p><p className={`text-lg font-mono font-bold ${color}`}>{value}</p><p className="text-[10px] text-muted-foreground">{unit}</p></div>);
}

export default function SimuladorDislipidemia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<LipidCase | null>(null);
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

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab, riskLevel: cd.riskLevel ?? "alto", ldlTarget: cd.ldlTarget ?? 70, expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [] }); } }, [virtualRoomCase]);

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab), [selectedDrug, dose, activeCase?.baseLab]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);
  const atTarget = activeCase ? simulation.lastLab.ldl <= activeCase.ldlTarget : false;
  const ldlReduction = activeCase ? Math.round(((activeCase.baseLab.ldl - simulation.lastLab.ldl) / Math.max(activeCase.baseLab.ldl, 1)) * 100) : 0;

  useEffect(() => { if (!running) return; if (animStep >= simulation.trend.length - 1) { setRunning(false); return; } const t = setTimeout(() => setAnimStep(s => s + 1), 250); return () => clearTimeout(t); }, [running, animStep, simulation.trend.length]);
  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => { if (!activeCase || submitted) return; const s = lastScore || 70; const decisions: SimDecision[] = [{ label: "Fármaco", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" }]; submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) }); }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);
  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);
  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, riskLevel: c.riskLevel ?? "alto", ldlTarget: c.ldlTarget ?? 70, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [] });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const riskColor = (r: string) => r === "muito alto" ? "text-red-400" : r === "alto" ? "text-orange-400" : r === "intermediário" ? "text-yellow-400" : "text-green-400";

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold">Dislipidemia e Risco Cardiovascular</h1><p className="text-muted-foreground">Interprete lipidograma, calcule risco CV e ajuste hipolipemiantes.</p><ShareToolButton toolSlug="farmacoterapia-dislipidemia" toolName="Perfil Lipídico e Risco Cardiovascular" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Dislipidemia" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} /></div></div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader><CardContent className="space-y-3">
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
      <div className="flex items-center gap-3 flex-wrap">{!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}<h2 className="text-xl font-bold">{activeCase.title}</h2><Badge className={riskColor(activeCase.riskLevel)}>Risco {activeCase.riskLevel}</Badge><Badge variant="outline">{activeCase.difficulty}</Badge><div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-dislipidemia" toolName="Perfil Lipídico e Risco Cardiovascular" caseId={activeCase.title} /></div></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      {/* Lipid Gauges */}
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Lipidograma (após tratamento)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <LabGauge name="CT" value={simulation.lastLab.ct} unit="mg/dL" color={simulation.lastLab.ct > 200 ? "text-chart-5" : "text-green-500"} />
        <LabGauge name="LDL" value={simulation.lastLab.ldl} unit="mg/dL" color={simulation.lastLab.ldl > (activeCase.ldlTarget) ? "text-destructive" : "text-green-500"} />
        <LabGauge name="HDL" value={simulation.lastLab.hdl} unit="mg/dL" color={simulation.lastLab.hdl < 40 ? "text-destructive" : "text-green-500"} />
        <LabGauge name="TG" value={simulation.lastLab.tg} unit="mg/dL" color={simulation.lastLab.tg > 150 ? "text-chart-5" : "text-green-500"} />
        <LabGauge name="Apo-B" value={Math.round(simulation.lastLab.ldl * 0.9)} unit="mg/dL" color={simulation.lastLab.ldl * 0.9 > 100 ? "text-chart-5" : "text-green-500"} />
        <LabGauge name="CPK" value={activeCase.baseLab.cpk} unit="U/L" color={activeCase.baseLab.cpk > 200 ? "text-destructive" : "text-green-500"} />
      </div></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Hipolipemiante</CardTitle></CardHeader><CardContent className="space-y-4">
          <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent></Select>
          <div><div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} /></div>
          <div className={`rounded-lg p-3 ${atTarget ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
            <p className="text-xs font-semibold">Meta LDL: &lt;{activeCase.ldlTarget} mg/dL</p>
            <p className="text-lg font-mono font-bold">{simulation.lastLab.ldl} <span className="text-xs font-normal">mg/dL</span></p>
            <p className="text-[10px]">{atTarget ? "✅ Meta atingida!" : `❌ Faltam ${simulation.lastLab.ldl - activeCase.ldlTarget}`} (redução: {ldlReduction}%)</p>
          </div>
          <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 8 semanas"}</Button>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Tendência (8 semanas)</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><LineChart data={displayTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Line type="monotone" dataKey="ldl" name="LDL" stroke="hsl(var(--chart-1))" strokeWidth={2} dot /><Line type="monotone" dataKey="hdl" name="HDL" stroke="hsl(var(--chart-2))" strokeWidth={2} dot /><Line type="monotone" dataKey="tg" name="TG" stroke="hsl(var(--chart-3))" strokeWidth={2} dot /><ReferenceLine y={activeCase.ldlTarget} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Meta LDL", fontSize: 9 }} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> EA</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={120}><BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>{activeCase.references?.length > 0 && <div className="mt-2">{activeCase.references.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}</div>}</CardContent></Card>

      {(() => { const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title); return <SimulatorChallengeMode challengeSet={getDislipidemiaLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, ldlTarget: activeCase.ldlTarget, riskLevel: activeCase.riskLevel, atTarget, ldlReduction }} onComplete={() => setChallengeCompleted(true)} />; })()}

      {isVirtualRoom && submitted && <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button></div>}
    </div>
  );
}
