import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
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
      const F = (r.bioavail / 100) * (bioFactor / 100);
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

export default function SimuladorViasAdministracao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<VACase | null>(null);
  const [dose, setDose] = useState(100);
  const [bioFactor, setBioFactor] = useState(100);
  const [elimRate, setElimRate] = useState(5);
  const [enabledRoutes, setEnabledRoutes] = useState<string[]>(["iv-bolus", "oral"]);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, expectedRoute: cd.expectedRoute ?? "oral", clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setDose(100); setBioFactor(100); setElimRate(5); setEnabledRoutes(["iv-bolus", "oral"]); } }, [activeCase]);

  const points = useMemo(() => generatePKProfiles(dose, enabledRoutes, bioFactor, elimRate), [dose, enabledRoutes, bioFactor, elimRate]);

  const toggleRoute = (key: string) => setEnabledRoutes(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = enabledRoutes.includes(activeCase.expectedRoute);
    const s = ok ? 100 : 30;
    setLastScore(s);
    submitResults({ score: s, actions: { dose, bioFactor, elimRate, enabledRoutes } });
    return s;
  }, [activeCase, enabledRoutes, dose, bioFactor, elimRate, submitted, submitResults]);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedRoute: c.expectedRoute ?? "oral", clinicalTip: c.clinicalTip ?? "" });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Vias de Administração</h1>
            <p className="text-muted-foreground">Compare perfis Cp×t para IV bolus, IV infusão, IM, SC, oral e sublingual.</p>
            <AdminPromptViewer toolSlug="sim-vias-administracao" toolName="Vias de Administração" toolType="simulator" prompt={getNativePrompt("sim-vias-administracao") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
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
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getViasAdministracaoChallenges()} simulatorState={{ dose, enabledRoutes, bioFactor, elimRate }} onComplete={() => setChallengeCompleted(true)} />
      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
