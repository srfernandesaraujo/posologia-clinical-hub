import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Target, BookOpen, Trophy, Play, RotateCcw, Lightbulb, ChevronRight } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MCQChallenge {
  type: "mcq";
  question: string;
  context?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference?: string;
}

export interface AdjustChallenge {
  type: "adjust";
  question: string;
  context?: string;
  /** Which parameters the student needs to adjust (key names from the simulator state) */
  targetParams: Record<string, { min: number; max: number; label: string }>;
  /** Function to validate current simulator state — returns { correct, feedback } */
  validator: (currentState: Record<string, any>) => { correct: boolean; feedback: string };
  explanation: string;
  reference?: string;
}

export type Challenge = MCQChallenge | AdjustChallenge;

export interface ChallengeSet {
  title: string;
  description: string;
  challenges: Challenge[];
}

interface SimulatorChallengeModeProps {
  challengeSet: ChallengeSet;
  /** Override challenge set (e.g., from virtual room custom challenges) */
  customChallengeSet?: ChallengeSet | null;
  /** Current simulator state (for adjust challenges) */
  simulatorState: Record<string, any>;
  /** Called when student should reset simulator to specific values for a challenge */
  onResetForChallenge?: (params: Record<string, number>) => void;
  /** Called when all challenges complete with final score */
  onComplete?: (score: number, total: number) => void;
  /** Hide the challenge section entirely */
  hidden?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SimulatorChallengeMode({
  challengeSet: nativeChallengeSet,
  customChallengeSet,
  simulatorState,
  onResetForChallenge,
  onComplete,
  hidden,
}: SimulatorChallengeModeProps) {
  // Use custom challenges if provided (from virtual room), otherwise native
  const challengeSet = customChallengeSet || nativeChallengeSet;
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [adjustValidated, setAdjustValidated] = useState(false);

  const challenges = challengeSet.challenges;
  const current = challenges[currentIndex];
  const progress = ((currentIndex) / challenges.length) * 100;

  const handleStart = useCallback(() => {
    setStarted(true);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
  }, []);

  const handleMCQAnswer = useCallback((optionIndex: number) => {
    if (answered) return;
    const challenge = current as MCQChallenge;
    const correct = optionIndex === challenge.correctIndex;
    setSelectedOption(optionIndex);
    setAnswered(true);
    setIsCorrect(correct);
    setFeedback(challenge.explanation);
    if (correct) setScore((s) => s + 1);
  }, [answered, current]);

  const handleAdjustValidate = useCallback(() => {
    if (answered) return;
    const challenge = current as AdjustChallenge;
    let result: { correct: boolean; feedback: string };
    
    if (challenge.validator) {
      result = challenge.validator(simulatorState);
    } else {
      // For serialized custom challenges, validate using targetParams ranges
      const params = challenge.targetParams || {};
      const allInRange = Object.entries(params).every(([key, spec]) => {
        const val = simulatorState[key] ?? simulatorState?.outputs?.[key];
        return val !== undefined && val >= spec.min && val <= spec.max;
      });
      result = allInRange
        ? { correct: true, feedback: "Parâmetros dentro da faixa esperada!" }
        : { correct: false, feedback: "Ajuste os parâmetros para ficarem dentro das faixas indicadas." };
    }
    
    setAnswered(true);
    setAdjustValidated(true);
    setIsCorrect(result.correct);
    setFeedback(result.correct ? challenge.explanation : result.feedback + "\n\n" + challenge.explanation);
    if (result.correct) setScore((s) => s + 1);
  }, [answered, current, simulatorState]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= challenges.length) {
      setFinished(true);
      onComplete?.(score, challenges.length);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setIsCorrect(false);
      setFeedback("");
      setAdjustValidated(false);
    }
  }, [currentIndex, challenges.length, score, onComplete]);

  const handleRestart = useCallback(() => {
    setStarted(false);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
    setFeedback("");
    setFinished(false);
    setAdjustValidated(false);
  }, []);

  if (hidden) return null;

  // ── Not started ──
  if (!started) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Modo Desafio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{challengeSet.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{challenges.length} desafios</Badge>
            <Badge variant="outline">Múltipla escolha + Ajuste</Badge>
          </div>
          <Button onClick={handleStart} className="w-full gap-2">
            <Play className="h-4 w-4" /> Iniciar Desafio
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Finished ──
  if (finished) {
    const pct = Math.round((score / challenges.length) * 100);
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
    return (
      <Card className="border-primary/30">
        <CardContent className="pt-6 space-y-4 text-center">
          <Trophy className={`h-12 w-12 mx-auto ${pct >= 60 ? "text-yellow-500" : "text-muted-foreground"}`} />
          <h3 className="text-xl font-bold">Desafio Concluído!</h3>
          <div className="text-3xl font-bold text-primary">{score}/{challenges.length}</div>
          <p className="text-sm text-muted-foreground">
            {pct >= 90 ? "Excelente! Domínio completo do tema." :
             pct >= 60 ? "Bom desempenho! Revise os pontos que errou." :
             pct >= 30 ? "Razoável. Recomendamos rever o conteúdo." :
             "Precisa de mais estudo. Tente novamente após revisar."}
          </p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`text-2xl ${s <= stars ? "text-yellow-400" : "text-muted-foreground/30"}`}>★</span>
            ))}
          </div>
          <Button onClick={handleRestart} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Active challenge ──
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Desafio {currentIndex + 1}/{challenges.length}
          </CardTitle>
          <Badge variant={current.type === "mcq" ? "default" : "secondary"}>
            {current.type === "mcq" ? "Pergunta" : "Ajuste"}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {current.context && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            {current.context}
          </div>
        )}

        <p className="font-medium text-foreground">{current.question}</p>

        {/* MCQ */}
        {current.type === "mcq" && (
          <div className="space-y-2">
            {(current as MCQChallenge).options.map((opt, i) => {
              const mcq = current as MCQChallenge;
              let optClass = "border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
              if (answered) {
                if (i === mcq.correctIndex) optClass = "border-green-500 bg-green-500/10";
                else if (i === selectedOption) optClass = "border-destructive bg-destructive/10";
                else optClass = "border opacity-50";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleMCQAnswer(i)}
                  disabled={answered}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${optClass}`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)})</span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Adjust */}
        {current.type === "adjust" && !answered && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-primary/30 text-sm">
              <p className="text-primary font-medium mb-1">📐 Instruções:</p>
              <p className="text-muted-foreground">
                Ajuste os parâmetros do simulador acima para responder a este desafio. 
                Quando estiver pronto, clique em "Verificar Resposta".
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries((current as AdjustChallenge).targetParams).map(([key, spec]) => (
                  <Badge key={key} variant="outline" className="text-xs">{spec.label}: {spec.min}–{spec.max}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleAdjustValidate} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Verificar Resposta
            </Button>
          </div>
        )}

        {/* Feedback */}
        {answered && (
          <div className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-semibold text-sm">
                {isCorrect ? "Correto!" : "Incorreto"}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p className="leading-relaxed whitespace-pre-line">{feedback}</p>
            </div>
            {current.reference && (
              <p className="text-xs text-muted-foreground mt-2">📚 Ref: {current.reference}</p>
            )}
            <Button onClick={handleNext} className="w-full mt-3 gap-2">
              {currentIndex + 1 >= challenges.length ? (
                <><Trophy className="h-4 w-4" /> Ver Resultado</>
              ) : (
                <><ChevronRight className="h-4 w-4" /> Próximo Desafio</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
