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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getTampaoChallenges } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "tampao-farmaceutico";

const BUFFERS = [
  { name: "Fosfato", pKa: 7.2, rangeMin: 5.8, rangeMax: 8.0 },
  { name: "Citrato", pKa: 6.4, rangeMin: 3.0, rangeMax: 6.2 },
  { name: "Acetato", pKa: 4.76, rangeMin: 3.76, rangeMax: 5.76 },
  { name: "Borato", pKa: 9.24, rangeMin: 8.24, rangeMax: 10.24 },
];

interface BufferCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; context: string };
  scenario: string;
  initialBuffer: string; targetpH: number;
  expectedpHRange: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: BufferCase[] = [
  {
    title: "Colírio de Timolol – Tampão Fosfato pH 6.8",
    difficulty: "Fácil",
    patient: { name: "Farmácia Magistral", product: "Colírio de timolol 0.5%", context: "Formulação oftálmica" },
    scenario: "Colírios devem ter pH entre 6.0-8.0 para conforto e estabilidade. Use tampão fosfato para manter pH ≈ 6.8. Ajuste a razão ácido/base.",
    initialBuffer: "Fosfato", targetpH: 6.8,
    expectedpHRange: [6.5, 7.0],
    clinicalTip: "O pH lacrimal é ~7.4. Colírios com pH 6-8 são geralmente bem tolerados. Fora dessa faixa, causam lacrimejamento reflexo e diluição.",
  },
  {
    title: "Solução Injetável – Tampão Citrato pH 5.0",
    difficulty: "Médio",
    patient: { name: "Indústria", product: "Injetável de ceftriaxona", context: "Estabilidade em pH ácido" },
    scenario: "A ceftriaxona é mais estável em pH 4.5-5.5. Use tampão citrato e calcule a capacidade tamponante necessária para suportar a adição de base.",
    initialBuffer: "Citrato", targetpH: 5.0,
    expectedpHRange: [4.5, 5.5],
    clinicalTip: "A capacidade tamponante (β) deve ser alta o suficiente para resistir a mudanças de pH durante a fabricação e armazenamento, mas não tão alta que cause dor na injeção.",
  },
  {
    title: "Formulação de Eritromicina – pH e Estabilidade",
    difficulty: "Difícil",
    patient: { name: "P&D", product: "Suspensão de eritromicina", context: "Estabilidade pH-dependente" },
    scenario: "A eritromicina é instável em pH < 4.0 (degradação ácida) e requer pH 7.0-8.0. Compare tampões fosfato e borato. Avalie a capacidade tamponante.",
    initialBuffer: "Fosfato", targetpH: 7.5,
    expectedpHRange: [7.0, 8.0],
    clinicalTip: "Para cada tampão, a capacidade máxima ocorre quando pH = pKa. A zona útil de tamponamento é pKa ± 1. Escolha o tampão cujo pKa esteja mais próximo do pH desejado.",
  },
];

function computeBuffer(bufferName: string, ratio: number, concentration: number, acidAdded: number) {
  const buf = BUFFERS.find(b => b.name === bufferName) || BUFFERS[0];
  // Henderson-Hasselbalch: pH = pKa + log([A-]/[HA])
  // ratio = [A-]/[HA] (slider 0.1 to 10)
  const effectiveRatio = Math.max(0.01, ratio - acidAdded / (concentration * 10));
  const pH = buf.pKa + Math.log10(Math.max(0.01, effectiveRatio));

  // Buffer capacity β = 2.303 * C * Ka * [H+] / (Ka + [H+])²
  const H = Math.pow(10, -pH);
  const Ka = Math.pow(10, -buf.pKa);
  const beta = 2.303 * (concentration / 100) * Ka * H / Math.pow(Ka + H, 2);

  // Titration curve
  const titrationData = [];
  for (let acid = 0; acid <= 20; acid += 0.5) {
    const r = Math.max(0.01, ratio - acid / (concentration * 10));
    const p = buf.pKa + Math.log10(Math.max(0.01, r));
    titrationData.push({ acidAdded: acid, pH: Math.round(p * 100) / 100 });
  }

  // β vs pH curve
  const betaCurve = [];
  for (let p = 2; p <= 12; p += 0.2) {
    const h = Math.pow(10, -p);
    const b = 2.303 * (concentration / 100) * Ka * h / Math.pow(Ka + h, 2);
    betaCurve.push({ pH: Math.round(p * 10) / 10, beta: Math.round(b * 10000) / 10000 });
  }

  return {
    pH: Math.round(pH * 100) / 100,
    beta: Math.round(beta * 10000) / 10000,
    titrationData,
    betaCurve,
    pKa: buf.pKa,
    rangeMin: buf.rangeMin,
    rangeMax: buf.rangeMax,
  };
}

export default function SimuladorTampao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<BufferCase | null>(null);
  const [bufferName, setBufferName] = useState("Fosfato");
  const [ratio, setRatio] = useState(1);
  const [concentration, setConcentration] = useState(50);
  const [acidAdded, setAcidAdded] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialBuffer: cd.initialBuffer ?? "Fosfato", targetpH: cd.targetpH ?? 7.0, expectedpHRange: cd.expectedpHRange ?? [6.5, 7.5], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setBufferName(activeCase.initialBuffer); setRatio(1); setConcentration(50); setAcidAdded(0); }
  }, [activeCase]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const { pH, beta, titrationData, betaCurve, pKa, rangeMin, rangeMax } = useMemo(() => computeBuffer(bufferName, ratio, concentration, acidAdded), [bufferName, ratio, concentration, acidAdded]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = pH >= activeCase.expectedpHRange[0] && pH <= activeCase.expectedpHRange[1];
    const score = ok ? 100 : 30;
    setLastScore(score);
    submitResults({ score, actions: { bufferName, ratio, concentration, acidAdded, pH, beta } });
  }, [activeCase, pH, bufferName, ratio, concentration, acidAdded, beta, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialBuffer: c.initialBuffer ?? "Fosfato", targetpH: c.targetpH ?? 7.0, expectedpHRange: c.expectedpHRange ?? [6.5, 7.5], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Tampão Farmacêutico e pH</h1>
            <p className="text-muted-foreground">Henderson-Hasselbalch interativo, capacidade tamponante e curvas de titulação.</p>
            <AdminPromptViewer toolSlug="sim-tampao-farmaceutico" toolName="Tampão Farmacêutico" toolType="simulator" prompt={getNativePrompt("sim-tampao-farmaceutico") || ""} />
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
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros do Tampão</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Sistema Tampão</label>
              <Select value={bufferName} onValueChange={setBufferName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUFFERS.map(b => <SelectItem key={b.name} value={b.name}>{b.name} (pKa = {b.pKa})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Razão [A⁻]/[HA]</label><span className="text-sm font-bold">{ratio}</span></div><Slider value={[ratio * 10]} onValueChange={([v]) => setRatio(v / 10)} min={1} max={100} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Concentração Total (%)</label><span className="text-sm font-bold">{concentration}%</span></div><Slider value={[concentration]} onValueChange={([v]) => setConcentration(v)} min={10} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Ácido Adicionado (mL)</label><span className="text-sm font-bold">{acidAdded} mL</span></div><Slider value={[acidAdded * 10]} onValueChange={([v]) => setAcidAdded(v / 10)} min={0} max={200} step={5} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">pH</p><p className={`text-2xl font-bold ${pH >= rangeMin && pH <= rangeMax ? "text-green-600" : "text-destructive"}`}>{pH}</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">β (cap. tamp.)</p><p className="text-lg font-bold">{beta}</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Zona Útil</p><p className="text-xs font-bold">{rangeMin}-{rangeMax}</p></div>
            </div>
            {isVirtualRoom ? (
              !submitted ? (
                <Button onClick={handleFinish} className="w-full gap-2"><Send className="h-4 w-4" /> Enviar Resultados</Button>
              ) : !showFeedback ? (
                <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                  <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
                  <p className="text-xs text-muted-foreground">pH: {pH} | Faixa esperada: {activeCase?.expectedpHRange?.[0]}–{activeCase?.expectedpHRange?.[1]}</p>
                </div>
              )
            ) : (
              <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Curva de Titulação</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={titrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="acidAdded" label={{ value: "Ácido (mL)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[2, 12]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <ReferenceLine y={pKa} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `pKa=${pKa}`, fill: "hsl(var(--destructive))" }} />
                  <Line type="monotone" dataKey="pH" name="pH" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Capacidade Tamponante (β vs pH)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={betaCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="pH" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <ReferenceLine x={pKa} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="beta" name="β" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getTampaoChallenges()} simulatorState={{ bufferName, ratio, concentration, pH, beta }} />
    </div>
  );
}
