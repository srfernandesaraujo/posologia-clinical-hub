import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Target, BookOpen, Trophy, Play, RotateCcw, Lightbulb, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  targetParams: Record<string, { min: number; max: number; label: string }>;
  validator: (currentState: Record<string, any>) => { correct: boolean; feedback: string };
  explanation: string;
  reference?: string;
  // Optional MCQ that the student must answer AFTER configuring the simulator.
  // When present, correctness requires BOTH the validator to pass AND the right option.
  options?: string[];
  correctIndex?: number;
}

export type Challenge = MCQChallenge | AdjustChallenge;

export interface ChallengeSet {
  title: string;
  description: string;
  challenges: Challenge[];
}

export interface QuestionResult {
  index: number;
  type: "mcq" | "adjust";
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  reference?: string;
}

interface SimulatorChallengeModeProps {
  challengeSet: ChallengeSet;
  customChallengeSet?: ChallengeSet | null;
  simulatorState: Record<string, any>;
  onResetForChallenge?: (params: Record<string, number>) => void;
  onComplete?: (score: number, total: number, questionResults?: QuestionResult[]) => void;
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
  const questionResultsRef = useRef<QuestionResult[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  // Virtual room detection
  const vrContextRef = useRef<any>(null);
  const [isVR, setIsVR] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("virtualRoom");
    if (raw) {
      try {
        const ctx = JSON.parse(raw);
        vrContextRef.current = ctx;
        setIsVR(true);
        // Signal that challenges exist so submitResults can skip
        sessionStorage.setItem("hasChallenges", "true");
      } catch {}
    }
    return () => {
      sessionStorage.removeItem("hasChallenges");
    };
  }, []);

  // Auto-start in virtual room mode
  useEffect(() => {
    if (isVR && !started) {
      setStarted(true);
      startTimeRef.current = Date.now();
    }
  }, [isVR, started]);

  const challenges = challengeSet.challenges;
  const current = challenges[currentIndex];
  const progress = ((currentIndex) / challenges.length) * 100;

  const handleStart = useCallback(() => {
    setStarted(true);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    questionResultsRef.current = [];
    startTimeRef.current = Date.now();
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

    // Track per-question result
    questionResultsRef.current.push({
      index: currentIndex,
      type: "mcq",
      question: challenge.question,
      userAnswer: challenge.options[optionIndex],
      correctAnswer: challenge.options[challenge.correctIndex],
      correct,
      explanation: challenge.explanation,
      reference: challenge.reference,
    });
  }, [answered, current, currentIndex]);

  const handleAdjustValidate = useCallback((chosenOption?: number) => {
    if (answered) return;
    const challenge = current as AdjustChallenge;
    let result: { correct: boolean; feedback: string };
    
    if (challenge.validator) {
      result = challenge.validator(simulatorState);
    } else {
      const params = challenge.targetParams || {};
      const allInRange = Object.entries(params).every(([key, spec]) => {
        const val = simulatorState[key] ?? simulatorState?.outputs?.[key];
        return val !== undefined && val >= spec.min && val <= spec.max;
      });
      result = allInRange
        ? { correct: true, feedback: "Parâmetros dentro da faixa esperada!" }
        : { correct: false, feedback: "Ajuste os parâmetros para ficarem dentro das faixas indicadas." };
    }

    // Hybrid mode: if challenge has options, require BOTH adjust + correct option
    const hasOptions = Array.isArray(challenge.options) && challenge.options.length > 0;
    let optionCorrect = true;
    let optionFeedback = "";
    if (hasOptions) {
      if (chosenOption === undefined || chosenOption === null) return;
      setSelectedOption(chosenOption);
      optionCorrect = chosenOption === challenge.correctIndex;
      if (!optionCorrect) {
        optionFeedback = `Alternativa incorreta. Resposta correta: ${String.fromCharCode(65 + (challenge.correctIndex ?? 0))}) ${challenge.options![challenge.correctIndex ?? 0]}.`;
      }
    }

    const finalCorrect = result.correct && optionCorrect;
    setAnswered(true);
    setAdjustValidated(true);
    setIsCorrect(finalCorrect);
    const composedFeedback = finalCorrect
      ? challenge.explanation
      : [result.correct ? "" : result.feedback, optionFeedback, challenge.explanation].filter(Boolean).join("\n\n");
    setFeedback(composedFeedback);
    if (finalCorrect) setScore((s) => s + 1);

    const paramsSummary = Object.entries(challenge.targetParams || {}).map(([key, spec]) => {
      const val = simulatorState[key] ?? simulatorState?.outputs?.[key];
      return `${spec.label}: ${val ?? "?"} (faixa: ${spec.min}–${spec.max})`;
    }).join("; ");
    const userAnswerStr = hasOptions
      ? `${paramsSummary} | Alternativa: ${String.fromCharCode(65 + (chosenOption ?? 0))}`
      : paramsSummary;
    const correctAnswerStr = hasOptions
      ? `${Object.entries(challenge.targetParams || {}).map(([_, spec]) => `${spec.label}: ${spec.min}–${spec.max}`).join("; ")} | Alternativa: ${String.fromCharCode(65 + (challenge.correctIndex ?? 0))}`
      : Object.entries(challenge.targetParams || {}).map(([_, spec]) => `${spec.label}: ${spec.min}–${spec.max}`).join("; ");

    questionResultsRef.current.push({
      index: currentIndex,
      type: "adjust",
      question: challenge.question,
      userAnswer: userAnswerStr,
      correctAnswer: correctAnswerStr,
      correct: finalCorrect,
      explanation: challenge.explanation,
      reference: challenge.reference,
    });
  }, [answered, current, simulatorState, currentIndex]);

  const submitToVirtualRoom = useCallback(async (finalScore: number, total: number) => {
    const ctx = vrContextRef.current;
    if (!ctx) return;

    const pctScore = Math.round((finalScore / total) * 100);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase.from("room_submissions").insert({
        room_id: ctx.roomId,
        participant_id: ctx.participantId,
        step_index: ctx.activityIndex ?? 0,
        score: pctScore,
        actions: {
          type: "challenge_results",
          questions: questionResultsRef.current,
          summary: { correct: finalScore, total, score: pctScore },
        } as any,
        time_spent_seconds: timeSpent,
        activity_id: ctx.activityId || null,
      });

      // Signal that VR submission was done by challenge mode
      sessionStorage.setItem("challengeSubmitted", "true");
      sessionStorage.setItem("challengeScore", String(pctScore));
    } catch (err) {
      console.error("Error submitting challenge results:", err);
    }
  }, []);

  const handleNext = useCallback(() => {
    const newScore = score;
    if (currentIndex + 1 >= challenges.length) {
      setFinished(true);
      const finalScore = newScore;
      onComplete?.(finalScore, challenges.length, questionResultsRef.current);
      
      if (isVR) {
        submitToVirtualRoom(finalScore, challenges.length);
      }
    } else {
      // Reset simulator params to defaults before next challenge
      onResetForChallenge?.({});
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setIsCorrect(false);
      setFeedback("");
      setAdjustValidated(false);
    }
  }, [currentIndex, challenges.length, score, onComplete, isVR, submitToVirtualRoom, onResetForChallenge]);

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
    questionResultsRef.current = [];
    startTimeRef.current = Date.now();
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
          {isVR && (
            <p className="text-xs text-muted-foreground">✅ Resultado enviado para o professor</p>
          )}
          {!isVR && (
            <Button onClick={handleRestart} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Tentar Novamente
            </Button>
          )}
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
        {current.type === "adjust" && !answered && (() => {
          const adj = current as AdjustChallenge;
          const hasOptions = Array.isArray(adj.options) && adj.options.length > 0;
          return (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-primary/30 text-sm">
                <p className="text-primary font-medium mb-1">📐 Instruções:</p>
                <p className="text-muted-foreground">
                  Ajuste os parâmetros do simulador acima {hasOptions ? "e escolha a alternativa que justifica a observação" : "para responder a este desafio"}.
                  {hasOptions ? "" : " Quando estiver pronto, clique em \"Verificar Resposta\"."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(adj.targetParams).map(([key, spec]) => (
                    <Badge key={key} variant="outline" className="text-xs">{spec.label}: {spec.min}–{spec.max}</Badge>
                  ))}
                </div>
              </div>

              {hasOptions && (
                <div className="space-y-2">
                  {adj.options!.map((opt, i) => {
                    const optClass = selectedOption === i
                      ? "border-primary bg-primary/10"
                      : "border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedOption(i)}
                        className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${optClass}`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + i)})</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={() => handleAdjustValidate(hasOptions ? (selectedOption ?? undefined) : undefined)}
                disabled={hasOptions && selectedOption === null}
                className="w-full gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Verificar Resposta
              </Button>
            </div>
          );
        })()}

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
