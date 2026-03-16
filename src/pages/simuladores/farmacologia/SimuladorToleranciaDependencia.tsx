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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getToleranciaDependenciaChallenges } from "@/data/simulatorChallenges";

const SLUG = "tolerancia-dependencia";

type DrugClass = "opioide" | "benzodiazepínico" | "álcool";

interface TDCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  drugClass: DrugClass;
  expectedWeeks: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: TDCase[] = [
  { title: "Tolerância a Opioides – Dor Oncológica", difficulty: "Médio", patient: { name: "Sérgio Campos", age: 62, weight: 70, diagnosis: "Dor oncológica com uso crônico de morfina há 6 meses" }, scenario: "Após semanas de uso, o paciente necessita doses crescentes para o mesmo alívio. Observe a tolerância farmacodinâmica por downregulation de receptores µ.", drugClass: "opioide", expectedWeeks: [4, 12], clinicalTip: "Tolerância a opioides: dessensibilização e internalização de receptores µ. A tolerância à analgesia é mais rápida que à depressão respiratória – mas esta também ocorre." },
  { title: "Dependência de Benzodiazepínicos", difficulty: "Difícil", patient: { name: "Marina Lopes", age: 45, weight: 58, diagnosis: "Insônia crônica com uso de alprazolam há 8 meses" }, scenario: "Uso prolongado de BZD causa upregulation compensatória de sistemas excitatórios (glutamato). A retirada abrupta pode causar convulsões.", drugClass: "benzodiazepínico", expectedWeeks: [8, 24], clinicalTip: "BZD potencializam GABA-A. Uso crônico → downregulation GABA + upregulation glutamatérgica. Desmame: redução de 10-25% por quinzena (Protocolo de Ashton)." },
  { title: "Síndrome de Abstinência Alcoólica", difficulty: "Difícil", patient: { name: "Ronaldo Souza", age: 50, weight: 90, diagnosis: "Etilismo crônico – internação com suspensão abrupta" }, scenario: "O álcool potencia GABA e inibe NMDA. A retirada causa hiperexcitabilidade: tremores (6-24h), convulsões (24-48h), delirium tremens (48-96h).", drugClass: "álcool", expectedWeeks: [2, 8], clinicalTip: "Abstinência alcoólica: usar BZD de longa ação (diazepam) ou curta (lorazepam em hepatopata). Tiamina IV antes de glicose para prevenir Wernicke." },
];

function generateToleranceCurve(drugClass: DrugClass, weeksOfUse: number, doseEscalation: number) {
  const points = [];
  const receptorHalfLife = drugClass === "opioide" ? 3 : drugClass === "benzodiazepínico" ? 5 : 2;

  for (let w = 0; w <= 24; w++) {
    const receptorDensity = 100 * Math.exp(-0.1 * Math.min(w, weeksOfUse) / receptorHalfLife * weeksOfUse * 0.3);
    const effectiveDose = 100 + (doseEscalation * Math.min(w, weeksOfUse) * 0.5);
    const clinicalEffect = (effectiveDose * receptorDensity) / (100 + effectiveDose * 0.3);

    let withdrawalSeverity = 0;
    if (w > weeksOfUse) {
      const weeksSinceStopped = w - weeksOfUse;
      const peakWithdrawal = Math.min(100, weeksOfUse * 5 + doseEscalation * 0.3);
      const decayRate = drugClass === "opioide" ? 0.5 : drugClass === "benzodiazepínico" ? 0.15 : 0.8;
      withdrawalSeverity = peakWithdrawal * Math.exp(-decayRate * weeksSinceStopped);
    }

    points.push({
      week: w,
      receptorDensity: Math.round(Math.max(10, receptorDensity) * 10) / 10,
      clinicalEffect: Math.round(Math.min(100, clinicalEffect) * 10) / 10,
      withdrawal: Math.round(withdrawalSeverity * 10) / 10,
    });
  }
  return points;
}

export default function SimuladorToleranciaDependencia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<TDCase | null>(null);
  const [drugClass, setDrugClass] = useState<DrugClass>("opioide");
  const [weeksOfUse, setWeeksOfUse] = useState(8);
  const [doseEscalation, setDoseEscalation] = useState(50);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, drugClass: cd.drugClass ?? "opioide", expectedWeeks: cd.expectedWeeks ?? [4, 12], clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setDrugClass(activeCase.drugClass); setWeeksOfUse(8); setDoseEscalation(50); } }, [activeCase]);

  const points = useMemo(() => generateToleranceCurve(drugClass, weeksOfUse, doseEscalation), [drugClass, weeksOfUse, doseEscalation]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = weeksOfUse >= activeCase.expectedWeeks[0] && weeksOfUse <= activeCase.expectedWeeks[1];
    const s = ok ? 100 : 30;
    submitResults({ score: s, actions: { drugClass, weeksOfUse, doseEscalation } });
    return s;
  }, [activeCase, drugClass, weeksOfUse, doseEscalation, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, drugClass: c.drugClass ?? "opioide", expectedWeeks: c.expectedWeeks ?? [4, 12], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Tolerância, Dependência e Abstinência</h1>
            <p className="text-muted-foreground">Simule uso crônico de opioides, benzodiazepínicos e álcool e observe tolerância e síndrome de abstinência.</p>
            <AdminPromptViewer toolSlug="sim-tolerancia-dependencia" toolName="Tolerância e Dependência" toolType="simulator" prompt={getNativePrompt("sim-tolerancia-dependencia") || ""} />
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
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Classe Farmacológica</p>
              {(["opioide", "benzodiazepínico", "álcool"] as const).map(d => (<button key={d} onClick={() => setDrugClass(d)} className={`w-full text-left p-2.5 rounded text-sm capitalize ${drugClass === d ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{d}</button>))}
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Semanas de Uso</label><span className="text-sm font-bold">{weeksOfUse} sem</span></div><Slider value={[weeksOfUse]} onValueChange={([v]) => setWeeksOfUse(v)} min={1} max={24} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Escalação de Dose</label><span className="text-sm font-bold">{doseEscalation}%</span></div><Slider value={[doseEscalation]} onValueChange={([v]) => setDoseEscalation(v)} min={0} max={100} step={5} /></div>
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={() => handleFinish()} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dinâmica Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" label={{ value: "Semana", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 110]} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <ReferenceLine x={weeksOfUse} stroke="hsl(var(--foreground))" strokeDasharray="5 5" label={{ value: "Suspensão", fill: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="receptorDensity" name="Receptores (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="clinicalEffect" name="Efeito Clínico (%)" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="withdrawal" name="Abstinência (%)" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getToleranciaDependenciaChallenges()} simulatorState={{ drugClass, weeksOfUse }} />
    </div>
  );
}
