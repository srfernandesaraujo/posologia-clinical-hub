import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Droplets } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getDepuracaoRenalChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "depuracao-renal";

interface RenalCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialAfferent: number;
  initialEfferent: number;
  initialHydration: number;
  initialPermeability: number;
  expectedTFG: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: RenalCase[] = [
  {
    title: "Estenose de Artéria Renal",
    difficulty: "Médio",
    patient: { name: "Antônio Silva", age: 65, weight: 82, diagnosis: "Hipertensão renovascular" },
    scenario: "Paciente com estenose de artéria renal. Reduza a pressão aferente e observe a queda da TFG.",
    initialAfferent: 40, initialEfferent: 60, initialHydration: 70, initialPermeability: 100,
    expectedTFG: [30, 60],
    clinicalTip: "A estenose da artéria renal reduz a pressão hidrostática glomerular. IECAs podem piorar a TFG ao dilatar a arteríola eferente.",
  },
  {
    title: "Desidratação Grave",
    difficulty: "Fácil",
    patient: { name: "Lúcia Martins", age: 78, weight: 55, diagnosis: "Gastroenterite aguda com desidratação" },
    scenario: "Paciente desidratada. Ajuste a hidratação e observe o impacto no volume urinário e TFG.",
    initialAfferent: 60, initialEfferent: 60, initialHydration: 20, initialPermeability: 100,
    expectedTFG: [40, 70],
    clinicalTip: "A desidratação reduz o volume plasmático e ativa o SRAA, causando vasoconstrição eferente compensatória.",
  },
  {
    title: "Nefropatia Diabética",
    difficulty: "Difícil",
    patient: { name: "Pedro Gonçalves", age: 52, weight: 95, diagnosis: "DM2 com proteinúria 2g/24h" },
    scenario: "Paciente diabético com hiperfiltração glomerular. A permeabilidade tubular está alterada.",
    initialAfferent: 80, initialEfferent: 80, initialHydration: 80, initialPermeability: 60,
    expectedTFG: [90, 140],
    clinicalTip: "Na nefropatia diabética precoce, há hiperfiltração. IECAs/BRAs protegem ao reduzir a pressão intraglomerular.",
  },
];

function computeRenal(afferent: number, efferent: number, hydration: number, permeability: number) {
  const af = afferent / 100;
  const ef = efferent / 100;
  const hy = hydration / 100;
  const perm = permeability / 100;
  const pressureGrad = af * 60 - ef * 15 - 10;
  const tfg = Math.min(200, Math.max(0, Math.round(pressureGrad * 2.5 * hy * perm)));
  const filtered = tfg * 1440 / 1000;
  const reabsorbed = filtered * 0.99 * perm;
  const urineVolume = Math.min(10, Math.max(0.3, +(filtered - reabsorbed).toFixed(1)));
  const naSodium = Math.round(140 * (1 - perm * 0.97));
  const glucose = perm > 0.8 ? 0 : Math.round((1 - perm) * 200);
  return { tfg, urineVolume, filtered: +filtered.toFixed(1), reabsorbed: +reabsorbed.toFixed(1), naSodium, glucose };
}

const BAR_COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(38 92% 50%)"];

export default function SimuladorDepuracaoRenal() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<RenalCase | null>(null);
  const [afferent, setAfferent] = useState(70);
  const [efferent, setEfferent] = useState(60);
  const [hydration, setHydration] = useState(80);
  const [permeability, setPermeability] = useState(100);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialAfferent: cd.initialAfferent ?? 70, initialEfferent: cd.initialEfferent ?? 60,
        initialHydration: cd.initialHydration ?? 80, initialPermeability: cd.initialPermeability ?? 100,
        expectedTFG: cd.expectedTFG ?? [60, 120], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setAfferent(activeCase.initialAfferent); setEfferent(activeCase.initialEfferent); setHydration(activeCase.initialHydration); setPermeability(activeCase.initialPermeability); }
  }, [activeCase]);

  const renal = useMemo(() => computeRenal(afferent, efferent, hydration, permeability), [afferent, efferent, hydration, permeability]);

  const barData = [
    { name: "Filtrado", value: renal.filtered },
    { name: "Reabsorvido", value: renal.reabsorbed },
    { name: "Urina (L)", value: renal.urineVolume },
  ];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const tfgOk = renal.tfg >= activeCase.expectedTFG[0] && renal.tfg <= activeCase.expectedTFG[1];
    const s = tfgOk ? 100 : 40;
    submitResults({ score: s, actions: buildSimulatorDecisions("depuracao-renal", [
        { label: "Tfg", userChoice: String(renal.tfg), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" }
      ]) });
    return s;
  }, [activeCase, renal, afferent, efferent, hydration, permeability, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialAfferent: c.initialAfferent ?? 70, initialEfferent: c.initialEfferent ?? 60,
      initialHydration: c.initialHydration ?? 80, initialPermeability: c.initialPermeability ?? 100,
      expectedTFG: c.expectedTFG ?? [60, 120], clinicalTip: c.clinicalTip ?? "",
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
            <h1 className="text-2xl font-bold">Depuração Renal e TFG</h1>
            <p className="text-muted-foreground">Ajuste pressões arteriolares, hidratação e permeabilidade tubular.</p>
            <AdminPromptViewer toolSlug="sim-depuracao-renal" toolName="Depuração Renal" toolType="simulator" prompt={getNativePrompt("sim-depuracao-renal") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
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
          <CardHeader><CardTitle className="text-base">Controles do Néfron</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Pressão Aferente", value: afferent, set: setAfferent },
              { label: "Pressão Eferente", value: efferent, set: setEfferent },
              { label: "Hidratação", value: hydration, set: setHydration },
              { label: "Permeabilidade Tubular", value: permeability, set: setPermeability },
            ].map((ctrl) => (
              <div key={ctrl.label}>
                <div className="flex justify-between mb-1"><label className="text-sm font-medium">{ctrl.label}</label><span className="text-sm font-bold">{ctrl.value}%</span></div>
                <Slider value={[ctrl.value]} onValueChange={([v]) => ctrl.set(v)} min={10} max={100} step={5} />
              </div>
            ))}
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={handleFinish} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resultados Renais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "TFG", value: renal.tfg, unit: "mL/min" },
                  { label: "Vol. Urina", value: renal.urineVolume, unit: "L/dia" },
                  { label: "Na⁺ urinário", value: renal.naSodium, unit: "mEq/L" },
                  { label: "Glicosúria", value: renal.glucose, unit: "mg/dL" },
                ].map((r) => (
                  <div key={r.label} className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-2xl font-bold">{r.value}</p>
                    <p className="text-xs text-muted-foreground">{r.unit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Balanço Renal (L/dia)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis label={{ value: "Volume (L/dia)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Volume" radius={[4, 4, 0, 0]}>
                    {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getDepuracaoRenalChallenges()}
        simulatorState={{ afferent, efferent, hydration, permeability }}
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
