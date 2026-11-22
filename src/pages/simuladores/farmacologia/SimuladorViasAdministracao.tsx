import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulatorCasePicker, SimulatorWorkspace, PatientCard } from "@/components/simulators/shell/SimulatorShell";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getViasAdministracaoChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "vias-administracao";

interface VACase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  expectedRoute: string;
  clinicalTip: string;
}

const ROUTES = [
  { key: "iv-bolus", label: "IV Bolus", bioavail: 100, ka: 0, infusionMin: 0, color: "hsl(var(--primary))" },
  { key: "iv-infusao", label: "IV Infusão", bioavail: 100, ka: 0, infusionMin: 60, color: "hsl(var(--chart-2))" },
  { key: "im", label: "Intramuscular", bioavail: 85, ka: 0.08, infusionMin: 0, color: "hsl(var(--chart-3))" },
  { key: "sc", label: "Subcutânea", bioavail: 75, ka: 0.03, infusionMin: 0, color: "hsl(var(--chart-4))" },
  { key: "oral", label: "Oral", bioavail: 50, ka: 0.02, infusionMin: 0, color: "hsl(var(--chart-5))" },
  { key: "sublingual", label: "Sublingual", bioavail: 65, ka: 0.5, infusionMin: 0, color: "hsl(var(--destructive))" },
];

function generatePKProfiles(dose: number, enabledRoutes: string[], bioFactor: number, elimRate: number) {
  const points = [];
  const ke = elimRate * 0.003; // ke ~0.015/min at slider=5 → t½ ~46 min
  for (let t = 0; t <= 360; t += 5) {
    const point: any = { time: t };
    ROUTES.forEach(r => {
      if (!enabledRoutes.includes(r.key)) return;
      // Vias IV têm F=100% por definição (sem absorção, sem 1ª passagem) — não escaladas pela biodisponibilidade global.
      const isIV = r.key === "iv-bolus" || r.key === "iv-infusao";
      const F = isIV ? (r.bioavail / 100) : (r.bioavail / 100) * (bioFactor / 100);
      let cp = 0;
      if (r.key === "iv-bolus") {
        // Instant peak, monoexponential decay
        cp = dose * F * Math.exp(-ke * t);
      } else if (r.key === "iv-infusao") {
        // Zero-order infusion over T minutes
        const T = r.infusionMin;
        if (t <= T) {
          cp = (dose * F / T) * (1 / ke) * (1 - Math.exp(-ke * t));
        } else {
          cp = (dose * F / T) * (1 / ke) * (1 - Math.exp(-ke * T)) * Math.exp(-ke * (t - T));
        }
      } else {
        // Bateman equation: first-order absorption + first-order elimination
        const ka = r.ka;
        if (Math.abs(ka - ke) < 0.0001) {
          cp = dose * F * ka * t * Math.exp(-ke * t);
        } else {
          cp = (dose * F * ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
        }
      }
      point[r.key] = Math.max(0, Math.round((cp || 0) * 100) / 100);
    });
    points.push(point);
  }
  return points;
}
const BUILT_IN_CASES: VACase[] = [
  { title: "Emergência – Anafilaxia", difficulty: "Fácil", patient: { name: "Lucas Mendes", age: 30, weight: 80, diagnosis: "Anafilaxia após picada de vespa" }, scenario: "A adrenalina deve ser administrada pela via que garanta absorção rápida e previsível em emergência. Compare os perfis.", expectedRoute: "im", clinicalTip: "Na anafilaxia, a adrenalina IM (face anterolateral da coxa) é preferida à IV por ser mais segura e ter absorção rápida e previsível." },
  { title: "Nitroglicerina Sublingual", difficulty: "Fácil", patient: { name: "Antônio Vieira", age: 65, weight: 72, diagnosis: "Angina estável de esforço" }, scenario: "A nitroglicerina sublingual evita o efeito de primeira passagem hepática. Compare com a via oral.", expectedRoute: "sublingual", clinicalTip: "A nitroglicerina tem metabolismo de primeira passagem >90%. Via sublingual atinge Tmax em ~5 min com biodisponibilidade ~40% (vs ~1% oral)." },
  { title: "Vancomicina IV – Infusão Contínua", difficulty: "Médio", patient: { name: "Carla Braga", age: 58, weight: 68, diagnosis: "MRSA bacteremia em UTI" }, scenario: "A vancomicina IV deve ser administrada em infusão lenta para evitar síndrome do homem vermelho. Compare IV bolus vs infusão.", expectedRoute: "iv-infusao", clinicalTip: "Vancomicina IV rápida causa liberação de histamina (red man syndrome). Infusão em ≥60 min é obrigatória. Meta AUC/MIC 400-600." },
];

export default function SimuladorViasAdministracao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<VACase | null>(null);
  const [dose, setDose] = useState(100);
  const [bioFactor, setBioFactor] = useState(100);
  const [elimRate, setElimRate] = useState(5);
  const [enabledRoutes, setEnabledRoutes] = useState<string[]>(["iv-bolus", "oral"]);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, expectedRoute: cd.expectedRoute ?? "oral", clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => {
    if (activeCase) {
      setDose(100); setBioFactor(100); setElimRate(5);
      // Pré-habilita apenas a via de comparação (errada) citada no cenário — a via correta
      // fica de fora por padrão, para que o aluno precise identificá-la e ativá-la.
      const COMPARATOR: Record<string, string> = { im: "iv-bolus", sublingual: "oral", "iv-infusao": "iv-bolus", oral: "iv-bolus", sc: "iv-bolus", "iv-bolus": "oral" };
      setEnabledRoutes([COMPARATOR[activeCase.expectedRoute] ?? "oral"]);
    }
  }, [activeCase]);

  const points = useMemo(() => generatePKProfiles(dose, enabledRoutes, bioFactor, elimRate), [dose, enabledRoutes, bioFactor, elimRate]);

  const toggleRoute = (key: string) => setEnabledRoutes(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const includesExpected = enabledRoutes.includes(activeCase.expectedRoute);
    const focused = enabledRoutes.length <= 2;
    const caseScore = includesExpected && focused ? 100 : includesExpected ? 60 : 20;
    // Modo solo: combina o score do caso com o score real do quiz de desafios (se já respondido),
    // em vez de persistir só o match binário de via — evita divergência entre nota exibida e gravada.
    const storedChallengeScore = sessionStorage.getItem("challengeScore");
    const s = storedChallengeScore ? Math.round((caseScore + Number(storedChallengeScore)) / 2) : caseScore;
    setLastScore(s);
    submitResults({ score: s, actions: { dose, bioFactor, elimRate, enabledRoutes } });
    return s;
  }, [activeCase, enabledRoutes, dose, bioFactor, elimRate, submitted, submitResults]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) { handleFinish(); const cs = sessionStorage.getItem("challengeScore"); if (cs) setLastScore(Number(cs)); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedRoute: c.expectedRoute ?? "oral", clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <SimulatorCasePicker
        slug={SLUG}
        title="Vias de Administração"
        description="Compare perfis Cp×t para IV bolus, IV infusão, IM, SC, oral e sublingual."
        onBack={() => navigate(isRoom ? "/sala" : "/simuladores")}
        actions={<AdminPromptViewer toolSlug="sim-vias-administracao" toolName="Vias de Administração" toolType="simulator" prompt={getNativePrompt("sim-vias-administracao") || ""} />}
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

  return (
    <SimulatorWorkspace
      slug={SLUG}
      simulatorName="Vias de Administração"
      caseTitle={activeCase.title}
      difficulty={activeCase.difficulty}
      onBack={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}
      banners={<>
        {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
        <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      </>}
      patient={
        <PatientCard name={activeCase.patient.name} age={activeCase.patient.age} weight={activeCase.patient.weight} scenario={activeCase.scenario} />
      }
      stage={<>
        <Card>
          <CardHeader><CardTitle className="text-base">Perfil Cp×t Comparativo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (min)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "Cp (mg/L)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                {ROUTES.filter(r => enabledRoutes.includes(r.key)).map(r => (<Line key={r.key} type="monotone" dataKey={r.key} name={r.label} stroke={r.color} dot={false} strokeWidth={2} />))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      </>}
      controls={
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Farmacocinéticos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose (mg)</label><span className="text-sm font-bold">{dose}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={10} max={500} step={10} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Biodisponibilidade Global (%)</label><span className="text-sm font-bold">{bioFactor}%</span></div><Slider value={[bioFactor]} onValueChange={([v]) => setBioFactor(v)} min={10} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Taxa de Eliminação</label><span className="text-sm font-bold">{elimRate}</span></div><Slider value={[elimRate]} onValueChange={([v]) => setElimRate(v)} min={1} max={20} step={1} /></div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Vias de Administração</p>
              {ROUTES.map(r => (<div key={r.key} className="flex items-center justify-between"><label className="text-sm">{r.label} (F={r.bioavail}%)</label><Switch checked={enabledRoutes.includes(r.key)} onCheckedChange={() => toggleRoute(r.key)} /></div>))}
            </div>
            
          </CardContent>
        </Card>
      }
      challenge={<SimulatorChallengeMode challengeSet={getViasAdministracaoChallenges()} simulatorState={{ dose, enabledRoutes, bioFactor, elimRate }} onComplete={() => setChallengeCompleted(true)} />}
      footer={isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-status-ok" : lastScore >= 50 ? "text-status-warn" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    />
  );
}
