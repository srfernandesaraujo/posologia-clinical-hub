import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, FileText, Code, Loader2, CheckCircle2, AlertTriangle, Lightbulb, Rocket, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AIGameConfig } from "@/components/games/DynamicAIGame";

interface CreateGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameCreated: (game: GeneratedGame) => void;
}

export interface GeneratedGame {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  howToPlay: string;
  aiPrompt: string;
  gameConfig: AIGameConfig;
}

type Step = "prompt" | "planning" | "review" | "generating" | "done";

const EXAMPLE_PROMPTS = [
  "Uma versão do clássico 'Adedonha' farmacológica: sorteia-se uma letra e o jogador deve identificar Fármaco, Mecanismo de Ação, Indicação, Efeito Colateral e Interação",
  "Quiz progressivo de farmacologia de emergência com cenários de UTI e decisões terapêuticas críticas",
  "Jogo de identificação de reações adversas: o jogador recebe sinais e sintomas e deve descobrir qual medicamento é o culpado",
  "Desafio de farmacocinética: ajuste doses em pacientes com insuficiência renal e hepática baseado em parâmetros laboratoriais",
];

export default function CreateGameDialog({ open, onOpenChange, onGameCreated }: CreateGameDialogProps) {
  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState("");
  const [game, setGame] = useState<GeneratedGame | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("prompt");
    setPrompt("");
    setPlan("");
    setGame(null);
    setError("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const generatePlan = async () => {
    if (!prompt.trim()) return;
    setStep("planning");
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-game", {
        body: { action: "plan", prompt: prompt.trim() },
      });

      if (fnError) throw new Error(fnError.message || "Erro ao gerar plano");
      if (data?.error) throw new Error(data.error);

      setPlan(data.plan);
      setStep("review");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      setStep("prompt");
      toast.error("Erro ao gerar plano", { description: msg });
    }
  };

  const generateGame = async () => {
    setStep("generating");
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-game", {
        body: { action: "generate", prompt: prompt.trim(), plan },
      });

      if (fnError) throw new Error(fnError.message || "Erro ao gerar jogo");
      if (data?.error) throw new Error(data.error);

      setGame(data.game);
      setStep("done");
      toast.success("Jogo criado com sucesso!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      setStep("review");
      toast.error("Erro ao gerar jogo", { description: msg });
    }
  };

  const handleConfirm = () => {
    if (game) {
      onGameCreated(game);
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Jogo com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o jogo clínico que deseja criar e a IA gerará um plano de implementação premium.
          </DialogDescription>
        </DialogHeader>

        {/* Progress steps */}
        <div className="flex items-center gap-2 py-2 shrink-0">
          {[
            { key: "prompt", label: "Prompt", icon: Lightbulb },
            { key: "review", label: "Plano", icon: FileText },
            { key: "done", label: "Jogo", icon: Code },
          ].map((s, i) => {
            const isActive =
              s.key === step ||
              (s.key === "prompt" && step === "planning") ||
              (s.key === "review" && step === "generating") ||
              (s.key === "done" && step === "done");
            const isPast =
              (s.key === "prompt" && ["review", "generating", "done"].includes(step)) ||
              (s.key === "review" && step === "done");

            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-6 ${isPast ? "bg-primary" : "bg-border"}`} />}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isPast
                      ? "bg-primary/20 text-primary"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <s.icon className="h-3.5 w-3.5" />
                  )}
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="shrink-0" />

        {/* STEP: Prompt */}
        {(step === "prompt" || step === "planning") && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Descreva o jogo que deseja criar
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Uma versão do clássico 'Adedonha' farmacológica: sorteia-se uma letra e o jogador identifica Fármaco, Mecanismo, Indicação..."
                className="min-h-[120px] resize-none"
                disabled={step === "planning"}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Quanto mais detalhado o prompt, melhor o resultado. Inclua gênero, mecânicas, tema clínico e diferenciais.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 Ideias para inspiração:</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    disabled={step === "planning"}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    {ex.slice(0, 60)}…
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={generatePlan}
                disabled={!prompt.trim() || step === "planning"}
                className="gap-2"
              >
                {step === "planning" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando plano...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Plano de Implementação
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Review Plan */}
        {(step === "review" || step === "generating") && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Plano de Implementação</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Gerado por IA
              </Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 overflow-auto" style={{ maxHeight: "45vh" }}>
              <div className="p-4 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {plan}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mt-3 shrink-0">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-between mt-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("prompt");
                  setError("");
                }}
                disabled={step === "generating"}
              >
                ← Editar Prompt
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={generatePlan}
                  disabled={step === "generating"}
                >
                  Regenerar Plano
                </Button>
                <Button
                  onClick={generateGame}
                  disabled={step === "generating"}
                  className="gap-2"
                >
                  {step === "generating" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando jogo...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Aprovar e Gerar Jogo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && game && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex flex-col items-center text-center py-4">
              <div className="rounded-full bg-primary/10 p-4 mb-3">
                <Gamepad2 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{game.title}</h3>
              <p className="text-muted-foreground mt-1">{game.description}</p>
              <Badge className="mt-2">{game.badge}</Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rodadas</span>
                <span className="font-bold text-foreground">{game.gameConfig.rounds.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cenário</span>
                <span className="text-foreground">{game.gameConfig.narrative.setting}</span>
              </div>
              {game.gameConfig.settings.timerPerRound && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timer por rodada</span>
                  <span className="text-foreground">{game.gameConfig.settings.timerPerRound}s</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pontos por acerto</span>
                <span className="text-foreground">+{game.gameConfig.settings.pointsPerCorrect}</span>
              </div>
            </div>

            {game.gameConfig.narrative.patientName && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Paciente</p>
                <p className="text-sm font-medium text-foreground">
                  {game.gameConfig.narrative.patientName}
                  {game.gameConfig.narrative.patientAge && ` — ${game.gameConfig.narrative.patientAge}`}
                </p>
                {game.gameConfig.narrative.patientHistory && (
                  <p className="text-xs text-muted-foreground mt-1">{game.gameConfig.narrative.patientHistory}</p>
                )}
              </div>
            )}

            <details className="rounded-lg border border-border bg-muted/30">
              <summary className="px-4 py-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                📋 Ver instruções "Como Jogar"
              </summary>
              <div className="px-4 pb-3 text-sm whitespace-pre-wrap text-muted-foreground">
                {game.howToPlay}
              </div>
            </details>

            <details className="rounded-lg border border-border bg-muted/30">
              <summary className="px-4 py-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                🎯 Ver rodadas ({game.gameConfig.rounds.length})
              </summary>
              <ScrollArea className="max-h-[200px]">
                <div className="px-4 pb-3 space-y-2">
                  {game.gameConfig.rounds.map((r, i) => (
                    <div key={i} className="text-xs border-b border-border pb-2 last:border-0">
                      <span className="font-medium text-foreground">
                        {r.phase ? `${r.phase} — ` : `Rodada ${i + 1} — `}
                      </span>
                      <span className="text-muted-foreground">{r.question}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </details>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep("review"); setError(""); }}>
                ← Voltar ao Plano
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Adicionar e Jogar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
