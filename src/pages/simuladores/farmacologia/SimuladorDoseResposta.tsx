import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { getDoseRespostaChallenges } from "@/data/simulatorChallenges";

const SLUG = "dose-resposta";

interface DRCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialEC50: number; initialEmax: number;
  expectedEC50: [number, number]; expectedEmax: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: DRCase[] = [
  {
    title: "Agonista Parcial – Buprenorfina vs Morfina",
    difficulty: "Médio",
    patient: { name: "Carlos Mendes", age: 52, weight: 78, diagnosis: "Dor crônica em transição para buprenorfina" },
    scenario: "Compare a curva dose-resposta de um agonista pleno (morfina) com um agonista parcial (buprenorfina). Ative o agonista parcial e observe a redução do Emax.",
    initialEC50: 50, initialEmax: 100,
    expectedEC50: [40, 60], expectedEmax: [40, 70],
    clinicalTip: "Agonistas parciais têm Emax menor que agonistas plenos, mas podem ter maior afinidade (menor EC50). A buprenorfina tem teto analgésico, reduzindo risco de depressão respiratória.",
  },
  {
    title: "Antagonista Competitivo – Naloxona",
    difficulty: "Médio",
    patient: { name: "Lúcia Ferreira", age: 28, weight: 60, diagnosis: "Reversão de overdose de opioides com naloxona" },
    scenario: "Ative o antagonista competitivo e observe o deslocamento da curva para a direita (↑EC50) sem alterar o Emax. A naloxona compete pelo receptor µ-opioide.",
    initialEC50: 50, initialEmax: 100,
    expectedEC50: [100, 200], expectedEmax: [90, 110],
    clinicalTip: "O antagonismo competitivo pode ser superado aumentando a concentração do agonista. Por isso doses repetidas de naloxona podem ser necessárias em overdoses com fentanil.",
  },
  {
    title: "Antagonista Não-Competitivo – Fenoxibenzamina",
    difficulty: "Difícil",
    patient: { name: "Roberto Santos", age: 48, weight: 90, diagnosis: "Feocromocitoma – preparo pré-operatório com fenoxibenzamina" },
    scenario: "A fenoxibenzamina é um antagonista α-adrenérgico irreversível. Ative o antagonista não-competitivo e observe a redução do Emax.",
    initialEC50: 50, initialEmax: 100,
    expectedEC50: [45, 60], expectedEmax: [30, 60],
    clinicalTip: "No antagonismo não-competitivo (irreversível), receptores são permanentemente inativados. Aumentar [agonista] NÃO restaura a resposta máxima. Novos receptores precisam ser sintetizados.",
  },
];

function generateDRCurve(ec50: number, emax: number, partialAgonist: boolean, competitiveAntag: boolean, nonCompAntag: boolean, antagConc: number) {
  const inh = antagConc / 100;
  let effEC50 = ec50;
  let effEmax = emax;

  if (partialAgonist) effEmax = emax * 0.55;
  if (competitiveAntag) effEC50 = ec50 * (1 + inh * 5);
  if (nonCompAntag) effEmax = emax / (1 + inh * 3);

  const points = [];
  for (let logD = -2; logD <= 3; logD += 0.1) {
    const dose = Math.pow(10, logD);
    const effect = (effEmax * dose) / (effEC50 + dose);
    points.push({
      logDose: Math.round(logD * 100) / 100,
      dose: Math.round(dose * 100) / 100,
      effect: Math.round(effect * 100) / 100,
    });
  }
  return { points, effEC50: Math.round(effEC50 * 10) / 10, effEmax: Math.round(effEmax * 10) / 10 };
}

export default function SimuladorDoseResposta() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<DRCase | null>(null);
  const [ec50, setEC50] = useState(50);
  const [emax, setEmax] = useState(100);
  const [partialAgonist, setPartialAgonist] = useState(false);
  const [competitiveAntag, setCompetitiveAntag] = useState(false);
  const [nonCompAntag, setNonCompAntag] = useState(false);
  const [antagConc, setAntagConc] = useState(50);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialEC50: cd.initialEC50 ?? 50, initialEmax: cd.initialEmax ?? 100, expectedEC50: cd.expectedEC50 ?? [40, 60], expectedEmax: cd.expectedEmax ?? [90, 110], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setEC50(activeCase.initialEC50); setEmax(activeCase.initialEmax); setPartialAgonist(false); setCompetitiveAntag(false); setNonCompAntag(false); setAntagConc(50); }
  }, [activeCase]);

  const { points, effEC50, effEmax } = useMemo(() => generateDRCurve(ec50, emax, partialAgonist, competitiveAntag, nonCompAntag, antagConc), [ec50, emax, partialAgonist, competitiveAntag, nonCompAntag, antagConc]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ec50Ok = effEC50 >= activeCase.expectedEC50[0] && effEC50 <= activeCase.expectedEC50[1];
    const emaxOk = effEmax >= activeCase.expectedEmax[0] && effEmax <= activeCase.expectedEmax[1];
    submitResults({ score: (ec50Ok ? 50 : 0) + (emaxOk ? 50 : 0), actions: { ec50, emax, partialAgonist, competitiveAntag, nonCompAntag, antagConc, effEC50, effEmax } });
  }, [activeCase, effEC50, effEmax, ec50, emax, partialAgonist, competitiveAntag, nonCompAntag, antagConc, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialEC50: c.initialEC50 ?? 50, initialEmax: c.initialEmax ?? 100, expectedEC50: c.expectedEC50 ?? [40, 60], expectedEmax: c.expectedEmax ?? [90, 110], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Curva Dose-Resposta</h1>
            <p className="text-muted-foreground">Explore potência (EC50) vs eficácia (Emax), agonistas parciais e antagonismo competitivo/não-competitivo.</p>
            <AdminPromptViewer toolSlug="sim-dose-resposta" toolName="Curva Dose-Resposta" toolType="simulator" prompt={getNativePrompt("sim-dose-resposta") || ""} />
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
        <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
        <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Farmacodinâmicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">EC50</label><span className="text-sm font-bold">{ec50}</span></div><Slider value={[ec50]} onValueChange={([v]) => setEC50(v)} min={5} max={200} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Emax</label><span className="text-sm font-bold">{emax}%</span></div><Slider value={[emax]} onValueChange={([v]) => setEmax(v)} min={10} max={100} step={5} /></div>
            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-semibold">Modificadores</p>
              <div className="flex items-center justify-between"><label className="text-sm">Agonista Parcial (↓ Emax)</label><Switch checked={partialAgonist} onCheckedChange={(v) => { setPartialAgonist(v); if (v) { setCompetitiveAntag(false); setNonCompAntag(false); } }} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Antagonista Competitivo (→ EC50)</label><Switch checked={competitiveAntag} onCheckedChange={(v) => { setCompetitiveAntag(v); if (v) { setPartialAgonist(false); setNonCompAntag(false); } }} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Antagonista Não-Competitivo (↓ Emax)</label><Switch checked={nonCompAntag} onCheckedChange={(v) => { setNonCompAntag(v); if (v) { setPartialAgonist(false); setCompetitiveAntag(false); } }} /></div>
              {(competitiveAntag || nonCompAntag) && (
                <div><div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">[Antagonista]</label><span className="text-sm font-bold text-destructive">{antagConc}%</span></div><Slider value={[antagConc]} onValueChange={([v]) => setAntagConc(v)} min={0} max={100} step={5} /></div>
              )}
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Efetivos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">EC50 Efetivo</p><p className={`text-2xl font-bold ${effEC50 > ec50 * 1.5 ? "text-destructive" : ""}`}>{effEC50}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Emax Efetivo</p><p className={`text-2xl font-bold ${effEmax < emax * 0.7 ? "text-destructive" : ""}`}>{effEmax}%</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Curva Dose-Resposta (log[Dose] vs Efeito)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="logDose" label={{ value: "log[Dose]", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 110]} label={{ value: "Efeito (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <ReferenceLine y={effEmax} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Emax=${effEmax}`, fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="effect" name="Efeito (%)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getDoseRespostaChallenges()} simulatorState={{ ec50, emax }} />
    </div>
  );
}
