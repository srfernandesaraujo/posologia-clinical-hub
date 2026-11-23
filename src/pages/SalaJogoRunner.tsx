import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/layouts/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Gamepad2, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getGameBySlug } from "@/data/virtualRoomGames";

interface VirtualRoomCtx {
  roomId: string;
  participantId: string;
  simulatorSlug: string;
  participantName: string;
  activityId?: string;
  activityIndex?: number;
  totalActivities?: number;
  allActivities?: any[];
  viewOnly?: boolean;
}

export default function SalaJogoRunner() {
  const navigate = useNavigate();
  const { gameSlug = "" } = useParams();
  const game = getGameBySlug(gameSlug);
  const startRef = useRef<number>(Date.now());
  const interactionsRef = useRef<number>(0);
  const lastInteractionAtRef = useRef<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  const ctx = useMemo<VirtualRoomCtx | null>(() => {
    try {
      const raw = sessionStorage.getItem("virtualRoom");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.simulatorSlug !== gameSlug) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [gameSlug]);

  // Track button clicks inside the game as "interactions"
  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button")) return;
    const now = Date.now();
    if (now - lastInteractionAtRef.current < 800) return;
    lastInteractionAtRef.current = now;
    interactionsRef.current += 1;
  };

  // Listen to messages dispatched by games (window.dispatchEvent custom event)
  useEffect(() => {
    const handler = (ev: any) => {
      if (typeof ev?.detail?.score === "number") {
        setScore(Math.max(0, Math.min(100, Math.round(ev.detail.score))));
      }
    };
    window.addEventListener("clinical-game-score" as any, handler);
    return () => window.removeEventListener("clinical-game-score" as any, handler);
  }, []);

  const buildPayload = (finalScore: number) => {
    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    return {
      type: "game_session" as const,
      gameSlug,
      gameLabel: game?.label || gameSlug,
      decisions: [],
      summary: {
        score: finalScore,
        interactions: interactionsRef.current,
        timeSpentSeconds: elapsed,
        completed: finalScore > 0,
        totalDecisions: interactionsRef.current,
        correctDecisions: 0,
        categories: {},
        strengths: [],
        weaknesses: [],
        pedagogicalNote: `Jogo "${game?.label || gameSlug}" concluído com ${interactionsRef.current} interações em ${elapsed}s.`,
      },
    };
  };

  const handleSubmit = async () => {
    if (!ctx) {
      toast.error("Sessão de sala não encontrada.");
      return;
    }
    if (ctx.viewOnly) {
      toast.info("Modo somente-leitura: o resultado não será enviado.");
      return;
    }
    setSubmitting(true);
    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    const finalScore = score; // teacher-defined or self-rated; default 0 unless game emits one
    const { error } = await supabase.from("room_submissions").insert({
      room_id: ctx.roomId,
      participant_id: ctx.participantId,
      step_index: ctx.activityIndex ?? 0,
      score: finalScore,
      actions: buildPayload(finalScore) as any,
      time_spent_seconds: elapsed,
      activity_id: ctx.activityId || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar resultado");
      return;
    }
    setSubmitted(true);
    toast.success("Resultado enviado!");
  };

  const goNextOrHome = () => {
    if (ctx?.allActivities && ctx.activityIndex !== undefined) {
      const nextIndex = ctx.activityIndex + 1;
      if (nextIndex < (ctx.totalActivities ?? ctx.allActivities.length)) {
        const nextAct: any = ctx.allActivities[nextIndex];
        sessionStorage.setItem("virtualRoom", JSON.stringify({
          ...ctx,
          caseId: nextAct.caseId,
          simulatorSlug: nextAct.simulatorSlug,
          activityId: nextAct.id,
          activityIndex: nextIndex,
          customChallenges: nextAct.customChallenges || null,
          nativeCaseIndex: nextAct.nativeCaseIndex ?? null,
        }));
        // Route depending on next activity slug
        const slug: string = nextAct.simulatorSlug;
        if (slug.startsWith("game-")) navigate(`/sala/jogo/${slug}`);
        else if (slug.startsWith("lab-")) navigate(`/sala/laboratorio/${slug.replace("lab-", "")}`);
        else navigate(`/sala/simulador/${slug}`);
        return;
      }
    }
    sessionStorage.removeItem("virtualRoom");
    navigate("/");
  };

  if (!game) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <EmptyState
          icon={<Gamepad2 />}
          title="Jogo não encontrado"
          description="Este jogo não existe mais ou o link da atividade está incorreto."
          action={<Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>}
        />
      </div>
    );
  }

  const GameComponent = game.component;
  const isExam = !!ctx?.allActivities;
  const isFinal = isExam && ctx && ctx.activityIndex !== undefined
    ? ctx.activityIndex + 1 >= (ctx.totalActivities ?? 1)
    : true;
  const current = (ctx?.activityIndex ?? 0) + 1;
  const total = ctx?.totalActivities ?? 1;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        onBack={() => navigate("/")}
        backLabel="Sair da sala"
        icon={<Gamepad2 />}
        title={game.label}
        badges={
          <>
            <Badge variant="secondary">Jogo clínico</Badge>
            <Badge variant="outline">Sala Virtual</Badge>
          </>
        }
        description="Jogue normalmente. Quando terminar, envie o resultado para o professor."
        className="mb-4"
      />

      {isExam && ctx && (
        <div className="mb-4 space-y-1.5" role="group" aria-label={`Atividade ${current} de ${total}`}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Atividade {current} de {total}</span>
            <span className="tabular-nums">{Math.round((current / total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(current / total) * 100}%` }} />
          </div>
        </div>
      )}

      {ctx?.viewOnly && (
        <div className="mb-4 rounded-xl border border-status-warn/40 bg-status-warn/10 p-3 text-xs text-status-warn">
          Modo somente-leitura. Você pode jogar, mas o resultado não será registrado, pois seu e-mail já está vinculado a um grupo.
        </div>
      )}

      <div onClickCapture={handleInteraction} className="mb-4 rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
        <GameComponent />
      </div>

      {!submitted ? (
        <div className="sticky bottom-3 z-10 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !ctx || ctx.viewOnly}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar resultado para o professor
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-status-ok/40 bg-status-ok/10 p-5 text-center" role="status">
          <div className="flex items-center justify-center gap-2 text-status-ok">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Resultado enviado!</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Interações registradas: {interactionsRef.current} · Tempo:{" "}
            {Math.floor((Date.now() - startRef.current) / 60000)}m
          </p>
          <Button onClick={goNextOrHome} className="w-full gap-2" size="lg">
            {isFinal ? "Concluir e voltar" : "Próxima atividade"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
