import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Beaker } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCicloUreiaChallenges } from "@/data/simulatorChallenges";

const SLUG = "ciclo-ureia";

interface UreaCycleCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  deficiencies: { cpsI: boolean; otc: boolean; ass: boolean; asl: boolean; arginase: boolean };
  expectedAmmonia: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: UreaCycleCase[] = [
  {
    title: "Deficiência de OTC (Ornitina Transcarbamilase)",
    difficulty: "Difícil",
    patient: { name: "Lucas Mendes", age: 3, weight: 14, diagnosis: "Hiperamonemia neonatal com vómitos recorrentes" },
    scenario: "Criança com letargia e vómitos cíclicos desde o nascimento. A deficiência de OTC, ligada ao X, é a mais comum dos defeitos do ciclo da ureia.",
    deficiencies: { cpsI: false, otc: true, ass: false, asl: false, arginase: false },
    expectedAmmonia: [200, 500],
    clinicalTip: "A deficiência de OTC causa acumulação de carbamil-fosfato, que é desviado para a via das pirimidinas, resultando em ácido orótico elevado na urina — achado diagnóstico chave.",
  },
  {
    title: "Deficiência de CPS I",
    difficulty: "Difícil",
    patient: { name: "Ana Rodrigues", age: 1, weight: 9, diagnosis: "Encefalopatia hiperamonémica grave" },
    scenario: "Recém-nascida com convulsões e coma nas primeiras 48h de vida. CPS I catalisa o primeiro passo do ciclo no interior da mitocôndria.",
    deficiencies: { cpsI: true, otc: false, ass: false, asl: false, arginase: false },
    expectedAmmonia: [300, 800],
    clinicalTip: "Na deficiência de CPS I, ao contrário da OTC, NÃO há acumulação de ácido orótico, pois o carbamil-fosfato não é formado. Este é o diagnóstico diferencial chave.",
  },
  {
    title: "Citrulinemia Tipo I (Deficiência de ASS)",
    difficulty: "Médio",
    patient: { name: "Pedro Costa", age: 8, weight: 25, diagnosis: "Citrulinemia com episódios de confusão após refeições proteicas" },
    scenario: "Criança com episódios de confusão mental após ingestão proteica elevada. A citrulina acumula-se no plasma por bloqueio da ASS.",
    deficiencies: { cpsI: false, otc: false, ass: true, asl: false, arginase: false },
    expectedAmmonia: [100, 300],
    clinicalTip: "Na citrulinemia, a citrulina plasmática está marcadamente elevada. O tratamento inclui restrição proteica, benzoato de sódio e fenilbutirato para vias alternativas de excreção de azoto.",
  },
];

const ENZYMES = [
  { key: "cpsI", name: "CPS I", fullName: "Carbamil-Fosfato Sintase I", location: "Mitocôndria", substrate: "NH₃ + CO₂ + 2 ATP", product: "Carbamil-fosfato" },
  { key: "otc", name: "OTC", fullName: "Ornitina Transcarbamilase", location: "Mitocôndria", substrate: "Carbamil-fosfato + Ornitina", product: "Citrulina" },
  { key: "ass", name: "ASS", fullName: "Argininossuccinato Sintase", location: "Citoplasma", substrate: "Citrulina + Aspartato + ATP", product: "Argininossuccinato" },
  { key: "asl", name: "ASL", fullName: "Argininossuccinato Liase", location: "Citoplasma", substrate: "Argininossuccinato", product: "Arginina + Fumarato" },
  { key: "arginase", name: "Arginase", fullName: "Arginase I", location: "Citoplasma", substrate: "Arginina", product: "Ureia + Ornitina" },
];

export default function SimuladorCicloUreia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<UreaCycleCase | null>(null);
  const [deficiencies, setDeficiencies] = useState({ cpsI: false, otc: false, ass: false, asl: false, arginase: false });
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: cd.id, title: cd.title, difficulty: cd.difficulty, isAI: cd.isAI,
        patient: cd.patient, scenario: cd.scenario,
        deficiencies: cd.deficiencies ?? { cpsI: false, otc: false, ass: false, asl: false, arginase: false },
        expectedAmmonia: cd.expectedAmmonia ?? [50, 200], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setDeficiencies(activeCase.deficiencies);
      setRunning(false); setHistory([]); setTime(0);
    }
  }, [activeCase]);

  const toggleDeficiency = useCallback((key: string) => {
    setDeficiencies(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const model = useMemo(() => {
    const baseInput = 100;
    let levels = { nh3: baseInput, carbamilP: 0, ornitina: 50, citrulina: 0, argininossuccinato: 0, arginina: 0, ureia: 0 };

    if (!deficiencies.cpsI) { levels.carbamilP = levels.nh3 * 0.9; levels.nh3 *= 0.1; }
    if (!deficiencies.otc && levels.carbamilP > 0) { levels.citrulina = Math.min(levels.carbamilP, levels.ornitina) * 0.9; levels.carbamilP *= 0.1; levels.ornitina *= 0.1; }
    if (!deficiencies.ass && levels.citrulina > 0) { levels.argininossuccinato = levels.citrulina * 0.9; levels.citrulina *= 0.1; }
    if (!deficiencies.asl && levels.argininossuccinato > 0) { levels.arginina = levels.argininossuccinato * 0.9; levels.argininossuccinato *= 0.1; }
    if (!deficiencies.arginase && levels.arginina > 0) { levels.ureia = levels.arginina * 0.9; levels.ornitina += levels.arginina * 0.9; levels.arginina *= 0.1; }

    const ammoniaLevel = levels.nh3 + (deficiencies.otc ? levels.carbamilP * 0.3 : 0);
    const toxicity = ammoniaLevel > 80 ? "Crítica" : ammoniaLevel > 40 ? "Elevada" : ammoniaLevel > 15 ? "Moderada" : "Normal";
    return { levels, ammoniaLevel, toxicity, ureiaOutput: levels.ureia };
  }, [deficiencies]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime(t => {
        const newT = t + 1;
        setHistory(prev => [...prev.slice(-59), { time: newT, ammonia: Math.round(model.ammoniaLevel), ureia: Math.round(model.ureiaOutput) }]);
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, model]);

  const barData = [
    { name: "NH₃", value: Math.round(model.levels.nh3) },
    { name: "Carb-P", value: Math.round(model.levels.carbamilP) },
    { name: "Ornitina", value: Math.round(model.levels.ornitina) },
    { name: "Citrulina", value: Math.round(model.levels.citrulina) },
    { name: "Arg-Succ", value: Math.round(model.levels.argininossuccinato) },
    { name: "Arginina", value: Math.round(model.levels.arginina) },
    { name: "Ureia", value: Math.round(model.levels.ureia) },
  ];

  const neuroData = useMemo(() => {
    const points = [];
    for (let h = 0; h <= 24; h += 2) {
      const factor = model.ammoniaLevel / 100;
      const brainEdema = Math.min(100, factor * h * 4);
      const consciousness = Math.max(0, 100 - brainEdema * 0.8);
      points.push({ hora: `${h}h`, edema: Math.round(brainEdema), consciencia: Math.round(consciousness), amonia: Math.round(model.ammoniaLevel * (1 + h * 0.05)) });
    }
    return points;
  }, [model.ammoniaLevel]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ammoniaOk = model.ammoniaLevel >= activeCase.expectedAmmonia[0] && model.ammoniaLevel <= activeCase.expectedAmmonia[1];
    const s = ammoniaOk ? 100 : Math.max(0, 100 - Math.abs(model.ammoniaLevel - (activeCase.expectedAmmonia[0] + activeCase.expectedAmmonia[1]) / 2) * 0.5);
    submitResults({ score: Math.round(s), actions: { deficiencies, ammoniaLevel: model.ammoniaLevel, ureiaOutput: model.ureiaOutput } });
  }, [activeCase, model, deficiencies, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      deficiencies: c.deficiencies ?? { cpsI: false, otc: false, ass: false, asl: false, arginase: false },
      expectedAmmonia: c.expectedAmmonia ?? [50, 200], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Ciclo da Ureia e Toxicidade da Amónia</h1>
            <p className="text-muted-foreground">Simule deficiências enzimáticas e observe a acumulação de intermediários</p>
            <AdminPromptViewer toolSlug="sim-ciclo-ureia" toolName="Ciclo da Ureia" toolType="simulator" prompt={getNativePrompt("sim-ciclo-ureia") || ""} />
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
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
            </Button>
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

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Enzyme Controls */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Enzimas do Ciclo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ENZYMES.map(enz => {
              const isDeficient = deficiencies[enz.key as keyof typeof deficiencies];
              return (
                <div key={enz.key} className={`p-3 rounded-lg border transition-colors ${isDeficient ? "bg-destructive/10 border-destructive/30" : "bg-muted/30 border-border"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold text-sm">{enz.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({enz.fullName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{isDeficient ? "Deficiente" : "Normal"}</span>
                      <Switch checked={isDeficient} onCheckedChange={() => toggleDeficiency(enz.key)} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{enz.location}</span> | {enz.substrate} → {enz.product}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Indicators + Bar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Indicadores</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Amónia (NH₃)</p>
                  <p className={`text-2xl font-bold ${model.ammoniaLevel > 40 ? "text-destructive" : "text-primary"}`}>{Math.round(model.ammoniaLevel)} µmol/L</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ureia Produzida</p>
                  <p className="text-2xl font-bold text-primary">{Math.round(model.ureiaOutput)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Neurotoxicidade</p>
                  <Badge variant={model.toxicity === "Crítica" || model.toxicity === "Elevada" ? "destructive" : "secondary"} className="text-lg">{model.toxicity}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Níveis de Intermediários</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Nível (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Neurotoxicity Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Evolução da Neurotoxicidade (24h)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={neuroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="amonia" name="NH₃ (µmol/L)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="edema" name="Edema Cerebral (%)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="consciencia" name="Nível Consciência (%)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => setRunning(!running)} className="flex-1">{running ? "⏸ Pausar" : "▶ Iniciar"}</Button>
        <Button variant="outline" onClick={handleFinish} disabled={(!running && history.length === 0) || submitted}>Finalizar</Button>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Evolução Temporal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: "Tempo (s)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="ammonia" name="Amônia (µmol/L)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ureia" name="Ureia (%)" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-primary mb-1">💡 Dica Clínica</p>
          <p className="text-sm">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getCicloUreiaChallenges()}
        simulatorState={{ ...deficiencies, ammonia: Math.round(model.ammoniaLevel) }}
      />
    </div>
  );
}
