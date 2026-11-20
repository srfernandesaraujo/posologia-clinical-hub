import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Beaker, Activity, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Area, AreaChart } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getGlicemiaLabChallenges } from "@/data/simulatorChallenges";
import { Switch } from "@/components/ui/switch";
import { DRUGS, computeSimulation, getDrug } from "@/lib/glicemia/engine";
import { BUILT_IN_CASES, type GlicCase } from "@/lib/glicemia/cases";

const SLUG = "farmacoterapia-glicemia";

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

function GlycemicZone({ jejum, pp }: { jejum: number; pp: number }) {
  const zone = jejum < 70 || pp < 70 ? "HIPOGLICEMIA" : jejum <= 130 && pp <= 180 ? "ALVO" : "HIPERGLICEMIA";
  const zoneColor = zone === "HIPOGLICEMIA" ? "bg-destructive/20 border-destructive text-destructive" : zone === "ALVO" ? "bg-green-500/20 border-green-500 text-green-500" : "bg-chart-5/20 border-chart-5 text-chart-5";
  const icon = zone === "HIPOGLICEMIA" ? <TrendingDown className="h-5 w-5" /> : zone === "ALVO" ? <Activity className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />;
  return (
    <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${zoneColor}`}>
      {icon}
      <div>
        <p className="text-sm font-bold">{zone}</p>
        <p className="text-xs opacity-80">Jejum {jejum} mg/dL | Pós-prandial {pp} mg/dL</p>
      </div>
    </div>
  );
}

export default function SimuladorGlicemia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<GlicCase | null>(null);
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
  // Esquema já em uso: quais itens continuam e com que dose (só nos casos com `regimen`).
  const [kept, setKept] = useState<string[]>([]);
  const [regDoses, setRegDoses] = useState<Record<string, number>>({});
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
        regimen: cd.regimen, ic: cd.ic, hba1cTarget: cd.hba1cTarget,
      });
    }
  }, [virtualRoomCase]);

  // Ao trocar de caso: volta ao esquema atual do paciente, sem fármaco adicional.
  useEffect(() => {
    setSelectedDrugIdx(0); setDose(DRUGS[0].doseMin);
    const reg = activeCase?.regimen ?? [];
    setKept(reg.map(r => r.drug));
    setRegDoses(Object.fromEntries(reg.map(r => [r.drug, r.dose])));
  }, [activeCase?.title]);

  const simulation = useMemo(
    () => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab, { regimen: activeCase?.regimen, kept, doses: regDoses, ic: activeCase?.ic }),
    [selectedDrug, dose, activeCase?.baseLab, activeCase?.regimen, activeCase?.ic, kept, regDoses],
  );
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

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [], regimen: c.regimen, ic: c.ic, hba1cTarget: c.hba1cTarget });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Glicemia, Diabetes e Insulinoterapia</h1>
            <p className="text-muted-foreground">Interprete glicemia, HbA1c e perfil insulínico para ajuste farmacoterapêutico.</p>
            <ShareToolButton toolSlug="farmacoterapia-glicemia" toolName="Glicemia, Diabetes e Insulinoterapia" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Glicemia" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
        {!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-glicemia" toolName="Glicemia, Diabetes e Insulinoterapia" caseId={activeCase.title} /></div>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p>
        {activeCase.patient.specialGroup.length > 0 && <p className="text-sm"><strong>Grupo especial:</strong> {activeCase.patient.specialGroup.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      {/* Glycemic Zone indicator */}
      <GlycemicZone jejum={simulation.lastLab.jejum} pp={simulation.lastLab.pp} />

      {/* Lab Gauges */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Painel Glicêmico (após tratamento)</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card>
          <CardHeader><CardTitle className="text-base">Prescrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(activeCase.regimen?.length ?? 0) > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold">Esquema atual do paciente</p>
                <p className="text-[11px] text-muted-foreground">O laboratório do caso já é COM este esquema. Desligue um item para suspendê-lo (o painel desfaz o efeito dele) ou ajuste a dose.</p>
                {activeCase.regimen!.map(r => {
                  const dr = getDrug(r.drug); if (!dr) return null;
                  const on = kept.includes(r.drug); const replacedNow = on && r.drug === selectedDrug.name;
                  const cur = regDoses[r.drug] ?? r.dose;
                  return (
                    <div key={r.drug} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{r.drug} <span className="text-muted-foreground">({r.dose} {dr.doseUnit} no caso)</span></span>
                        <div className="flex items-center gap-1.5"><span className="text-[10px] text-muted-foreground">{on ? "Mantido" : "Suspenso"}</span><Switch checked={on} onCheckedChange={v => setKept(k => v ? [...k, r.drug] : k.filter(x => x !== r.drug))} aria-label={`Manter ${r.drug}`} /></div>
                      </div>
                      {on && (
                        <>
                          <div className="flex justify-between"><span className="text-[11px]">Dose do esquema</span><span className="text-[11px] font-bold">{cur} {dr.doseUnit}</span></div>
                          <Slider value={[cur]} onValueChange={([v]) => setRegDoses(d => ({ ...d, [r.drug]: v }))} min={dr.doseMin} max={dr.doseMax} step={dr.doseStep} />
                        </>
                      )}
                      {replacedNow && <p className="text-[10px] text-chart-5">Este fármaco também está em "Prescrição": a dose da Prescrição substitui a do esquema.</p>}
                    </div>
                  );
                })}
                {simulation.keptOverRenal.length > 0 && <p className="text-[11px] font-semibold text-destructive">Acima do limite para a TFG ({activeCase.baseLab.tfg} mL/min): {simulation.keptOverRenal.join(", ")}.</p>}
              </div>
            )}
            <p className="text-xs font-semibold">{(activeCase.regimen?.length ?? 0) > 0 ? "Fármaco a adicionar (Prescrição)" : "Prescrição"}</p>
            <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.noDose ? d.name : `${d.name} (${d.class})`}</SelectItem>)}</SelectContent>
            </Select>
            {!selectedDrug.noDose && (
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div>
                <Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} />
                {simulation.renalMax !== null && (
                  <p className={`text-[11px] mt-1 ${simulation.overRenal ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    {simulation.renalMax === 0 ? `Contraindicada com TFG ${activeCase.baseLab.tfg} mL/min.` : `Limite para TFG ${activeCase.baseLab.tfg} mL/min: ≤ ${simulation.renalMax} ${selectedDrug.doseUnit}.`}
                  </p>
                )}
              </div>
            )}
            {activeCase.hba1cTarget !== undefined && (
              <div className={`rounded-lg border p-2 text-xs ${simulation.lastLab.hba1c <= activeCase.hba1cTarget ? "border-green-500/40 bg-green-500/10" : "border-chart-5/40 bg-chart-5/10"}`}>
                <strong>Meta de HbA1c do caso: até {activeCase.hba1cTarget}%</strong> — projeção atual {simulation.lastLab.hba1c}% ({simulation.lastLab.hba1c <= activeCase.hba1cTarget ? "dentro da meta" : "acima da meta"}).
              </div>
            )}
            <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 7 dias"}</Button>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Curva Glicêmica (7 dias)</CardTitle>
            <p className="text-[11px] text-muted-foreground">Jejum e pós-prandial respondem em dias. A HbA1c do painel é a projeção de equilíbrio (~3 meses). Linha "Alvo PP 180" = meta pós-prandial; "Hipo 70" = limite de hipoglicemia.</p></CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={displayTrend}>
                <defs>
                  <linearGradient id="gradJejum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradPP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Hipo 70", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <ReferenceLine y={180} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: "Alvo PP 180", fill: "hsl(var(--chart-5))", fontSize: 10 }} />
                <Area type="monotone" dataKey="jejum" name="Jejum" stroke="hsl(var(--chart-1))" fill="url(#gradJejum)" strokeWidth={2} />
                <Area type="monotone" dataKey="pp" name="Pós-prandial" stroke="hsl(var(--chart-2))" fill="url(#gradPP)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Challenges */}
      {(() => {
        const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title);
        return <SimulatorChallengeMode challengeSet={getGlicemiaLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, kept, regDoses, regimen: activeCase.regimen ?? [], hba1cTarget: activeCase.hba1cTarget, renalMax: simulation.renalMax, overRenal: simulation.overRenal, keptOverRenal: simulation.keptOverRenal, untreated: simulation.untreated }} onComplete={(score, total) => { setLastScore(total > 0 ? Math.round((score / total) * 100) : 0); setChallengeCompleted(true); }} />;
      })()}

      {isVirtualRoom && submitted && (!showFeedback ? (
        <Card className="border-green-500/30 bg-green-500/5"><CardContent className="pt-4 text-center"><p className="text-green-500 font-bold">✅ Resultados enviados!</p><p className="text-muted-foreground text-sm">Redirecionando em 15s...</p></CardContent></Card>
      ) : null)}
    </div>
  );
}
