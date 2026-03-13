import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AIContextGeneratorProps {
  labType: string;
  onContextGenerated: (data: any) => void;
  disabled?: boolean;
}

export function AIContextGenerator({ labType, onContextGenerated, disabled }: AIContextGeneratorProps) {
  const { user, isAdmin } = useAuth();
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed border-border">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">Geração com IA disponível apenas para administradores</p>
      </div>
    );
  }

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lab-context", {
        body: { labType, theme: theme.trim() || undefined, userId: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onContextGenerated(data);
      toast.success("Contexto gerado com IA!");
    } catch (err: any) {
      console.error("[AIContextGenerator]", err);
      toast.error(err.message || "Erro ao gerar contexto com IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-dashed border-border mt-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-medium text-primary">Gerar contexto com IA</span>
      </div>
      <Input
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        placeholder="Tema desejado (opcional)"
        className="text-xs h-8"
        disabled={loading || disabled}
      />
      <Button
        onClick={generate}
        disabled={loading || disabled}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Gerando...</>
        ) : (
          <><Sparkles className="h-3 w-3 mr-1" /> Gerar com IA</>
        )}
      </Button>
    </div>
  );
}
