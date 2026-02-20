import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useVirtualRoomCase(simulatorSlug: string) {
  const navigate = useNavigate();
  const [virtualRoomCase, setVirtualRoomCase] = useState<any>(null);
  const [isVirtualRoom, setIsVirtualRoom] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("virtualRoom");
    if (!raw) return;
    try {
      const ctx = JSON.parse(raw);
      if (ctx.caseId && ctx.simulatorSlug === simulatorSlug) {
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
      }
    } catch {}
  }, [simulatorSlug]);

  const goBack = () => {
    sessionStorage.removeItem("virtualRoom");
    navigate("/");
  };

  return { virtualRoomCase, isVirtualRoom, loading, goBack };
}
