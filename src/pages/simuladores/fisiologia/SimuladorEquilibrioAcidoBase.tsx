import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Beaker } from "lucide-react";
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
import { getEquilibrioAcidoBaseChallenges } from "@/data/simulatorChallenges";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "equilibrio-acido-base";

interface ABCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; diagnosis: string };
  scenario: string;
  initialPH: number;
  initialPCO2: number;
  initialHCO3: number;
  expectedClassification: string;
  clinicalTip: string;
}

const BUILT_IN_CASES: ABCase[] = [
  {
    title: "Cetoacidose Diabética",
    difficulty: "Médio",
    patient: { name: "Lucas Pereira", age: 22, diagnosis: "DM1 descompensado, glicemia 450 mg/dL" },
    scenario: "Paciente com acidose metabólica por cetoacidose. Corrija o distúrbio ajustando a ventilação e a excreção renal.",
    initialPH: 7.18, initialPCO2: 22, initialHCO3: 8,
    expectedClassification: "Acidose metabólica compensada",
    clinicalTip: "Na cetoacidose, o ânion gap está elevado. Compensação respiratória esperada: pCO₂ = 1.5 × HCO₃⁻ + 8 (Winter).",
  },
  {
    title: "DPOC Exacerbada",
    difficulty: "Médio",
    patient: { name: "Maria das Graças", age: 70, diagnosis: "DPOC Gold IV com exacerbação infecciosa" },
    scenario: "Paciente com acidose respiratória crônica agudizada. Observe a compensação renal.",
    initialPH: 7.28, initialPCO2: 65, initialHCO3: 30,
    expectedClassification: "Acidose respiratória com compensação renal",
    clinicalTip: "Na acidose respiratória crônica, o rim retém HCO₃⁻ (3.5 mEq/L para cada 10 mmHg de pCO₂ acima de 40).",
  },
  {
    title: "Vômitos Prolongados",
    difficulty: "Fácil",
    patient: { name: "Carla Souza", age: 35, diagnosis: "Hiperêmese gravídica" },
    scenario: "Paciente com alcalose metabólica por perda de HCl. Observe a compensação respiratória.",
    initialPH: 7.52, initialPCO2: 48, initialHCO3: 38,
    expectedClassification: "Alcalose metabólica compensada",
    clinicalTip: "A perda de HCl gera alcalose hipoclorêmica. A reposição de NaCl 0.9% é fundamental para corrigir o distúrbio.",
  },
];

function computeAB(basePCO2: number, baseHCO3: number, rrMod: number, renalMod: number) {
  const rrEffect = (rrMod - 50) / 50;
  const renalEffect = (renalMod - 50) / 50;
  const pCO2 = Math.max(10, Math.min(100, basePCO2 - rrEffect * 25));
  const hco3 = Math.max(5, Math.min(50, baseHCO3 + renalEffect * 15));
  const ph = +(6.1 + Math.log10(hco3 / (0.03 * pCO2))).toFixed(2);
  const be = +(hco3 - 24 + (ph - 7.4) * 16.2).toFixed(1);

  let classification = "Normal";
  if (ph < 7.35) {
    if (pCO2 > 45 && hco3 < 22) classification = "Acidose mista";
    else if (pCO2 > 45) classification = "Acidose respiratória";
    else if (hco3 < 22) classification = "Acidose metabólica";
  } else if (ph > 7.45) {
    if (pCO2 < 35 && hco3 > 26) classification = "Alcalose mista";
    else if (pCO2 < 35) classification = "Alcalose respiratória";
    else if (hco3 > 26) classification = "Alcalose metabólica";
  } else {
    if (pCO2 > 45 && hco3 > 26) classification = "Acidose respiratória compensada";
    else if (pCO2 < 35 && hco3 < 22) classification = "Alcalose respiratória compensada";
    else if (hco3 > 26 && pCO2 > 42) classification = "Alcalose metabólica compensada";
    else if (hco3 < 22 && pCO2 < 38) classification = "Acidose metabólica compensada";
  }

  return { ph: Math.max(6.8, Math.min(7.8, ph)), pCO2: +pCO2.toFixed(1), hco3: +hco3.toFixed(1), be, classification };
}

function getClassColor(c: string) {
  if (c.includes("Acidose")) return "text-destructive";
  if (c.includes("Alcalose")) return "text-primary";
  if (c === "Normal") return "text-green-600 dark:text-green-400";
  return "text-muted-foreground";
}

export default function SimuladorEquilibrioAcidoBase() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<ABCase | null>(null);
  const [rrModifier, setRrModifier] = useState(50);
  const [renalModifier, setRenalModifier] = useState(50);
  const [history, setHistory] = useState<any[]>([]);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        initialPH: cd.initialPH ?? 7.4, initialPCO2: cd.initialPCO2 ?? 40, initialHCO3: cd.initialHCO3 ?? 24,
        expectedClassification: cd.expectedClassification ?? "", clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setRrModifier(50); setRenalModifier(50); setHistory([]); }
  }, [activeCase]);

  const ab = useMemo(() => {
    if (!activeCase) return computeAB(40, 24, 50, 50);
    return computeAB(activeCase.initialPCO2, activeCase.initialHCO3, rrModifier, renalModifier);
  }, [activeCase, rrModifier, renalModifier]);

  useEffect(() => {
    if (activeCase) setHistory((prev) => [...prev.slice(-19), { step: prev.length + 1, pH: ab.ph, pCO2: ab.pCO2, HCO3: ab.hco3 }]);
  }, [ab.ph, ab.pCO2, ab.hco3]);

  const injectDisturbance = (type: string) => {
    if (!activeCase) return;
    const presets: Record<string, { pco2: number; hco3: number }> = {
      cetoacidose: { pco2: 20, hco3: 7 },
      dpoc: { pco2: 70, hco3: 32 },
      vomitos: { pco2: 48, hco3: 40 },
      diarreia: { pco2: 28, hco3: 12 },
    };
    const d = presets[type];
    if (d) {
      setActiveCase({ ...activeCase, initialPCO2: d.pco2, initialHCO3: d.hco3 });
      setRrModifier(50); setRenalModifier(50); setHistory([]);
    }
  };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const normalized = ab.ph >= 7.35 && ab.ph <= 7.45;
    const s = normalized ? 100 : 50;
    submitResults({ score: s, actions: buildSimulatorDecisions("equilibrio-acido-base", [
        { label: "Ph", userChoice: String(ab.ph), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" },
        { label: "Pco2", userChoice: String(ab.pCO2), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" },
        { label: "Hco3", userChoice: String(ab.hco3), idealChoice: "Conforme caso", correct: true, category: "Parâmetro", explanation: "" }
      ]) });
    return s;
  }, [activeCase, ab, rrModifier, renalModifier, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialPH: c.initialPH ?? 7.4, initialPCO2: c.initialPCO2 ?? 40, initialHCO3: c.initialHCO3 ?? 24,
      expectedClassification: c.expectedClassification ?? "", clinicalTip: c.clinicalTip ?? "",
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
            <h1 className="text-2xl font-bold">Equilíbrio Ácido-Base</h1>
            <p className="text-muted-foreground">Manipule ventilação e excreção renal para corrigir distúrbios ácido-base.</p>
            <AdminPromptViewer toolSlug="sim-equilibrio-acido-base" toolName="Equilíbrio Ácido-Base" toolType="simulator" prompt={getNativePrompt("sim-equilibrio-acido-base") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "pH", value: ab.ph, ref: "7.35–7.45", warn: ab.ph < 7.35 || ab.ph > 7.45 },
          { label: "pCO₂", value: ab.pCO2, ref: "35–45 mmHg", warn: ab.pCO2 < 35 || ab.pCO2 > 45 },
          { label: "HCO₃⁻", value: ab.hco3, ref: "22–26 mEq/L", warn: ab.hco3 < 22 || ab.hco3 > 26 },
          { label: "BE", value: ab.be, ref: "-2 a +2", warn: false },
        ].map((g) => (
          <Card key={g.label} className={g.warn ? "border-destructive/50" : "border-green-500/50"}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{g.label}</p>
              <p className="text-2xl font-bold">{g.value}</p>
              <p className="text-xs text-muted-foreground">{g.ref}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="md:col-span-1 col-span-2">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Classificação</p>
            <p className={`text-sm font-bold ${getClassColor(ab.classification)}`}>{ab.classification}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Controles Fisiológicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Frequência Respiratória</label><span className="text-sm font-bold">{rrModifier < 50 ? "↓ Hipoventilação" : rrModifier > 50 ? "↑ Hiperventilação" : "Normal"}</span></div>
              <Slider value={[rrModifier]} onValueChange={([v]) => setRrModifier(v)} min={0} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-sm font-medium">Excreção Renal de HCO₃⁻</label><span className="text-sm font-bold">{renalModifier < 50 ? "↓ Excreção" : renalModifier > 50 ? "↑ Retenção" : "Normal"}</span></div>
              <Slider value={[renalModifier]} onValueChange={([v]) => setRenalModifier(v)} min={0} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Injetar Distúrbio:</p>
              <div className="flex flex-wrap gap-2">
                {[["cetoacidose", "Cetoacidose"], ["dpoc", "DPOC"], ["vomitos", "Vômitos"], ["diarreia", "Diarreia"]].map(([k, l]) => (
                  <Button key={k} size="sm" variant="outline" onClick={() => injectDisturbance(k)}>{l}</Button>
                ))}
              </div>
            </div>
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={handleFinish} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>

        {history.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Evolução da Gasometria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" label={{ value: "Etapa", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="ph" domain={[6.9, 7.7]} label={{ value: "pH", angle: -90, position: "insideLeft" }} stroke="hsl(var(--primary))" />
                  <YAxis yAxisId="other" orientation="right" label={{ value: "mmHg / mEq/L", angle: 90, position: "insideRight" }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <ReferenceLine yAxisId="ph" y={7.35} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="ph" y={7.45} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Line yAxisId="ph" type="monotone" dataKey="pH" name="pH" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  <Line yAxisId="other" type="monotone" dataKey="pCO2" name="pCO₂" stroke="hsl(var(--accent-foreground))" dot={false} strokeWidth={2} />
                  <Line yAxisId="other" type="monotone" dataKey="HCO3" name="HCO₃⁻" stroke="hsl(142 76% 36%)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getEquilibrioAcidoBaseChallenges()}
        simulatorState={{ pH: ab.ph, pCO2: ab.pCO2, hco3: ab.hco3 }}
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
