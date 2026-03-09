import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getPentosesFosfatoChallenges } from "@/data/simulatorChallenges";

const SLUG = "pentoses-fosfato";

interface PPPCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  g6pdDeficient: boolean;
  oxidantAgent: string;
  oxidantDose: number;
  expectedHemolysis: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: PPPCase[] = [
  {
    title: "Crise Hemolítica por Primaquina",
    difficulty: "Difícil",
    patient: { name: "João Baptista", age: 32, weight: 70, diagnosis: "Malária vivax com deficiência de G6PD" },
    scenario: "Paciente com malária P. vivax recebeu primaquina para eliminação de hipnozoítos. Apresenta icterícia, urina escura e anemia hemolítica aguda 48h após início do fármaco.",
    g6pdDeficient: true, oxidantAgent: "primaquina", oxidantDose: 80,
    expectedHemolysis: [60, 100],
    clinicalTip: "A primaquina gera metabolitos oxidantes que requerem NADPH (via G6PD → glutationa reduzida) para serem neutralizados. Sem G6PD suficiente, a hemoglobina é oxidada a meta-hemoglobina e forma corpos de Heinz.",
  },
  {
    title: "Favismo — Ingestão de Favas",
    difficulty: "Médio",
    patient: { name: "Miguel Cardoso", age: 8, weight: 25, diagnosis: "Anemia hemolítica após ingestão de favas" },
    scenario: "Criança mediterrânica que comeu favas pela primeira vez. Apresentou palidez, taquicardia e urina cola 24h após. As favas contêm vicina e convicina, potentes oxidantes.",
    g6pdDeficient: true, oxidantAgent: "favas", oxidantDose: 60,
    expectedHemolysis: [40, 80],
    clinicalTip: "O favismo é a manifestação clássica da deficiência de G6PD no Mediterrâneo (variante B-). As favas libertam divicina e isouramil, que geram radicais livres nos eritrócitos.",
  },
  {
    title: "Eritrócito Normal sob Stresse Oxidativo",
    difficulty: "Fácil",
    patient: { name: "Clara Mendes", age: 45, weight: 65, diagnosis: "Controlo saudável — sem deficiência de G6PD" },
    scenario: "Paciente saudável exposta ao mesmo agente oxidante. O eritrócito normal possui G6PD funcional que regenera NADPH suficiente para manter a glutationa reduzida e proteger a membrana.",
    g6pdDeficient: false, oxidantAgent: "primaquina", oxidantDose: 80,
    expectedHemolysis: [0, 15],
    clinicalTip: "No eritrócito normal, a via das pentoses fosfato é a ÚNICA fonte de NADPH. A G6PD catalisa: G6P + NADP⁺ → 6-fosfogluconolactona + NADPH. O NADPH mantém a glutationa no estado reduzido (GSH) via glutationa redutase.",
  },
];

const OXIDANT_AGENTS = [
  { value: "primaquina", label: "Primaquina" },
  { value: "dapsona", label: "Dapsona" },
  { value: "favas", label: "Favas (Vicia faba)" },
  { value: "naftaleno", label: "Naftaleno" },
  { value: "sulfonamida", label: "Sulfonamida" },
];

export default function SimuladorPentosesFosfato() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<PPPCase | null>(null);
  const [g6pdDeficient, setG6pdDeficient] = useState(false);
  const [oxidantAgent, setOxidantAgent] = useState("primaquina");
  const [oxidantDose, setOxidantDose] = useState(50);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario, g6pdDeficient: cd.g6pdDeficient ?? false,
        oxidantAgent: cd.oxidantAgent ?? "primaquina", oxidantDose: cd.oxidantDose ?? 50,
        expectedHemolysis: cd.expectedHemolysis ?? [0, 50], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setG6pdDeficient(activeCase.g6pdDeficient);
      setOxidantAgent(activeCase.oxidantAgent);
      setOxidantDose(activeCase.oxidantDose);
    }
  }, [activeCase]);

  const model = useMemo(() => {
    const g6pdActivity = g6pdDeficient ? 10 : 100;
    const nadphProduction = g6pdActivity * 0.9;
    const gshReduction = Math.min(nadphProduction, 95);
    const rosNeutralization = gshReduction * 0.85;

    const oxidantStress = oxidantDose * (oxidantAgent === "favas" ? 1.2 : oxidantAgent === "primaquina" ? 1.0 : 0.8);
    const unquenchedROS = Math.max(0, oxidantStress - rosNeutralization);
    const membraneIntegrity = Math.max(0, 100 - unquenchedROS * 1.2);
    const hemolysis = Math.min(100, unquenchedROS * 1.5);
    const heinzBodies = g6pdDeficient ? Math.min(100, unquenchedROS * 2) : Math.min(10, unquenchedROS * 0.2);

    return {
      g6pdActivity, nadphProduction: Math.round(nadphProduction), gshReduction: Math.round(gshReduction),
      rosNeutralization: Math.round(rosNeutralization), oxidantStress: Math.round(oxidantStress),
      unquenchedROS: Math.round(unquenchedROS), membraneIntegrity: Math.round(membraneIntegrity),
      hemolysis: Math.round(hemolysis), heinzBodies: Math.round(heinzBodies),
    };
  }, [g6pdDeficient, oxidantAgent, oxidantDose]);

  const pathwayData = [
    { name: "G6PD", normal: 100, atual: model.g6pdActivity },
    { name: "NADPH", normal: 90, atual: model.nadphProduction },
    { name: "GSH", normal: 85, atual: model.gshReduction },
    { name: "Neutraliz.", normal: 80, atual: model.rosNeutralization },
  ];

  const damageTimeline = useMemo(() => {
    const pts = [];
    for (let h = 0; h <= 72; h += 6) {
      const factor = model.hemolysis / 100;
      const hb = Math.max(4, 14 - factor * h * 0.15);
      const reticulocytes = Math.min(20, 1 + factor * h * 0.08);
      const bilirubin = Math.min(15, 0.8 + factor * h * 0.06);
      pts.push({ hora: `${h}h`, hemoglobina: +hb.toFixed(1), reticulocitos: +reticulocytes.toFixed(1), bilirrubina: +bilirubin.toFixed(1) });
    }
    return pts;
  }, [model.hemolysis]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const hemOk = model.hemolysis >= activeCase.expectedHemolysis[0] && model.hemolysis <= activeCase.expectedHemolysis[1];
    const s = hemOk ? 100 : Math.max(0, 100 - Math.abs(model.hemolysis - (activeCase.expectedHemolysis[0] + activeCase.expectedHemolysis[1]) / 2) * 2);
    submitResults({ score: Math.round(s), actions: { g6pdDeficient, oxidantAgent, oxidantDose, hemolysis: model.hemolysis } });
  }, [activeCase, model, g6pdDeficient, oxidantAgent, oxidantDose, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, g6pdDeficient: c.g6pdDeficient ?? false,
      oxidantAgent: c.oxidantAgent ?? "primaquina", oxidantDose: c.oxidantDose ?? 50,
      expectedHemolysis: c.expectedHemolysis ?? [0, 50], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Via das Pentoses Fosfato e G6PD</h1>
            <p className="text-muted-foreground">Stresse oxidativo, NADPH e hemólise na deficiência de G6PD</p>
            <AdminPromptViewer toolSlug="sim-pentoses-fosfato" toolName="Via das Pentoses Fosfato" toolType="simulator" prompt={getNativePrompt("sim-pentoses-fosfato") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
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
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Eritrócito</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${g6pdDeficient ? "bg-destructive/10 border-destructive/30" : "bg-muted/30"}`}>
                <div>
                  <p className="text-sm font-semibold">Deficiência de G6PD</p>
                  <p className="text-xs text-muted-foreground">Atividade: {model.g6pdActivity}%</p>
                </div>
                <Switch checked={g6pdDeficient} onCheckedChange={setG6pdDeficient} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Agente Oxidante</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {OXIDANT_AGENTS.map(a => (
                  <button key={a.value} onClick={() => setOxidantAgent(a.value)}
                    className={`w-full text-left p-2 rounded-lg border text-sm transition-colors ${oxidantAgent === a.value ? "bg-primary/10 border-primary/30 font-semibold" : "hover:bg-muted/50"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Dose / Exposição</span><span className="font-semibold">{oxidantDose}%</span></div>
                <Slider value={[oxidantDose]} onValueChange={([v]) => setOxidantDose(v)} min={0} max={100} step={5} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Estado do Eritrócito</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Hemólise</p>
                  <p className={`text-2xl font-bold ${model.hemolysis > 40 ? "text-destructive" : "text-primary"}`}>{model.hemolysis}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Membrana</p>
                  <p className={`text-2xl font-bold ${model.membraneIntegrity < 50 ? "text-destructive" : "text-primary"}`}>{model.membraneIntegrity}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Corpos de Heinz</p>
                  <p className={`text-2xl font-bold ${model.heinzBodies > 30 ? "text-destructive" : "text-primary"}`}>{model.heinzBodies}%</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pathwayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="normal" name="Normal" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atual" name="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Evolução Laboratorial (72h)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={damageTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hemoglobina" name="Hb (g/dL)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reticulocitos" name="Reticulócitos (%)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bilirrubina" name="Bilirrubina (mg/dL)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleFinish} disabled={submitted}>Finalizar Simulação</Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-primary mb-1">💡 Dica Clínica</p>
          <p className="text-sm">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getPentosesFosfatoChallenges()}
        simulatorState={{ g6pdDeficient, oxidantAgent, oxidantDose }}
      />
    </div>
  );
}
