import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Beaker } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

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
    title: "Deficiência de Argininossuccinato Sintase (Citrulinemia Tipo I)",
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

const INTERMEDIATES = ["NH₃", "Carbamil-P", "Ornitina", "Citrulina", "Argininossuccinato", "Arginina", "Ureia"];

export default function SimuladorCicloUreia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases(SLUG, BUILT_IN_CASES);
  const { roomCase, isExamMode, examTimeLeft, handleFinishExam, showFeedback, feedback, closeFeedback, startExam } = useVirtualRoomCase(SLUG, allCases);

  const [selectedCase, setSelectedCase] = useState<UreaCycleCase | null>(null);
  const [deficiencies, setDeficiencies] = useState({ cpsI: false, otc: false, ass: false, asl: false, arginase: false });

  const handleSelectCase = useCallback((c: UreaCycleCase) => {
    setSelectedCase(c);
    setDeficiencies(c.deficiencies);
  }, []);

  const toggleDeficiency = useCallback((key: string) => {
    setDeficiencies(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const model = useMemo(() => {
    // Base production rates (arbitrary units per cycle turn)
    const baseInput = 100; // NH3 input
    let levels = { nh3: baseInput, carbamilP: 0, ornitina: 50, citrulina: 0, argininossuccinato: 0, arginina: 0, ureia: 0, fumarato: 0 };

    // Step 1: CPS I - NH3 → Carbamil-P
    if (!deficiencies.cpsI) {
      levels.carbamilP = levels.nh3 * 0.9;
      levels.nh3 *= 0.1;
    }

    // Step 2: OTC - Carbamil-P + Ornitina → Citrulina
    if (!deficiencies.otc && levels.carbamilP > 0) {
      levels.citrulina = Math.min(levels.carbamilP, levels.ornitina) * 0.9;
      levels.carbamilP *= 0.1;
      levels.ornitina *= 0.1;
    }

    // Step 3: ASS - Citrulina + Asp → Argininossuccinato
    if (!deficiencies.ass && levels.citrulina > 0) {
      levels.argininossuccinato = levels.citrulina * 0.9;
      levels.citrulina *= 0.1;
    }

    // Step 4: ASL - Argininossuccinato → Arginina + Fumarato
    if (!deficiencies.asl && levels.argininossuccinato > 0) {
      levels.arginina = levels.argininossuccinato * 0.9;
      levels.fumarato = levels.argininossuccinato * 0.9;
      levels.argininossuccinato *= 0.1;
    }

    // Step 5: Arginase - Arginina → Ureia + Ornitina
    if (!deficiencies.arginase && levels.arginina > 0) {
      levels.ureia = levels.arginina * 0.9;
      const recycledOrnitina = levels.arginina * 0.9;
      levels.ornitina += recycledOrnitina;
      levels.arginina *= 0.1;
    }

    // Ammonia toxicity level
    const ammoniaLevel = levels.nh3 + (deficiencies.otc ? levels.carbamilP * 0.3 : 0);
    const toxicity = ammoniaLevel > 80 ? "Crítica" : ammoniaLevel > 40 ? "Elevada" : ammoniaLevel > 15 ? "Moderada" : "Normal";

    return { levels, ammoniaLevel, toxicity, ureiaOutput: levels.ureia };
  }, [deficiencies]);

  const barData = [
    { name: "NH₃", value: Math.round(model.levels.nh3), fill: "hsl(var(--destructive))" },
    { name: "Carb-P", value: Math.round(model.levels.carbamilP), fill: "hsl(var(--chart-1))" },
    { name: "Ornitina", value: Math.round(model.levels.ornitina), fill: "hsl(var(--chart-2))" },
    { name: "Citrulina", value: Math.round(model.levels.citrulina), fill: "hsl(var(--chart-3))" },
    { name: "Arg-Succ", value: Math.round(model.levels.argininossuccinato), fill: "hsl(var(--chart-4))" },
    { name: "Arginina", value: Math.round(model.levels.arginina), fill: "hsl(var(--chart-5))" },
    { name: "Ureia", value: Math.round(model.levels.ureia), fill: "hsl(var(--primary))" },
  ];

  // Neurotoxicity timeline simulation
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

  if (!selectedCase && !roomCase) {
    return (
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isVirtualRoom ? "/sala" : "/simuladores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ciclo da Ureia e Toxicidade da Amónia</h1>
            <p className="text-muted-foreground">Simule deficiências enzimáticas e observe a acumulação de intermediários</p>
          </div>
        </div>

        {!isVirtualRoom && (
          <div className="flex gap-2">
            <Button onClick={generateCase} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar Caso com IA
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCases.map((c: any, i: number) => (
            <Card key={c.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectCase(c)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={c.difficulty === "Difícil" ? "destructive" : c.difficulty === "Médio" ? "default" : "secondary"}>{c.difficulty}</Badge>
                    {c.isAI && <Badge variant="outline"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.scenario?.substring(0, 100)}...</p>
                {c.isAI && <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeCase = roomCase || selectedCase!;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {isExamMode && <ExamBanner timeLeft={examTimeLeft} onFinish={handleFinishExam} />}
      {showFeedback && <ExamFeedbackOverlay feedback={feedback} onClose={closeFeedback} />}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => roomCase ? navigate("/sala") : setSelectedCase(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" /> {activeCase.title}
          </h1>
          <p className="text-sm text-muted-foreground">{activeCase.patient?.name} — {activeCase.patient?.diagnosis}</p>
        </div>
        <Badge variant={activeCase.difficulty === "Difícil" ? "destructive" : "default"}>{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enzyme Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enzimas do Ciclo da Ureia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Results */}
        <div className="space-y-4">
          {/* Ammonia & Urea indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indicadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Amónia (NH₃)</p>
                  <p className={`text-2xl font-bold ${model.ammoniaLevel > 40 ? "text-destructive" : "text-primary"}`}>
                    {Math.round(model.ammoniaLevel)} µmol/L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ureia Produzida</p>
                  <p className="text-2xl font-bold text-primary">{Math.round(model.ureiaOutput)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Neurotoxicidade</p>
                  <Badge variant={model.toxicity === "Crítica" ? "destructive" : model.toxicity === "Elevada" ? "destructive" : "secondary"} className="text-lg">
                    {model.toxicity}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intermediates Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Níveis de Intermediários</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Nível (%)" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Neurotoxicity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução da Neurotoxicidade (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={neuroData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amonia" name="NH₃ (µmol/L)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="edema" name="Edema Cerebral (%)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="consciencia" name="Nível Consciência (%)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Clinical Tip */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-primary mb-1">💡 Dica Clínica</p>
          <p className="text-sm">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>
    </div>
  );
}
