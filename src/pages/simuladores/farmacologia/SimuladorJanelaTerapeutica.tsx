import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
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
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<JTCase | null>(null);
  const [dose, setDose] = useState(30);
  const [de50, setDE50] = useState(30);
  const [dl50, setDL50] = useState(65);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, drugName: cd.drugName ?? "", de50: cd.de50 ?? 30, dl50: cd.dl50 ?? 65, expectedDose: cd.expectedDose ?? [20, 40], clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setDose(activeCase.de50); setDE50(activeCase.de50); setDL50(activeCase.dl50); } }, [activeCase]);

  const { points, it } = useMemo(() => generatePopulationCurves(de50, dl50, dose), [de50, dl50, dose]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = dose >= activeCase.expectedDose[0] && dose <= activeCase.expectedDose[1];
    const s = ok ? 100 : 30;
    submitResults({ score: s, actions: { dose, de50, dl50, it } });
    return s;
  }, [activeCase, dose, de50, dl50, it, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, drugName: c.drugName ?? "", de50: c.de50 ?? 30, dl50: c.dl50 ?? 65, expectedDose: c.expectedDose ?? [20, 40], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Janela Terapêutica e Índice Terapêutico</h1>
            <p className="text-muted-foreground">Compare DE50 vs DL50, calcule o índice terapêutico e identifique fármacos de janela estreita vs ampla.</p>
            <AdminPromptViewer toolSlug="sim-janela-terapeutica-farma" toolName="Janela Terapêutica" toolType="simulator" prompt={getNativePrompt("sim-janela-terapeutica-farma") || ""} />
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
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm"><strong>Fármaco:</strong> {activeCase.drugName}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose administrada</label><span className="text-sm font-bold">{dose}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={0} max={100} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">DE50</label><span className="text-sm font-bold">{de50}</span></div><Slider value={[de50]} onValueChange={([v]) => setDE50(v)} min={5} max={80} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">DL50</label><span className="text-sm font-bold">{dl50}</span></div><Slider value={[dl50]} onValueChange={([v]) => setDL50(v)} min={20} max={100} step={1} /></div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Índice Terapêutico</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">DE50</p><p className="text-2xl font-bold">{de50}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">DL50</p><p className="text-2xl font-bold">{dl50}</p></div>
              <div className={`p-3 rounded-lg text-center ${it < 3 ? "bg-destructive/10" : it < 5 ? "bg-yellow-500/10" : "bg-green-500/10"}`}><p className="text-xs text-muted-foreground">IT (DL50/DE50)</p><p className={`text-2xl font-bold ${it < 3 ? "text-destructive" : it < 5 ? "text-yellow-600" : "text-green-600"}`}>{it}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">{it < 3 ? "⚠️ Janela estreita – TDM obrigatório" : it < 5 ? "⚡ Janela moderada – monitorar" : "✅ Janela ampla – maior segurança"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Curvas Populacionais: Efeito vs Toxicidade</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dose" label={{ value: "Dose", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} label={{ value: "% População", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <ReferenceArea x1={de50} x2={dl50} fill="hsl(var(--primary))" fillOpacity={0.08} />
              <ReferenceLine x={dose} stroke="hsl(var(--foreground))" strokeDasharray="5 5" label={{ value: `Dose=${dose}`, fill: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="terapeutico" name="Efeito Terapêutico (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="toxico" name="Efeito Tóxico (%)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getJanelaTerapeuticaFarmaChallenges()} simulatorState={{ dose, de50, dl50 }} />
    </div>
  );
}
