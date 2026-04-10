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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCineticaEnzimaticaChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "cinetica-enzimatica";

interface EnzymeCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialVmax: number;
  initialKm: number;
  expectedVmax: [number, number];
  expectedKm: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: EnzymeCase[] = [
  {
    title: "Inibição Competitiva – Metotrexato",
    difficulty: "Médio",
    patient: { name: "Renata Costa", age: 45, weight: 65, diagnosis: "Artrite reumatoide em uso de metotrexato" },
    scenario: "O metotrexato é um inibidor competitivo da di-hidrofolato redutase (DHFR). Ative a inibição competitiva e observe o aumento aparente do Km sem alterar o Vmax.",
    initialVmax: 100, initialKm: 50,
    expectedVmax: [90, 110], expectedKm: [80, 150],
    clinicalTip: "Na inibição competitiva, o inibidor compete com o substrato pelo sítio ativo. Pode ser superada aumentando [S]. O Vmax permanece inalterado, mas o Km aparente aumenta.",
  },
  {
    title: "Inibição Não-Competitiva – Metais Pesados",
    difficulty: "Médio",
    patient: { name: "Jorge Lima", age: 55, weight: 82, diagnosis: "Intoxicação por chumbo – inibição enzimática" },
    scenario: "O chumbo liga-se a sítios alostéricos de várias enzimas. Ative a inibição não-competitiva e observe a redução do Vmax com Km inalterado.",
    initialVmax: 100, initialKm: 50,
    expectedVmax: [30, 70], expectedKm: [45, 55],
    clinicalTip: "Na inibição não-competitiva, o inibidor liga-se a um sítio diferente do substrato, reduzindo o Vmax. Aumentar [S] não supera o bloqueio.",
  },
  {
    title: "Cinética Normal – Sem Inibição",
    difficulty: "Fácil",
    patient: { name: "Ana Paula", age: 22, weight: 58, diagnosis: "Aula de bioquímica – cinética basal" },
    scenario: "Explore a curva de Michaelis-Menten sem inibidores. Ajuste Vmax e Km para entender a saturação enzimática.",
    initialVmax: 100, initialKm: 50,
    expectedVmax: [90, 110], expectedKm: [45, 55],
    clinicalTip: "Quando [S] = Km, a velocidade da reação é exatamente metade de Vmax. Isso define a afinidade da enzima pelo substrato.",
  },
];

function generateMMCurve(vmax: number, km: number, competitiveInhibitor: boolean, nonCompetitiveInhibitor: boolean, inhibitorConc: number) {
  const inh = inhibitorConc / 100;
  const Ki = 30; // inhibitor constant

  let effectiveVmax = vmax;
  let effectiveKm = km;

  if (competitiveInhibitor) {
    effectiveKm = km * (1 + inh * 100 / Ki);
  }
  if (nonCompetitiveInhibitor) {
    effectiveVmax = vmax / (1 + inh * 100 / Ki);
  }

  const points = [];
  for (let s = 0; s <= 200; s += 5) {
    const v = (effectiveVmax * s) / (effectiveKm + s);
    // Lineweaver-Burk: 1/V vs 1/[S] (skip s=0)
    points.push({
      substrate: s,
      velocity: Math.round(v * 100) / 100,
      invS: s > 0 ? Math.round(1000 / s) / 10 : null,
      invV: v > 0 ? Math.round(1000 / v) / 10 : null,
    });
  }

  return { points, effectiveVmax: Math.round(effectiveVmax * 10) / 10, effectiveKm: Math.round(effectiveKm * 10) / 10 };
}

export default function SimuladorCineticaEnzimatica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<EnzymeCase | null>(null);
  const [vmax, setVmax] = useState(100);
  const [km, setKm] = useState(50);
  const [competitiveInhibitor, setCompetitiveInhibitor] = useState(false);
  const [nonCompetitiveInhibitor, setNonCompetitiveInhibitor] = useState(false);
  const [inhibitorConc, setInhibitorConc] = useState(50);
  const [showLineweaver, setShowLineweaver] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialVmax: cd.initialVmax ?? 100, initialKm: cd.initialKm ?? 50,
        expectedVmax: cd.expectedVmax ?? [90, 110], expectedKm: cd.expectedKm ?? [45, 55], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setVmax(activeCase.initialVmax);
      setKm(activeCase.initialKm);
      setCompetitiveInhibitor(false);
      setNonCompetitiveInhibitor(false);
      setInhibitorConc(50);
    }
  }, [activeCase]);

  const { points, effectiveVmax, effectiveKm } = useMemo(
    () => generateMMCurve(vmax, km, competitiveInhibitor, nonCompetitiveInhibitor, inhibitorConc),
    [vmax, km, competitiveInhibitor, nonCompetitiveInhibitor, inhibitorConc]
  );

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const vmaxOk = effectiveVmax >= activeCase.expectedVmax[0] && effectiveVmax <= activeCase.expectedVmax[1];
    const kmOk = effectiveKm >= activeCase.expectedKm[0] && effectiveKm <= activeCase.expectedKm[1];
    const s = (vmaxOk ? 50 : 0) + (kmOk ? 50 : 0);
    if (!submitted) submitResults({ score: s, actions: { vmax, km, competitiveInhibitor, nonCompetitiveInhibitor, inhibitorConc, effectiveVmax, effectiveKm } });
    return s;
  }, [activeCase, effectiveVmax, effectiveKm, vmax, km, competitiveInhibitor, nonCompetitiveInhibitor, inhibitorConc, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialVmax: c.initialVmax ?? 100, initialKm: c.initialKm ?? 50,
      expectedVmax: c.expectedVmax ?? [90, 110], expectedKm: c.expectedKm ?? [45, 55], clinicalTip: c.clinicalTip ?? "",
    });
  };

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  if (!activeCase) {
    if (isVirtualRoom) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cinética Enzimática</h1>
            <p className="text-muted-foreground">Explore curvas de Michaelis-Menten e Lineweaver-Burk com inibidores competitivos e não-competitivos.</p>
            <AdminPromptViewer toolSlug="sim-cinetica-enzimatica" toolName="Cinética Enzimática" toolType="simulator" prompt={getNativePrompt("sim-cinetica-enzimatica") || ""} />
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
            {!isVirtualRoom && (
              <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Caso com IA
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && (
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Enzimáticos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Vmax</label><span className="text-sm font-bold">{vmax}</span></div>
              <Slider value={[vmax]} onValueChange={([v]) => setVmax(v)} min={10} max={200} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Km</label><span className="text-sm font-bold">{km}</span></div>
              <Slider value={[km]} onValueChange={([v]) => setKm(v)} min={5} max={150} step={5} />
            </div>
            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-semibold">Inibidores</p>
              <div className="flex items-center justify-between">
                <label className="text-sm">Competitivo (↑ Km)</label>
                <Switch checked={competitiveInhibitor} onCheckedChange={(v) => { setCompetitiveInhibitor(v); if (v) setNonCompetitiveInhibitor(false); }} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Não-competitivo (↓ Vmax)</label>
                <Switch checked={nonCompetitiveInhibitor} onCheckedChange={(v) => { setNonCompetitiveInhibitor(v); if (v) setCompetitiveInhibitor(false); }} />
              </div>
              {(competitiveInhibitor || nonCompetitiveInhibitor) && (
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">[Inibidor]</label><span className="text-sm font-bold text-destructive">{inhibitorConc}%</span></div>
                  <Slider value={[inhibitorConc]} onValueChange={([v]) => setInhibitorConc(v)} min={0} max={100} step={5} />
                </div>
              )}
            </div>
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={handleFinish} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Parâmetros Efetivos</CardTitle>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Lineweaver-Burk</label>
                <Switch checked={showLineweaver} onCheckedChange={setShowLineweaver} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Vmax Efetivo</p>
                <p className={`text-2xl font-bold ${effectiveVmax < vmax * 0.8 ? "text-destructive" : ""}`}>{effectiveVmax}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Km Aparente</p>
                <p className={`text-2xl font-bold ${effectiveKm > km * 1.2 ? "text-destructive" : ""}`}>{effectiveKm}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{showLineweaver ? "Lineweaver-Burk (1/V vs 1/[S])" : "Michaelis-Menten (V vs [S])"}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {showLineweaver ? (
              <LineChart data={points.filter(p => p.invS !== null && p.invS! > 0 && p.invV !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="invS" label={{ value: "1/[S]", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "1/V", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="invV" name="1/V" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            ) : (
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="substrate" label={{ value: "[S]", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis label={{ value: "V", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="velocity" name="Velocidade (V)" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getCineticaEnzimaticaChallenges()}
        simulatorState={{ vmax, km }}
        onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }}
      />

      {isVirtualRoom && submitted && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setShowFeedback(!showFeedback)}>
              {showFeedback ? "Ocultar Resultados" : "Mostrar Resultados"}
            </Button>
            {showFeedback && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm font-semibold">Pontuação: {lastScore}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
