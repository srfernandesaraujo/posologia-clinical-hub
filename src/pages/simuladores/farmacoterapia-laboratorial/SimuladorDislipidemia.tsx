import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Heart, Activity, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getDislipidemiaLabChallenges } from "@/data/simulatorChallenges";
import { DRUGS, computeRegimen, drugByName, nonHdlTargetFor, type LipidLab, type RegimenItem, type LipidLifestyle } from "@/lib/dislipidemia/motor";

const SLUG = "farmacoterapia-dislipidemia";
const MAX_SLOTS = 3;

/**
 * Motor em src/lib/dislipidemia/motor.ts. Campos opcionais do caso (casos antigos e de IA não os têm):
 *  - background: esquema em uso quando o baseLab foi colhido (o laboratório do caso já é COM esse esquema);
 *  - cpkOff: CPK depois de suspender/trocar o esquema em uso;
 *  - tgTarget: meta de TG (casos em que o TG é o desfecho primário);
 *  - lifestyle: medida não farmacológica (rótulo + efeitos %), com interruptor na tela;
 *  - nonHdlTarget: sobrescreve a meta de não-HDL derivada do risco.
 */
interface LipidCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string; baseLab: LipidLab; riskLevel: string; ldlTarget: number; expectedDrugs: string[]; clinicalTip: string; references: string[];
  background?: RegimenItem[]; cpkOff?: number; tgTarget?: number; nonHdlTarget?: number; lifestyle?: LipidLifestyle;
}

const BUILT_IN_CASES: LipidCase[] = [
  { title: "Caso 1: Carlos Mendes", difficulty: "Médio", patient: { name: "Carlos Mendes", age: 55, weight: 85, sex: "M", specialGroup: ["DM2", "HAS"], diagnosis: "DM2 e HAS, sem hipolipemiante" }, scenario: "Homem de 55 anos, 85 kg, com DM2 há 12 anos e hipertensão arterial (PA 146/90 mmHg em uso de losartana), sem doença cardiovascular conhecida e sem hipolipemiante. Lipidograma em jejum: CT 262, LDL 180, HDL 38, TG 220 mg/dL; Apo-B 160 mg/dL. A tela mostra o lipidograma projetado para 8 semanas depois do esquema que você montar.", baseLab: { ct: 262, ldl: 180, hdl: 38, tg: 220, apoB: 160, cpk: 120 }, riskLevel: "alto", ldlTarget: 70, expectedDrugs: ["Atorvastatina", "Ezetimiba"], clinicalTip: "Estatina de alta potência primeiro; dobrar a dose rende só ~6 pontos percentuais a mais no LDL, então, se a meta não vier, some ezetimiba. HDL baixo não é alvo de tratamento; o alvo é o LDL (e o não-HDL, quando o TG está alto).", references: ["Faludi AA. Arq Bras Cardiol 2017;109(2 Supl 1) (Diretriz SBC de Dislipidemias)", "Mach F. Eur Heart J 2020;41:111-188 (ESC/EAS 2019)"] },
  { title: "Caso 2: Maria Teresa", difficulty: "Médio", patient: { name: "Maria Teresa", age: 62, weight: 65, sex: "F", specialGroup: ["Hipotireoidismo"], diagnosis: "Dislipidemia em uso de sinvastatina, queixa muscular" }, scenario: "Mulher de 62 anos, 65 kg, hipotireoidismo em reposição de levotiroxina (TSH 7,2 mUI/L), sem doença cardiovascular. Usa sinvastatina 40 mg há 3 meses e queixa-se de dor e fraqueza em coxas e ombros desde o 2º mês. Exames: CT 241, LDL 160, HDL 52, TG 145 mg/dL; CPK 680 U/L (referência até cerca de 200); Apo-B 135 mg/dL. A tela mostra o lipidograma projetado para 8 semanas depois do esquema que você montar; o laboratório de partida é o colhido com a sinvastatina em uso.", baseLab: { ct: 241, ldl: 160, hdl: 52, tg: 145, apoB: 135, cpk: 680 }, riskLevel: "intermediário", ldlTarget: 100, expectedDrugs: ["Rosuvastatina", "Ezetimiba"], clinicalTip: "Mialgia com CPK < 10× o limite superior: suspender a estatina, esperar a resolução, corrigir causas (TSH) e reintroduzir outra estatina em dose menor, somando ezetimiba para chegar à meta.", references: ["Stroes ES. Eur Heart J 2015;36:1012-1022 (EAS, intolerância a estatinas)", "Faludi AA. Arq Bras Cardiol 2017;109(2 Supl 1)"], background: [{ name: "Sinvastatina", dose: 40 }], cpkOff: 95 },
  { title: "Caso 3: Roberto Alves", difficulty: "Difícil", patient: { name: "Roberto Alves", age: 45, weight: 95, sex: "M", specialGroup: ["Etilista", "Obesidade"], diagnosis: "Triglicerídeos muito elevados, obesidade e uso de álcool" }, scenario: "Homem de 45 anos, 95 kg (IMC 31), consome cerca de 6 doses de álcool por dia, sem diabetes conhecido nem uso de medicamentos. Veio por dor abdominal leve após uma festa. Exames em jejum: CT 320, HDL 28, TG 850 mg/dL; o laboratório informou LDL direto de 110 mg/dL (a conta de Friedewald não vale com TG acima de 400); Apo-B 140 mg/dL. A tela mostra o lipidograma projetado para 8 semanas depois do esquema que você montar; o interruptor das medidas não farmacológicas está ao lado dos fármacos.", baseLab: { ct: 320, ldl: 110, hdl: 28, tg: 850, apoB: 140, cpk: 90 }, riskLevel: "intermediário", ldlTarget: 100, tgTarget: 500, expectedDrugs: ["Fenofibrato", "Ômega-3"], clinicalTip: "TG acima de 500: fibrato e medidas não farmacológicas primeiro (o risco agudo é pancreatite); a estatina reduz pouco o TG e entra depois, para o risco cardiovascular. LDL calculado por Friedewald não vale com TG > 400.", references: ["Berglund L. J Clin Endocrinol Metab 2012;97:2969-2989 (Endocrine Society)", "Mach F. Eur Heart J 2020;41:111-188 (ESC/EAS 2019)"], lifestyle: { label: "Abstinência alcoólica + dieta + perda de peso (efeito estimado)", effects: { tg: -35, hdl: 8 } } },
  { title: "Caso 4: Antônio Ferreira", difficulty: "Difícil", patient: { name: "Antônio Ferreira", age: 58, weight: 78, sex: "M", specialGroup: ["IAM prévio", "Stent"], diagnosis: "3 meses após evento coronariano, em uso de estatina" }, scenario: "Homem de 58 anos, 78 kg, 3 meses após infarto do miocárdio com implante de stent, em uso regular de atorvastatina 80 mg (adesão confirmada pela farmácia) e AAS. Exames: CT 159, LDL 82, HDL 45, TG 160 mg/dL; Apo-B 95 mg/dL; CPK 140 U/L. A tela mostra o lipidograma projetado para 8 semanas depois do esquema que você montar; o laboratório de partida é o colhido com a atorvastatina 80 mg em uso.", baseLab: { ct: 159, ldl: 82, hdl: 45, tg: 160, apoB: 95, cpk: 140 }, riskLevel: "muito alto", ldlTarget: 50, expectedDrugs: ["Atorvastatina", "Ezetimiba", "Evolocumabe"], clinicalTip: "Prevenção secundária: meta de LDL < 50 mg/dL. Estatina potente em dose máxima tolerada + ezetimiba; se o LDL seguir acima da meta, iPCSK9.", references: ["Cannon CP. N Engl J Med 2015;372:2387-2397 (IMPROVE-IT)", "Sabatine MS. N Engl J Med 2017;376:1713-1722 (FOURIER)"], background: [{ name: "Atorvastatina", dose: 80 }] },
  { title: "Caso 5: Patrícia Lima", difficulty: "Difícil", patient: { name: "Patrícia Lima", age: 35, weight: 60, sex: "F", specialGroup: ["Xantomas", "Terapia dupla prévia"], diagnosis: "LDL persistentemente elevado em terapia dupla, xantomas" }, scenario: "Mulher de 35 anos, 60 kg, com xantomas em tendões de Aquiles e pai que teve infarto aos 48 anos. Há 6 meses usa rosuvastatina 40 mg + ezetimiba 10 mg, com adesão confirmada; TSH, glicemia e proteinúria normais. Exames atuais: CT 247, LDL 170, HDL 55, TG 110 mg/dL; Apo-B 150 mg/dL. Não tem doença cardiovascular estabelecida. A tela mostra o lipidograma projetado para 8 semanas depois do esquema que você montar; o laboratório de partida é o colhido com a terapia dupla em uso.", baseLab: { ct: 247, ldl: 170, hdl: 55, tg: 110, apoB: 150, cpk: 100 }, riskLevel: "alto", ldlTarget: 70, expectedDrugs: ["Rosuvastatina", "Ezetimiba", "Evolocumabe"], clinicalTip: "Hipercolesterolemia familiar: meta de LDL < 70 mg/dL e redução ≥ 50% (sem DCV); estatina máxima + ezetimiba + iPCSK9 se a meta não vier. Rastreamento em cascata dos familiares e orientação contraceptiva (estatinas e gestação).", references: ["Mach F. Eur Heart J 2020;41:111-188 (ESC/EAS 2019)", "Raal FJ. Lancet 2015;385:331-340 (RUTHERFORD-2)"], background: [{ name: "Rosuvastatina", dose: 40 }, { name: "Ezetimiba", dose: 10 }] },
];

/** Normaliza um caso vindo da Sala Virtual, de IA ou nativo, preservando os campos opcionais do motor. */
function toLipidCase(c: any): LipidCase {
  return {
    id: c.id, title: c.title, difficulty: c.difficulty, isAI: c.isAI,
    patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
    scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, riskLevel: c.riskLevel ?? "alto", ldlTarget: c.ldlTarget ?? 70,
    expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [],
    background: c.background, cpkOff: c.cpkOff, tgTarget: c.tgTarget, nonHdlTarget: c.nonHdlTarget, lifestyle: c.lifestyle,
  };
}

type Slot = { idx: number; dose: number };
const slotsFromCase = (c: LipidCase | null): Slot[] => {
  const base: Slot[] = Array.from({ length: MAX_SLOTS }, () => ({ idx: -1, dose: 0 }));
  (c?.background ?? []).slice(0, MAX_SLOTS).forEach((b, i) => { const di = DRUGS.findIndex(d => d.name === b.name); if (di >= 0) base[i] = { idx: di, dose: b.dose }; });
  return base;
};

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
  const [slots, setSlots] = useState<Slot[]>(slotsFromCase(null));
  const [lifestyleOn, setLifestyleOn] = useState(false);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  // Ao trocar de caso, o esquema volta ao que o paciente usa (ou a nenhum fármaco).
  useEffect(() => { setSlots(slotsFromCase(activeCase)); setLifestyleOn(false); setRunning(false); setAnimStep(0); }, [activeCase?.title]);

  useEffect(() => { if (virtualRoomCase) setActiveCase(toLipidCase(virtualRoomCase)); }, [virtualRoomCase]);

  const regimen: RegimenItem[] = useMemo(() => slots.filter(s => s.idx >= 0).map(s => ({ name: DRUGS[s.idx].name, dose: s.dose })), [slots]);
  const fallbackCase = BUILT_IN_CASES[0];
  const simulation = useMemo(() => computeRegimen(regimen, { baseLab: (activeCase ?? fallbackCase).baseLab, background: activeCase?.background, cpkOff: activeCase?.cpkOff, lifestyle: activeCase?.lifestyle }, lifestyleOn), [regimen, activeCase, lifestyleOn]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);
  const nonHdlTarget = activeCase ? (activeCase.nonHdlTarget ?? nonHdlTargetFor(activeCase.riskLevel)) : 130;
  const atTarget = activeCase ? simulation.lastLab.ldl <= activeCase.ldlTarget : false;
  const atNonHdlTarget = simulation.lastLab.nonHdl < nonHdlTarget;
  const atTgTarget = activeCase?.tgTarget !== undefined ? simulation.lastLab.tg < activeCase.tgTarget : undefined;
  const ldlReduction = activeCase ? Math.round(((activeCase.baseLab.ldl - simulation.lastLab.ldl) / Math.max(activeCase.baseLab.ldl, 1)) * 100) : 0;
  const primary = regimen[0] ? drugByName(regimen[0].name) : undefined;

  useEffect(() => { if (!running) return; if (animStep >= simulation.trend.length - 1) { setRunning(false); return; } const t = setTimeout(() => setAnimStep(s => s + 1), 250); return () => clearTimeout(t); }, [running, animStep, simulation.trend.length]);
  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const s = lastScore;
    const chosen = regimen.map(r => r.name);
    const decisions: SimDecision[] = [{ label: "Esquema", userChoice: chosen.join(" + ") || "Sem hipolipemiante", idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.some(e => chosen.includes(e)), category: "Seleção" }];
    submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) });
  }, [activeCase, regimen, submitted, submitResults, lastScore]);
  useEffect(() => { if (challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);
  const loadAICase = (c: any) => setActiveCase(toLipidCase({ ...c, isAI: true }));

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

  const setSlotDrug = (i: number, v: number) => setSlots(prev => prev.map((s, k) => k === i ? { idx: v, dose: v >= 0 ? DRUGS[v].doseMin : 0 } : s));
  const setSlotDose = (i: number, dose: number) => setSlots(prev => prev.map((s, k) => k === i ? { ...s, dose } : s));
  const bgLabel = activeCase.background?.length ? activeCase.background.map(b => `${b.name} ${b.dose} ${drugByName(b.name)?.doseUnit ?? ""}`).join(" + ") : null;

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3 flex-wrap">{!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}<h2 className="text-xl font-bold">{activeCase.title}</h2><Badge className={riskColor(activeCase.riskLevel)}>Risco {activeCase.riskLevel}</Badge><Badge variant="outline">{activeCase.difficulty}</Badge><div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-dislipidemia" toolName="Perfil Lipídico e Risco Cardiovascular" caseId={activeCase.title} /></div></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p>{bgLabel && <p className="text-xs"><strong>Esquema em uso:</strong> {bgLabel}</p>}</CardContent></Card>

      {/* Lipid Gauges */}
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Lipidograma (após 8 semanas do esquema escolhido)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <LabGauge name="CT" value={simulation.lastLab.ct} unit="mg/dL" color={simulation.lastLab.ct > 200 ? "text-chart-5" : "text-green-500"} />
        <LabGauge name="LDL" value={simulation.lastLab.ldl} unit="mg/dL" color={simulation.lastLab.ldl > activeCase.ldlTarget ? "text-destructive" : "text-green-500"} />
        <LabGauge name="Não-HDL (CT − HDL)" value={simulation.lastLab.nonHdl} unit="mg/dL" color={simulation.lastLab.nonHdl >= nonHdlTarget ? "text-destructive" : "text-green-500"} />
        <LabGauge name="HDL" value={simulation.lastLab.hdl} unit="mg/dL" color={simulation.lastLab.hdl < 40 ? "text-destructive" : "text-green-500"} />
        <LabGauge name="TG" value={simulation.lastLab.tg} unit="mg/dL" color={simulation.lastLab.tg > (activeCase.tgTarget ?? 150) ? "text-chart-5" : "text-green-500"} />
        <LabGauge name="Apo-B" value={simulation.apoB} unit="mg/dL (acompanha o não-HDL)" color="text-chart-5" />
        <LabGauge name="CPK" value={simulation.cpk} unit="U/L (ref. até ~200)" color={simulation.cpk > 200 ? "text-destructive" : "text-green-500"} />
      </div></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Esquema hipolipemiante</CardTitle></CardHeader><CardContent className="space-y-4">
          {slots.map((slot, i) => {
            const d = slot.idx >= 0 ? DRUGS[slot.idx] : null;
            const taken = new Set(slots.filter((_, k) => k !== i && _.idx >= 0).map(x => x.idx));
            return (
              <div key={i} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{i === 0 ? "Fármaco 1" : `Associar fármaco ${i + 1}`}</p>
                <Select value={String(slot.idx)} onValueChange={v => setSlotDrug(i, Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="-1">{i === 0 ? "Nenhum (sem hipolipemiante)" : "Nenhum"}</SelectItem>{DRUGS.map((dr, k) => <SelectItem key={k} value={String(k)} disabled={taken.has(k)}>{dr.name}</SelectItem>)}</SelectContent></Select>
                {d && (d.doseMax > d.doseMin
                  ? <div><div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{slot.dose} {d.doseUnit}</span></div><Slider value={[slot.dose]} onValueChange={([v]) => setSlotDose(i, v)} min={d.doseMin} max={d.doseMax} step={d.doseStep} /></div>
                  : <p className="text-xs">Dose fixa: <span className="font-bold">{d.doseMin} {d.doseUnit}</span></p>)}
              </div>
            );
          })}
          {activeCase.lifestyle && (
            <div className="flex items-start gap-3 rounded-lg border p-3"><Switch checked={lifestyleOn} onCheckedChange={setLifestyleOn} /><div><p className="text-xs font-semibold">Medidas não farmacológicas</p><p className="text-[11px] text-muted-foreground">{activeCase.lifestyle.label}</p></div></div>
          )}
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs font-semibold">Metas do caso (após 8 semanas)</p>
            <p className={`text-xs ${atTarget ? "text-green-500" : "text-destructive"}`}>LDL &lt; {activeCase.ldlTarget}: <span className="font-mono font-bold">{simulation.lastLab.ldl}</span> {atTarget ? "✅" : `❌ (faltam ${simulation.lastLab.ldl - activeCase.ldlTarget})`} · variação {-ldlReduction}% em relação ao laboratório do caso</p>
            <p className={`text-xs ${atNonHdlTarget ? "text-green-500" : "text-destructive"}`}>Não-HDL &lt; {nonHdlTarget}: <span className="font-mono font-bold">{simulation.lastLab.nonHdl}</span> {atNonHdlTarget ? "✅" : "❌"}</p>
            {activeCase.tgTarget !== undefined && <p className={`text-xs ${atTgTarget ? "text-green-500" : "text-destructive"}`}>TG &lt; {activeCase.tgTarget}: <span className="font-mono font-bold">{simulation.lastLab.tg}</span> {atTgTarget ? "✅" : "❌"}</p>}
            {primary && <p className="text-[10px] text-muted-foreground">Efeito pleno do 1º fármaco em ~{primary.weeksToEffect} semanas (o de ação mais lenta define a curva).</p>}
          </div>
          <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 8 semanas"}</Button>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Tendência (8 semanas)</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={260}><LineChart data={displayTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" /><YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" label={{ value: "LDL / Não-HDL / HDL (mg/dL)", angle: -90, position: "insideLeft", fontSize: 9 }} /><YAxis yAxisId="r" orientation="right" stroke="hsl(var(--chart-3))" label={{ value: "TG (mg/dL)", angle: 90, position: "insideRight", fontSize: 9 }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line yAxisId="l" type="monotone" dataKey="ldl" name="LDL" stroke="hsl(var(--chart-1))" strokeWidth={2} dot /><Line yAxisId="l" type="monotone" dataKey="nonHdl" name="Não-HDL" stroke="hsl(var(--chart-4))" strokeWidth={2} dot /><Line yAxisId="l" type="monotone" dataKey="hdl" name="HDL" stroke="hsl(var(--chart-2))" strokeWidth={2} dot /><Line yAxisId="r" type="monotone" dataKey="tg" name="TG (eixo direito)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot /><ReferenceLine yAxisId="l" y={activeCase.ldlTarget} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Meta LDL", fontSize: 9 }} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de efeitos adversos (%) do esquema</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={140}><BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} /><Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>

      {(() => {
        const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
        const state = {
          drug: regimen[0]?.name ?? "Nenhum", dose: regimen[0]?.dose ?? 0, regimen, drugs: regimen.map(r => r.name), nDrugs: regimen.length, lifestyleOn,
          sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, apoB: simulation.apoB, cpk: simulation.cpk,
          ldlTarget: activeCase.ldlTarget, nonHdlTarget, tgTarget: activeCase.tgTarget, riskLevel: activeCase.riskLevel, atTarget, atNonHdlTarget, atTgTarget, ldlReduction, unchanged: simulation.unchanged,
        };
        return <SimulatorChallengeMode challengeSet={getDislipidemiaLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={state} onComplete={(score, total) => { setLastScore(total > 0 ? Math.round((score / total) * 100) : 0); setChallengeCompleted(true); }} />;
      })()}

      {isVirtualRoom && submitted && <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button></div>}
    </div>
  );
}
