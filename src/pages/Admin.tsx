import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export default function Admin() {
  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tools").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Painel Admin</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4">Ferramentas ({tools.length})</h2>
        {tools.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma ferramenta cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {tools.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t.type}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {t.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
