import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const { data: logs = [] } = useQuery({
    queryKey: ["analytics-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*, tools(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4">Últimos acessos ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Nenhum registro de uso ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="font-medium">{log.tools?.name || "Ferramenta removida"}</span>
                <span className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
