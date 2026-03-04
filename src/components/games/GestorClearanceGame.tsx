import { useState, useMemo } from "react";
import { Activity, Syringe, AlertTriangle, Calendar, ChevronRight, Trophy, XCircle, Thermometer, Droplets, FlaskConical, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameFeedbackOverlay from "./GameFeedbackOverlay";
import GameStarsResult from "./GameStarsResult";
import { toast } from "sonner";

interface PatientProfile {
  id: string; name: string; age: number; weight: number; sex: string; drug: string;
  baseCr: number; baseTFG: number; description: string;
  days: DayData[]; doses: string[]; optimalDoses: Record<number, string>;
  toxThreshold: number; effMin: number;
}

interface DayData {
  day: number; creatinina: number; tfg: number; alert: string; event?: string; eventEffect?: { toxMod: number; effMod: number };
}

interface Notification {
  day: number; message: string; type: "info" | "warning" | "critical";
}

const patients: PatientProfile[] = [
  {
    id: "idoso", name: "João Silva", age: 68, weight: 72, sex: "M", drug: "Vancomicina IV",
    baseCr: 0.9, baseTFG: 95, description: "Idoso com infecção por MRSA. Função renal inicial preservada mas com risco de deterioração.",
    toxThreshold: 90, effMin: 20,
    doses: ["1000mg 12/12h", "750mg 12/12h", "500mg 12/12h", "500mg 24/24h", "250mg 24/24h", "Suspender"],
    optimalDoses: { 1: "1000mg 12/12h", 2: "1000mg 12/12h", 3: "750mg 12/12h", 4: "500mg 12/12h", 5: "500mg 24/24h", 6: "500mg 12/12h", 7: "500mg 12/12h", 8: "750mg 12/12h", 9: "750mg 12/12h", 10: "500mg 12/12h", 11: "500mg 12/12h", 12: "500mg 12/12h", 13: "500mg 12/12h", 14: "500mg 12/12h" },
    days: [
      { day: 1, creatinina: 0.9, tfg: 95, alert: "Função renal normal" },
      { day: 2, creatinina: 1.0, tfg: 88, alert: "Estável" },
      { day: 3, creatinina: 1.3, tfg: 65, alert: "Queda leve da TFG", event: "🌡️ Febre 38.5°C — desidratação leve", eventEffect: { toxMod: 10, effMod: -5 } },
      { day: 4, creatinina: 1.8, tfg: 45, alert: "Lesão Renal Aguda Grau 1!", event: "⚠️ Nível sérico Vancomicina: 28 mcg/mL (alvo: 15-20)", eventEffect: { toxMod: 15, effMod: 0 } },
      { day: 5, creatinina: 2.2, tfg: 30, alert: "LRA Grau 2 — Ajuste urgente!" },
      { day: 6, creatinina: 2.5, tfg: 25, alert: "Risco de diálise!" },
      { day: 7, creatinina: 2.1, tfg: 35, alert: "Recuperação lenta" },
      { day: 8, creatinina: 1.8, tfg: 45, alert: "Melhora gradual" },
      { day: 9, creatinina: 1.5, tfg: 55, alert: "Recuperação contínua" },
      { day: 10, creatinina: 1.3, tfg: 65, alert: "Quase normalizado", event: "🔬 Cultura: MRSA sensível, MIC 1 mcg/mL", eventEffect: { toxMod: 0, effMod: 5 } },
      { day: 11, creatinina: 1.1, tfg: 78, alert: "Função estabilizada" },
      { day: 12, creatinina: 1.0, tfg: 85, alert: "Quase normal" },
      { day: 13, creatinina: 0.9, tfg: 90, alert: "Recuperado" },
      { day: 14, creatinina: 0.9, tfg: 92, alert: "Alta possível" },
    ],
  },
  {
    id: "obeso", name: "Maria Santos", age: 45, weight: 110, sex: "F", drug: "Gentamicina IV",
    baseCr: 0.7, baseTFG: 110, description: "Paciente obesa com pielonefrite complicada. Risco de subdosagem por volume de distribuição aumentado.",
    toxThreshold: 85, effMin: 25,
    doses: ["5mg/kg 24/24h", "3mg/kg 24/24h", "3mg/kg 36/36h", "2mg/kg 24/24h", "1mg/kg 24/24h", "Suspender"],
    optimalDoses: { 1: "5mg/kg 24/24h", 2: "5mg/kg 24/24h", 3: "5mg/kg 24/24h", 4: "3mg/kg 24/24h", 5: "3mg/kg 36/36h", 6: "3mg/kg 36/36h", 7: "3mg/kg 24/24h", 8: "3mg/kg 24/24h", 9: "3mg/kg 24/24h", 10: "3mg/kg 24/24h", 11: "3mg/kg 24/24h", 12: "2mg/kg 24/24h", 13: "2mg/kg 24/24h", 14: "2mg/kg 24/24h" },
    days: [
      { day: 1, creatinina: 0.7, tfg: 110, alert: "Função renal normal" },
      { day: 2, creatinina: 0.7, tfg: 108, alert: "Estável" },
      { day: 3, creatinina: 0.8, tfg: 100, alert: "Leve variação" },
      { day: 4, creatinina: 0.9, tfg: 92, alert: "Atenção à tendência", event: "⚠️ Vale de Gentamicina: 2.5 mcg/mL (alvo: < 2)", eventEffect: { toxMod: 12, effMod: 0 } },
      { day: 5, creatinina: 1.2, tfg: 70, alert: "Queda significativa TFG" },
      { day: 6, creatinina: 1.4, tfg: 58, alert: "Nefrotoxicidade em curso!", event: "🔊 Paciente refere zumbido bilateral", eventEffect: { toxMod: 8, effMod: 0 } },
      { day: 7, creatinina: 1.3, tfg: 62, alert: "Estabilização" },
      { day: 8, creatinina: 1.1, tfg: 75, alert: "Recuperação" },
      { day: 9, creatinina: 1.0, tfg: 82, alert: "Melhora contínua" },
      { day: 10, creatinina: 0.9, tfg: 90, alert: "Quase normalizado" },
      { day: 11, creatinina: 0.8, tfg: 100, alert: "Estável" },
      { day: 12, creatinina: 0.8, tfg: 102, alert: "Normal" },
      { day: 13, creatinina: 0.7, tfg: 108, alert: "Recuperação completa" },
      { day: 14, creatinina: 0.7, tfg: 110, alert: "Alta possível" },
    ],
  },
  {
    id: "pediatrico", name: "Lucas Oliveira", age: 8, weight: 28, sex: "M", drug: "Vancomicina IV",
    baseCr: 0.4, baseTFG: 120, description: "Criança com osteomielite por MRSA. Clearance renal elevado para idade — risco de subdosagem.",
    toxThreshold: 80, effMin: 30,
    doses: ["15mg/kg 6/6h", "15mg/kg 8/8h", "10mg/kg 6/6h", "10mg/kg 8/8h", "10mg/kg 12/12h", "Suspender"],
    optimalDoses: { 1: "15mg/kg 6/6h", 2: "15mg/kg 6/6h", 3: "15mg/kg 8/8h", 4: "10mg/kg 6/6h", 5: "10mg/kg 8/8h", 6: "10mg/kg 8/8h", 7: "10mg/kg 6/6h", 8: "15mg/kg 8/8h", 9: "15mg/kg 8/8h", 10: "15mg/kg 8/8h", 11: "10mg/kg 8/8h", 12: "10mg/kg 8/8h", 13: "10mg/kg 12/12h", 14: "10mg/kg 12/12h" },
    days: [
      { day: 1, creatinina: 0.4, tfg: 120, alert: "Clearance elevado — dose adequada?" },
      { day: 2, creatinina: 0.4, tfg: 118, alert: "Estável" },
      { day: 3, creatinina: 0.5, tfg: 105, alert: "Variação leve", event: "🌡️ Febre persistente 39°C", eventEffect: { toxMod: 5, effMod: -8 } },
      { day: 4, creatinina: 0.6, tfg: 90, alert: "Queda discreta" },
      { day: 5, creatinina: 0.7, tfg: 78, alert: "Monitorar de perto" },
      { day: 6, creatinina: 0.8, tfg: 68, alert: "Redução significativa", event: "⚠️ Nível vale Vancomicina: 22 mcg/mL", eventEffect: { toxMod: 10, effMod: 0 } },
      { day: 7, creatinina: 0.7, tfg: 75, alert: "Leve melhora" },
      { day: 8, creatinina: 0.6, tfg: 88, alert: "Recuperação" },
      { day: 9, creatinina: 0.5, tfg: 100, alert: "Boa evolução" },
      { day: 10, creatinina: 0.5, tfg: 105, alert: "Estabilizado" },
      { day: 11, creatinina: 0.4, tfg: 115, alert: "Normal para idade" },
      { day: 12, creatinina: 0.4, tfg: 118, alert: "Excelente" },
      { day: 13, creatinina: 0.4, tfg: 120, alert: "Completo" },
      { day: 14, creatinina: 0.4, tfg: 120, alert: "Alta possível" },
    ],
  },
];

const difficultyConfig: Record<GameDifficulty, { totalDays: number; notifications: boolean }> = {
  academic: { totalDays: 7, notifications: true },
  clinical: { totalDays: 10, notifications: true },
  specialist: { totalDays: 14, notifications: false },
};

export default function GestorClearanceGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "patient" | "playing" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [patient, setPatient] = useState<PatientProfile>(patients[0]);
  const [currentDay, setCurrentDay] = useState(1);
  const [toxicity, setToxicity] = useState(0);
  const [efficacy, setEfficacy] = useState(50);
  const [currentDose, setCurrentDose] = useState("");
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [pkHistory, setPkHistory] = useState<{ day: number; tox: number; eff: number; cr: number; tfg: number }[]>([]);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const config = difficultyConfig[difficulty];
  const totalDays = Math.min(config.totalDays, patient.days.length);
  const lab = patient.days[currentDay - 1];

  const startGame = (p: PatientProfile) => {
    setPatient(p);
    setCurrentDay(1);
    setToxicity(0);
    setEfficacy(50);
    setCurrentDose(p.doses[0]);
    setScore(0);
    setErrors(0);
    setPkHistory([{ day: 0, tox: 0, eff: 50, cr: p.baseCr, tfg: p.baseTFG }]);
    setNotifications([]);
    setPhase("playing");
  };

  const advanceDay = () => {
    const optimal = patient.optimalDoses[currentDay];
    const isOptimal = currentDose === optimal;
    const tfg = lab.tfg;

    let toxDelta = 0;
    let effDelta = 0;

    if (currentDose === "Suspender") {
      toxDelta = -20; effDelta = -25;
    } else {
      // Higher doses in poor renal function = more toxicity
      const doseIdx = patient.doses.indexOf(currentDose);
      const intensity = (patient.doses.length - 1 - doseIdx) / (patient.doses.length - 1); // 0=suspended, 1=max dose

      if (tfg < 30) {
        toxDelta = intensity * 40 - 10;
        effDelta = intensity * 10 - 5;
      } else if (tfg < 50) {
        toxDelta = intensity * 25 - 8;
        effDelta = intensity * 8;
      } else if (tfg < 80) {
        toxDelta = intensity * 10 - 3;
        effDelta = intensity * 10;
      } else {
        toxDelta = intensity * 5;
        effDelta = intensity * 12;
      }
    }

    // Apply event effects
    if (lab.event && lab.eventEffect) {
      toxDelta += lab.eventEffect.toxMod;
      effDelta += lab.eventEffect.effMod;

      if (config.notifications) {
        setNotifications(n => [...n, { day: currentDay, message: lab.event!, type: lab.eventEffect!.toxMod > 10 ? "critical" : "warning" }]);
      }
    }

    const newTox = Math.min(100, Math.max(0, toxicity + toxDelta));
    const newEff = Math.min(100, Math.max(0, efficacy + effDelta));

    // Scoring
    if (isOptimal) {
      setScore(s => s + 15);
    } else {
      const closeness = Math.abs(patient.doses.indexOf(currentDose) - patient.doses.indexOf(optimal));
      setScore(s => s + Math.max(0, 10 - closeness * 3));
      if (closeness >= 2) setErrors(e => e + 1);
    }

    setToxicity(newTox);
    setEfficacy(newEff);
    setPkHistory(h => [...h, { day: currentDay, tox: newTox, eff: newEff, cr: lab.creatinina, tfg: lab.tfg }]);

    // Show feedback on events
    if (lab.event) {
      setFeedback({
        isCorrect: isOptimal,
        title: isOptimal ? "Ajuste Adequado!" : "Atenção ao Ajuste",
        explanation: `${lab.event}. ${isOptimal ? "Dose ótima selecionada para esta situação clínica." : `A dose ótima seria: ${optimal}. O ajuste baseado na TFG de ${tfg} mL/min e creatinina de ${lab.creatinina} exige atenção.`}`,
        reference: "Guia de Ajuste Renal — Micromedex/UpToDate",
        tip: isOptimal ? undefined : `Com TFG ${tfg}: considere reduzir dose ou espaçar intervalo.`,
      });
      return; // Don't advance until feedback dismissed
    }

    // Check end conditions
    if (newTox >= patient.toxThreshold) {
      setFeedback({
        isCorrect: false,
        title: "Nefrotoxicidade Severa!",
        explanation: `Toxicidade atingiu ${Math.round(newTox)}%. O acúmulo do fármaco por falta de ajuste causou dano renal. Em pacientes com TFG reduzida, é essencial reduzir dose ou aumentar intervalo.`,
        reference: "Brunton LL. Goodman & Gilman, 13ª ed.",
      });
      setTimeout(() => setPhase("result"), 100);
      return;
    }

    if (newEff <= patient.effMin) {
      setFeedback({
        isCorrect: false,
        title: "Falha Terapêutica!",
        explanation: `Eficácia caiu para ${Math.round(newEff)}%. Subdosagem levou à falha no controle da infecção. É importante manter níveis terapêuticos adequados mesmo durante ajustes renais.`,
        reference: "IDSA Guidelines — Vancomycin TDM",
      });
      setTimeout(() => setPhase("result"), 100);
      return;
    }

    if (currentDay >= totalDays) {
      setPhase("result");
      return;
    }

    setCurrentDay(d => d + 1);
  };

  const continueFeedback = () => {
    setFeedback(null);
    if (phase === "result") return;
    if (toxicity >= patient.toxThreshold || efficacy <= patient.effMin) { setPhase("result"); return; }
    if (currentDay >= totalDays) { setPhase("result"); return; }
    setCurrentDay(d => d + 1);
  };

  const maxScore = totalDays * 15;

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Gestor de Clearance Renal"
        setting="UTI — Setor de Farmácia Clínica"
        briefing="Ajuste a dose do antimicrobiano a cada dia com base nos exames laboratoriais. Mantenha eficácia terapêutica sem causar nefrotoxicidade. Eventos clínicos (febre, desidratação) alteram a farmacocinética!"
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">{config.totalDays} dias • {config.notifications ? "Com" : "Sem"} notificações</p>
        <Button onClick={() => setPhase("patient")} size="lg">Selecionar Paciente</Button>
      </div>
    );
  }

  if (phase === "patient") {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center text-foreground">Selecione o Paciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {patients.map(p => (
            <Card key={p.id} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => startGame(p)}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {p.age < 18 ? "👶" : p.sex === "F" ? "👩" : "👨"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.age} anos • {p.weight}kg</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{p.drug}</Badge>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (feedback) {
    return (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={continueFeedback}
      />
    );
  }

  if (phase === "result") {
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={toxicity >= patient.toxThreshold ? "Nefrotoxicidade!" : efficacy <= patient.effMin ? "Falha Terapêutica!" : "Alta Hospitalar!"}
        subtitle={
          toxicity >= patient.toxThreshold
            ? `Toxicidade atingiu ${Math.round(toxicity)}% no dia ${currentDay}. O paciente necessitou hemodiálise.`
            : efficacy <= patient.effMin
            ? `Eficácia caiu para ${Math.round(efficacy)}% no dia ${currentDay}. Infecção não controlada.`
            : `${patient.name} completou ${totalDays} dias de tratamento com sucesso. Toxicidade: ${Math.round(toxicity)}%, Eficácia: ${Math.round(efficacy)}%.`
        }
        onRestart={() => setPhase("narrative")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{patient.name} • {patient.age}a • {patient.weight}kg • {patient.drug}</p>
          <Badge variant="secondary">Dia {currentDay} de {totalDays}</Badge>
        </div>
        <Badge variant="outline">Pontos: {score}</Badge>
      </div>

      {/* Notifications */}
      {lab.event && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 animate-in slide-in-from-top-2">
          <Bell className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">{lab.event}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Labs */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><FlaskConical className="h-4 w-4" /> Laboratório</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Creatinina Sérica</p>
              <p className={`text-2xl font-bold ${lab.creatinina > 1.2 ? "text-destructive" : "text-green-500"}`}>{lab.creatinina} mg/dL</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TFG Estimada</p>
              <p className={`text-2xl font-bold ${lab.tfg < 50 ? "text-orange-500" : "text-green-500"}`}>{lab.tfg} mL/min</p>
            </div>
            <Badge variant={lab.tfg < 30 ? "destructive" : lab.tfg < 50 ? "secondary" : "outline"} className="text-xs">{lab.alert}</Badge>
          </CardContent>
        </Card>

        {/* Dose Selection */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Syringe className="h-4 w-4" /> Ajuste de Dose</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {patient.doses.map(d => (
              <Button
                key={d}
                variant={currentDose === d ? "default" : "outline"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setCurrentDose(d)}
              >
                {d}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Patient Status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estado do Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Toxicidade</span>
                <span className={toxicity > 70 ? "text-destructive font-bold animate-pulse" : ""}>{Math.round(toxicity)}%</span>
              </div>
              <Progress value={toxicity} className="h-3 [&>div]:bg-destructive" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Eficácia</span>
                <span className={efficacy < 35 ? "text-orange-500 font-bold animate-pulse" : ""}>{Math.round(efficacy)}%</span>
              </div>
              <Progress value={efficacy} className="h-3 [&>div]:bg-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PK Chart */}
      {pkHistory.length > 1 && (
        <Card>
          <CardHeader className="pb-0 pt-3"><CardTitle className="text-sm">Evolução Farmacocinética</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={pkHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={v => `D${v}`} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip />
                <ReferenceLine y={patient.toxThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Tox Max", fontSize: 9 }} />
                <ReferenceLine y={patient.effMin} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "Eff Min", fontSize: 9 }} />
                <Line type="monotone" dataKey="tox" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="Toxicidade" />
                <Line type="monotone" dataKey="eff" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 3 }} name="Eficácia" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Button onClick={advanceDay} className="w-full" size="lg">
        Confirmar Dose e Avançar para Dia {currentDay + 1} <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
