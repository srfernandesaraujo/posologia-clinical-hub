import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, Swords, Shield, Trophy, RotateCcw, Sparkles, Skull, Zap, BookOpen, Brain, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Battle {
  id: number;
  monsterName: string;
  monsterDescription: string;
  distortionType: string;
  options: { text: string; correct: boolean; skill: string; explanation: string }[];
}

interface StoryArc {
  name: string;
  icon: string;
  description: string;
  patientName: string;
  patientAge: string;
  patientHistory: string;
  battles: Battle[];
}

const storyArcs: StoryArc[] = [
  {
    name: "Ansiedade Generalizada",
    icon: "😰",
    description: "Combata as distorções que alimentam a preocupação excessiva",
    patientName: "Sofia Almeida",
    patientAge: "29 anos, analista de sistemas",
    patientHistory: "Preocupação excessiva há 2 anos. Insônia, tensão muscular, dificuldade de concentração. GAD-7: 16 (grave). Sem medicação.",
    battles: [
      {
        id: 1, monsterName: "O Fantasma da Leitura Mental", distortionType: "Leitura Mental",
        monsterDescription: "Um amigo leu sua mensagem, mas não respondeu há horas. O Fantasma sussurra: 'Ele está zangado contigo. Disseste algo errado e agora te rejeita.'",
        options: [
          { text: "Vou enviar 10 mensagens pedindo desculpa por algo que nem sei se fiz.", correct: false, skill: "Empatia", explanation: "Isso é reasseguração excessiva, que alimenta a ansiedade. Você está assumindo responsabilidade por pensamentos que atribuiu ao outro." },
          { text: "Ele deve estar ocupado. Não tenho evidências de que esteja zangado. Responderá quando puder.", correct: true, skill: "Lógica", explanation: "Excelente reestruturação! Você separou FATO (não respondeu) de INTERPRETAÇÃO (está zangado). Essa é a técnica do Registro de Pensamentos Disfuncionais." },
          { text: "Vou bloqueá-lo para não sofrer com a rejeição.", correct: false, skill: "Resiliência", explanation: "Evitação mantém a crença disfuncional intacta. Enfrentar a incerteza é essencial para reduzir a ansiedade." },
        ],
      },
      {
        id: 2, monsterName: "O Titã da Catastrofização", distortionType: "Catastrofização",
        monsterDescription: "Sentes dor de cabeça leve e o coração acelerado. O Titã ruge: 'Isto é uma doença grave! Estás a morrer!'",
        options: [
          { text: "É uma resposta física passageira. Provavelmente estou cansado ou desidratado. Vou respirar fundo.", correct: true, skill: "Resiliência", explanation: "Correto! Você normalizou a sensação corporal e usou respiração como técnica de grounding. Na TCC, isso se chama reatribuição de sintomas." },
          { text: "Vou pesquisar sintomas na internet por 3 horas para me tranquilizar.", correct: false, skill: "Lógica", explanation: "Busca de reasseguração online (cyberchondria) PIORA a ansiedade. Cada pesquisa gera mais dúvida." },
          { text: "Vou cancelar tudo porque estou doente.", correct: false, skill: "Empatia", explanation: "Evitação reforça a crença catastrófica. Exposição gradual à incerteza é o tratamento." },
        ],
      },
      {
        id: 3, monsterName: "A Lupa do Filtro Negativo", distortionType: "Abstração Seletiva",
        monsterDescription: "Apresentação no trabalho: 50 elogios e 1 crítica construtiva. A Lupa aumenta a crítica: 'Viste? Foi horrível!'",
        options: [
          { text: "Realmente, foi um desastre. Os 50 elogios foram por pena.", correct: false, skill: "Lógica", explanation: "Desconsiderar evidências positivas é o filtro negativo em ação. 50 elogios são dados concretos." },
          { text: "Tive 50 elogios e 1 feedback construtivo. O saldo é claramente positivo. A crítica é oportunidade de melhoria.", correct: true, skill: "Lógica", explanation: "Perfeito! Você considerou TODAS as evidências, não apenas a negativa. Essa é a técnica de exame de evidências da TCC." },
          { text: "Nunca mais vou apresentar nada.", correct: false, skill: "Resiliência", explanation: "Generalização excessiva: um evento vira 'nunca mais'. Evitação impede desconfirmação da crença." },
        ],
      },
      {
        id: 4, monsterName: "O Gigante da Generalização", distortionType: "Supergeneralização",
        monsterDescription: "Erro num relatório. O Gigante esmaga o chão: 'Falhaste aqui, logo vais falhar em TUDO!'",
        options: [
          { text: "Realmente, sou incompetente em tudo.", correct: false, skill: "Empatia", explanation: "Generalizar um erro para toda a vida é distorção. Palavras como 'tudo', 'nunca', 'sempre' sinalizam supergeneralização." },
          { text: "Vou me demitir antes que me demitam.", correct: false, skill: "Resiliência", explanation: "Comportamento de fuga baseado em predição sem evidências. Previsão ≠ realidade." },
          { text: "Foi um erro pontual. Não define minha competência geral. Posso corrigir e aprender.", correct: true, skill: "Lógica", explanation: "Reestruturação excelente! Circunscrever o erro ao contexto específico é a técnica de descatastrofização." },
        ],
      },
      {
        id: 5, monsterName: "O Juiz Interior", distortionType: "Rotulação",
        monsterDescription: "Esqueceste uma reunião. O Juiz martela: 'És irresponsável. Sempre foste. Nunca vai mudar.'",
        options: [
          { text: "Esqueci uma reunião, o que é um comportamento, não uma identidade. Posso usar agenda para prevenir.", correct: true, skill: "Empatia", explanation: "Separar COMPORTAMENTO de IDENTIDADE é fundamental. 'Esqueci' ≠ 'sou irresponsável'. Rotulação transforma ato em traço fixo." },
          { text: "O Juiz tem razão. Sou irresponsável e não mereço esse emprego.", correct: false, skill: "Resiliência", explanation: "Aceitar o rótulo é fundir pensamento com realidade (fusão cognitiva). Pensamentos são hipóteses, não fatos." },
          { text: "Vou trabalhar 14 horas por dia para provar que não sou irresponsável.", correct: false, skill: "Lógica", explanation: "Compensação excessiva gera burnout. A resposta funcional é aceitar a falha e implementar estratégia prática." },
        ],
      },
      {
        id: 6, monsterName: "O Ditador do 'Deveria'", distortionType: "Imperativos ('Devo/Tenho que')",
        monsterDescription: "Domingo à tarde no sofá. O Ditador aponta: 'DEVERIAS estar a ser produtivo! Descansar é para fracos!'",
        options: [
          { text: "Descansar é necessidade fisiológica e direito. Posso relaxar sem culpa.", correct: true, skill: "Empatia", explanation: "Substituir 'deveria' por 'prefiro' ou 'posso' reduz a rigidez cognitiva. Imperativos absolutistas geram culpa desnecessária." },
          { text: "Vou levantar e limpar a casa toda, mesmo exausto.", correct: false, skill: "Resiliência", explanation: "Obedecer ao 'deveria' irracional reforça a crença. A longo prazo, gera resentimento e esgotamento." },
          { text: "Sou preguiçoso. Mereço me sentir culpado.", correct: false, skill: "Lógica", explanation: "Transformar descanso em culpa é o ciclo do 'deveria'. Aceitar necessidades humanas é autocuidado, não fraqueza." },
        ],
      },
      {
        id: 7, monsterName: "O Dragão da Previsão Negativa", distortionType: "Adivinhação",
        monsterDescription: "Entrevista de emprego amanhã. O Dragão cospe fogo: 'Vais gaguejar, esquecer tudo e fazer papel de ridículo!'",
        options: [
          { text: "Melhor desistir da entrevista. Sei que vai correr mal.", correct: false, skill: "Resiliência", explanation: "Previsão negativa vira profecia autorrealizável quando leva à evitação. Não comparecer garante o fracasso." },
          { text: "Não tenho bola de cristal. Posso me preparar e dar o meu melhor. O resultado é incerto, não necessariamente negativo.", correct: true, skill: "Lógica", explanation: "Reconhecer incerteza sem presumir catástrofe é descatastrofização. Preparação é a resposta funcional à ansiedade." },
          { text: "Vou tomar 3 calmantes antes para não sentir ansiedade.", correct: false, skill: "Empatia", explanation: "Evitação química impede processamento emocional. Ansiedade moderada melhora performance (Lei de Yerkes-Dodson)." },
        ],
      },
    ],
  },
  {
    name: "Depressão",
    icon: "😔",
    description: "Enfrente os pensamentos automáticos da tríade cognitiva de Beck",
    patientName: "Ricardo Menezes",
    patientAge: "42 anos, professor universitário",
    patientHistory: "Humor deprimido há 4 meses após divórcio. Anedonia, isolamento social, fadiga. PHQ-9: 18 (grave). Em uso de sertralina 100mg.",
    battles: [
      {
        id: 1, monsterName: "O Vórtice da Desesperança", distortionType: "Visão negativa do futuro",
        monsterDescription: "Após o divórcio, o Vórtice sussurra: 'Nunca mais serás feliz. Estás condenado à solidão para sempre.'",
        options: [
          { text: "Estou passando por um momento difícil, mas momentos passam. Não tenho evidências de que será sempre assim.", correct: true, skill: "Resiliência", explanation: "Na tríade de Beck, a visão negativa do futuro é central na depressão. Reconhecer temporalidade do sofrimento é essencial." },
          { text: "O Vórtice tem razão. Minha vida acabou.", correct: false, skill: "Empatia", explanation: "Desesperança é o principal preditor de risco suicida. É crucial desafiar essa crença com evidências concretas." },
          { text: "Vou voltar a namorar amanhã para provar que posso ser feliz.", correct: false, skill: "Lógica", explanation: "Ação compensatória impulsiva não é reestruturação. Processar o luto é necessário antes de novos relacionamentos." },
        ],
      },
      {
        id: 2, monsterName: "A Sombra da Desvalorização", distortionType: "Visão negativa de si",
        monsterDescription: "Olhando no espelho, a Sombra diz: 'Não tens valor. Se tivesses, teu casamento teria dado certo.'",
        options: [
          { text: "Casamento depende de duas pessoas. O fim não define meu valor como ser humano.", correct: true, skill: "Empatia", explanation: "Visão negativa de si (sou defeituoso/sem valor) é pilar da depressão. Separar resultado relacional de valor pessoal é terapêutico." },
          { text: "É verdade. Sou um fracasso como pessoa.", correct: false, skill: "Lógica", explanation: "Fundir evento (divórcio) com identidade (fracasso) é rotulação + personalização simultâneas." },
          { text: "Vou me isolar porque ninguém merece conviver comigo.", correct: false, skill: "Resiliência", explanation: "Isolamento é comportamento de evitação que mantém a depressão. Ativação comportamental é o oposto." },
        ],
      },
      {
        id: 3, monsterName: "O Parasita da Culpa", distortionType: "Personalização",
        monsterDescription: "O Parasita se alimenta: 'Seus filhos estão tristes por SUA culpa. Você destruiu a família.'",
        options: [
          { text: "Vou fazer tudo que as crianças querem para compensar minha culpa.", correct: false, skill: "Empatia", explanation: "Parentalidade compensatória por culpa não é saudável para as crianças nem para o pai." },
          { text: "A separação foi decisão conjunta. Posso ser bom pai separado. A tristeza das crianças é natural e temporária.", correct: true, skill: "Lógica", explanation: "Personalização excessiva atribui toda a responsabilidade a si. Reconhecer contexto e normalizar emoções dos filhos é adequado." },
          { text: "Sou um péssimo pai. Eles ficariam melhor sem mim.", correct: false, skill: "Resiliência", explanation: "⚠️ Este pensamento requer avaliação de risco. Crença de ser dispensável é sinal de alerta para ideação suicida." },
        ],
      },
      {
        id: 4, monsterName: "O Ladrão do Prazer", distortionType: "Anedonia cognitiva",
        monsterDescription: "Amigo convida para futebol. O Ladrão diz: 'Não vai ser legal. Nada mais te dá prazer. Fica em casa.'",
        options: [
          { text: "Aceito o convite mesmo sem vontade. A ativação comportamental precede a motivação.", correct: true, skill: "Resiliência", explanation: "Na depressão, esperar a motivação é armadilha. A TCC usa ativação comportamental: FAZER primeiro, sentir depois." },
          { text: "Realmente, nada me dá prazer. Vou ficar em casa.", correct: false, skill: "Lógica", explanation: "Evitação de atividades prazerosas mantém o ciclo depressivo. A previsão de desprazer nem sempre se confirma." },
          { text: "Só vou se tiver certeza de que vou me divertir.", correct: false, skill: "Empatia", explanation: "Exigir garantia de prazer é irrealista. Na depressão, o prazer retorna gradualmente com a exposição." },
        ],
      },
      {
        id: 5, monsterName: "O Espelho Deformado", distortionType: "Maximização/Minimização",
        monsterDescription: "Recebe elogio do chefe. O Espelho distorce: 'Ele só disse isso por pena. Teus defeitos são enormes, tuas qualidades inexistentes.'",
        options: [
          { text: "Um elogio do chefe é dado objetivo. Posso aceitar sem desconsiderar.", correct: true, skill: "Lógica", explanation: "Minimizar positivos e maximizar negativos é distorção dupla. Aceitar elogios é habilidade terapêutica a desenvolver." },
          { text: "Tenho certeza que foi por pena. Ninguém realmente valoriza meu trabalho.", correct: false, skill: "Empatia", explanation: "Ler mente do chefe sem evidências é leitura mental + desconsideração do positivo." },
          { text: "Um elogio não compensa todos os meus fracassos.", correct: false, skill: "Resiliência", explanation: "Pensamento tudo-ou-nada: se não for 100% bom, é nada. Reconhecer parcialidades é mais realista." },
        ],
      },
    ],
  },
];

type Skill = "Empatia" | "Lógica" | "Resiliência";

interface SkillTree {
  Empatia: number;
  Lógica: number;
  Resiliência: number;
}

const skillIcons: Record<string, any> = { Empatia: Smile, Lógica: Brain, Resiliência: Shield };

export default function RpgTccGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "result">("select");
  const [arcIdx, setArcIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");

  const arc = storyArcs[arcIdx];
  const [currentBattle, setCurrentBattle] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [monsterHp, setMonsterHp] = useState(100);
  const [xp, setXp] = useState(0);
  const [skills, setSkills] = useState<SkillTree>({ Empatia: 0, Lógica: 0, Resiliência: 0 });
  const [gameState, setGameState] = useState<"playing" | "victory" | "gameover">("playing");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; skill?: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errors, setErrors] = useState(0);
  const [damageAnim, setDamageAnim] = useState<"player" | "monster" | null>(null);

  const startGame = () => {
    setCurrentBattle(0);
    setPlayerHp(100);
    setMonsterHp(100);
    setXp(0);
    setSkills({ Empatia: 0, Lógica: 0, Resiliência: 0 });
    setGameState("playing");
    setFeedback(null);
    setIsTransitioning(false);
    setErrors(0);
    setPhase("playing");
  };

  const xpForNextLevel = 100;
  const level = Math.floor(xp / xpForNextLevel) + 1;
  const xpProgress = ((xp % xpForNextLevel) / xpForNextLevel) * 100;

  const handleOptionClick = useCallback((index: number) => {
    if (isTransitioning || gameState !== "playing") return;
    const battle = arc.battles[currentBattle];
    const option = battle.options[index];

    if (option.correct) {
      setMonsterHp(0);
      setDamageAnim("monster");
      const newXp = xp + 50;
      setXp(newXp);
      setSkills(s => ({ ...s, [option.skill]: (s[option.skill as Skill] || 0) + 1 }));
      setFeedback({
        isCorrect: true,
        title: `⚔️ ${battle.monsterName} derrotado!`,
        explanation: option.explanation,
        reference: `Distorção: ${battle.distortionType}`,
        skill: option.skill,
      });
    } else {
      const dmg = difficulty === "specialist" ? 30 : difficulty === "clinical" ? 25 : 20;
      const newHp = playerHp - dmg;
      setPlayerHp(newHp);
      setErrors(e => e + 1);
      setDamageAnim("player");
      setFeedback({
        isCorrect: false,
        title: `💥 O monstro atacou! -${dmg} HP`,
        explanation: option.explanation,
        reference: `Distorção: ${battle.distortionType}`,
      });
      if (newHp <= 0) {
        setGameState("gameover");
      }
    }
    setTimeout(() => setDamageAnim(null), 600);
  }, [currentBattle, playerHp, xp, isTransitioning, gameState, arc, difficulty]);

  const handleFeedbackContinue = () => {
    if (gameState === "gameover") { setFeedback(null); setPhase("result"); return; }
    if (feedback?.isCorrect) {
      const next = currentBattle + 1;
      if (next >= arc.battles.length) {
        setGameState("victory");
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setFeedback(null);
        setPhase("result");
      } else {
        setCurrentBattle(next);
        setMonsterHp(100);
        setFeedback(null);
      }
    } else {
      setFeedback(null);
    }
  };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">RPG Clínico — Terapia Cognitivo-Comportamental</h2>
        <p className="text-center text-muted-foreground text-sm">Escolha o arco narrativo e enfrente distorções cognitivas</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {storyArcs.map((a, i) => (
            <button
              key={i}
              onClick={() => setArcIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                arcIdx === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="font-semibold text-foreground mt-2">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
              <p className="text-xs text-muted-foreground">{a.battles.length} batalhas</p>
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
        title={`RPG TCC: ${arc.name}`}
        setting="Consultório de Psicologia — Centro de Saúde Mental"
        patientName={arc.patientName}
        patientAge={arc.patientAge}
        patientHistory={arc.patientHistory}
        briefing="Cada batalha representa uma distorção cognitiva. Use Empatia, Lógica e Resiliência para derrotar os monstros da mente. Reestruture pensamentos automáticos com técnicas da TCC."
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Brain className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    const won = gameState === "victory";
    return (
      <GameStarsResult
        score={xp}
        maxScore={arc.battles.length * 50}
        errors={errors}
        title={won ? "Vitória Terapêutica!" : "Sessão Encerrada"}
        subtitle={won
          ? "Todas as distorções cognitivas foram reestruturadas com sucesso!"
          : "Não desanime! Cada tentativa é um passo na jornada de autoconhecimento."
        }
        onRestart={startGame}
        onBack={() => setPhase("select")}
        details={[
          { label: "Arco", value: arc.name },
          { label: "Empatia", value: `${skills.Empatia} pts` },
          { label: "Lógica", value: `${skills.Lógica} pts` },
          { label: "Resiliência", value: `${skills.Resiliência} pts` },
        ]}
      />
    );
  }

  // Playing
  const battle = arc.battles[currentBattle];

  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={feedback.isCorrect}
          title={feedback.title}
          explanation={feedback.explanation}
          reference={feedback.reference}
          tip={feedback.skill ? `Habilidade: ${feedback.skill}` : undefined}
          onContinue={handleFeedbackContinue}
        />
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cn(damageAnim === "player" && "animate-[shake_0.3s]")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><Sparkles className="h-4 w-4 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Nível {level} — Terapeuta</p>
              <div className="flex items-center gap-2">
                <Progress value={xpProgress} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground">{xp % 100}/{xpForNextLevel}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-full bg-green-500/10 p-2"><Heart className="h-4 w-4 text-green-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Saúde Mental</p>
              <div className="flex items-center gap-2">
                <Progress value={playerHp} className={cn("h-1.5 flex-1", playerHp < 30 ? "[&>div]:bg-destructive" : "[&>div]:bg-green-500")} />
                <span className="text-[10px] text-muted-foreground">{playerHp}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill tree */}
      <div className="flex justify-center gap-3">
        {(["Empatia", "Lógica", "Resiliência"] as Skill[]).map(skill => {
          const Icon = skillIcons[skill];
          return (
            <div key={skill} className="flex items-center gap-1 text-xs">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">{skill}:</span>
              <span className="font-bold text-foreground">{skills[skill]}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">Batalha {currentBattle + 1} de {arc.battles.length}</p>

      {/* Monster card */}
      <Card className={cn("border-2 border-destructive/20", damageAnim === "monster" && "animate-[shake_0.3s]")}>
        <CardHeader className="pb-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Swords className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{battle.monsterName}</CardTitle>
          </div>
          <Badge variant="outline" className="mx-auto text-xs">{battle.distortionType}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <Progress value={monsterHp} className={cn("h-2 flex-1", "[&>div]:bg-destructive")} />
            <span className="text-xs text-muted-foreground">{monsterHp}/100</span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm italic leading-relaxed text-foreground">"{battle.monsterDescription}"</p>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-center text-foreground">Escolha sua resposta terapêutica:</p>
        {battle.options.map((option, i) => {
          const SkillIcon = skillIcons[option.skill] || Zap;
          return (
            <Button
              key={i}
              variant="outline"
              className="w-full text-left h-auto py-3 px-4 whitespace-normal justify-start gap-2"
              disabled={isTransitioning || gameState !== "playing"}
              onClick={() => handleOptionClick(i)}
            >
              <SkillIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm">{option.text}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar</Button>
      </div>

      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`}</style>
    </div>
  );
}
