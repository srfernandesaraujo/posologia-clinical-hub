import { useState, useEffect, useRef } from "react";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Pill, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer, ReferenceLine } from "recharts";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface DrugScenario {
  name: string;
  icon: string;
  unit: string;
  lowerLimit: number;
  upperLimit: number;
  toxicLimit: number;
  startValue: number;
  yDomain: [number, number];
  days: number;
  actions: { label: string; icon: string; delta: number; variance: number }[];
  events: { day: number; text: string; effect: number; explanation: string; reference: string }[];
  narrative: { setting: string; patientName: string; patientAge: string; patientHistory: string; briefing: string };
}

const drugScenarios: DrugScenario[] = [
  {
    name: "Varfarina (INR)",
    icon: "💉",
    unit: "INR",
    lowerLimit: 2.0,
    upperLimit: 3.0,
    toxicLimit: 5.0,
    startValue: 2.2,
    yDomain: [0.5, 6],
    days: 14,
    actions: [
      { label: "Aumentar Dose", icon: "up", delta: 0.6, variance: 0.4 },
      { label: "Manter Dose", icon: "maintain", delta: 0, variance: 0.3 },
      { label: "Reduzir Dose", icon: "down", delta: -0.5, variance: 0.3 },
      { label: "Suspender 1 Dia", icon: "suspend", delta: -1.2, variance: 0.3 },
    ],
    events: [
      { day: 4, text: "🥦 Paciente comeu brócolis e couve no almoço (ricos em Vitamina K)", effect: -0.8, explanation: "Vitamina K antagoniza a varfarina competindo pela enzima VKOR. Alimentos ricos em vitamina K reduzem o INR.", reference: "Holbrook AM et al. Arch Intern Med 2005" },
      { day: 7, text: "💊 Médico prescreveu Amoxicilina + Clavulanato para sinusite", effect: 0.9, explanation: "Antibióticos alteram flora intestinal que produz vitamina K, potencializando a varfarina. Amoxicilina-clavulanato é um dos mais implicados.", reference: "Baillargeon J et al. Am J Med 2012" },
      { day: 10, text: "🤒 Paciente com diarreia há 2 dias (desidratação leve)", effect: 0.5, explanation: "Diarreia reduz absorção de vitamina K e concentra a varfarina por desidratação, elevando o INR.", reference: "UpToDate: Warfarin management 2024" },
    ],
    narrative: {
      setting: "Ambulatório de Anticoagulação — Hospital Universitário",
      patientName: "Dona Tereza",
      patientAge: "72 anos, fibrilação atrial crônica",
      patientHistory: "FA permanente com CHA₂DS₂-VASc de 5. Em uso de varfarina com alvo INR 2.0-3.0. Mora sozinha, alimentação variável. Último INR: 2.2.",
      briefing: "Monitore o INR da paciente por 14 dias, ajustando a dose de varfarina. Cuidado com eventos intercorrentes que alteram o INR!",
    },
  },
  {
    name: "Lítio (mEq/L)",
    icon: "🧠",
    unit: "mEq/L",
    lowerLimit: 0.6,
    upperLimit: 1.2,
    toxicLimit: 1.5,
    startValue: 0.8,
    yDomain: [0, 2.0],
    days: 14,
    actions: [
      { label: "Aumentar 300mg", icon: "up", delta: 0.2, variance: 0.1 },
      { label: "Manter Dose", icon: "maintain", delta: 0, variance: 0.08 },
      { label: "Reduzir 150mg", icon: "down", delta: -0.15, variance: 0.08 },
      { label: "Suspender 1 Dia", icon: "suspend", delta: -0.3, variance: 0.1 },
    ],
    events: [
      { day: 3, text: "☀️ Onda de calor — paciente suando muito e bebendo pouca água", effect: 0.25, explanation: "Desidratação reduz a eliminação renal de lítio. Suor excessivo sem reposição hídrica concentra o fármaco.", reference: "Malhi GS et al. Lancet 2013" },
      { day: 6, text: "💊 Cardiologista prescreveu Hidroclorotiazida para PA elevada", effect: 0.35, explanation: "Tiazídicos reduzem a excreção renal de lítio por aumentarem reabsorção proximal de sódio (e lítio). Risco de intoxicação!", reference: "Finley PR. J Clin Pharmacol 2016" },
      { day: 11, text: "🏃 Paciente iniciou exercícios físicos intensos", effect: 0.15, explanation: "Exercício intenso causa desidratação e redistribuição hemodinâmica, elevando litemia. Orientar hidratação.", reference: "Goodman & Gilman, 14ª ed." },
    ],
    narrative: {
      setting: "CAPS III — Ambulatório de Psiquiatria",
      patientName: "Carlos Eduardo",
      patientAge: "45 anos, engenheiro",
      patientHistory: "Transtorno bipolar tipo I em uso de carbonato de lítio 900mg/dia. Função renal normal (TFG 85). Último nível sérico: 0.8 mEq/L. Estável há 6 meses.",
      briefing: "Monitore a litemia por 14 dias. O lítio tem janela terapêutica estreitíssima — toxicidade pode ser fatal!",
    },
  },
  {
    name: "Digoxina (ng/mL)",
    icon: "❤️",
    unit: "ng/mL",
    lowerLimit: 0.5,
    upperLimit: 2.0,
    toxicLimit: 2.5,
    startValue: 1.2,
    yDomain: [0, 3.5],
    days: 14,
    actions: [
      { label: "Aumentar 0.125mg", icon: "up", delta: 0.4, variance: 0.2 },
      { label: "Manter Dose", icon: "maintain", delta: 0, variance: 0.15 },
      { label: "Reduzir 0.0625mg", icon: "down", delta: -0.3, variance: 0.15 },
      { label: "Suspender 1 Dia", icon: "suspend", delta: -0.5, variance: 0.15 },
    ],
    events: [
      { day: 4, text: "💧 Paciente com vômitos — piora da função renal (Cr: 1.2→1.8)", effect: 0.5, explanation: "Digoxina é eliminada 70% por via renal. Qualquer queda na TFG acumula o fármaco. Creatinina 1.8 reduz clearance em ~40%.", reference: "Gheorghiade M et al. Circulation 2004" },
      { day: 8, text: "💊 Prescrito Amiodarona para controle de ritmo", effect: 0.6, explanation: "Amiodarona inibe a glicoproteína-P, principal transportador de efluxo da digoxina. Reduzir dose de digoxina em 50% ao iniciar amiodarona!", reference: "Goodman & Gilman, 14ª ed." },
      { day: 12, text: "🍌 Paciente com hipocaliemia (K+: 3.0) por furosemida", effect: 0.3, explanation: "Hipocaliemia potencializa a toxicidade digitálica sem alterar o nível sérico. Digoxina e potássio competem pelo mesmo sítio na Na+/K+-ATPase.", reference: "Rang & Dale, 9ª ed." },
    ],
    narrative: {
      setting: "Enfermaria de Cardiologia — Ala de Insuficiência Cardíaca",
      patientName: "Sr. Benedito",
      patientAge: "78 anos, ICC classe III",
      patientHistory: "IC com FE reduzida (30%). Em uso de digoxina 0.25mg/dia, furosemida, enalapril e carvedilol. Último nível sérico: 1.2 ng/mL. Cr: 1.2.",
      briefing: "Monitore o nível sérico de digoxina. Atenção: a toxicidade digitálica é uma das intoxicações medicamentosas mais perigosas!",
    },
  },
  {
    name: "Fenitoína (µg/mL)",
    icon: "⚡",
    unit: "µg/mL",
    lowerLimit: 10,
    upperLimit: 20,
    toxicLimit: 25,
    startValue: 14,
    yDomain: [0, 35],
    days: 14,
    actions: [
      { label: "Aumentar 50mg", icon: "up", delta: 3, variance: 2 },
      { label: "Manter Dose", icon: "maintain", delta: 0, variance: 1.5 },
      { label: "Reduzir 50mg", icon: "down", delta: -2.5, variance: 1.5 },
      { label: "Suspender 1 Dia", icon: "suspend", delta: -5, variance: 2 },
    ],
    events: [
      { day: 5, text: "💊 Paciente iniciou Fluconazol para candidíase oral", effect: 5, explanation: "Fluconazol inibe CYP2C9, principal via de metabolização da fenitoína. Nível pode DOBRAR. É uma das interações mais perigosas.", reference: "Blum RA et al. Clin Pharmacol Ther 1991" },
      { day: 9, text: "📉 Paciente com hipoalbuminemia (Alb: 2.5 g/dL)", effect: 2, explanation: "Fenitoína liga-se 90% à albumina. Hipoalbuminemia aumenta fração livre (ativa) sem alterar nível total. Usar fenitoína livre corrigida.", reference: "Winter ME. Basic Clinical Pharmacokinetics, 6ª ed." },
      { day: 12, text: "🍷 Paciente ingeriu álcool em evento social", effect: -3, explanation: "Álcool agudo inibe CYP2E1 (efeito mínimo) mas álcool crônico INDUZ metabolismo. Efeito agudo é imprevisível.", reference: "Katzung, Farmacologia Básica e Clínica" },
    ],
    narrative: {
      setting: "Ambulatório de Neurologia — Clínica de Epilepsia",
      patientName: "Marcos Vinícius",
      patientAge: "32 anos, professor de história",
      patientHistory: "Epilepsia focal com crises TCG desde os 18 anos. Em uso de fenitoína 300mg/dia. Livre de crises há 1 ano. Último nível sérico: 14 µg/mL.",
      briefing: "A fenitoína tem cinética de Michaelis-Menten: pequenas mudanças de dose causam grandes variações no nível sérico. Monitore com cuidado!",
    },
  },
];

export default function JanelaTerapeuticaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "result">("select");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");

  const scenario = drugScenarios[scenarioIdx];
  const [currentDay, setCurrentDay] = useState(1);
  const [currentValue, setCurrentValue] = useState(scenario.startValue);
  const [history, setHistory] = useState([{ day: 0, value: scenario.startValue * 0.5 }, { day: 1, value: scenario.startValue }]);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost_high" | "lost_low">("playing");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string } | null>(null);
  const [activeEvent, setActiveEvent] = useState<typeof scenario.events[0] | null>(null);
  const [daysInRange, setDaysInRange] = useState(0);
  const [errors, setErrors] = useState(0);

  const startGame = () => {
    setCurrentDay(1);
    setCurrentValue(scenario.startValue);
    setHistory([{ day: 0, value: scenario.startValue * 0.5 }, { day: 1, value: scenario.startValue }]);
    setGameStatus("playing");
    setFeedback(null);
    setActiveEvent(null);
    setDaysInRange(0);
    setErrors(0);
    setPhase("playing");
  };

  const applyDose = (actionIdx: number) => {
    if (gameStatus !== "playing") return;
    const action = scenario.actions[actionIdx];
    const rand = (Math.random() - 0.5) * action.variance * 2;
    let newValue = currentValue + action.delta + rand;

    // Check for event
    const event = scenario.events.find(e => e.day === currentDay + 1);
    if (event) {
      newValue += event.effect;
      setActiveEvent(event);
      setFeedback({
        isCorrect: false,
        title: `⚠️ Evento no Dia ${currentDay + 1}`,
        explanation: event.explanation,
        reference: event.reference,
      });
    }

    newValue = Math.max(0.1, parseFloat(newValue.toFixed(2)));
    const newDay = currentDay + 1;
    setCurrentValue(newValue);
    setHistory(h => [...h, { day: newDay, value: newValue }]);
    setCurrentDay(newDay);

    // Track in-range days
    if (newValue >= scenario.lowerLimit && newValue <= scenario.upperLimit) {
      setDaysInRange(d => d + 1);
    } else {
      setErrors(e => e + 1);
    }

    if (newValue >= scenario.toxicLimit) { setGameStatus("lost_high"); return; }
    if (newValue <= scenario.lowerLimit * 0.4 && newDay > 3) { setGameStatus("lost_low"); return; }
    if (newDay >= scenario.days) { setGameStatus("won"); }
  };

  const handleFeedbackContinue = () => {
    setFeedback(null);
    setActiveEvent(null);
    if (gameStatus !== "playing") setPhase("result");
  };

  useEffect(() => {
    if ((gameStatus === "won" || gameStatus === "lost_high" || gameStatus === "lost_low") && !feedback) {
      setPhase("result");
    }
  }, [gameStatus, feedback]);

  const valueColor = currentValue < scenario.lowerLimit ? "text-yellow-600" : currentValue <= scenario.upperLimit ? "text-green-600" : "text-destructive";

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">A Janela Terapêutica</h2>
        <p className="text-center text-muted-foreground text-sm">Selecione o fármaco de janela estreita</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {drugScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => setScenarioIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                scenarioIdx === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <p className="font-semibold text-foreground mt-2">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Alvo: {s.lowerLimit}–{s.upperLimit} {s.unit}</p>
            </button>
          ))}
        </div>

        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setPhase("narrative")} className="gap-2">Continuar</Button>
        </div>
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title={`Janela Terapêutica: ${scenario.name}`}
        setting={scenario.narrative.setting}
        patientName={scenario.narrative.patientName}
        patientAge={scenario.narrative.patientAge}
        patientHistory={scenario.narrative.patientHistory}
        briefing={scenario.narrative.briefing}
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Activity className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    const won = gameStatus === "won";
    return (
      <GameStarsResult
        score={daysInRange * 10}
        maxScore={scenario.days * 10}
        errors={errors}
        title={won ? "Monitoramento Bem-Sucedido!" : gameStatus === "lost_high" ? "Toxicidade!" : "Subterapêutico!"}
        subtitle={won
          ? `Paciente mantido na janela terapêutica por ${daysInRange} de ${scenario.days} dias.`
          : gameStatus === "lost_high"
            ? `Nível tóxico atingido (≥${scenario.toxicLimit} ${scenario.unit}). O paciente sofreu efeitos adversos graves.`
            : `Nível subterapêutico mantido. O paciente não teve benefício terapêutico.`
        }
        onRestart={startGame}
        onBack={() => setPhase("select")}
        details={[
          { label: "Fármaco", value: scenario.name },
          { label: "Dias na faixa terapêutica", value: `${daysInRange}/${scenario.days}` },
          { label: "Eventos enfrentados", value: `${scenario.events.filter(e => e.day <= currentDay).length}` },
        ]}
      />
    );
  }

  // Playing
  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={false}
          title={feedback.title}
          explanation={feedback.explanation}
          reference={feedback.reference}
          onContinue={handleFeedbackContinue}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{scenario.icon}</span>
          <h3 className="font-bold text-foreground text-sm">{scenario.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Dia {currentDay}/{scenario.days}</Badge>
          <span className={`text-2xl font-bold font-mono ${valueColor}`}>{currentValue.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">{scenario.unit}</span>
        </div>
      </div>

      {/* Active event banner */}
      {activeEvent && (
        <div className="bg-accent/50 border border-accent rounded-lg p-3 text-sm flex items-start gap-2 animate-fade-in">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span className="text-foreground">{activeEvent.text}</span>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} />
              <YAxis domain={scenario.yDomain} />
              <Tooltip />
              <ReferenceArea y1={scenario.yDomain[0]} y2={scenario.lowerLimit} fill="hsl(45 93% 47%)" fillOpacity={0.15} />
              <ReferenceArea y1={scenario.lowerLimit} y2={scenario.upperLimit} fill="hsl(142 71% 45%)" fillOpacity={0.15} />
              <ReferenceArea y1={scenario.upperLimit} y2={scenario.yDomain[1]} fill="hsl(0 84% 60%)" fillOpacity={0.15} />
              <ReferenceLine y={scenario.lowerLimit} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" />
              <ReferenceLine y={scenario.upperLimit} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" />
              {scenario.toxicLimit < scenario.yDomain[1] && (
                <ReferenceLine y={scenario.toxicLimit} stroke="hsl(0 84% 40%)" strokeDasharray="6 3" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-yellow-400/30 rounded" /> Subterapêutico</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500/30 rounded" /> Terapêutico</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500/30 rounded" /> Tóxico</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {scenario.actions.map((action, i) => (
          <Button key={i} onClick={() => applyDose(i)} variant="outline" className="flex-col h-auto py-3 gap-1" disabled={gameStatus !== "playing"}>
            {action.icon === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
            {action.icon === "maintain" && <Activity className="h-4 w-4 text-primary" />}
            {action.icon === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
            {action.icon === "suspend" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar</Button>
      </div>
    </div>
  );
}
