import { useState, useEffect, useRef, useCallback } from "react";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult, { calculateStars } from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Clock, Lightbulb, CheckCircle2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

export interface AIGameRound {
  phase?: string;
  scenario: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  reference?: string;
  tip?: string;
}

export interface AIGameConfig {
  narrative: {
    title: string;
    setting: string;
    patientName?: string;
    patientAge?: string;
    patientHistory?: string;
    briefing: string;
  };
  settings: {
    pointsPerCorrect: number;
    pointsPerError: number;
    timerPerRound?: number;
  };
  rounds: AIGameRound[];
}

interface DynamicAIGameProps {
  config: AIGameConfig;
  customData?: any;
}

type Phase = "narrative" | "difficulty" | "playing" | "result";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const diffSettings = {
  academic: { lives: 5, timerMult: 1.5 },
  clinical: { lives: 3, timerMult: 1.0 },
  specialist: { lives: 2, timerMult: 0.7 },
};

export default function DynamicAIGame({ config, customData }: DynamicAIGameProps) {
  const gc = customData ? { ...config, rounds: customData.rounds || config.rounds, narrative: { ...config.narrative, ...customData.narrative }, settings: { ...config.settings, ...customData.settings } } : config;

  const [phase, setPhase] = useState<Phase>("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timer, setTimer] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [lifelineUsed, setLifelineUsed] = useState(false);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [shuffled, setShuffled] = useState<{ text: string; isCorrect: boolean; idx: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startRef = useRef(0);

  const rounds = gc.rounds;
  const round = rounds[roundIdx];
  const maxScore = rounds.length * gc.settings.pointsPerCorrect;

  const initRound = useCallback((idx: number) => {
    const r = rounds[idx];
    if (!r) return;
    const s = r.options.map((o, i) => ({ ...o, idx: i }));
    setShuffled(shuffleArray(s));
    setSelected(null);
    setConfirmed(false);
    setEliminated(new Set());

    if (gc.settings.timerPerRound) {
      const t = Math.round(gc.settings.timerPerRound * diffSettings[difficulty].timerMult);
      setTimer(t);
    }
  }, [rounds, gc.settings.timerPerRound, difficulty]);

  const handleStart = () => setPhase("difficulty");

  const handleDifficulty = (d: GameDifficulty) => {
    setDifficulty(d);
    const s = diffSettings[d];
    setLives(s.lives);
    setMaxLives(s.lives);
    setScore(0);
    setErrors(0);
    setRoundIdx(0);
    setLifelineUsed(false);
    startRef.current = Date.now();
    setPhase("playing");
    initRound(0);
  };

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing" || !gc.settings.timerPerRound || confirmed) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Time's up — auto wrong
          setConfirmed(true);
          setErrors(e => e + 1);
          setLives(l => l - 1);
          setScore(s => s + gc.settings.pointsPerError);
          setShowFeedback(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, roundIdx, gc.settings.timerPerRound, confirmed, gc.settings.pointsPerError]);

  // Init round on roundIdx change
  useEffect(() => {
    if (phase === "playing") initRound(roundIdx);
  }, [roundIdx, phase, initRound]);

  const handleConfirm = () => {
    if (selected === null || confirmed) return;
    clearInterval(timerRef.current);
    setConfirmed(true);

    const opt = shuffled[selected];
    if (opt.isCorrect) {
      setScore(s => s + gc.settings.pointsPerCorrect);
      toast.success("Correto! +" + gc.settings.pointsPerCorrect + " pts");
    } else {
      setErrors(e => e + 1);
      setLives(l => l - 1);
      setScore(s => Math.max(0, s + gc.settings.pointsPerError));
    }
    setShowFeedback(true);
  };

  const handleContinue = () => {
    setShowFeedback(false);
    const nextIdx = roundIdx + 1;

    if (lives <= 0 && !shuffled[selected!]?.isCorrect) {
      setTotalTimeMs(Date.now() - startRef.current);
      setPhase("result");
      return;
    }

    if (nextIdx >= rounds.length) {
      setTotalTimeMs(Date.now() - startRef.current);
      setPhase("result");
      return;
    }

    setRoundIdx(nextIdx);
  };

  const useLifeline = () => {
    if (lifelineUsed || confirmed) return;
    setLifelineUsed(true);
    // Eliminate one wrong option that isn't selected
    const wrongIndices = shuffled
      .map((o, i) => ({ ...o, sIdx: i }))
      .filter(o => !o.isCorrect && o.sIdx !== selected && !eliminated.has(o.sIdx));
    if (wrongIndices.length > 0) {
      const pick = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
      setEliminated(new Set([...eliminated, pick.sIdx]));
      toast.info("Opção eliminada! Uma alternativa incorreta foi removida.");
    }
  };

  const restart = () => {
    setPhase("difficulty");
    setRoundIdx(0);
    setScore(0);
    setErrors(0);
    setShowFeedback(false);
  };

  // ── NARRATIVE ──
  if (phase === "narrative") {
    return (
      <GameNarrative
        title={gc.narrative.title}
        setting={gc.narrative.setting}
        patientName={gc.narrative.patientName}
        patientAge={gc.narrative.patientAge}
        patientHistory={gc.narrative.patientHistory}
        briefing={gc.narrative.briefing}
        onStart={handleStart}
      />
    );
  }

  // ── DIFFICULTY ──
  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <h2 className="text-xl font-bold text-foreground">{gc.narrative.title}</h2>
        <GameDifficultySelector selected={difficulty} onChange={handleDifficulty} />
      </div>
    );
  }

  // ── RESULT ──
  if (phase === "result") {
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        timeSeconds={Math.round(totalTimeMs / 1000)}
        title={lives <= 0 ? "Game Over!" : "Parabéns!"}
        subtitle={lives <= 0 ? "Suas vidas acabaram. Tente novamente!" : `Você completou ${gc.narrative.title}!`}
        onRestart={restart}
        details={[
          { label: "Rodadas", value: `${Math.min(roundIdx + 1, rounds.length)}/${rounds.length}` },
          { label: "Acertos", value: `${Math.min(roundIdx + 1, rounds.length) - errors}` },
          { label: "Dificuldade", value: difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista" },
        ]}
      />
    );
  }

  // ── PLAYING ──
  if (!round) return null;

  const isCorrect = selected !== null ? shuffled[selected]?.isCorrect : false;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Lives */}
          <div className="flex items-center gap-1">
            {Array.from({ length: maxLives }).map((_, i) => (
              <Heart
                key={i}
                className={`h-5 w-5 transition-all ${i < lives ? "text-red-500 fill-red-500" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          {/* Timer */}
          {gc.settings.timerPerRound && (
            <div className={`flex items-center gap-1 text-sm font-mono font-bold ${timer <= 5 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
              <Clock className="h-4 w-4" />
              {timer}s
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">
            {score} pts
          </Badge>
          <span className="text-xs text-muted-foreground">
            {roundIdx + 1}/{rounds.length}
          </span>
        </div>
      </div>

      {/* Progress */}
      <Progress value={((roundIdx) / rounds.length) * 100} className="h-2" />

      {/* Phase label */}
      {round.phase && (
        <Badge variant="secondary" className="text-xs">{round.phase}</Badge>
      )}

      {/* Scenario */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm text-foreground leading-relaxed">{round.scenario}</p>
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-foreground">{round.question}</h3>

      {/* Options */}
      <div className="grid gap-2">
        {shuffled.map((opt, i) => {
          const isEliminated = eliminated.has(i);
          const isSelected = selected === i;
          const showResult = confirmed;

          let className = "w-full text-left p-4 rounded-xl border-2 transition-all text-sm ";
          if (isEliminated) {
            className += "opacity-30 cursor-not-allowed border-border bg-muted/20 line-through";
          } else if (showResult && isSelected && opt.isCorrect) {
            className += "border-green-500 bg-green-500/10 text-foreground";
          } else if (showResult && isSelected && !opt.isCorrect) {
            className += "border-red-500 bg-red-500/10 text-foreground";
          } else if (showResult && opt.isCorrect) {
            className += "border-green-500/50 bg-green-500/5 text-foreground";
          } else if (isSelected) {
            className += "border-primary bg-primary/10 text-foreground";
          } else {
            className += "border-border hover:border-primary/40 bg-card text-foreground cursor-pointer";
          }

          return (
            <button
              key={i}
              className={className}
              onClick={() => !confirmed && !isEliminated && setSelected(i)}
              disabled={confirmed || isEliminated}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full border border-border text-xs font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt.text}</span>
                {showResult && opt.isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto shrink-0" />}
                {showResult && isSelected && !opt.isCorrect && <XCircle className="h-5 w-5 text-red-500 ml-auto shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={lifelineUsed || confirmed}
          onClick={useLifeline}
        >
          <Lightbulb className={`h-4 w-4 ${lifelineUsed ? "text-muted-foreground" : "text-yellow-500"}`} />
          Consulta Rápida
          {lifelineUsed && <span className="text-xs">(usado)</span>}
        </Button>

        {!confirmed ? (
          <Button
            onClick={handleConfirm}
            disabled={selected === null}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Confirmar
          </Button>
        ) : (
          <Button onClick={handleContinue} className="gap-2">
            {roundIdx + 1 >= rounds.length || lives <= 0 ? "Ver Resultado" : "Próxima Rodada →"}
          </Button>
        )}
      </div>

      {/* Feedback overlay */}
      {showFeedback && round && (
        <GameFeedbackOverlay
          isCorrect={selected !== null ? shuffled[selected]?.isCorrect : false}
          title={selected !== null && shuffled[selected]?.isCorrect ? "Excelente!" : timer === 0 && !shuffled[selected!] ? "Tempo Esgotado!" : "Incorreto"}
          explanation={round.explanation}
          reference={round.reference}
          tip={round.tip}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
