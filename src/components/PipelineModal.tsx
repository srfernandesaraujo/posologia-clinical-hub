import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rocket, Lightbulb, Clock, ArrowRight, Flame } from "lucide-react";
import { useSystemUpdates, type SystemUpdate } from "@/hooks/useSystemUpdates";
import { useNavigate } from "react-router-dom";

const SESSION_KEY = "pipeline-modal-shown";

const priorityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  critical: { color: "text-red-400", icon: Flame },
  high: { color: "text-orange-400", icon: Rocket },
  medium: { color: "text-yellow-400", icon: Lightbulb },
  low: { color: "text-muted-foreground", icon: Clock },
};

export function PipelineModal() {
  const [open, setOpen] = useState(false);
  const { pendingIdeas, isLoading } = useSystemUpdates();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || pendingIdeas.length === 0) return;
    const shown = sessionStorage.getItem(SESSION_KEY);
    if (!shown) {
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, [isLoading, pendingIdeas.length]);

  if (pendingIdeas.length === 0) return null;

  const grouped = {
    in_progress: pendingIdeas.filter((i) => i.status === "in_progress"),
    planned: pendingIdeas.filter((i) => i.status === "planned"),
    idea: pendingIdeas.filter((i) => i.status === "idea"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Pipeline de Atualizações
          </DialogTitle>
          <DialogDescription>
            {pendingIdeas.length} itens pendentes no pipeline de desenvolvimento
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-2">
          <div className="space-y-4">
            {(["in_progress", "planned", "idea"] as const).map((status) => {
              const items = grouped[status];
              if (items.length === 0) return null;
              const label = status === "in_progress" ? "Em Andamento" : status === "planned" ? "Planejado" : "Ideias";
              const variant = status === "in_progress" ? "default" : status === "planned" ? "secondary" : "outline";
              return (
                <div key={status}>
                  <Badge variant={variant} className="mb-2">{label} ({items.length})</Badge>
                  <div className="space-y-1.5">
                    {items.slice(0, 5).map((item) => {
                      const cfg = priorityConfig[item.priority] || priorityConfig.medium;
                      return (
                        <div key={item.id} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5">
                          <cfg.icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.title}</p>
                            {item.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                            )}
                            <div className="flex gap-1.5 mt-1">
                              {item.category && <Badge variant="outline" className="text-[9px] h-4">{item.category}</Badge>}
                              <Badge variant="outline" className={`text-[9px] h-4 ${cfg.color}`}>{item.priority}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 5 && (
                      <p className="text-[10px] text-muted-foreground pl-6">+{items.length - 5} mais...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
          <Button size="sm" onClick={() => { setOpen(false); navigate("/admin/pipeline"); }}>
            Ver Pipeline Completo <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
