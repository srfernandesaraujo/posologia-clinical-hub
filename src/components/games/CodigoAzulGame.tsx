import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Zap, Clock, Activity, Users, Syringe, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

type Rhythm = "fv" | "tv" | "aesp" | "assistolia";
type ACLSAction = "desfibrilar" | "epinefrina" | "amiodarona" | "compressoes" | "via_aerea" | "acesso_venoso" | "identificar_causa" | "checar_ritmo";

interface TeamMember {
  id: string;
  role: string;
  task: string | null;
  icon: string;
}

interface Scenario {
  id: string;
  title: string;
  patientName: string;
  patientAge: string;
  history: string;
  initialRhythm: Rhythm;
  reversibleCause: string;
  reversibleCauseHint: string;
  reversibleCauseCategory: "5H" | "5T";
  correctSequence: ACLSAction[];
  explanation: string;
  reference: string;
}

const rhythmInfo: Record<Rhythm, { name: string; shockable: boolean; description: string; ecgPattern: string }> = {
  fv: { name: "Fibrilação Ventricular", shockable: true, description: "Ritmo caótico sem complexo QRS organizado", ecgPattern: "∿∿∿∿∿∿∿" },
  tv: { name: "Taquicardia Ventricular sem pulso", shockable: true, description: "Complexos QRS largos e regulares, sem pulso", ecgPattern: "╱╲╱╲╱╲╱╲" },
  aesp: { name: "Atividade Elétrica Sem Pulso", shockable: false, description: "ECG organizado mas sem pulso palpável", ecgPattern: "╱╲_╱╲_╱╲_" },
  assistolia: { name: "Assistolia", shockable: false, description: "Linha reta no monitor. Confirmar em 2 derivações.", ecgPattern: "————————" },
};

const scenarios: Scenario[] = [
  {
    id: "caso1", title: "Caso 1: FV no Pós-Operatório",
    patientName: "Sr. Antônio", patientAge: "67 anos, 85kg",
    history: "Pós-operatório de revascularização miocárdica. Monitor alarma FV. Sem pulso carotídeo.",
    initialRhythm: "fv",
    reversibleCause: "Hipocalemia",
    reversibleCauseHint: "K⁺ pré-operatório: 2.8 mEq/L. Última reposição há 18h. Uso de furosemida IV no pós-op.",
    reversibleCauseCategory: "5H",
    correctSequence: ["compressoes", "desfibrilar", "epinefrina", "amiodarona", "identificar_causa"],
    explanation: "FV/TV sem pulso: protocolo de ritmo chocável. 1) RCP imediata 2) Desfibrilação 200J bifásico 3) Epinefrina 1mg IV a cada 3-5min 4) Amiodarona 300mg IV se FV refratária 5) Tratar 5H/5T — hipocalemia corrigir com KCl 20-40mEq IV.",
    reference: "AHA ACLS Guidelines 2020",
  },
  {
    id: "caso2", title: "Caso 2: Assistolia na Emergência",
    patientName: "Dona Francisca", patientAge: "78 anos, 60kg",
    history: "Trouxe EMS em PCR. Ritmo na chegada: assistolia confirmada em 2 derivações. Família informa uso de insulina NPH.",
    initialRhythm: "assistolia",
    reversibleCause: "Hipoglicemia",
    reversibleCauseHint: "Glicemia capilar: 22 mg/dL. Filha informa que mãe não jantou mas tomou insulina.",
    reversibleCauseCategory: "5H",
    correctSequence: ["compressoes", "acesso_venoso", "epinefrina", "identificar_causa"],
    explanation: "Assistolia: ritmo NÃO chocável. Desfibrilação está contraindicada. 1) RCP de alta qualidade 2) Epinefrina 1mg IV a cada 3-5min 3) Buscar causas reversíveis — Hipoglicemia: Glicose 50% 40mL IV em bolus. NÃO DESFIBRILAR assistolia.",
    reference: "AHA ACLS Guidelines 2020",
  },
  {
    id: "caso3", title: "Caso 3: AESP no Trauma",
    patientName: "Carlos Eduardo", patientAge: "32 anos, 75kg",
    history: "Vítima de acidente automobilístico. Tórax instável à direita. ECG com complexos estreitos mas sem pulso.",
    initialRhythm: "aesp",
    reversibleCause: "Pneumotórax hipertensivo (Tension pneumothorax)",
    reversibleCauseHint: "Desvio traqueal para esquerda. MV abolido à direita. Turgência jugular bilateral. Hipotensão refratária a volume.",
    reversibleCauseCategory: "5T",
    correctSequence: ["compressoes", "acesso_venoso", "epinefrina", "identificar_causa"],
    explanation: "AESP: ritmo NÃO chocável. Foco em RCP + identificar causa reversível. Pneumotórax hipertensivo (5T): descompressão com agulha no 2º EIC linha hemiclavicular, depois dreno de tórax. Volume + epinefrina enquanto trata a causa.",
    reference: "ATLS 10th Edition + AHA ACLS 2020",
  },
  {
    id: "caso4", title: "Caso 4: TV sem Pulso na UTI Coronariana",
    patientName: "Ricardo Mendes", patientAge: "55 anos, 90kg",
    history: "IAM anterior extenso há 2h. Estava estável quando subitamente perde consciência. Monitor: TV monomórfica sem pulso.",
    initialRhythm: "tv",
    reversibleCause: "Hidrogênio (Acidose)",
    reversibleCauseHint: "Gasometria pré-PCR: pH 7.12, pCO₂ 28, HCO₃ 12, Lactato 8.5. Acidose metabólica grave.",
    reversibleCauseCategory: "5H",
    correctSequence: ["compressoes", "desfibrilar", "epinefrina", "amiodarona", "identificar_causa"],
    explanation: "TV sem pulso = ritmo chocável (mesmo protocolo da FV). Desfibrilação precoce + RCP. Acidose grave (H⁺): Bicarbonato de sódio 8.4% 1mEq/kg IV se pH < 7.1. Tratar causa base do IAM: considerar cateterismo de resgate pós-ROSC.",
    reference: "AHA ACLS 2020 + ESC STEMI Guidelines 2023",
  },
];

const actionDescriptions: Record<ACLSAction, { label: string; icon: string; description: string }> = {
  compressoes: { label: "Iniciar RCP", icon: "💪", description: "Compressões torácicas 100-120/min, 5-6cm de profundidade" },
  desfibrilar: { label: "Desfibrilar", icon: "⚡", description: "Choque 200J bifásico (ou 360J monofásico)" },
  epinefrina: { label: "Epinefrina 1mg IV", icon: "💉", description: "A cada 3-5 minutos durante PCR" },
  amiodarona: { label: "Amiodarona 300mg IV", icon: "💊", description: "Para FV/TV refratária ao choque" },
  via_aerea: { label: "Via Aérea Avançada", icon: "🫁", description: "Intubação orotraqueal ou dispositivo supraglótico" },
  acesso_venoso: { label: "Acesso Venoso", icon: "🩸", description: "Acesso IV periférico calibroso ou IO" },
  identificar_causa: { label: "Identificar 5H/5T", icon: "🔍", description: "Buscar causa reversível da PCR" },
  checar_ritmo: { label: "Checar Ritmo", icon: "📊", description: "Pausa breve (<10s) para análise do ritmo" },
};

const diffConfig: Record<GameDifficulty, { timerSec: number; hintLevel: number }> = {
  academic: { timerSec: 150, hintLevel: 2 },
  clinical: { timerSec: 120, hintLevel: 1 },
  specialist: { timerSec: 90, hintLevel: 0 },
};

export default function CodigoAzulGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "scenario" | "playing" | "feedback" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [currentScenario, setCurrentScenario] = useState(0);
  const [cycleTimer, setCycleTimer] = useState(120);
  const [roscChance, setRoscChance] = useState(80);
  const [actionsPerformed, setActionsPerformed] = useState<ACLSAction[]>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [scenariosDone, setScenariosDone] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [causeFound, setCauseFound] = useState(false);
  const [rosc, setRosc] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([
    { id: "1", role: "Enfermeiro 1", task: null, icon: "👩‍⚕️" },
    { id: "2", role: "Enfermeiro 2", task: null, icon: "👨‍⚕️" },
    { id: "3", role: "Técnico", task: null, icon: "🧑‍⚕️" },
  ]);

  const timerRef = useRef<number | null>(null);
  const scenario = scenarios[currentScenario];
  const rhythm = rhythmInfo[scenario?.initialRhythm];
  const conf = diffConfig[difficulty];

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = window.setInterval(() => {
      setCycleTimer(prev => {
        if (prev <= 1) {
          setRoscChance(c => Math.max(0, c - 15));
          setCycle(cy => cy + 1);
          return conf.timerSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, conf.timerSec]);

  const performAction = (action: ACLSAction) => {
    if (!scenario) return;
    const isShockable = rhythm.shockable;

    let correct = false;
    let title = "";
    let explanation = "";
    let tip: string | undefined;

    // Validate action
    if (action === "desfibrilar" && !isShockable) {
      title = "❌ Choque em ritmo NÃO CHOCÁVEL!";
      explanation = `${rhythm.name} NÃO é chocável. Desfibrilação só em FV/TV sem pulso. Isso desperdiça tempo e atrasa RCP.`;
      setErrors(e => e + 1);
      setRoscChance(c => Math.max(0, c - 20));
    } else if (action === "desfibrilar" && isShockable && !actionsPerformed.includes("compressoes")) {
      title = "⚠️ Desfibrilou sem iniciar RCP!";
      explanation = "Embora o choque esteja indicado, RCP deve ser iniciada IMEDIATAMENTE enquanto prepara o desfibrilador.";
      tip = "Na prática: RCP começa enquanto cola as pás.";
      correct = true; // Partial credit
      setScore(s => s + 50);
    } else if (action === "compressoes") {
      correct = true;
      title = "✅ RCP Iniciada!";
      explanation = "Compressões de alta qualidade: 100-120/min, profundidade 5-6cm, retorno completo do tórax, mínimas interrupções.";
      setScore(s => s + 100);
    } else if (action === "desfibrilar" && isShockable) {
      correct = true;
      title = "⚡ Desfibrilação bem-sucedida!";
      explanation = "Choque de 200J bifásico aplicado. Retomar RCP imediatamente por 2 minutos antes de rechecar ritmo.";
      setScore(s => s + 150);
      setRoscChance(c => Math.min(100, c + 10));
    } else if (action === "epinefrina") {
      if (actionsPerformed.includes("compressoes")) {
        correct = true;
        title = "💉 Epinefrina administrada!";
        explanation = "Epinefrina 1mg IV/IO. Repetir a cada 3-5 minutos. Em ritmos não-chocáveis: dar o mais rápido possível. Em chocáveis: após 2º choque.";
        setScore(s => s + 100);
      } else {
        title = "⚠️ Epinefrina sem RCP!";
        explanation = "Priorize RCP antes de medicações. Compressões são mais importantes que drogas.";
        correct = false;
        setErrors(e => e + 1);
      }
    } else if (action === "amiodarona") {
      if (isShockable && actionsPerformed.includes("desfibrilar")) {
        correct = true;
        title = "💊 Amiodarona administrada!";
        explanation = "Amiodarona 300mg IV em bolus para FV/TV refratária. Pode repetir 150mg. Alternativa: Lidocaína 1-1.5mg/kg.";
        setScore(s => s + 100);
      } else if (!isShockable) {
        title = "❌ Amiodarona em ritmo não-chocável!";
        explanation = "Amiodarona é indicada apenas para FV/TV refratária ao choque. Em AESP/assistolia, não há indicação.";
        setErrors(e => e + 1);
        setRoscChance(c => Math.max(0, c - 10));
      } else {
        title = "⚠️ Amiodarona antes da desfibrilação!";
        explanation = "Desfibrilação é prioridade em ritmos chocáveis. Amiodarona só após choque sem sucesso.";
        correct = false;
        setErrors(e => e + 1);
      }
    } else if (action === "acesso_venoso") {
      correct = true;
      title = "🩸 Acesso venoso estabelecido!";
      explanation = "Acesso IV periférico calibroso (18G ou maior) ou intraósseo (IO) se IV difícil. Essencial para drogas.";
      setScore(s => s + 50);
    } else if (action === "via_aerea") {
      correct = true;
      title = "🫁 Via aérea avançada!";
      explanation = "IOT ou dispositivo supraglótico inserido. Após via aérea avançada: ventilações a cada 6 segundos (10/min) sem sincronizar com compressões.";
      setScore(s => s + 50);
    } else if (action === "identificar_causa") {
      correct = true;
      setCauseFound(true);
      title = `🔍 Causa identificada: ${scenario.reversibleCause}!`;
      explanation = `${scenario.reversibleCauseHint}\n\nCategoria: ${scenario.reversibleCauseCategory}`;
      tip = scenario.explanation;
      setScore(s => s + 200);
      setRoscChance(c => Math.min(100, c + 25));
    } else if (action === "checar_ritmo") {
      correct = true;
      title = "📊 Ritmo reavaliado";
      explanation = "Pausa breve (<10s) para análise do ritmo. Retomar RCP imediatamente após.";
      setScore(s => s + 25);
    }

    setActionsPerformed(prev => [...prev, action]);
    setFeedback({ isCorrect: correct, title, explanation, reference: scenario.reference, tip });
    setPhase("feedback");
  };

  const checkROSC = () => {
    if (roscChance >= 60 && actionsPerformed.length >= 3 && causeFound) {
      setRosc(true);
      setScenariosDone(s => s + 1);
      setScore(s => s + 300);

      const next = currentScenario + 1;
      if (next >= scenarios.length) {
        setPhase("result");
      } else {
        setFeedback({
          isCorrect: true,
          title: "🎉 ROSC Obtido!",
          explanation: `${scenario.patientName} apresentou retorno da circulação espontânea! Iniciar cuidados pós-PCR: hipotermia terapêutica, otimização hemodinâmica, investigar causa.`,
          reference: scenario.reference,
        });
      }
    } else {
      toast.error(
        roscChance < 60 ? "Chance de ROSC muito baixa. Continue o protocolo." :
        !causeFound ? "Identifique a causa reversível antes!" :
        "Continue as intervenções do ACLS."
      );
    }
  };

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Código Azul — Simulador ACLS"
        setting="Hospital Central — Equipe de Resposta Rápida"
        briefing="Você é o líder do código azul. Identifique o ritmo cardíaco, siga o protocolo ACLS, administre medicações nos intervalos corretos e encontre a causa reversível. Cada segundo conta."
        patientName="Equipe de Código"
        patientAge="4 cenários, múltiplos ritmos"
        patientHistory="FV pós-cirúrgica, Assistolia na emergência, AESP no trauma, TV no IAM. Cada caso tem uma causa reversível dos 5H e 5T."
        onStart={() => setPhase("difficulty")}
        icon={<Heart className="h-10 w-10 text-red-500" />}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-xl font-bold">Selecione a dificuldade</h2>
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <Button size="lg" onClick={() => { setCycleTimer(conf.timerSec); setPhase("scenario"); }}>
          Iniciar Código Azul
        </Button>
      </div>
    );
  }

  if (phase === "scenario") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
        <div className="rounded-full bg-red-500/10 p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-destructive">{scenario.title}</h2>
        <Card className="max-w-md w-full">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-lg font-bold text-red-600">
                {scenario.patientName[0]}
              </div>
              <div>
                <p className="font-bold">{scenario.patientName}</p>
                <p className="text-xs text-muted-foreground">{scenario.patientAge}</p>
              </div>
            </div>
            <p className="text-sm">{scenario.history}</p>
            <div className="bg-muted/50 rounded-lg p-3 border font-mono text-center">
              <p className="text-xs text-muted-foreground mb-1">Monitor Cardíaco</p>
              <p className="text-2xl tracking-widest text-red-500">{rhythm.ecgPattern}</p>
              <p className="text-sm font-semibold mt-1">{rhythm.name}</p>
              <Badge variant={rhythm.shockable ? "destructive" : "secondary"} className="mt-1">
                {rhythm.shockable ? "CHOCÁVEL" : "NÃO CHOCÁVEL"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Button size="lg" onClick={() => {
          setActionsPerformed([]);
          setCauseFound(false);
          setRosc(false);
          setCycleTimer(conf.timerSec);
          setCycle(1);
          setPhase("playing");
        }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Zap className="h-4 w-4" /> INICIAR PROTOCOLO
        </Button>
      </div>
    );
  }

  if (phase === "feedback") {
    return feedback ? (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={() => {
          setFeedback(null);
          if (rosc) {
            const next = currentScenario + 1;
            if (next >= scenarios.length) {
              setPhase("result");
            } else {
              setCurrentScenario(next);
              setPhase("scenario");
            }
          } else {
            setPhase("playing");
          }
        }}
      />
    ) : null;
  }

  if (phase === "result") {
    const maxScore = scenarios.length * 600;
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={errors <= 2 ? "Protocolo ACLS Exemplar!" : "Código Encerrado"}
        subtitle={scenariosDone === scenarios.length ? "ROSC obtido em todos os cenários!" : `${scenariosDone}/${scenarios.length} pacientes salvos.`}
        onRestart={() => {
          setPhase("narrative");
          setScore(0);
          setErrors(0);
          setCurrentScenario(0);
          setScenariosDone(0);
          setActionsPerformed([]);
          setCauseFound(false);
          setRosc(false);
          setCycle(1);
        }}
        details={[
          { label: "Cenários completados", value: `${scenariosDone}/${scenarios.length}` },
          { label: "Ciclos ACLS", value: String(cycle) },
          { label: "Erros de protocolo", value: String(errors) },
        ]}
      />
    );
  }

  // Playing
  const timerPercent = (cycleTimer / conf.timerSec) * 100;
  const timerColor = cycleTimer < 30 ? "text-red-500" : cycleTimer < 60 ? "text-yellow-500" : "text-foreground";

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={cycleTimer < 30 ? "destructive" : "outline"} className="gap-1 text-sm">
          <Clock className="h-3 w-3" /> <span className={timerColor}>{Math.floor(cycleTimer / 60)}:{String(cycleTimer % 60).padStart(2, "0")}</span>
        </Badge>
        <Badge variant="outline">Ciclo {cycle}</Badge>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">ROSC:</span>
          <Progress value={roscChance} className="w-20 h-2" />
          <span className="text-xs font-medium">{roscChance}%</span>
        </div>
        <Badge variant="secondary">{score} pts</Badge>
        <Badge variant="outline">Caso {currentScenario + 1}/{scenarios.length}</Badge>
      </div>

      <Progress value={timerPercent} className="h-2" />

      {/* Monitor */}
      <Card className="border-red-500/30 bg-black/5 dark:bg-black/20">
        <CardContent className="p-3 text-center">
          <p className="font-mono text-xl tracking-[0.3em] text-red-500">{rhythm.ecgPattern}</p>
          <p className="text-sm font-semibold">{rhythm.name}</p>
          <div className="flex gap-2 justify-center mt-1">
            <Badge variant={rhythm.shockable ? "destructive" : "secondary"}>{rhythm.shockable ? "CHOCÁVEL" : "NÃO CHOCÁVEL"}</Badge>
            {causeFound && <Badge className="bg-green-600 text-white">Causa: {scenario.reversibleCause}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Hint (academic) */}
      {conf.hintLevel >= 2 && !causeFound && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3 text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">💡 Dica: {scenario.reversibleCauseHint}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions grid */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(actionDescriptions) as [ACLSAction, typeof actionDescriptions[ACLSAction]][]).map(([action, info]) => {
          const performed = actionsPerformed.filter(a => a === action).length;
          const maxRepeats = action === "epinefrina" ? 5 : action === "compressoes" ? 99 : action === "checar_ritmo" ? 10 : 2;
          const disabled = performed >= maxRepeats;

          return (
            <Button
              key={action}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-start gap-1 text-left relative"
              onClick={() => performAction(action)}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{info.icon}</span>
                <span className="font-semibold text-sm">{info.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{info.description}</span>
              {performed > 0 && (
                <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1.5 py-0">{performed}x</Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* ROSC check */}
      <Button
        onClick={checkROSC}
        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
        size="lg"
        disabled={actionsPerformed.length < 3}
      >
        <ShieldCheck className="h-5 w-5" /> Verificar ROSC (Retorno da Circulação)
      </Button>

      {/* Team */}
      <div className="flex gap-2">
        {team.map(m => (
          <div key={m.id} className="flex-1 bg-muted/30 rounded-lg p-2 border text-center">
            <span className="text-lg">{m.icon}</span>
            <p className="text-[10px] font-medium">{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
