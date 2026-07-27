import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketDiagnostics {
  profile: {
    full_name: string | null;
    status: string | null;
    has_unlimited_access: boolean;
    created_at: string;
  } | null;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
  } | null;
  recentActivity: Array<{ source: "tool_visits" | "analytics_events" | "usage_logs"; label: string; created_at: string }>;
}

// Diagnóstico do admin reaproveita tabelas de telemetria já existentes
// (tool_visits, analytics_events, usage_logs) — nenhum tracking novo foi criado.
export function useTicketDiagnostics(userId: string | null) {
  return useQuery({
    queryKey: ["ticket-diagnostics", userId],
    queryFn: async (): Promise<TicketDiagnostics> => {
      const [profileRes, subRes, visitsRes, eventsRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, status, has_unlimited_access, created_at").eq("user_id", userId).maybeSingle(),
        supabase.from("subscribers" as any).select("plan, status, current_period_end").eq("user_id", userId).maybeSingle(),
        supabase.from("tool_visits" as any).select("tool_name, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("analytics_events" as any).select("event_type, page_path, tool_slug, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("usage_logs" as any).select("created_at, tools(name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);

      const visits = ((visitsRes.data || []) as any[]).map((v) => ({
        source: "tool_visits" as const,
        label: `Visitou "${v.tool_name}"`,
        created_at: v.created_at,
      }));
      const events = ((eventsRes.data || []) as any[]).map((e) => ({
        source: "analytics_events" as const,
        label: e.tool_slug ? `Usou ferramenta "${e.tool_slug}"` : `Acessou ${e.page_path || "página"}`,
        created_at: e.created_at,
      }));
      const logs = ((logsRes.data || []) as any[]).map((l) => ({
        source: "usage_logs" as const,
        label: `Executou "${l.tools?.name || "calculadora"}"`,
        created_at: l.created_at,
      }));

      const recentActivity = [...visits, ...events, ...logs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      return {
        profile: (profileRes.data as any) || null,
        subscription: (subRes.data as any) || null,
        recentActivity,
      };
    },
    enabled: !!userId,
  });
}
