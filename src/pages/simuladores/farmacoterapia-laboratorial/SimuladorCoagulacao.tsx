import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Beaker, Activity, ShieldAlert, AlertTriangle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import { SimulatorCasePicker, SimulatorWorkspace, ShellPanel, PatientCard, LabValueTile } from "@/components/simulators/shell/SimulatorShell";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCoagulacaoLabChallenges } from "@/data/simulatorChallenges";
import { DRUGS, computeSimulation, bleedingRisk, formatLab, type CoagCase } from "@/lib/coagulacao/engine";
import { BUILT_IN_CASES } from "@/lib/coagulacao/cases";

const SLUG = "farmacoterapia-coagulacao";

function BleedingRisk({ inr, ttpa, plaquetas, hb }: { inr: number; ttpa: number; plaquetas: number; hb: number }) {
  const { level } = bleedingRisk(inr, ttpa, plaquetas, hb);
  const lColor = level === "CRÍTICO" ? "bg-destructive/20 border-destructive text-destructive" : level === "ALTO" ? "bg-chart-5/20 border-chart-5 text-chart-5" : level === "MODERADO" ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-green-500/20 border-green-500 text-green-500";
  return (
    <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${lColor}`}>
      <AlertTriangle className="h-5 w-5" />
      <div>
        <p className="text-sm font-bold">Risco Hemorrágico: {level}</p>
        <p className="text-xs opacity-80">INR {inr} | TTPa {ttpa}s | Plaq {plaquetas}k | Hb {hb}</p>
      </div>
    </div>
  );
}

export default function SimuladorCoagulacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<CoagCase | null>(null);
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

  const selectedDrug = DRUGS[selectedDrugIdx] ?? DRUGS[0];
  // Condutas sem dose / pausa só aparecem nos casos que as liberam (flags); casos por IA ficam só com os fármacos.
  const caseFlags = activeCase?.flags ?? [];
  const availableDrugs = useMemo(() => DRUGS.map((d, i) => ({ d, i })).filter(({ d }) => !d.caseFlag || caseFlags.includes(d.caseFlag)), [caseFlags.join("|")]);
  // Trocou de caso: volta ao primeiro fármaco (a conduta/dose do caso anterior não vale para o novo paciente).
  useEffect(() => { setSelectedDrugIdx(0); setDose(DRUGS[0].doseMin); setRunning(false); }, [activeCase?.title]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab,
        expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [],
        flags: cd.flags, infusion: cd.infusion,
      });
    }
  }, [virtualRoomCase]);

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab, { weight: activeCase?.patient.weight, infusion: activeCase?.infusion }), [selectedDrug, dose, activeCase?.baseLab, activeCase?.patient.weight, activeCase?.infusion]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);

  useEffect(() => {
    if (!running) return;
    if (animStep >= simulation.trend.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setAnimStep(s => s + 1), 300);
    return () => clearTimeout(t);
  }, [running, animStep, simulation.trend.length]);

  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = lastScore;
    const decisions: SimDecision[] = [
      { label: "Fármaco", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" },
    ];
    submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) });
    return s;
  }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [], infusion: c.infusion });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <SimulatorCasePicker
        slug="farmacoterapia-coagulacao"
        title="Coagulação e Anticoagulantes"
        description="Interprete INR, TTPa e coagulograma para conduzir a anticoagulação."
        onBack={() => navigate(isRoom ? "/sala" : "/simuladores")}
        actions={<><ShareToolButton toolSlug="farmacoterapia-coagulacao" toolName="Coagulação e Anticoagulantes" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Coagulação" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} /></>}
        banner={<ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />}
        footer={!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="w-full gap-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar caso com IA</Button>}
      >
        {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
        {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
          <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
        ))}
      </SimulatorCasePicker>
    );
  }

  const caseIdx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
  const tooltipProps = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }, labelStyle: { color: "hsl(var(--foreground))" }, itemStyle: { color: "hsl(var(--foreground))" } };
  // Neste motor "alto" já é a faixa crítica e "elevado" é acima do normal.
  const tileStatus = (s: string) => (s === "alto" ? "critico" : s === "elevado" ? "alto" : s);

  return (
    <SimulatorWorkspace
      slug="farmacoterapia-coagulacao"
      simulatorName="Coagulação e Anticoagulantes"
      caseTitle={activeCase.title}
      difficulty={activeCase.difficulty}
      onBack={isEmbed ? undefined : isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}
      actions={<ShareToolButton toolSlug="farmacoterapia-coagulacao" toolName="Coagulação e Anticoagulantes" caseId={activeCase.title} />}
      banners={<>
        {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
        <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      </>}
      patient={
        <PatientCard
          name={activeCase.patient.name}
          age={activeCase.patient.age}
          weight={activeCase.patient.weight}
          sex={activeCase.patient.sex}
          scenario={activeCase.scenario}
          extra={activeCase.patient.specialGroup.length > 0 && <div className="flex flex-wrap gap-1.5">{activeCase.patient.specialGroup.map(g => <span key={g} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium">{g}</span>)}</div>}
        />
      }
      stage={<>
        <BleedingRisk inr={simulation.lastLab.inr} ttpa={simulation.lastLab.ttpa} plaquetas={simulation.lastLab.plaquetas} hb={activeCase.baseLab.hb} />

        <ShellPanel title="Coagulograma após o tratamento" icon={<Activity />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{simulation.labGauges.map(g => <LabValueTile key={g.name} {...g} value={formatLab(g.name, g.value)} status={tileStatus(g.status)} />)}</div>
        </ShellPanel>

        <ShellPanel title="Tendência do coagulograma em 7 dias" aside={running && <span className="text-[11px] font-semibold text-primary">Simulando…</span>}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={displayTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...tooltipProps} />
              <ReferenceLine y={3} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "INR 3", fill: "hsl(var(--destructive))", fontSize: 10 }} />
              <Line type="monotone" dataKey="inr" name="INR" stroke="hsl(var(--chart-1))" strokeWidth={2} dot />
              <Line type="monotone" dataKey="ttpa" name="TTPa" stroke="hsl(var(--chart-2))" strokeWidth={2} dot />
              <Line type="monotone" dataKey="antiXa" name="Anti-Xa" stroke="hsl(var(--chart-3))" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ShellPanel>

        <ShellPanel title="Risco de efeitos adversos (%)" icon={<ShieldAlert />}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--status-crit))" : e.risco > 15 ? "hsl(var(--status-warn))" : "hsl(var(--status-ok))"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ShellPanel>
      </>}
      controls={
        <ShellPanel title="Prescrição">
          <div className="space-y-4">
            <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{availableDrugs.map(({ d, i }) => <SelectItem key={i} value={String(i)}>{d.name}{d.noDose ? "" : ` (${d.class})`}</SelectItem>)}</SelectContent>
            </Select>
            {!selectedDrug.noDose && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{selectedDrug.washout ? "Tempo sem tomar" : "Dose"}</span><span className="font-mono font-semibold text-primary">{dose} {selectedDrug.doseUnit}</span></div>
                <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>{selectedDrug.doseMin}</span><span>{selectedDrug.doseMax} {selectedDrug.doseUnit}</span></div>
              </div>
            )}
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando…" : "Simular 7 dias"}</Button>
          </div>
        </ShellPanel>
      }
      challenge={<SimulatorChallengeMode challengeSet={getCoagulacaoLabChallenges(caseIdx >= 0 ? caseIdx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, weight: activeCase.patient.weight }} onComplete={(score, total) => { setLastScore(total > 0 ? Math.round((score / total) * 100) : 0); setChallengeCompleted(true); }} />}
      footer={isVirtualRoom && submitted && !showFeedback && (
        <div className="rounded-xl border border-status-ok/30 bg-status-ok/5 p-4 text-center"><p className="font-semibold text-status-ok">✅ Resultados enviados!</p><p className="text-sm text-muted-foreground">Redirecionando em 15s…</p></div>
      )}
    />
  );
}
