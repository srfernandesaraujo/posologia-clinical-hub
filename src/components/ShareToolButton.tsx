import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { Share2, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShareToolButtonProps {
  toolId: string;
  toolName: string;
}

export function ShareToolButton({ toolId, toolName }: ShareToolButtonProps) {
  const { user } = useAuth();
  const { isPremium } = useFeatureGating();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: share, isLoading } = useQuery({
    queryKey: ["shared-tool", toolId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shared_tools")
        .select("*")
        .eq("tool_id", toolId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const createShare = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("shared_tools")
        .insert({ tool_id: toolId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-tool", toolId, user?.id] });
      toast.success("Link de compartilhamento criado!");
    },
    onError: () => toast.error("Erro ao criar link"),
  });

  const toggleShare = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from("shared_tools")
        .update({ is_active: active })
        .eq("id", share!.id);
      if (error) throw error;
    },
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ["shared-tool", toolId, user?.id] });
      toast.success(active ? "Compartilhamento ativado!" : "Compartilhamento desativado!");
    },
    onError: () => toast.error("Erro ao atualizar compartilhamento"),
  });

  if (!user || !isPremium) return null;

  const embedUrl = share ? `${window.location.origin}/embed/${share.share_token}` : "";
  const iframeCode = share ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;border:1px solid #e5e7eb;"></iframe>` : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-4 w-4" />Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar "{toolName}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !share ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Gere um link público para incorporar esta calculadora em qualquer página web.
              </p>
              <Button onClick={() => createShare.mutate()} disabled={createShare.isPending} className="gap-2">
                {createShare.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Gerar Link de Compartilhamento
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="share-toggle" className="text-sm font-medium">
                  Compartilhamento {share.is_active ? "ativo" : "desativado"}
                </Label>
                <Switch
                  id="share-toggle"
                  checked={share.is_active}
                  onCheckedChange={(checked) => toggleShare.mutate(checked)}
                  disabled={toggleShare.isPending}
                />
              </div>

              {share.is_active && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">URL Pública</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-muted p-2.5 rounded-lg break-all border border-border">
                        {embedUrl}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(embedUrl)}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Código Embed (iframe)</Label>
                    <div className="relative">
                      <code className="block text-xs bg-muted p-2.5 rounded-lg break-all border border-border">
                        {iframeCode}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-7 text-xs gap-1"
                        onClick={() => copyToClipboard(iframeCode)}
                      >
                        <Copy className="h-3 w-3" />Copiar
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ⚠️ Se seu plano for alterado para gratuito, este link será automaticamente desativado.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
