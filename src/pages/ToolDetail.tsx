import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name)")
        .eq("slug", slug)
        .single();
      if (error) throw error;

      // Log usage
      if (user && data) {
        supabase.from("usage_logs").insert({ user_id: user.id, tool_id: data.id });
      }

      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Ferramenta não encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="rounded-2xl border border-border bg-card p-8">
        {tool.categories && (
          <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mb-4">
            {(tool.categories as any).name}
          </span>
        )}
        <h1 className="text-3xl font-bold mb-4">{tool.name}</h1>

        {/* Tool form placeholder - fields come from JSONB */}
        <div className="rounded-xl border border-border bg-muted/50 p-6 mb-6">
          <p className="text-muted-foreground text-center">
            Interface da ferramenta em construção.
            <br />
            Os campos de input e cálculos serão carregados dinamicamente.
          </p>
        </div>

        {/* Description / how to use */}
        {tool.description && (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-semibold mb-2">Como utilizar</h3>
            <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
