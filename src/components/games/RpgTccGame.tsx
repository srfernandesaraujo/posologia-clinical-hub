import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Swords, Shield, Trophy, RotateCcw, Sparkles, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

interface Battle {
  id: number;
  monsterName: string;
  monsterDescription: string;
  options: string[];
  correctOptionIndex: number;
}

const battles: Battle[] = [
  {
    id: 1,
    monsterName: "O Fantasma da Leitura Mental",
    monsterDescription:
      "Um amigo leu a tua mensagem, mas não respondeu há horas. O Fantasma sussurra: 'Ele está zangado contigo. De certeza que disseste algo de errado e agora ele não quer ser teu amigo.'",
    options: [
      "Vou enviar-lhe 10 mensagens a perguntar o que fiz de errado e pedir desculpa.",
      "Ele deve estar apenas ocupado com o trabalho ou distraído, e responderá quando puder. Não tem necessariamente a ver comigo.",
      "Vou ignorá-lo também e nunca mais lhe envio mensagens para não ser rejeitado.",
    ],
    correctOptionIndex: 1,
  },
  {
    id: 2,
    monsterName: "O Titã da Catastrofização",
    monsterDescription:
      "Sentes uma ligeira dor de cabeça e o coração a bater mais rápido. O Titã ruge: 'Isto é um sinal de uma doença grave e incurável! O teu fim está próximo!'",
    options: [
      "É apenas uma resposta física passageira, provavelmente porque estou cansado ou bebi pouca água hoje. Vou focar-me na minha respiração.",
      "Tens razão, vou passar as próximas três horas a pesquisar sintomas graves na internet.",
      "Vou cancelar todos os meus planos para o resto da semana porque estou doente.",
    ],
    correctOptionIndex: 0,
  },
  {
    id: 3,
    monsterName: "O Gigante da Generalização Excessiva",
    monsterDescription:
      "Fizeste um pequeno erro numa apresentação de trabalho. O Gigante esmaga o chão e grita: 'Falhaste nisto, logo vais falhar em tudo na vida! És um incompetente!'",
    options: [
      "Realmente, eu nunca consigo fazer nada bem. Devia despedir-me.",
      "Vou evitar fazer apresentações no futuro para não passar vergonhas.",
      "Foi apenas um erro pontual numa apresentação. Isso não apaga todas as minhas qualidades profissionais anteriores, nem define o meu valor.",
    ],
    correctOptionIndex: 2,
  },
  {
    id: 4,
    monsterName: "O Ditador do 'Tem Que'",
    monsterDescription:
      "Estás a descansar no sofá a um domingo à tarde. O Ditador aponta-te o dedo: 'Não deverias estar a relaxar! Tens de ser produtivo a 100% ou és um inútil!'",
    options: [
      "Descansar é uma necessidade humana essencial para a saúde física e mental. Tenho o direito de relaxar sem me sentir culpado.",
      "Vou levantar-me agora mesmo e limpar a casa toda, mesmo estando exausto.",
      "Sou mesmo preguiçoso, não mereço estar a descansar neste momento.",
    ],
    correctOptionIndex: 0,
  },
  {
    id: 5,
    monsterName: "O Cavaleiro do Tudo-ou-Nada",
    monsterDescription:
      "Comeste uma fatia de bolo num dia em que tinhas planeado comer apenas coisas saudáveis. O Cavaleiro ataca: 'Quebraste a dieta! Agora está tudo estragado, és um fraco!'",
    options: [
      "Vou comer o bolo inteiro e amanhã recomeço tudo do zero, já que hoje o dia está arruinado.",
      "Comer um doce não anula todo o meu progresso nem o meu esforço. Posso desfrutar deste momento e voltar a fazer escolhas saudáveis na próxima refeição.",
      "Sou incapaz de manter a disciplina, nunca vou conseguir atingir os meus objetivos.",
    ],
    correctOptionIndex: 1,
  },
  {
    id: 6,
    monsterName: "O Espelho da Personalização",
    monsterDescription:
      "A tua equipa não conseguiu atingir a meta do mês. O Espelho reflete a tua imagem e diz: 'A culpa é inteiramente tua. Se fosses melhor, toda a equipa teria tido sucesso.'",
    options: [
      "Vou assumir a culpa perante o chefe e dizer que o fracasso foi apenas responsabilidade minha.",
      "O resultado de uma equipa depende do trabalho de várias pessoas e de fatores externos. Posso assumir a minha parte da responsabilidade, mas não o fardo inteiro.",
      "Não vou dormir hoje a pensar em tudo o que devia ter feito diferente.",
    ],
    correctOptionIndex: 1,
  },
  {
    id: 7,
    monsterName: "O Morcego do Filtro Negativo",
    monsterDescription:
      "Tiveste um dia excelente, mas ao final da tarde deixaste cair o telemóvel (sem partir). O Morcego cobre o sol e diz: 'O teu dia foi um desastre completo. Tens uma sorte horrível.'",
    options: [
      "Tive várias coisas boas hoje: falei com um amigo, o almoço foi ótimo e terminei uma tarefa. Um pequeno percalço não apaga as coisas boas que aconteceram.",
      "É verdade, a minha vida é uma sucessão de azares. Nada me corre bem.",
      "Vou enfiar-me na cama, o universo está contra mim hoje.",
    ],
    correctOptionIndex: 0,
  },
];

type GameState = "playing" | "victory" | "gameover";

function getMonsterTheme(name: string) {
  // Anxiety-related monsters → purple tint
  const anxietyMonsters = ["Fantasma", "Titã", "Catastrofização", "Leitura Mental", "Morcego", "Filtro Negativo", "Cavaleiro", "Tudo-ou-Nada", "Generalização"];
  // Guilt/Demand monsters → blue-gray tint
  const guiltMonsters = ["Ditador", "Espelho", "Personalização", "Tem Que"];

  const isAnxiety = anxietyMonsters.some((k) => name.includes(k));
  const isGuilt = guiltMonsters.some((k) => name.includes(k));

  if (isGuilt) return { bg: "bg-slate-100 border-slate-300", label: "Culpa / Cobrança", labelColor: "text-slate-600" };
  if (isAnxiety) return { bg: "bg-purple-50 border-purple-200", label: "Ansiedade", labelColor: "text-purple-600" };
  return { bg: "bg-card border-border", label: "", labelColor: "" };
}

export default function RpgTccGame() {
  const [currentBattle, setCurrentBattle] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [monsterHp, setMonsterHp] = useState(100);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const xpForNextLevel = level * 100;
  const xpProgress = (xp / xpForNextLevel) * 100;

  const handleOptionClick = useCallback(
    (index: number) => {
      if (isTransitioning || gameState !== "playing") return;

      const battle = battles[currentBattle];

      if (index === battle.correctOptionIndex) {
        setMonsterHp(0);
        const newXp = xp + 50;
        const newLevel = Math.floor(newXp / 100) + 1;
        setXp(newXp);
        setLevel(newLevel);
        setFeedback({ message: "⚔️ Você usou a Lógica! Dano crítico! O monstro foi derrotado!", type: "success" });
        setIsTransitioning(true);

        setTimeout(() => {
          const next = currentBattle + 1;
          if (next >= battles.length) {
            setGameState("victory");
          } else {
            setCurrentBattle(next);
            setMonsterHp(100);
          }
          setFeedback(null);
          setIsTransitioning(false);
        }, 2000);
      } else {
        const newHp = playerHp - 20;
        setPlayerHp(newHp);
        setFeedback({ message: "💥 O monstro da ansiedade atacou! Tente refletir melhor.", type: "error" });

        if (newHp <= 0) {
          setGameState("gameover");
        } else {
          setTimeout(() => setFeedback(null), 2500);
        }
      }
    },
    [currentBattle, playerHp, xp, isTransitioning, gameState]
  );

  const resetGame = () => {
    setCurrentBattle(0);
    setPlayerHp(100);
    setMonsterHp(100);
    setXp(0);
    setLevel(1);
    setGameState("playing");
    setFeedback(null);
    setIsTransitioning(false);
  };

  if (gameState === "victory") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-6 animate-in fade-in duration-500">
        <div className="rounded-full bg-yellow-100 p-8">
          <Trophy className="h-16 w-16 text-yellow-500" />
        </div>
        <h2 className="text-3xl font-extrabold">🏆 Vitória!</h2>
        <p className="text-muted-foreground max-w-md text-lg">
          Parabéns pela sua resiliência mental! Você derrotou todas as distorções cognitivas usando pensamento racional e lógica.
        </p>
        <p className="text-sm text-muted-foreground">
          Nível alcançado: <span className="font-bold text-primary">{level}</span> · XP total: <span className="font-bold text-primary">{xp}</span>
        </p>
        <Button onClick={resetGame} size="lg" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Jogar novamente
        </Button>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-6 animate-in fade-in duration-500">
        <div className="rounded-full bg-red-100 p-8">
          <Skull className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold">Game Over</h2>
        <p className="text-muted-foreground max-w-md text-lg">
          Não desanime! Cada tentativa é um passo na jornada de autoconhecimento. Respire fundo e tente novamente — você é mais forte do que pensa. 💪
        </p>
        <Button onClick={resetGame} size="lg" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const battle = battles[currentBattle];
  const theme = getMonsterTheme(battle.monsterName);

  return (
    <div className="space-y-6">
      {/* Player Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Nível {level} — Paciente</p>
              <div className="flex items-center gap-2">
                <Progress value={xpProgress} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{xp}/{xpForNextLevel} XP</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-2">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vida do Jogador</p>
              <div className="flex items-center gap-2">
                <Progress value={playerHp} className={cn("h-2 flex-1", "[&>div]:bg-green-500")} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{playerHp}/100 HP</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Battle progress */}
      <p className="text-xs text-muted-foreground text-center">
        Batalha {currentBattle + 1} de {battles.length}
      </p>

      {/* Monster Arena */}
      <Card className={cn("transition-colors duration-500 border-2", theme.bg)}>
        <CardHeader className="pb-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Swords className="h-5 w-5 text-destructive" />
            <CardTitle className="text-xl">{battle.monsterName}</CardTitle>
          </div>
          {theme.label && (
            <span className={cn("text-xs font-medium", theme.labelColor)}>
              Emoção associada: {theme.label}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monster HP */}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <Progress value={monsterHp} className={cn("h-2 flex-1", "[&>div]:bg-destructive")} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{monsterHp}/100 HP</span>
          </div>

          {/* Monster speech */}
          <div className="bg-background/80 rounded-lg p-4 border border-border relative">
            <div className="absolute -top-2 left-6 w-4 h-4 bg-background/80 border-l border-t border-border rotate-45" />
            <p className="text-sm italic leading-relaxed">"{battle.monsterDescription}"</p>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "text-center p-3 rounded-lg font-medium text-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
            feedback.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          )}
        >
          {feedback.message}
        </div>
      )}

      {/* Action Panel */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-center">Escolha a sua resposta:</p>
        {battle.options.map((option, i) => (
          <Button
            key={i}
            variant="outline"
            className="w-full text-left h-auto py-3 px-4 whitespace-normal justify-start"
            disabled={isTransitioning}
            onClick={() => handleOptionClick(i)}
          >
            <span className="font-bold mr-2 shrink-0">{String.fromCharCode(65 + i)}.</span>
            <span>{option}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
