import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Send, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getReologiaChallenges } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "reologia";

interface RheoCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; context: string };
  scenario: string;
  initialBehavior: string; initialViscosity: number;
  clinicalTip: string;
}

const BUILT_IN_CASES: RheoCase[] = [
  {
    title: "Gel de Carbômero 940 – Pseudoplástico",
    difficulty: "Fácil",
    patient: { name: "Farmácia Magistral", product: "Gel de carbômero 0.5%", context: "Formulação de gel para uso tópico" },
    scenario: "O carbômero forma géis pseudoplásticos: a viscosidade diminui com o aumento da taxa de cisalhamento (shear-thinning). Observe o reograma característico.",
    initialBehavior: "pseudoplastic", initialViscosity: 70,
    clinicalTip: "Géis pseudoplásticos são ideais para uso tópico: alta viscosidade em repouso (boa retenção) e baixa durante aplicação (fácil espalhabilidade).",
  },
  {
    title: "Creme com HPMC – Comportamento Tixotrópico",
    difficulty: "Médio",
    patient: { name: "CQ Industrial", product: "Creme dermatológico com HPMC", context: "Controle de qualidade reológico" },
    scenario: "A HPMC confere tixotropia: a viscosidade diminui com o tempo sob cisalhamento constante e recupera gradualmente em repouso. Observe a histerese no reograma.",
    initialBehavior: "thixotropic", initialViscosity: 60,
    clinicalTip: "Tixotropia é desejável em cremes: facilita a aplicação (agitação reduz viscosidade) e mantém o produto no local após aplicação (viscosidade recupera).",
  },
  {
    title: "Suspensão Concentrada – Dilatante",
    difficulty: "Difícil",
    patient: { name: "Laboratório", product: "Suspensão de amido em água 60%", context: "Estudo de comportamento dilatante" },
    scenario: "Suspensões concentradas podem ser dilatantes: a viscosidade AUMENTA com a taxa de cisalhamento. Este comportamento é indesejável em formulações farmacêuticas.",
    initialBehavior: "dilatant", initialViscosity: 40,
    clinicalTip: "Comportamento dilatante dificulta a agitação e o envase. Soluções: diluir a suspensão, usar dispersantes ou mudar o tamanho de partícula.",
  },
];

function computeRheogram(behavior: string, viscosity: number, thickener: number) {
  const points = [];
  const k = viscosity / 50;
  const thick = 1 + thickener / 50;
  for (let sr = 0; sr <= 200; sr += 5) {
    let shearStress: number;
    let apparentViscosity: number;
    switch (behavior) {
      case "newtonian":
        shearStress = k * thick * sr;
        apparentViscosity = k * thick;
        break;
      case "pseudoplastic":
        shearStress = k * thick * Math.pow(sr, 0.6);
        apparentViscosity = sr > 0 ? shearStress / sr : k * thick;
        break;
      case "dilatant":
        shearStress = k * thick * Math.pow(sr, 1.5) / 10;
        apparentViscosity = sr > 0 ? shearStress / sr : k * thick;
        break;
      case "thixotropic":
        const decay = Math.exp(-sr / 100);
        shearStress = k * thick * Math.pow(sr, 0.6) * (0.6 + 0.4 * decay);
        apparentViscosity = sr > 0 ? shearStress / sr : k * thick;
        break;
      default:
        shearStress = k * sr;
        apparentViscosity = k;
    }
    points.push({
      shearRate: sr,
      shearStress: Math.round(shearStress * 100) / 100,
      viscosity: Math.round(apparentViscosity * 100) / 100,
    });
  }
  return points;
}

export default function SimuladorReologia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<RheoCase | null>(null);
  const [behavior, setBehavior] = useState("pseudoplastic");
  const [viscosity, setViscosity] = useState(70);
  const [thickener, setThickener] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialBehavior: cd.initialBehavior ?? "pseudoplastic", initialViscosity: cd.initialViscosity ?? 70, clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setBehavior(activeCase.initialBehavior); setViscosity(activeCase.initialViscosity); setThickener(0); }
  }, [activeCase]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const points = useMemo(() => computeRheogram(behavior, viscosity, thickener), [behavior, viscosity, thickener]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const score = 80;
    setLastScore(score);
    submitResults({ score, actions: { behavior, viscosity, thickener } });
  }, [activeCase, behavior, viscosity, thickener, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialBehavior: c.initialBehavior ?? "pseudoplastic", initialViscosity: c.initialViscosity ?? 70, clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Reologia e Viscosidade</h1>
            <p className="text-muted-foreground">Reogramas interativos: newtoniano, pseudoplástico, dilatante e tixotrópico.</p>
            <AdminPromptViewer toolSlug="sim-reologia" toolName="Reologia e Viscosidade" toolType="simulator" prompt={getNativePrompt("sim-reologia") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Produto:</strong> {activeCase.patient.product}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Reológicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Comportamento</label>
              <Select value={behavior} onValueChange={setBehavior}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newtonian">Newtoniano</SelectItem>
                  <SelectItem value="pseudoplastic">Pseudoplástico</SelectItem>
                  <SelectItem value="dilatant">Dilatante</SelectItem>
                  <SelectItem value="thixotropic">Tixotrópico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Viscosidade Base</label><span className="text-sm font-bold">{viscosity}</span></div><Slider value={[viscosity]} onValueChange={([v]) => setViscosity(v)} min={10} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Espessante Adicionado (%)</label><span className="text-sm font-bold">{thickener}%</span></div><Slider value={[thickener]} onValueChange={([v]) => setThickener(v)} min={0} max={100} step={5} /></div>
            {isVirtualRoom ? (
              !submitted ? (
                <Button onClick={handleFinish} className="w-full gap-2"><Send className="h-4 w-4" /> Enviar Resultados</Button>
              ) : !showFeedback ? (
                <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                  <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
                  <p className="text-xs text-muted-foreground">Comportamento: {behavior} | Viscosidade: {viscosity} | Espessante: {thickener}%</p>
                </div>
              )
            ) : (
              <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
            )}
            {isVirtualRoom && submitted && <p className="text-xs text-center text-muted-foreground mt-2">Resultados enviados ✓ — Redirecionando em 15s...</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Reograma (τ vs γ̇)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="shearRate" label={{ value: "Taxa de Cisalhamento (s⁻¹)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" label={{ value: "Tensão (Pa)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--primary))" />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Viscosidade (Pa·s)", angle: 90, position: "insideRight" }} stroke="hsl(var(--chart-2))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="shearStress" name="Tensão de Cisalhamento" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="viscosity" name="Viscosidade Aparente" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getReologiaChallenges()} simulatorState={{ behavior, viscosity, thickener }} />
    </div>
  );
}
