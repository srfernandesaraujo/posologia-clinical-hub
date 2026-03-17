import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Logs a page visit to tool_visits table.
 * Call once per page component with the tool metadata.
 * Debounces to avoid duplicate inserts on re-renders.
 */
export function useToolVisit(
  toolSlug: string,
  toolName: string,
  toolCategory: "calculadora" | "simulador" | "laboratorio" | "jogo" | "ferramenta" | "outros"
) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    const log = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any).from("tool_visits").insert({
          user_id: user?.id || null,
          tool_slug: toolSlug,
          tool_name: toolName,
          tool_category: toolCategory,
        });
      } catch {
        // silent fail — analytics should never break UX
      }
    };
    log();
  }, [toolSlug, toolName, toolCategory]);
}
