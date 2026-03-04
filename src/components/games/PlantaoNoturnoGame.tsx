import { useState, useEffect } from "react";
import { FileText, Monitor, Lock, BookOpen, Key, Clock, Package, Trophy, XCircle, Eye, Lightbulb, MapPin, Thermometer, Beaker, Stethoscope, Syringe, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface InventoryItem { id: string; name: string }
interface RoomObject {
  id: string; name: string; icon: React.ReactNode; position: { top: string; left?: string; right?: string };
  unlockedState?: string; content: string; hint?: string;
  action?: "password" | "code" | "read" | "examine";
  password?: string; codeLength?: number; correctCode?: string;
  inventoryGain?: InventoryItem;
  requiresItem?: string;
  isKey?: boolean;
  explanation?: string;
}

interface Scenario {
  id: string; title: string; description: string;
  patient: { name: string; age: number; symptoms: string; vitals: string };
  room: string;
  objects: RoomObject[];
  finalCode: string;
  antidote: string;
  timerSeconds: number;
  explanation: string;
  reference: string;
}

const scenarios: Scenario[] = [
  {
    id: "opioide", title: "Overdose de Opioides", description: "Paciente inconsciente com miose e depressão respiratória.",
    patient: { name: "Sr. Marcos", age: 32, symptoms: "Miose pontiforme, FR 6irpm, cianose, Glasgow 3", vitals: "FC 52 | PA 85/50 | SpO₂ 78% | FR 6" },
    room: "UTI — Ala Norte", timerSeconds: 600,
    antidote: "Naloxona",
    finalCode: "0420",
    explanation: "Naloxona é antagonista competitivo dos receptores Mu opioides. Reverte depressão respiratória em 1-2min IV. Meia-vida curta (30-90min) — risco de renarcotização. Dose: 0.04-0.4mg IV, titular até FR adequada.",
    reference: "Brunton LL. Goodman & Gilman, 13ª ed. Cap 20.",
    objects: [
      { id: "prontuario", name: "Prontuário", icon: <FileText className="h-8 w-8" />, position: { top: "30%", left: "10%" },
        action: "read", content: "Paciente com miose pontiforme, depressão respiratória e cianose. Suspeita de overdose de opioides. Marcas de agulha em braço esquerdo.",
        inventoryGain: { id: "pista-clinica", name: "Pista: Overdose opioide" }, isKey: false,
        explanation: "A tríade clássica da intoxicação opioide: miose, depressão respiratória e rebaixamento do nível de consciência." },
      { id: "livro", name: "Livro de Toxicologia", icon: <BookOpen className="h-8 w-8" />, position: { top: "15%", right: "15%" },
        action: "read", content: "O antídoto reverte a ligação aos receptores Mu em segundos. Meia-vida do fármaco X é de 4 horas. O frasco padrão tem 2000mg.",
        inventoryGain: { id: "pista-bioquimica", name: "Pista: Meia-vida 4h, 2000mg" }, isKey: false },
      { id: "computador", name: "Terminal Clínico", icon: <Monitor className="h-8 w-8" />, position: { top: "55%", left: "40%" },
        action: "password", password: "NALOXONA", content: "ACESSO CONCEDIDO. Código parcial do cofre: o valor da meia-vida (em horas) seguido dos dois primeiros dígitos da dose do frasco.",
        inventoryGain: { id: "code-hint", name: "Código parcial: 420" }, isKey: true,
        explanation: "Identificar o antídoto correto (Naloxona) é o primeiro passo no manejo da intoxicação opioide." },
      { id: "monitor", name: "Monitor de Sinais", icon: <Thermometer className="h-8 w-8" />, position: { top: "20%", left: "55%" },
        action: "examine", content: "SpO₂: 78% ↓↓ | FR: 6 irpm ↓↓ | FC: 52 bpm ↓ | PA: 85/50 ↓ | Pupilas: mióticas bilaterais. ALERTA: Necessidade imediata de suporte ventilatório!",
        isKey: false, explanation: "Hipoxemia grave (SpO₂ <90%) exige ventilação assistida ANTES do antídoto. ABC sempre primeiro." },
      { id: "cofre", name: "Cofre do Antídoto", icon: <Lock className="h-10 w-10 text-yellow-500" />, position: { top: "45%", right: "8%" },
        action: "code", codeLength: 4, correctCode: "0420", content: "", isKey: true },
    ],
  },
  {
    id: "anafilaxia", title: "Choque Anafilático", description: "Reação alérgica severa após administração de antibiótico.",
    patient: { name: "Dona Clara", age: 45, symptoms: "Edema facial, urticária generalizada, sibilos, hipotensão", vitals: "FC 130 | PA 70/40 | SpO₂ 88% | FR 28" },
    room: "Pronto-Socorro — Sala Vermelha", timerSeconds: 480,
    antidote: "ADRENALINA",
    finalCode: "1500",
    explanation: "Adrenalina (Epinefrina) IM 0.3-0.5mg na coxa anterolateral é o tratamento de primeira linha na anafilaxia. Atua em receptores alfa-1 (vasoconstrição), beta-1 (cronotropismo) e beta-2 (broncodilatação). NUNCA atrasar para dar anti-histamínico primeiro.",
    reference: "WAO Anaphylaxis Guidelines 2020.",
    objects: [
      { id: "prontuario2", name: "Ficha de Admissão", icon: <FileText className="h-8 w-8" />, position: { top: "25%", left: "8%" },
        action: "read", content: "Paciente recebeu Amoxicilina-Clavulanato IV há 15 minutos. Relata alergia a penicilina (não informado na admissão). Edema de glote em progressão.",
        inventoryGain: { id: "pista-alergia", name: "Pista: Alergia penicilina + anafilaxia" }, isKey: false,
        explanation: "Reação cruzada entre penicilinas ocorre em 1-2%. A anafilaxia é mediada por IgE e pode ser fatal em minutos." },
      { id: "desfibrilador", name: "Carrinho de Emergência", icon: <Syringe className="h-8 w-8" />, position: { top: "50%", left: "25%" },
        action: "examine", content: "Carrinho contém: Adrenalina 1mg/mL, Hidrocortisona 500mg, Difenidramina 50mg, Salbutamol spray. A dose IM de adrenalina para adulto é 0.3-0.5mg.",
        inventoryGain: { id: "pista-dose", name: "Dose: Adrenalina 0.5mg IM" }, isKey: false },
      { id: "computador2", name: "Sistema de Alergia", icon: <Monitor className="h-8 w-8" />, position: { top: "60%", left: "55%" },
        action: "password", password: "ADRENALINA", content: "Protocolo anafilaxia acessado. Código do kit de emergência: os 4 primeiros dígitos do telefone de emergência do hospital (ramal 1500).",
        inventoryGain: { id: "code-hint2", name: "Código: 1500" }, isKey: true,
        explanation: "Adrenalina é o ÚNICO tratamento de primeira linha na anafilaxia. Anti-histamínicos e corticoides são adjuvantes." },
      { id: "monitor2", name: "Monitor Multiparamétrico", icon: <Thermometer className="h-8 w-8" />, position: { top: "18%", right: "20%" },
        action: "examine", content: "PA em queda: 70/40 → 65/35 mmHg. FC 135bpm. SpO₂ 85% com O₂ a 10L/min. Estridor laríngeo audível. URGÊNCIA: edema de via aérea progressivo!",
        isKey: false },
      { id: "cofre2", name: "Kit de Emergência", icon: <Lock className="h-10 w-10 text-yellow-500" />, position: { top: "40%", right: "5%" },
        action: "code", codeLength: 4, correctCode: "1500", content: "", isKey: true },
    ],
  },
  {
    id: "cetoacidose", title: "Cetoacidose Diabética", description: "Paciente jovem com DM1 descompensado.",
    patient: { name: "Lucas", age: 19, symptoms: "Hálito cetônico, respiração de Kussmaul, desidratação severa, confusão", vitals: "FC 120 | PA 90/60 | SpO₂ 97% | FR 32 | Glicemia 520 mg/dL" },
    room: "Emergência — Leito 03", timerSeconds: 540,
    antidote: "INSULINA",
    finalCode: "7350",
    explanation: "Na CAD, a primeira medida é reposição volêmica com SF 0,9% (1-1.5L/h). Insulina regular IV em bomba só APÓS: K+ >3.3 mEq/L e hidratação inicial. Bicarbonato apenas se pH <6.9. Meta: redução de glicemia 50-70 mg/dL/h.",
    reference: "ADA — Hyperglycemic Crises in Diabetes. Diabetes Care 2024.",
    objects: [
      { id: "prontuario3", name: "Prontuário DM1", icon: <FileText className="h-8 w-8" />, position: { top: "28%", left: "12%" },
        action: "read", content: "DM1 desde os 12 anos. Abandonou insulina há 1 semana por falta de receita. pH 7.15, Bic 8 mEq/L, Glicemia 520, K+ 5.2. Gasometria: acidose metabólica com ânion gap elevado.",
        inventoryGain: { id: "pista-cad", name: "Pista: CAD — pH 7.15, K+ 5.2" }, isKey: false,
        explanation: "CAD: pH <7.3, Bic <18, Glicemia >250, cetonúria/cetonemia positiva. Ânion gap elevado confirma." },
      { id: "livro3", name: "Protocolo CAD", icon: <BookOpen className="h-8 w-8" />, position: { top: "15%", right: "12%" },
        action: "read", content: "Etapas do manejo: 1) SF 0,9% 1L/h. 2) Verificar K+ (>3.3 antes de insulina). 3) Insulina Regular IV 0.1U/kg/h. O pH normal (meta) é 7.35-7.45. Código: os 4 primeiros dígitos de 7.350.",
        inventoryGain: { id: "pista-ph", name: "Pista: pH meta = 7.350" }, isKey: false },
      { id: "bomba", name: "Bomba de Infusão", icon: <Syringe className="h-8 w-8" />, position: { top: "55%", left: "35%" },
        action: "password", password: "INSULINA", content: "Bomba ativada. Insulina Regular 0.1U/kg/h. O código do armário é baseado no pH-meta: 7350.",
        inventoryGain: { id: "code-hint3", name: "Código: 7350" }, isKey: true,
        explanation: "Insulina IV em bomba de infusão contínua permite titulação precisa. Meta: queda de 50-70 mg/dL/h." },
      { id: "gasometria", name: "Resultado Gasometria", icon: <Beaker className="h-8 w-8" />, position: { top: "20%", left: "60%" },
        action: "examine", content: "pH 7.15 | pCO₂ 20 | HCO₃ 8 | BE -18 | Lactato 2.8 | AG 22. Acidose metabólica com ânion gap elevado. Compensação respiratória adequada (Kussmaul).",
        isKey: false, explanation: "Respiração de Kussmaul é a compensação respiratória da acidose metabólica (hiperventilação para eliminar CO₂)." },
      { id: "cofre3", name: "Armário de Insulinas", icon: <Lock className="h-10 w-10 text-yellow-500" />, position: { top: "42%", right: "6%" },
        action: "code", codeLength: 4, correctCode: "7350", content: "", isKey: true },
    ],
  },
  {
    id: "digitálica", title: "Intoxicação Digitálica", description: "Idosa com arritmia após ajuste de dose.",
    patient: { name: "Dona Antônia", age: 82, symptoms: "Náuseas, visão amarelada, bradicardia, bloqueio AV", vitals: "FC 42 | PA 100/70 | ECG: BAV 2º grau Mobitz II" },
    room: "UTI Cardiológica", timerSeconds: 560,
    antidote: "DIGIBIND",
    finalCode: "2538",
    explanation: "Intoxicação digitálica: nível sérico >2 ng/mL. Anticorpo anti-digoxina (Digibind/DigiFab) é o antídoto específico. Tratar hipocalemia associada (K+ facilita toxicidade). Evitar cardioversão elétrica (risco de FV). Atropina para bradicardia sintomática.",
    reference: "Hauptman PJ et al. Circulation 2016.",
    objects: [
      { id: "prontuario4", name: "Prontuário Cardio", icon: <FileText className="h-8 w-8" />, position: { top: "25%", left: "10%" },
        action: "read", content: "IC crônica em uso de Digoxina 0.25mg/dia. Dose aumentada para 0.5mg há 4 dias por piora da IC. K+ 3.0 mEq/L (hipocalemia facilita toxicidade digitálica). Nível sérico Digoxina: 3.8 ng/mL (tóxico >2.0).",
        inventoryGain: { id: "pista-dig", name: "Pista: Digoxina 3.8 ng/mL + K+ 3.0" }, isKey: false,
        explanation: "Hipocalemia potencializa toxicidade digitálica porque K+ e digoxina competem pelo mesmo sítio na Na+/K+ ATPase." },
      { id: "ecg", name: "ECG 12 Derivações", icon: <Stethoscope className="h-8 w-8" />, position: { top: "50%", left: "30%" },
        action: "examine", content: "Ritmo sinusal com BAV 2º grau Mobitz II. Intervalos PR progressivamente longos com QRS largo. Cubeta digitálica presente. Extrassístoles ventriculares bigeminadas.",
        inventoryGain: { id: "pista-ecg", name: "Pista: BAV + cubeta digitálica" }, isKey: false },
      { id: "computador4", name: "Sistema Toxicológico", icon: <Monitor className="h-8 w-8" />, position: { top: "60%", left: "55%" },
        action: "password", password: "DIGIBIND", content: "Protocolo ativado. Dose de Digibind baseada no nível sérico. Código do dispensador: 2538 (primeiros 4 dígitos do código CID I49.2 + peso em kg).",
        inventoryGain: { id: "code-hint4", name: "Código: 2538" }, isKey: true,
        explanation: "DigiFab (fragmentos Fab anti-digoxina) liga-se à digoxina livre, formando complexo inativo excretado renalmente." },
      { id: "monitor4", name: "Monitor Cardíaco", icon: <Thermometer className="h-8 w-8" />, position: { top: "18%", right: "18%" },
        action: "examine", content: "FC 42 bpm — bradicardia severa. Episódio de TV não sustentada registrado há 30 min. ALERTA: não cardioverter (risco de fibrilação ventricular em intoxicação digitálica)!",
        isKey: false },
      { id: "cofre4", name: "Dispensador Antídoto", icon: <Lock className="h-10 w-10 text-yellow-500" />, position: { top: "40%", right: "6%" },
        action: "code", codeLength: 4, correctCode: "2538", content: "", isKey: true },
    ],
  },
];

const difficultyConfig: Record<GameDifficulty, { timeMult: number; hintCost: number; hintsAvailable: number }> = {
  academic: { timeMult: 1.3, hintCost: 0, hintsAvailable: 3 },
  clinical: { timeMult: 1.0, hintCost: 30, hintsAvailable: 2 },
  specialist: { timeMult: 0.7, hintCost: 60, hintsAvailable: 1 },
};

export default function PlantaoNoturnoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "scenario" | "playing" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [dialogUnlocked, setDialogUnlocked] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [gameResult, setGameResult] = useState<"escaped" | "timeout" | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [scenariosCompleted, setScenariosCompleted] = useState(0);

  const config = difficultyConfig[difficulty];
  const scenario = scenarios[scenarioIdx];

  // Timer
  useEffect(() => {
    if (phase !== "playing" || gameResult) return;
    if (timeLeft <= 0) { setGameResult("timeout"); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, gameResult]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const startScenario = (idx: number) => {
    setScenarioIdx(idx);
    const sc = scenarios[idx];
    setTimeLeft(Math.floor(sc.timerSeconds * config.timeMult));
    setInventory([]);
    setUnlocked(new Set());
    setScore(0);
    setErrors(0);
    setHintsUsed(0);
    setGameResult(null);
    setDialogUnlocked(false);
    setInputValue("");
    setPhase("playing");
  };

  const addInventory = (item: InventoryItem) => {
    if (!inventory.some(i => i.id === item.id)) setInventory(prev => [...prev, item]);
  };

  const handleObjectClick = (obj: RoomObject) => {
    if (obj.action === "read" || obj.action === "examine") {
      if (!unlocked.has(obj.id)) {
        setUnlocked(p => new Set(p).add(obj.id));
        if (obj.inventoryGain) addInventory(obj.inventoryGain);
        setScore(s => s + (obj.isKey ? 30 : 15));
      }
      if (obj.explanation) {
        setFeedback({ isCorrect: true, title: obj.name, explanation: obj.explanation, reference: scenario.reference });
      } else {
        setActiveDialog(obj.id);
        setDialogUnlocked(true);
      }
    } else {
      setActiveDialog(obj.id);
      setDialogUnlocked(unlocked.has(obj.id));
      setInputValue("");
    }
  };

  const handlePasswordSubmit = (obj: RoomObject) => {
    if (inputValue.toUpperCase().trim() === obj.password) {
      setUnlocked(p => new Set(p).add(obj.id));
      setDialogUnlocked(true);
      if (obj.inventoryGain) addInventory(obj.inventoryGain);
      setScore(s => s + 40);
      toast.success("Acesso concedido!");
      if (obj.explanation) {
        setActiveDialog(null);
        setFeedback({ isCorrect: true, title: "Desbloqueado!", explanation: obj.explanation, reference: scenario.reference });
      }
    } else {
      setErrors(e => e + 1);
      setTimeLeft(t => Math.max(0, t - 30));
      toast.error("Incorreto! -30 segundos");
      setInputValue("");
    }
  };

  const handleCodeSubmit = (obj: RoomObject) => {
    if (inputValue === obj.correctCode) {
      setGameResult("escaped");
      setScore(s => s + 50);
      setScenariosCompleted(c => c + 1);
      setTotalScore(t => t + score + 50);
      setFeedback({
        isCorrect: true,
        title: `Antídoto Administrado: ${scenario.antidote}!`,
        explanation: scenario.explanation,
        reference: scenario.reference,
      });
    } else {
      setErrors(e => e + 1);
      setTimeLeft(t => Math.max(0, t - 30));
      toast.error("Código inválido! -30 segundos");
      setInputValue("");
    }
  };

  const useHint = () => {
    if (hintsUsed >= config.hintsAvailable) return;
    setHintsUsed(h => h + 1);
    setTimeLeft(t => Math.max(0, t - config.hintCost));
    // Find next unlockable object
    const nextObj = scenario.objects.find(o => !unlocked.has(o.id) && o.action !== "code");
    if (nextObj) {
      toast.info(`Dica: Investigue "${nextObj.name}"`, { duration: 5000 });
    } else {
      toast.info("Dica: Tente combinar as pistas do inventário para o código final.");
    }
  };

  const activeObj = activeDialog ? scenario.objects.find(o => o.id === activeDialog) : null;
  const urgencyPct = Math.max(0, (timeLeft / (scenario.timerSeconds * config.timeMult)) * 100);

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="O Plantão Noturno — Escape Room Clínico"
        setting="Hospital — Múltiplos cenários de emergência"
        briefing="Você está no plantão noturno quando um paciente grave chega. Investigue pistas, desbloqueie sistemas e encontre o antídoto antes que o tempo acabe. Cada cenário é uma emergência diferente!"
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">
          Tempo: ×{config.timeMult} • {config.hintsAvailable} dicas{config.hintCost > 0 ? ` (custo: ${config.hintCost}s)` : " (grátis)"}
        </p>
        <Button onClick={() => setPhase("scenario")} size="lg">Escolher Emergência</Button>
      </div>
    );
  }

  if (phase === "scenario") {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center text-foreground">Selecione a Emergência</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenarios.map((sc, i) => (
            <button key={sc.id} onClick={() => startScenario(i)}
              className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-4 text-left transition-all hover:border-destructive/50 hover:bg-destructive/10 cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-bold text-foreground">{sc.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{sc.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{sc.room}</Badge>
                <Badge variant="secondary" className="text-[10px]">{Math.floor(sc.timerSeconds * config.timeMult / 60)}min</Badge>
              </div>
            </button>
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
        onContinue={() => {
          setFeedback(null);
          if (gameResult === "escaped") setPhase("result");
        }}
      />
    );
  }

  if (phase === "result" || gameResult === "timeout") {
    const maxScore = scenario.objects.length * 30 + 50;
    return (
      <GameStarsResult
        score={gameResult === "escaped" ? score : 0}
        maxScore={maxScore}
        errors={errors}
        title={gameResult === "escaped" ? "Paciente Salvo!" : "Tempo Esgotado!"}
        subtitle={gameResult === "escaped"
          ? `${scenario.antidote} administrado a tempo. ${scenario.patient.name} foi estabilizado.`
          : `O paciente não resistiu. O antídoto era: ${scenario.antidote}.`}
        onRestart={() => setPhase("narrative")}
      />
    );
  }

  // Main playing screen
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{scenario.room}</p>
          <p className="text-xs font-medium text-foreground">{scenario.patient.name}, {scenario.patient.age}a — {scenario.patient.symptoms}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Pontos: {score}</Badge>
          <div className={`flex items-center gap-1.5 font-mono text-lg font-bold px-3 py-1 rounded-full transition-colors ${timeLeft < 60 ? "bg-destructive/20 text-destructive animate-pulse" : "bg-muted text-foreground"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Vitals bar */}
      <div className="flex gap-2 flex-wrap text-xs">
        {scenario.patient.vitals.split(" | ").map((v, i) => (
          <Badge key={i} variant={v.includes("↓") ? "destructive" : "outline"} className="text-[10px]">{v}</Badge>
        ))}
      </div>

      {/* Urgency progress */}
      <Progress value={urgencyPct} className={`h-2 transition-all ${urgencyPct < 20 ? "[&>div]:bg-destructive" : urgencyPct < 50 ? "[&>div]:bg-yellow-500" : ""}`} />

      {/* Room */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-card border rounded-xl overflow-hidden"
        style={{ background: `radial-gradient(circle at 50% 40%, hsl(var(--muted)) 0%, hsl(var(--background)) 70%)` }}
      >
        <p className="absolute top-3 left-4 text-muted-foreground text-xs uppercase tracking-widest">{scenario.room}</p>

        {scenario.objects.map(obj => (
          <button key={obj.id} onClick={() => handleObjectClick(obj)}
            className="absolute flex flex-col items-center gap-1 group cursor-pointer"
            style={{ top: obj.position.top, left: obj.position.left, right: obj.position.right }}
          >
            <div className={`p-3 rounded-lg transition-all group-hover:scale-110 group-hover:shadow-lg ${
              unlocked.has(obj.id) ? "bg-green-500/10 shadow-green-500/20 ring-1 ring-green-500/30" : "bg-muted hover:bg-accent"
            }`}>
              <span className={unlocked.has(obj.id) ? "text-green-500" : "text-muted-foreground"}>
                {obj.icon}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{obj.name}</span>
          </button>
        ))}

        {/* Hint button */}
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <Lightbulb className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Clique nos objetos para investigar</span>
        </div>
        <div className="absolute bottom-3 right-4">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={useHint} disabled={hintsUsed >= config.hintsAvailable}>
            <Lightbulb className="h-3 w-3" /> Dica ({config.hintsAvailable - hintsUsed})
          </Button>
        </div>
      </div>

      {/* Inventory */}
      <div className="min-h-[56px] bg-muted/30 border rounded-lg flex items-center px-4 gap-3 overflow-x-auto py-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0">Inventário:</span>
        {inventory.length === 0 && <span className="text-muted-foreground/50 text-xs">Vazio</span>}
        {inventory.map(item => (
          <Badge key={item.id} variant="secondary" className="shrink-0 text-xs">{item.name}</Badge>
        ))}
      </div>

      {/* Object Dialog */}
      <Dialog open={!!activeDialog} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {activeObj && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{activeObj.icon && <span className="scale-75">{activeObj.icon}</span>} {activeObj.name}</DialogTitle>
              </DialogHeader>
              {activeObj.action === "code" ? (
                <div className="space-y-3">
                  <DialogDescription>Introduza o código de {activeObj.codeLength} dígitos.</DialogDescription>
                  <Input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value.replace(/\D/g, "").slice(0, activeObj.codeLength || 4))}
                    placeholder="0000"
                    maxLength={activeObj.codeLength || 4}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    onKeyDown={e => e.key === "Enter" && inputValue.length === (activeObj.codeLength || 4) && handleCodeSubmit(activeObj)}
                  />
                  <Button onClick={() => handleCodeSubmit(activeObj)} disabled={inputValue.length !== (activeObj.codeLength || 4)} className="w-full">Abrir</Button>
                </div>
              ) : activeObj.action === "password" && !dialogUnlocked ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{activeObj.id.includes("computador") ? "O sistema pede uma senha." : "Qual é o antídoto/fármaco necessário?"}</p>
                  <Input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Digite a resposta..."
                    onKeyDown={e => e.key === "Enter" && handlePasswordSubmit(activeObj)}
                  />
                  <Button onClick={() => handlePasswordSubmit(activeObj)} className="w-full">Desbloquear</Button>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border">
                  <p>{activeObj.content}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveDialog(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
