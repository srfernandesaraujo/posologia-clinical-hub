import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { POINTS } from "@/hooks/useGamification";

interface ExamFeedback {
  score: number;
  simulatorSlug: string;
  caseTitle?: string;
  isFinalActivity: boolean;
}

export function useVirtualRoomCase(simulatorSlug: string, builtInCases?: any[]) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [virtualRoomCase, setVirtualRoomCase] = useState<any>(null);
  const [isVirtualRoom, setIsVirtualRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [examFeedback, setExamFeedback] = useState<ExamFeedback | null>(null);
  const roomCtxRef = useRef<any>(null);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("virtualRoom");
    if (!raw) return;
    try {
      const ctx = JSON.parse(raw);
      if (ctx.simulatorSlug !== simulatorSlug) return;

      roomCtxRef.current = ctx;
      setIsVirtualRoom(true);

      if (ctx.caseId) {
        // DB case — fetch from Supabase
        setLoading(true);
        supabase
          .from("simulator_cases")
          .select("*")
          .eq("id", ctx.caseId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setVirtualRoomCase({
                ...(data.case_data as any),
                id: data.id,
                title: data.title,
                difficulty: data.difficulty,
                isAI: data.is_ai_generated,
              });
            }
            setLoading(false);
          });
      } else if (ctx.nativeCaseIndex !== null && ctx.nativeCaseIndex !== undefined && builtInCases) {
        // Native built-in case — pick from array by index
        const nativeCase = builtInCases[ctx.nativeCaseIndex];
        if (nativeCase) {
          setVirtualRoomCase({
            ...nativeCase,
            id: `native-${ctx.nativeCaseIndex}`,
          });
        }
      }
    } catch {}
  }, [simulatorSlug, builtInCases]);

  // Sinal leve de integridade de prova (item 10, OSCE): registra troca de aba/perda de
  // foco e saída de tela-cheia durante a estação, sem bloquear o aluno nem usar webcam.
  // Centralizado aqui (em vez de em cada página de simulador) para não precisar tocar
  // os ~100 arquivos de simulador individualmente.
  useEffect(() => {
    if (!isVirtualRoom) return;
    const onVisibilityChange = () => {
      if (document.hidden) tabSwitchCountRef.current += 1;
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) tabSwitchCountRef.current += 1;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [isVirtualRoom]);

  const submitResults = async (opts: {
    stepIndex?: number;
    score: number;
    actions: Record<string, any>;
    timeSpentSeconds?: number;
  }) => {
    const ctx = roomCtxRef.current;
    if (submitted) return;
    if (!ctx) {
      setSubmitted(true);
      // Uso individual (fora de Sala Virtual): até aqui o score calculado por
      // cada simulador era descartado. Persiste a tentativa e credita pontos
      // proporcionais ao score, sem bloquear a UI se algo falhar.
      if (user) {
        supabase.from("simulator_attempts").insert({
          user_id: user.id,
          simulator_slug: simulatorSlug,
          score: opts.score,
          actions: opts.actions,
        }).then(({ error }) => {
          if (error) console.error("Error saving simulator attempt:", error);
          // useMastery tem staleTime de 30min — sem isso, a aba Competências só
          // refletiria a nova tentativa depois de expirar o cache ou de um reload.
          queryClient.invalidateQueries({ queryKey: ["mastery"] });
        });

        supabase.functions.invoke("award-points", {
          body: {
            points: Math.round(POINTS.SIMULATOR_CASE * (opts.score / 100)),
            source: "simulator_case",
            simulator_slug: simulatorSlug,
          },
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["gamification-points"] });
          queryClient.invalidateQueries({ queryKey: ["gamification-badges"] });
          queryClient.invalidateQueries({ queryKey: ["gamification-leaderboard"] });
        }).catch((err) => console.error("Error awarding simulator points:", err));
      }
      return;
    }

    // If challenge mode exists, it handles its own submission — skip here
    const hasChallenges = sessionStorage.getItem("hasChallenges");
    const challengeSubmitted = sessionStorage.getItem("challengeSubmitted");
    if (hasChallenges === "true") {
      // Use challenge score from sessionStorage instead of simulator score
      const storedChallengeScore = sessionStorage.getItem("challengeScore");
      const challengeScore = storedChallengeScore ? Number(storedChallengeScore) : opts.score;

      // If challenge already submitted, just mark as submitted for UI state
      if (challengeSubmitted === "true") {
        setSubmitted(true);
        // Handle exam feedback
        if (ctx.allActivities && ctx.activityIndex !== undefined) {
          const isFinal = ctx.activityIndex + 1 >= ctx.totalActivities;
          setExamFeedback({
            score: challengeScore,
            simulatorSlug: ctx.simulatorSlug,
            caseTitle: virtualRoomCase?.title,
            isFinalActivity: isFinal,
          });
        }
        return;
      }
      // Challenge mode hasn't submitted yet — skip, it will submit with correct score.
      // Usa opts.score (recém-calculado por esta atividade) em vez de challengeScore:
      // esse último pode ser um valor de sessionStorage sobrado de uma atividade anterior
      // que nunca passou pela limpeza em proceedToNext (ex.: a navegação quebrou no meio).
      setSubmitted(true);
      if (ctx.allActivities && ctx.activityIndex !== undefined) {
        const isFinal = ctx.activityIndex + 1 >= ctx.totalActivities;
        setExamFeedback({
          score: opts.score,
          simulatorSlug: ctx.simulatorSlug,
          caseTitle: virtualRoomCase?.title,
          isFinalActivity: isFinal,
        });
      }
      return;
    }

    // No challenges — submit normally with simulator score
    try {
      const { error } = await supabase.from("room_submissions").insert({
        room_id: ctx.roomId,
        participant_id: ctx.participantId,
        step_index: opts.stepIndex ?? 0,
        score: opts.score,
        actions: opts.actions as any,
        time_spent_seconds: opts.timeSpentSeconds ?? 0,
        activity_id: ctx.activityId || null,
        tab_switch_count: tabSwitchCountRef.current,
      } as any);
      if (!error) {
        setSubmitted(true);

        if (ctx.allActivities && ctx.activityIndex !== undefined) {
          const isFinal = ctx.activityIndex + 1 >= ctx.totalActivities;
          setExamFeedback({
            score: opts.score,
            simulatorSlug: ctx.simulatorSlug,
            caseTitle: virtualRoomCase?.title,
            isFinalActivity: isFinal,
          });
        }
      } else {
        console.error("Error submitting room results:", error);
      }
    } catch (err) {
      console.error("Error submitting room results:", err);
    }
  };

  const LAB_PREFIX = "lab-";

  const LAB_SLUGS_SET = new Set([
    "lab-farmacos", "lab-microbiologia", "lab-toxicologia", "lab-farmacogenomica", "lab-estabilidade",
    "lab-controle-qualidade", "lab-epidemiologia", "lab-biotecnologia", "lab-simulacao-realistica",
    "lab-pericia-forense", "lab-modelagem-molecular",
  ]);

  const LAB_ONLY_SLUGS_SET = new Set([
    "farmacos",
    "microbiologia",
    "toxicologia",
    "controle-qualidade",
    "epidemiologia",
    "biotecnologia",
    "simulacao-realistica",
    "pericia-forense",
    "modelagem-molecular",
  ]);

  const getRouteForActivity = (slug: string, caseId?: string | null, activityId?: string | null) => {
    if (slug === "live-team-case") return `/sala/equipe/${activityId}`;
    if (LAB_SLUGS_SET.has(slug)) return `/sala/laboratorio/${slug.replace(LAB_PREFIX, "")}`;
    if (LAB_ONLY_SLUGS_SET.has(slug) && !caseId) return `/sala/laboratorio/${slug}`;
    return `/sala/simulador/${slug}`;
  };

  const proceedToNext = useCallback(() => {
    const ctx = roomCtxRef.current;
    if (!ctx) return;

    // Clean up challenge flags
    sessionStorage.removeItem("hasChallenges");
    sessionStorage.removeItem("challengeSubmitted");
    sessionStorage.removeItem("challengeScore");
    tabSwitchCountRef.current = 0;

    const nextIndex = ctx.activityIndex + 1;
    if (nextIndex < ctx.totalActivities) {
      const nextAct = ctx.allActivities[nextIndex];
      sessionStorage.setItem("virtualRoom", JSON.stringify({
        ...ctx,
        caseId: nextAct.caseId,
        simulatorSlug: nextAct.simulatorSlug,
        activityId: nextAct.id,
        activityIndex: nextIndex,
        customChallenges: nextAct.customChallenges || null,
      }));
      const route = getRouteForActivity(nextAct.simulatorSlug, nextAct.caseId, nextAct.id);
      navigate(route);
    } else {
      sessionStorage.removeItem("virtualRoom");
      navigate("/");
    }
  }, [navigate]);

  const goBack = () => {
    sessionStorage.removeItem("virtualRoom");
    sessionStorage.removeItem("hasChallenges");
    sessionStorage.removeItem("challengeSubmitted");
    sessionStorage.removeItem("challengeScore");
    navigate("/");
  };

  const examProgress = roomCtxRef.current?.allActivities
    ? { current: (roomCtxRef.current.activityIndex ?? 0) + 1, total: roomCtxRef.current.totalActivities }
    : null;

  const customChallenges = roomCtxRef.current?.customChallenges || null;
  const nativeCaseIndex: number | null = roomCtxRef.current?.nativeCaseIndex ?? null;

  return {
    virtualRoomCase,
    isVirtualRoom,
    loading,
    goBack,
    submitResults,
    submitted,
    examProgress,
    examFeedback,
    proceedToNext,
    customChallenges,
    nativeCaseIndex,
  };
}
