import { useState } from "react";
import { HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameHeaderProps {
  howToPlay: string;
  aiPrompt: string;
  gameId: string;
  onAiUpdate?: (data: any) => void;
}

export default function GameHeader({ howToPlay, aiPrompt, gameId, onAiUpdate }: GameHeaderProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAiUpdate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-game", {
        body: { gameId, aiPrompt },
      });

      if (error) throw error;
      if (data?.gameData) {
        onAiUpdate?.(data.gameData);
        toast.success("Jogo atualizado com IA! Novos conteúdos carregados.");
      } else {
        throw new Error("Dados não retornados pela IA");
      }
    } catch (e: any) {
      console.error("AI update error:", e);
      toast.error(e.message || "Erro ao atualizar com IA. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowHelp(true)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Como Jogar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleAiUpdate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Gerando..." : "Atualizar com IA"}
        </Button>
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Como Jogar
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {howToPlay}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
