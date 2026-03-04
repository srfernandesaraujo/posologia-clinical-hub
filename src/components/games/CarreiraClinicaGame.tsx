import { useState, useCallback } from "react";
import { Building, GraduationCap, Stethoscope, Wallet, Gavel, Dice1, Monitor, FlaskConical, Megaphone, Hospital, Syringe, Heart, DollarSign, AlertTriangle, Coffee, ArrowRight, Trophy, XCircle, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface BoardSpace {
  id: number; name: string;
  type: "go" | "property" | "chest" | "tax" | "jail" | "free" | "go-to-jail" | "quiz";
  cost?: number; rent?: number; color?: string; specialty?: string;
}

interface QuizEvent {
  question: string; options: string[]; correctIndex: number; reward: number; penalty: number; explanation: string;
}

interface SpecCard {
  id: string; name: string; multiplier: number; description: string;
}

const board: BoardSpace[] = [
  { id: 0, name: "PARTIDA", type: "go" },
  { id: 1, name: "Curso de Farmacologia", type: "property", cost: 60, rent: 10, color: "bg-blue-500", specialty: "farma" },
  { id: 2, name: "Caso Clínico!", type: "quiz" },
  { id: 3, name: "Especialização Anamnese", type: "property", cost: 100, rent: 15, color: "bg-blue-500", specialty: "clinica" },
  { id: 4, name: "IMPOSTO DE RENDA", type: "tax" },
  { id: 5, name: "Software Prontuário", type: "property", cost: 150, rent: 25, color: "bg-green-500", specialty: "tech" },
  { id: 6, name: "Laboratório de Testes", type: "property", cost: 180, rent: 30, color: "bg-green-500", specialty: "lab" },
  { id: 7, name: "CONSELHO DE ÉTICA", type: "jail" },
  { id: 8, name: "Equip. Diagnóstico", type: "property", cost: 220, rent: 40, color: "bg-purple-500", specialty: "diagnostico" },
  { id: 9, name: "Marketing Médico", type: "property", cost: 240, rent: 45, color: "bg-purple-500", specialty: "gestao" },
  { id: 10, name: "RECESSO", type: "free" },
  { id: 11, name: "Clínica Reabilitação", type: "property", cost: 300, rent: 60, color: "bg-purple-500", specialty: "reab" },
  { id: 12, name: "Centro de Infusão", type: "property", cost: 350, rent: 80, color: "bg-rose-500", specialty: "farma" },
  { id: 13, name: "Caso Clínico!", type: "quiz" },
  { id: 14, name: "Hospital Particular", type: "property", cost: 400, rent: 100, color: "bg-rose-500", specialty: "hospital" },
  { id: 15, name: "VÁ PARA O CONSELHO", type: "go-to-jail" },
];

const quizEvents: QuizEvent[] = [
  { question: "Paciente com ICC classe III. Qual diurético é poupador de potássio?", options: ["Furosemida", "Espironolactona", "HCTZ", "Manitol"], correctIndex: 1, reward: 150, penalty: -80, explanation: "Espironolactona é antagonista da aldosterona e poupador de K+. Reduz mortalidade na ICC (RALES trial)." },
  { question: "Qual é o principal risco de associar IECA + BRA?", options: ["Hipocalemia", "Hipotensão e hipercalemia", "Taquicardia", "Hepatotoxicidade"], correctIndex: 1, reward: 120, penalty: -60, explanation: "Duplo bloqueio do SRAA causa hipotensão e hipercalemia sem benefício adicional (ONTARGET)." },
  { question: "A Varfarina tem sua ação revertida por qual vitamina?", options: ["Vitamina C", "Vitamina B12", "Vitamina K", "Vitamina D"], correctIndex: 2, reward: 100, penalty: -50, explanation: "Vitamina K é cofator dos fatores II, VII, IX, X. Varfarina inibe a vitamina K epóxido redutase." },
  { question: "Qual antibiótico causa 'Red Man Syndrome'?", options: ["Amoxicilina", "Vancomicina", "Ciprofloxacino", "Metronidazol"], correctIndex: 1, reward: 130, penalty: -70, explanation: "Vancomicina causa Red Man por liberação direta de histamina (não IgE). Prevenção: infundir lentamente (>1h)." },
  { question: "Em gestante com epilepsia, qual anticonvulsivante tem menor teratogenicidade?", options: ["Valproato", "Fenobarbital", "Lamotrigina", "Fenitoína"], correctIndex: 2, reward: 140, penalty: -60, explanation: "Lamotrigina é o anticonvulsivante mais seguro na gestação. Valproato é categoria X (DTN em 10%)." },
  { question: "Qual classe de antidepressivos inibe a recaptação de serotonina E noradrenalina?", options: ["ISRS", "IRSN (Duloxetina)", "IMAO", "Tricíclicos"], correctIndex: 1, reward: 110, penalty: -50, explanation: "IRSN (Venlafaxina, Duloxetina) são duais: inibem recaptação de 5-HT e NA. Úteis em dor neuropática." },
];

const chestCards = [
  { text: "Processo ganho por boa documentação!", amount: 100 },
  { text: "Bônus por publicação científica!", amount: 120 },
  { text: "Reembolso de conferência!", amount: 80 },
  { text: "Multa por prescrição ilegível!", amount: -80 },
  { text: "Reparação de equipamento!", amount: -100 },
  { text: "Prêmio de qualidade hospitalar!", amount: 150 },
  { text: "Paciente indicou 5 novos pacientes!", amount: 130 },
  { text: "Glosa do convênio!", amount: -120 },
];

const specCards: SpecCard[] = [
  { id: "farma", name: "Farmacologia Clínica", multiplier: 1.5, description: "×1.5 renda em propriedades 'farma'" },
  { id: "clinica", name: "Clínica Médica", multiplier: 1.5, description: "×1.5 renda em propriedades 'clínica'" },
  { id: "gestao", name: "Gestão em Saúde", multiplier: 2.0, description: "×2.0 renda em propriedades 'gestão'" },
];

const difficultyConfig: Record<GameDifficulty, { startBalance: number; rounds: number; aiOpponent: boolean }> = {
  academic: { startBalance: 2000, rounds: 8, aiOpponent: false },
  clinical: { startBalance: 1500, rounds: 10, aiOpponent: true },
  specialist: { startBalance: 1200, rounds: 12, aiOpponent: true },
};

function getBoardPosition(id: number): { row: number; col: number } {
  if (id <= 4) return { row: 4, col: 4 - id };
  if (id <= 8) return { row: 4 - (id - 4), col: 0 };
  if (id <= 12) return { row: 0, col: id - 8 };
  return { row: id - 12, col: 4 };
}

function SpaceCell({ space, isHere, isAI, owned }: { space: BoardSpace; isHere: boolean; isAI: boolean; owned: boolean }) {
  return (
    <div className={`relative border border-border rounded-md p-1 h-full flex flex-col items-center justify-center text-center gap-0.5 transition-all ${isHere ? "ring-2 ring-primary shadow-lg bg-primary/10" : isAI ? "ring-1 ring-destructive/50" : "bg-card"}`}>
      {space.color && <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-md ${space.color}`} />}
      {isHere && <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />}
      {isAI && !isHere && <Brain className="h-3 w-3 text-destructive shrink-0" />}
      <span className="text-[9px] sm:text-[10px] font-semibold leading-tight line-clamp-2">{space.name}</span>
      {space.cost && <span className="text-[8px] text-muted-foreground">${space.cost}</span>}
      {owned && <Badge variant="secondary" className="text-[7px] px-1 py-0">Seu</Badge>}
    </div>
  );
}

export default function CarreiraClinicaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "playing" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [position, setPosition] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [balance, setBalance] = useState(2000);
  const [aiBalance, setAiBalance] = useState(1500);
  const [owned, setOwned] = useState<Set<number>>(new Set());
  const [aiOwned, setAiOwned] = useState<Set<number>>(new Set());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [lastDice, setLastDice] = useState<number | null>(null);
  const [buyDialog, setBuyDialog] = useState<BoardSpace | null>(null);
  const [quizDialog, setQuizDialog] = useState<QuizEvent | null>(null);
  const [jailTurns, setJailTurns] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [round, setRound] = useState(1);
  const [specialization, setSpecialization] = useState<SpecCard | null>(null);
  const [showSpecPick, setShowSpecPick] = useState(false);
  const [balanceHistory, setBalanceHistory] = useState<{ round: number; player: number; ai: number }[]>([]);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string } | null>(null);
  const [score, setScore] = useState(0);

  const config = difficultyConfig[difficulty];

  const log = (msg: string) => setGameLog(l => [msg, ...l].slice(0, 25));

  const startGame = () => {
    setBalance(config.startBalance);
    setAiBalance(config.startBalance);
    setPosition(0);
    setAiPos(0);
    setOwned(new Set());
    setAiOwned(new Set());
    setGameLog(["Jogo iniciado!"]);
    setRound(1);
    setSpecialization(null);
    setBalanceHistory([{ round: 0, player: config.startBalance, ai: config.startBalance }]);
    setScore(0);
    setLastDice(null);
    setJailTurns(0);
    setPhase("playing");
    // Offer specialization pick on round 3
  };

  const aiTurn = useCallback(() => {
    if (!config.aiOpponent) return;
    const dice = Math.floor(Math.random() * 6) + 1;
    const newPos = (aiPos + dice) % 16;
    setAiPos(newPos);
    const space = board[newPos];
    log(`🤖 IA: Dado ${dice} → ${space.name}`);

    if (space.type === "property" && !owned.has(space.id) && !aiOwned.has(space.id) && space.cost && aiBalance >= space.cost) {
      if (Math.random() > 0.3) {
        setAiBalance(b => b - space.cost!);
        setAiOwned(o => new Set(o).add(space.id));
        log(`🤖 IA comprou ${space.name}`);
      }
    } else if (space.type === "property" && owned.has(space.id) && space.rent) {
      setAiBalance(b => b - space.rent!);
      setBalance(b => b + space.rent!);
      log(`🤖 IA pagou aluguel $${space.rent} a você`);
    } else if (space.type === "go") {
      setAiBalance(b => b + 200);
    }
  }, [aiPos, aiBalance, owned, aiOwned, config.aiOpponent]);

  const rollDice = useCallback(() => {
    if (rolling) return;

    if (jailTurns > 0) {
      setJailTurns(0);
      log("Saiu do Conselho de Ética.");
      return;
    }

    setRolling(true);
    const dice = Math.floor(Math.random() * 6) + 1;
    setLastDice(dice);

    setTimeout(() => {
      const newPos = (position + dice) % 16;
      const passedGo = newPos < position;
      let newBalance = balance;

      if (passedGo && newPos !== 0) {
        newBalance += 200;
        log("Passou pela PARTIDA: +$200");
        setRound(r => {
          const nr = r + 1;
          if (nr === 3 && !specialization) setShowSpecPick(true);
          return nr;
        });
      }

      setPosition(newPos);
      const space = board[newPos];
      log(`🎲 ${dice} → ${space.name}`);

      if (space.type === "go") {
        newBalance += 200;
        log("PARTIDA: +$200");
      } else if (space.type === "property") {
        if (aiOwned.has(space.id) && space.rent) {
          const rent = space.rent;
          newBalance -= rent;
          setAiBalance(b => b + rent);
          log(`Pagou aluguel $${rent} à IA`);
        } else if (owned.has(space.id)) {
          const specBonus = specialization && space.specialty === specialization.id ? specialization.multiplier : 1;
          const income = Math.floor((space.rent || 0) * specBonus);
          if (income > 0) {
            newBalance += income;
            log(`Renda de ${space.name}: +$${income}${specBonus > 1 ? " (bônus spec!)" : ""}`);
          }
        } else {
          setBuyDialog(space);
        }
      } else if (space.type === "quiz") {
        const quiz = quizEvents[Math.floor(Math.random() * quizEvents.length)];
        setQuizDialog(quiz);
      } else if (space.type === "chest") {
        const card = chestCards[Math.floor(Math.random() * chestCards.length)];
        newBalance += card.amount;
        log(`Cofre: ${card.text} ${card.amount > 0 ? "+" : ""}$${card.amount}`);
        toast(card.text, { description: `${card.amount > 0 ? "+" : ""}$${card.amount}` });
      } else if (space.type === "tax") {
        const tax = space.id === 4 ? 100 : 150;
        newBalance -= tax;
        log(`${space.name}: -$${tax}`);
      } else if (space.type === "go-to-jail") {
        setPosition(7);
        setJailTurns(1);
        log("Enviado ao Conselho de Ética! Perde 1 turno.");
      }

      setBalance(newBalance);
      setBalanceHistory(h => [...h, { round, player: newBalance, ai: aiBalance }]);

      // AI turn
      if (config.aiOpponent) setTimeout(aiTurn, 500);

      // Check end
      if (round >= config.rounds) {
        setScore(Math.max(0, newBalance));
        setTimeout(() => setPhase("result"), 800);
      }

      setRolling(false);
    }, 600);
  }, [position, balance, owned, aiOwned, jailTurns, rolling, round, config, specialization, aiTurn, aiBalance]);

  const handleBuy = () => {
    if (!buyDialog || !buyDialog.cost || balance < buyDialog.cost) { setBuyDialog(null); return; }
    setBalance(b => b - buyDialog.cost!);
    setOwned(o => new Set(o).add(buyDialog.id));
    log(`Comprou ${buyDialog.name} por $${buyDialog.cost}`);
    setBuyDialog(null);
  };

  const handleQuizAnswer = (idx: number) => {
    if (!quizDialog) return;
    const correct = idx === quizDialog.correctIndex;
    const amount = correct ? quizDialog.reward : quizDialog.penalty;
    setBalance(b => b + amount);
    setScore(s => s + (correct ? 30 : 0));
    setFeedback({
      isCorrect: correct,
      title: correct ? `Correto! +$${quizDialog.reward}` : `Errado! $${quizDialog.penalty}`,
      explanation: quizDialog.explanation,
    });
    setQuizDialog(null);
  };

  const grid: (BoardSpace | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  board.forEach(space => {
    const { row, col } = getBoardPosition(space.id);
    grid[row][col] = space;
  });

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Carreira Clínica — Banco Imobiliário Médico"
        setting="Sistema de Saúde — Sua jornada profissional"
        briefing="Construa sua carreira clínica adquirindo consultórios, laboratórios e hospitais. Responda casos clínicos para bônus. Escolha uma especialização para multiplicar rendas. Compita contra a IA!"
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">
          ${config.startBalance} inicial • {config.rounds} rodadas • {config.aiOpponent ? "Com" : "Sem"} oponente IA
        </p>
        <Button onClick={startGame} size="lg">Iniciar Carreira</Button>
      </div>
    );
  }

  if (feedback) {
    return (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        onContinue={() => setFeedback(null)}
      />
    );
  }

  if (phase === "result") {
    const won = balance > aiBalance || !config.aiOpponent;
    return (
      <GameStarsResult
        score={Math.max(0, balance)}
        maxScore={config.startBalance * 3}
        errors={0}
        title={won ? "Carreira de Sucesso!" : "A IA venceu!"}
        subtitle={`Patrimônio final: $${balance}${config.aiOpponent ? ` vs IA: $${aiBalance}` : ""}. ${owned.size} propriedades adquiridas em ${round} rodadas.`}
        onRestart={() => setPhase("narrative")}
        details={[
          { label: "Propriedades", value: `${owned.size}` },
          { label: "Rodadas", value: `${round}/${config.rounds}` },
          ...(specialization ? [{ label: "Especialização", value: specialization.name }] : []),
        ]}
      />
    );
  }

  const isGameOver = balance < 0;

  return (
    <div className="space-y-4">
      {isGameOver && (
        <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <h2 className="text-lg font-bold text-destructive mb-1">Falência!</h2>
          <p className="text-sm text-muted-foreground">Seu consultório faliu.</p>
          <Button className="mt-2" size="sm" onClick={() => setPhase("result")}>Ver Resultado</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Board */}
        <div className="grid grid-cols-5 grid-rows-5 gap-1 aspect-square max-w-md mx-auto w-full">
          {grid.map((row, r) =>
            row.map((space, c) => (
              <div key={`${r}-${c}`}>
                {space ? (
                  <SpaceCell space={space} isHere={position === space.id} isAI={config.aiOpponent && aiPos === space.id} owned={owned.has(space.id)} />
                ) : <div />}
              </div>
            ))
          )}
        </div>

        {/* Control Panel */}
        <div className="space-y-3">
          <Card>
            <CardContent className="py-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Seu Saldo</span>
                <span className={`text-lg font-bold font-mono ${balance < 100 ? "text-destructive" : "text-green-500"}`}>${balance}</span>
              </div>
              {config.aiOpponent && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">🤖 IA</span>
                  <span className="text-sm font-mono text-muted-foreground">${aiBalance}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Rodada {round}/{config.rounds}</span>
                <span>Dado: {lastDice ?? "—"}</span>
              </div>
              {specialization && (
                <Badge variant="secondary" className="text-xs w-full justify-center">
                  <Sparkles className="h-3 w-3 mr-1" /> {specialization.name}
                </Badge>
              )}
              <Button onClick={rollDice} disabled={rolling || isGameOver} className="w-full gap-2" size="lg">
                {jailTurns > 0 ? "Sair do Conselho" : "🎲 Lançar Dados"}
              </Button>
            </CardContent>
          </Card>

          {/* Patrimony chart */}
          {balanceHistory.length > 2 && (
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs text-muted-foreground">Patrimônio</CardTitle></CardHeader>
              <CardContent className="py-1 px-2 pb-2">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={balanceHistory}>
                    <Line type="monotone" dataKey="player" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    {config.aiOpponent && <Line type="monotone" dataKey="ai" stroke="hsl(var(--destructive))" strokeWidth={1} dot={false} strokeDasharray="3 3" />}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {owned.size > 0 && (
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs text-muted-foreground">Bens ({owned.size})</CardTitle></CardHeader>
              <CardContent className="py-1 px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {[...owned].map(id => {
                    const s = board[id];
                    return <Badge key={id} variant="secondary" className="text-[10px]">{s.name}</Badge>;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-2 px-3"><CardTitle className="text-xs text-muted-foreground">Log</CardTitle></CardHeader>
            <CardContent className="py-1 px-3 pb-2">
              <ScrollArea className="h-24">
                <div className="space-y-0.5">
                  {gameLog.map((msg, i) => (
                    <p key={i} className={`text-[10px] ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{msg}</p>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={!!buyDialog} onOpenChange={o => !o && setBuyDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          {buyDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{buyDialog.name}</DialogTitle>
                <DialogDescription>Adquirir por ${buyDialog.cost}? Renda: ${buyDialog.rent}/visita</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setBuyDialog(null)}>Ignorar</Button>
                <Button onClick={handleBuy} disabled={balance < (buyDialog.cost || 0)}>Comprar (${buyDialog.cost})</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={!!quizDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Caso Clínico</DialogTitle>
          </DialogHeader>
          {quizDialog && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{quizDialog.question}</p>
              <div className="space-y-2">
                {quizDialog.options.map((opt, i) => (
                  <Button key={i} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => handleQuizAnswer(i)}>
                    {String.fromCharCode(65 + i)}) {opt}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Correto: +${quizDialog.reward} | Errado: ${quizDialog.penalty}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Specialization Pick */}
      <Dialog open={showSpecPick} onOpenChange={setShowSpecPick}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Escolha sua Especialização</DialogTitle>
            <DialogDescription>Multiplica a renda de propriedades da área escolhida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {specCards.map(sc => (
              <Button key={sc.id} variant="outline" className="w-full justify-between text-xs" onClick={() => { setSpecialization(sc); setShowSpecPick(false); log(`Especializou-se em ${sc.name}!`); toast.success(`Especialização: ${sc.name}`); }}>
                <span>{sc.name}</span>
                <Badge variant="secondary" className="text-[10px]">{sc.description}</Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
