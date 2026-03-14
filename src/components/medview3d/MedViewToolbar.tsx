import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Focus, Layers, Play, Pause, MessageCircle, RotateCcw, Maximize } from "lucide-react";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import type { SketchfabApi } from "./External3DViewer";

interface MedViewToolbarProps {
  api?: SketchfabApi | null;
  isReady?: boolean;
  onFullscreen?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export function MedViewToolbar({ api, isReady, onFullscreen, disabled, disabledMessage }: MedViewToolbarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hiddenNodes, setHiddenNodes] = useState<number[]>([]);
  const [xrayActive, setXrayActive] = useState(false);

  const handleIsolateStructure = useCallback(() => {
    if (!api || !isReady) {
      toast.info("Aguarde o modelo carregar...");
      return;
    }

    api.getNodeMap((err: any, nodes: any) => {
      if (err) {
        toast.error("Erro ao obter estruturas do modelo");
        return;
      }

      if (hiddenNodes.length > 0) {
        // Show all hidden nodes
        hiddenNodes.forEach((id) => api.show(id));
        setHiddenNodes([]);
        toast.success("Todas as estruturas visíveis");
      } else {
        // Hide root-level children except the first visible one
        const nodeIds = Object.keys(nodes).map(Number).filter((id) => id > 0);
        const toHide = nodeIds.slice(1, Math.min(nodeIds.length, 5));
        toHide.forEach((id) => api.hide(id));
        setHiddenNodes(toHide);
        toast.success("Estrutura isolada — clique novamente para restaurar");
      }
    });
  }, [api, isReady, hiddenNodes]);

  const handleToggleTransparency = useCallback(() => {
    if (!api || !isReady) {
      toast.info("Aguarde o modelo carregar...");
      return;
    }

    api.getMaterialList((err: any, materials: any[]) => {
      if (err) {
        toast.error("Erro ao obter materiais");
        return;
      }

      const newXray = !xrayActive;
      materials.forEach((mat: any) => {
        const updated = { ...mat };
        if (newXray) {
          updated.channels = { ...mat.channels };
          if (updated.channels.Opacity) {
            updated.channels.Opacity = { ...updated.channels.Opacity, factor: 0.3 };
          } else {
            updated.channels.Opacity = { enable: true, factor: 0.3, type: "alphaBlend" };
          }
        } else {
          updated.channels = { ...mat.channels };
          if (updated.channels.Opacity) {
            updated.channels.Opacity = { ...updated.channels.Opacity, factor: 1.0 };
          }
        }
        api.setMaterial(updated);
      });

      setXrayActive(newXray);
      toast.success(newXray ? "Modo Raio-X ativado" : "Modo Raio-X desativado");
    });
  }, [api, isReady, xrayActive]);

  const handlePlayAnimation = useCallback(() => {
    if (!api || !isReady) {
      toast.info("Aguarde o modelo carregar...");
      return;
    }

    api.getAnimations((err: any, animations: any[]) => {
      if (err || !animations || animations.length === 0) {
        toast.info("Este modelo não possui animações");
        return;
      }

      if (isPlaying) {
        api.pause();
        setIsPlaying(false);
        toast.success("Animação pausada");
      } else {
        api.play();
        setIsPlaying(true);
        toast.success("Animação reproduzindo");
      }
    });
  }, [api, isReady, isPlaying]);

  const handleAddAnnotation = useCallback(() => {
    if (!api || !isReady) {
      toast.info("Aguarde o modelo carregar...");
      return;
    }

    // Take a screenshot as annotation reference
    api.getScreenShot(1920, 1080, (err: any, result: string) => {
      if (err) {
        toast.error("Erro ao capturar tela");
        return;
      }
      // Open screenshot in new tab
      const w = window.open();
      if (w) {
        w.document.write(`<img src="${result}" style="max-width:100%;height:auto;" />`);
        w.document.title = "Captura MedView 3D";
      }
      toast.success("Captura de tela gerada");
    });
  }, [api, isReady]);

  const handleResetView = useCallback(() => {
    if (!api || !isReady) {
      toast.info("Aguarde o modelo carregar...");
      return;
    }

    // Show all hidden nodes
    if (hiddenNodes.length > 0) {
      hiddenNodes.forEach((id) => api.show(id));
      setHiddenNodes([]);
    }

    // Reset transparency
    if (xrayActive) {
      api.getMaterialList((err: any, materials: any[]) => {
        if (!err) {
          materials.forEach((mat: any) => {
            const updated = { ...mat };
            if (updated.channels?.Opacity) {
              updated.channels.Opacity = { ...updated.channels.Opacity, factor: 1.0 };
            }
            api.setMaterial(updated);
          });
        }
      });
      setXrayActive(false);
    }

    // Recenter camera
    api.recenterCamera();
    toast.success("Visão resetada");
  }, [api, isReady, hiddenNodes, xrayActive]);

  const tools = [
    { icon: Focus, label: "Isolar Estrutura", action: handleIsolateStructure },
    { icon: Layers, label: xrayActive ? "Desativar Raio-X" : "Raio-X / Transparência", action: handleToggleTransparency },
    { icon: isPlaying ? Pause : Play, label: isPlaying ? "Pausar Animação" : "Play Animação", action: handlePlayAnimation },
    { icon: MessageCircle, label: "Captura de Tela", action: handleAddAnnotation },
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
