import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Focus, Layers, Play, Pause, MessageCircle, RotateCcw, Maximize } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface MedViewToolbarProps {
  onFullscreen?: () => void;
}

export function MedViewToolbar({ onFullscreen }: MedViewToolbarProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Será integrado com Sketchfab Viewer API ou BioDigital Human API
   * via iframe.contentWindow.postMessage(...)
   * Exemplo: api.hide(nodeId) para isolar estruturas
   */
  const handleIsolateStructure = () => {
    toast.info("Isolar Estrutura — será integrado com a API do visualizador 3D");
  };

  /**
   * Futura integração: api.setTransparency(nodeId, opacity)
   * Permite visualizar camadas internas (raio-X)
   */
  const handleToggleTransparency = () => {
    toast.info("Modo Raio-X — será integrado com a API do visualizador 3D");
  };

  /**
   * Futura integração: api.play() / api.pause()
   * Controla animações de procedimento no modelo 3D
   */
  const handlePlayAnimation = () => {
    setIsPlaying(!isPlaying);
    toast.info(
      isPlaying
        ? "Animação pausada — será integrado com a API do visualizador 3D"
        : "Animação reproduzindo — será integrado com a API do visualizador 3D"
    );
  };

  /**
   * Futura integração: api.createAnnotation(...)
   * Permite adicionar anotações diretamente no modelo
   */
  const handleAddAnnotation = () => {
    toast.info("Anotações — será integrado com a API do visualizador 3D");
  };

  /**
   * Futura integração: api.recenterCamera()
   * Reseta a posição da câmera para a visão inicial
   */
  const handleResetView = () => {
    toast.info("Resetar visão — será integrado com a API do visualizador 3D");
  };

  const tools = [
    { icon: Focus, label: "Isolar Estrutura", action: handleIsolateStructure },
    { icon: Layers, label: "Raio-X / Transparência", action: handleToggleTransparency },
    { icon: isPlaying ? Pause : Play, label: isPlaying ? "Pausar Animação" : "Play Animação", action: handlePlayAnimation },
    { icon: MessageCircle, label: "Anotações", action: handleAddAnnotation },
    { icon: RotateCcw, label: "Resetar Visão", action: handleResetView },
    { icon: Maximize, label: "Tela Cheia", action: onFullscreen || (() => {}) },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
        Ferramentas
      </p>
      {tools.map((tool) => (
        <Tooltip key={tool.label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={tool.action}
            >
              <tool.icon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{tool.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
