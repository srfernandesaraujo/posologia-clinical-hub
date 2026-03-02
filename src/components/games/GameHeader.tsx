import { useState } from "react";
import { HelpCircle, Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAiUpdate = async () => {
    if (!userPrompt.trim()) {
      toast.error("Escreva uma instrução de melhoria para o jogo.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-game", {
        body: { gameId, aiPrompt, userPrompt: userPrompt.trim() },
      });

      if (error) throw error;
      if (data?.gameData) {
        onAiUpdate?.(data.gameData);
        toast.success("Jogo atualizado com IA! Novos conteúdos carregados.");
        setUserPrompt("");
        setShowAiPanel(false);
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
          onClick={() => setShowAiPanel(!showAiPanel)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Atualizar com IA
        </Button>
      </div>

      {showAiPanel && (
        <div className="mb-4 p-4 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-medium">
            ✨ Descreva a melhoria que deseja para este jogo:
          </p>
          <Textarea
            placeholder="Ex: Crie uma nova fase com um paciente pediátrico, adicione um ranking de participantes, mude o enredo para emergência obstétrica..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="min-h-[80px] text-sm"
            disabled={loading}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAiPanel(false); setUserPrompt(""); }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleAiUpdate}
              disabled={loading || !userPrompt.trim()}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {loading ? "Gerando..." : "Enviar para IA"}
            </Button>
          </div>
        </div>
      )}

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
