import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useVirtualRoomCase(simulatorSlug: string) {
  const navigate = useNavigate();
  const [virtualRoomCase, setVirtualRoomCase] = useState<any>(null);
  const [isVirtualRoom, setIsVirtualRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        // Room without a specific case (or exam activity without case)
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
    if (!ctx || submitted) return;

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

        // If exam mode, navigate to next activity or back to results
        if (ctx.allActivities && ctx.activityIndex !== undefined) {
          const nextIndex = ctx.activityIndex + 1;
          if (nextIndex < ctx.totalActivities) {
            // Navigate to next activity
            const nextAct = ctx.allActivities[nextIndex];
            sessionStorage.setItem("virtualRoom", JSON.stringify({
              ...ctx,
              caseId: nextAct.caseId,
              simulatorSlug: nextAct.simulatorSlug,
              activityId: nextAct.id,
              activityIndex: nextIndex,
            }));
            // Small delay for UX
            setTimeout(() => {
              navigate(`/sala/simulador/${nextAct.simulatorSlug}`);
            }, 1500);
          } else {
            // All done - clear and go home
            setTimeout(() => {
              sessionStorage.removeItem("virtualRoom");
              navigate("/");
            }, 2000);
          }
        }
      } else {
        console.error("Error submitting room results:", error);
      }
    } catch (err) {
      console.error("Error submitting room results:", err);
    }
  };

  const goBack = () => {
    sessionStorage.removeItem("virtualRoom");
    navigate("/");
  };

  const examProgress = roomCtxRef.current?.allActivities
    ? { current: (roomCtxRef.current.activityIndex ?? 0) + 1, total: roomCtxRef.current.totalActivities }
    : null;

  return { virtualRoomCase, isVirtualRoom, loading, goBack, submitResults, submitted, examProgress };
}
