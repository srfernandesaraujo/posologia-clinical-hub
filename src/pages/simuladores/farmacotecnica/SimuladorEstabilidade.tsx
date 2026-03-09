import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { CaseCardMeta } from "@/components/CaseCardMeta";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getEstabilidadeChallenges } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "estabilidade";

interface StabCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; activeIngredient: string };
  scenario: string;
  initialConcentration: number; initialTemp: number; initialOrder: string;
  expectedT90Range: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: StabCase[] = [
  {
    title: "Suspensão de Amoxicilina – Prazo de Validade",
    difficulty: "Fácil",
    patient: { name: "Farmácia Escola", product: "Suspensão oral de amoxicilina 250 mg/5 mL", activeIngredient: "Amoxicilina" },
    scenario: "Após reconstituição, a suspensão de amoxicilina degrada por cinética de primeira ordem. Determine o t90 a 25°C e avalie se o prazo de 14 dias é adequado.",
    initialConcentration: 100, initialTemp: 25, initialOrder: "first",
    expectedT90Range: [10, 20],
    clinicalTip: "A amoxicilina em suspensão deve ser refrigerada (2-8°C) para prolongar a estabilidade. A 25°C, o t90 é significativamente menor.",
  },
  {
    title: "Vitamina C Injetável – Efeito da Temperatura",
    difficulty: "Médio",
    patient: { name: "Indústria Farmacêutica", product: "Solução injetável de ácido ascórbico 500 mg/mL", activeIngredient: "Ácido Ascórbico" },
    scenario: "O ácido ascórbico sofre oxidação (degradação de primeira ordem). Compare a estabilidade a 25°C, 40°C e 60°C usando a equação de Arrhenius para estudo acelerado.",
    initialConcentration: 100, initialTemp: 40, initialOrder: "first",
    expectedT90Range: [3, 8],
    clinicalTip: "Estudos de estabilidade acelerada (40°C/75% UR por 6 meses) permitem extrapolar o prazo de validade a 25°C usando a equação de Arrhenius.",
  },
  {
    title: "Pomada de Hidrocortisona – Degradação de Ordem Zero",
    difficulty: "Difícil",
    patient: { name: "Farmácia Magistral", product: "Pomada de hidrocortisona 1%", activeIngredient: "Hidrocortisona" },
    scenario: "Em formulações semissólidas saturadas, a degradação pode seguir cinética de ordem zero (concentração constante na superfície). Modele o t90 e compare com primeira ordem.",
    initialConcentration: 100, initialTemp: 25, initialOrder: "zero",
    expectedT90Range: [15, 30],
    clinicalTip: "Quando o fármaco está em suspensão no veículo (saturação), a degradação aparente segue ordem zero até que toda a reserva se dissolva.",
  },
];

function computeDegradation(c0: number, temp: number, order: string, kRef: number) {
  // Arrhenius: k(T) = kRef * exp(Ea/R * (1/T_ref - 1/T))
  const Ea = 80000; // J/mol typical pharmaceutical
  const R = 8.314;
  const Tref = 298.15; // 25°C
  const T = temp + 273.15;
  const k = kRef * Math.exp((Ea / R) * (1 / Tref - 1 / T));

  const points = [];
  let t90 = 0;
  for (let t = 0; t <= 36; t += 0.5) {
    let conc: number;
    if (order === "zero") {
      conc = Math.max(0, c0 - k * t);
    } else if (order === "second") {
      conc = c0 / (1 + k * t * c0 / 100);
    } else {
      // first order
      conc = c0 * Math.exp(-k * t);
    }
    points.push({ month: t, concentration: Math.round(conc * 100) / 100 });
    if (t90 === 0 && conc <= c0 * 0.9) t90 = t;
  }
  if (t90 === 0) t90 = 36;
  return { points, t90: Math.round(t90 * 10) / 10, kEff: Math.round(k * 10000) / 10000 };
}

export default function SimuladorEstabilidade() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<StabCase | null>(null);
  const [concentration, setConcentration] = useState(100);
  const [temp, setTemp] = useState(25);
  const [order, setOrder] = useState("first");
  const [kRef, setKRef] = useState(0.03);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialConcentration: cd.initialConcentration ?? 100, initialTemp: cd.initialTemp ?? 25, initialOrder: cd.initialOrder ?? "first", expectedT90Range: cd.expectedT90Range ?? [5, 15], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setConcentration(activeCase.initialConcentration); setTemp(activeCase.initialTemp); setOrder(activeCase.initialOrder); setKRef(0.03); }
  }, [activeCase]);

  const { points, t90, kEff } = useMemo(() => computeDegradation(concentration, temp, order, kRef), [concentration, temp, order, kRef]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const t90Ok = t90 >= activeCase.expectedT90Range[0] && t90 <= activeCase.expectedT90Range[1];
    submitResults({ score: t90Ok ? 100 : 30, actions: { concentration, temp, order, kRef, t90 } });
  }, [activeCase, t90, concentration, temp, order, kRef, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialConcentration: c.initialConcentration ?? 100, initialTemp: c.initialTemp ?? 25, initialOrder: c.initialOrder ?? "first", expectedT90Range: c.expectedT90Range ?? [5, 15], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Estabilidade e Prazo de Validade</h1>
            <p className="text-muted-foreground">Cinética de degradação, equação de Arrhenius e cálculo de t90.</p>
            <AdminPromptViewer toolSlug="sim-estabilidade" toolName="Estabilidade e Prazo de Validade" toolType="simulator" prompt={getNativePrompt("sim-estabilidade") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.patient.product}</p>
              </button>
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <button key={c.id} onClick={() => loadAICase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><div className="flex gap-2"><Badge variant="secondary">IA</Badge><Badge variant="outline">{c.difficulty}</Badge></div></div>
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
              </button>
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>
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
        <p className="text-sm"><strong>Princípio Ativo:</strong> {activeCase.patient.activeIngredient}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros de Estabilidade</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Concentração Inicial (%)</label><span className="text-sm font-bold">{concentration}%</span></div><Slider value={[concentration]} onValueChange={([v]) => setConcentration(v)} min={50} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Temperatura (°C)</label><span className="text-sm font-bold">{temp}°C</span></div><Slider value={[temp]} onValueChange={([v]) => setTemp(v)} min={5} max={60} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Constante de velocidade (k ref 25°C)</label><span className="text-sm font-bold">{kRef}</span></div><Slider value={[kRef * 1000]} onValueChange={([v]) => setKRef(v / 1000)} min={5} max={100} step={5} /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ordem da Reação</label>
              <Select value={order} onValueChange={setOrder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zero">Ordem Zero</SelectItem>
                  <SelectItem value="first">Primeira Ordem</SelectItem>
                  <SelectItem value="second">Segunda Ordem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">t90</p><p className="text-2xl font-bold">{t90} <span className="text-sm">meses</span></p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">k efetivo</p><p className="text-xl font-bold">{kEff}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Ordem</p><p className="text-xl font-bold capitalize">{order === "zero" ? "0" : order === "first" ? "1ª" : "2ª"}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Concentração vs Tempo (meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" label={{ value: "Meses", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 110]} label={{ value: "Conc. (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <ReferenceLine y={90} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "90% (t90)", fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="concentration" name="Concentração (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getEstabilidadeChallenges()} simulatorState={{ concentration, temp, order, kRef, t90 }} />
    </div>
  );
}
