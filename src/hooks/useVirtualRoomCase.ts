import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ExamFeedback {
  score: number;
  simulatorSlug: string;
  caseTitle?: string;
  isFinalActivity: boolean;
}

export function useVirtualRoomCase(simulatorSlug: string) {
  const navigate = useNavigate();
  const [virtualRoomCase, setVirtualRoomCase] = useState<any>(null);
  const [isVirtualRoom, setIsVirtualRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [examFeedback, setExamFeedback] = useState<ExamFeedback | null>(null);
  const roomCtxRef = useRef<any>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("virtualRoom");
    if (!raw) return;
    try {
      const ctx = JSON.parse(raw);
      if (ctx.caseId && ctx.simulatorSlug === simulatorSlug) {
        roomCtxRef.current = ctx;
        setIsVirtualRoom(true);
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
      } else if (ctx.simulatorSlug === simulatorSlug) {
        roomCtxRef.current = ctx;
        setIsVirtualRoom(true);
      }
    } catch {}
  }, [simulatorSlug]);

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
      return;
    }

    try {
      const { error } = await supabase.from("room_submissions").insert({
        room_id: ctx.roomId,
        participant_id: ctx.participantId,
        step_index: opts.stepIndex ?? 0,
        score: opts.score,
        actions: opts.actions as any,
        time_spent_seconds: opts.timeSpentSeconds ?? 0,
        activity_id: ctx.activityId || null,
      });
      if (!error) {
        setSubmitted(true);

        // If exam mode, show feedback overlay instead of auto-navigating
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

  const LAB_SLUGS_SET = new Set([
    "farmacos", "microbiologia", "toxicologia", "farmacogenomica", "estabilidade",
    "controle-qualidade", "epidemiologia", "biotecnologia", "simulacao-realistica",
    "pericia-forense", "modelagem-molecular",
  ]);

  const proceedToNext = useCallback(() => {
    const ctx = roomCtxRef.current;
    if (!ctx) return;

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
      const route = LAB_SLUGS_SET.has(nextAct.simulatorSlug)
        ? `/sala/laboratorio/${nextAct.simulatorSlug}`
        : `/sala/simulador/${nextAct.simulatorSlug}`;
      navigate(route);
    } else {
      sessionStorage.removeItem("virtualRoom");
      navigate("/");
    }
  }, [navigate]);

  const goBack = () => {
    sessionStorage.removeItem("virtualRoom");
    navigate("/");
  };

  const examProgress = roomCtxRef.current?.allActivities
    ? { current: (roomCtxRef.current.activityIndex ?? 0) + 1, total: roomCtxRef.current.totalActivities }
    : null;

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
  };
}
