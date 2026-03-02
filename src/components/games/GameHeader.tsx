import { useState } from "react";
import { HelpCircle, Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GameUpdateType = "incremental" | "major";

interface GameHeaderProps {
  howToPlay: string;
  aiPrompt: string;
  gameId: string;
  versionLabel: string;
  currentData?: any;
  onAiUpdate?: (data: any, updateType: GameUpdateType) => void;
}

export default function GameHeader({ howToPlay, aiPrompt, gameId, versionLabel, currentData, onAiUpdate }: GameHeaderProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [updateType, setUpdateType] = useState<GameUpdateType>("incremental");
  const [loading, setLoading] = useState(false);

  const handleAiUpdate = async () => {
    if (!userPrompt.trim()) {
      toast.error("Escreva uma instrução de melhoria para o jogo.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-game", {
        body: {
          gameId,
          aiPrompt,
          userPrompt: userPrompt.trim(),
          updateType,
          currentData: currentData ?? null,
        },
      });

      if (error) throw error;

      const gameData = data?.gameData;
      if (!gameData || typeof gameData !== "object" || Object.keys(gameData).length === 0) {
        throw new Error("A IA não retornou uma atualização válida para este jogo.");
      }

      onAiUpdate?.(gameData, updateType);
      toast.success(updateType === "major" ? "Grande atualização aplicada com sucesso!" : "Atualização incremental aplicada com sucesso!");
      setUserPrompt("");
      setShowAiPanel(false);
    } catch (e: any) {
      console.error("AI update error:", e);
      toast.error(e.message || "Erro ao atualizar com IA. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          Versão {versionLabel}
        </Badge>

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
          <p className="text-sm font-medium">✨ Descreva a melhoria específica para este jogo:</p>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={updateType === "incremental" ? "default" : "outline"}
              onClick={() => setUpdateType("incremental")}
              disabled={loading}
            >
              Incremental (+0.1)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={updateType === "major" ? "default" : "outline"}
              onClick={() => setUpdateType("major")}
              disabled={loading}
            >
              Grande (+1.0)
            </Button>
          </div>

          <Textarea
            placeholder="Ex: Crie uma nova fase com paciente pediátrico, adicione personagens novos, mude o enredo para uma emergência específica..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="min-h-[90px] text-sm"
            disabled={loading}
          />

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAiPanel(false);
                setUserPrompt("");
              }}
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
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {loading ? "Gerando..." : "Aplicar atualização"}
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
