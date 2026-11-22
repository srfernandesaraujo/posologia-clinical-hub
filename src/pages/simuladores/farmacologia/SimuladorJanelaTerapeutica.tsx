import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SimulatorCasePicker, SimulatorWorkspace, ShellPanel, PatientCard, VitalTile } from "@/components/simulators/shell/SimulatorShell";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Loader2, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getJanelaTerapeuticaFarmaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "janela-terapeutica-farma";

interface JTCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  drugName: string;
  de50: number; dl50: number;
  expectedDose: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: JTCase[] = [
  { title: "Digoxina – Janela Estreita", difficulty: "Difícil", patient: { name: "Helena Ribeiro", age: 72, weight: 55, diagnosis: "ICC com fibrilação atrial em uso de digoxina" }, scenario: "A digoxina tem índice terapêutico ~2 (DL50/DE50). Ajuste a dose para ficar na faixa terapêutica estreita (0.8-2.0 ng/mL).", drugName: "Digoxina", de50: 30, dl50: 65, expectedDose: [25, 40], clinicalTip: "IT da digoxina ≈ 2. Monitoramento sérico é obrigatório. Hipocalemia, hipomagnesemia e hipercalcemia potencializam toxicidade." },
  { title: "Amoxicilina – Janela Ampla", difficulty: "Fácil", patient: { name: "Pedro Silva", age: 25, weight: 70, diagnosis: "Faringite bacteriana em tratamento ambulatorial" }, scenario: "A amoxicilina tem IT amplo (>10). Observe como a faixa entre efeito terapêutico e tóxico é grande, permitindo doses flexíveis.", drugName: "Amoxicilina", de50: 20, dl50: 250, expectedDose: [15, 60], clinicalTip: "IT amplo permite doses flexíveis sem TDM. Porém, em IRA/DRC, o acúmulo pode estreitar a janela efetiva." },
  { title: "Lítio – Faixa Terapêutica Crítica", difficulty: "Difícil", patient: { name: "Mariana Lopes", age: 38, weight: 65, diagnosis: "Transtorno bipolar em ajuste de litemia" }, scenario: "O lítio tem IT ~3. A faixa sérica terapêutica é 0.6-1.2 mEq/L; acima de 1.5 mEq/L há toxicidade. Ajuste a dose cuidadosamente.", drugName: "Lítio", de50: 25, dl50: 70, expectedDose: [20, 35], clinicalTip: "Lítio requer TDM regular. Desidratação, AINEs e IECAs reduzem clearance renal e elevam litemia. IT ≈ 3." },
];

function generatePopulationCurves(de50: number, dl50: number, dose: number) {
  const points = [];
  for (let d = 0; d <= 100; d += 2) {
    const effectPct = 100 / (1 + Math.exp(-0.15 * (d - de50)));
    const toxicPct = 100 / (1 + Math.exp(-0.12 * (d - dl50)));
    points.push({ dose: d, terapeutico: Math.round(effectPct * 10) / 10, toxico: Math.round(toxicPct * 10) / 10 });
  }
  const it = dl50 / de50;
  return { points, it: Math.round(it * 10) / 10 };
}

export default function SimuladorJanelaTerapeutica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<JTCase | null>(null);
  const [dose, setDose] = useState(30);
  const [de50, setDE50] = useState(30);
  const [dl50, setDL50] = useState(65);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, drugName: cd.drugName ?? "", de50: cd.de50 ?? 30, dl50: cd.dl50 ?? 65, expectedDose: cd.expectedDose ?? [20, 40], clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setDose(activeCase.de50); setDE50(activeCase.de50); setDL50(activeCase.dl50); } }, [activeCase]);

  const { points, it } = useMemo(() => generatePopulationCurves(de50, dl50, dose), [de50, dl50, dose]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = dose >= activeCase.expectedDose[0] && dose <= activeCase.expectedDose[1];
    const s = ok ? 100 : 30;
    setLastScore(s);
    submitResults({ score: s, actions: { dose, de50, dl50, it } });
    return s;
  }, [activeCase, dose, de50, dl50, it, submitted, submitResults]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); const cs = sessionStorage.getItem("challengeScore"); if (cs) setLastScore(Number(cs)); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, drugName: c.drugName ?? "", de50: c.de50 ?? 30, dl50: c.dl50 ?? 65, expectedDose: c.expectedDose ?? [20, 40], clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <SimulatorCasePicker
        slug={SLUG}
        title="Janela Terapêutica e Índice Terapêutico"
        description="Compare DE50 vs DL50, calcule o índice terapêutico e identifique fármacos de janela estreita vs ampla."
        onBack={() => navigate(isRoom ? "/sala" : "/simuladores")}
        actions={<AdminPromptViewer toolSlug="sim-janela-terapeutica-farma" toolName="Janela Terapêutica" toolType="simulator" prompt={getNativePrompt("sim-janela-terapeutica-farma") || ""} />}
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

  const itTone = it < 3 ? "text-status-crit border-status-crit/40 bg-status-crit/5" : it < 5 ? "text-status-warn border-status-warn/30 bg-status-warn/5" : "text-status-ok border-border bg-card";
  const itNote = it < 3 ? "▲ Janela estreita – TDM obrigatório" : it < 5 ? "● Janela moderada – monitorar" : "● Janela ampla – maior segurança";

  return (
    <SimulatorWorkspace
      slug={SLUG}
      simulatorName="Janela Terapêutica"
      caseTitle={activeCase.title}
      difficulty={activeCase.difficulty}
      onBack={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}
      banners={<>
        {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
        <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      </>}
      patient={
        <PatientCard name={activeCase.patient.name} age={activeCase.patient.age} weight={activeCase.patient.weight} scenario={activeCase.scenario}
          extra={<p className="text-sm"><span className="text-muted-foreground">Fármaco:</span> <span className="font-medium">{activeCase.drugName}</span></p>} />
      }
      stage={<>
        <ShellPanel title="Índice terapêutico">
          <div className="grid grid-cols-3 gap-2">
            <VitalTile name="DE50" value={de50} unit="mg/kg" note="Dose eficaz" />
            <VitalTile name="DL50" value={dl50} unit="mg/kg" note="Dose letal" />
            <div className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 ${itTone}`}>
              <span className="text-[11px] font-medium text-muted-foreground">IT (DL50/DE50)</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{it}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{itNote}</span>
            </div>
          </div>
        </ShellPanel>
        <ShellPanel title="Curvas populacionais: efeito vs toxicidade">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dose" label={{ value: "Dose", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} label={{ value: "% População", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
              <Legend />
              <ReferenceArea x1={de50} x2={dl50} fill="hsl(var(--primary))" fillOpacity={0.08} />
              <ReferenceLine x={dose} stroke="hsl(var(--foreground))" strokeDasharray="5 5" label={{ value: `Dose=${dose}`, fill: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="terapeutico" name="Efeito terapêutico (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="toxico" name="Efeito tóxico (%)" stroke="hsl(var(--status-crit))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ShellPanel>
        <ShellPanel title="Dica clínica"><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></ShellPanel>
      </>}
      controls={
        <ShellPanel title="Parâmetros">
          <div className="space-y-5">
            <div><div className="mb-2 flex justify-between text-xs"><label className="text-muted-foreground">Dose administrada</label><span className="font-mono font-semibold text-primary">{dose} mg/kg</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={0} max={100} step={1} /></div>
            <div><div className="mb-2 flex justify-between text-xs"><label className="text-muted-foreground">DE50</label><span className="font-mono font-semibold text-primary">{de50} mg/kg</span></div><Slider value={[de50]} onValueChange={([v]) => setDE50(v)} min={5} max={80} step={1} /></div>
            <div><div className="mb-2 flex justify-between text-xs"><label className="text-muted-foreground">DL50</label><span className="font-mono font-semibold text-primary">{dl50} mg/kg</span></div><Slider value={[dl50]} onValueChange={([v]) => setDL50(v)} min={20} max={100} step={1} /></div>
          </div>
        </ShellPanel>
      }
      challenge={<SimulatorChallengeMode challengeSet={getJanelaTerapeuticaFarmaChallenges()} simulatorState={{ dose, de50, dl50 }} onComplete={() => setChallengeCompleted(true)} />}
      footer={isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-center text-xs text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-status-ok" : lastScore >= 50 ? "text-status-warn" : "text-status-crit"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    />
  );
}
