import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, CheckCircle2, XCircle, Circle } from "lucide-react";
import type { DecisionRecord, DecisionNode } from "./BranchingDecisionPanel";

interface Props {
  nodes: DecisionNode[];
  decisions: DecisionRecord[];
  currentStage: number;
  completed: boolean;
}

export function DecisionTimelinePanel({ nodes, decisions, currentStage, completed }: Props) {
  const correct = decisions.filter(d => d.isCorrect).length;
  const totalWeight = decisions.reduce((sum, d) => {
    const node = nodes.find(n => n.id === d.nodeId);
    return sum + (node?.weight ?? 1);
  }, 0);
  const correctWeight = decisions.reduce((sum, d) => {
    if (!d.isCorrect) return sum;
    const node = nodes.find(n => n.id === d.nodeId);
    return sum + (node?.weight ?? 1);
  }, 0);
  const maxWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
  const score = maxWeight > 0 ? Math.round((correctWeight / maxWeight) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> 4. Linha do Tempo
          {completed && (
            <Badge className="ml-auto text-[10px]" variant={score >= 70 ? "default" : "destructive"}>
              Score: {score}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-3">
            {nodes.map((node, i) => {
              const decision = decisions.find(d => d.nodeId === node.id);
              const isCurrent = i === currentStage && !completed;
              const isPending = i > currentStage && !completed;

              return (
                <div key={node.id} className="flex items-start gap-3 relative">
                  {/* Node dot */}
                  <div className="z-10 shrink-0 mt-0.5">
                    {decision ? (
                      decision.isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )
                    ) : isCurrent ? (
                      <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${isPending ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? "text-primary" : ""}`}>
                        {node.title}
                      </p>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        Peso {node.weight}
                      </Badge>
                    </div>
                    {decision && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Escolha: {decision.chosenLabel}
                        {!decision.isCorrect && ` (ideal: ${decision.correctLabel})`}
                      </p>
                    )}
                    {isCurrent && (
                      <p className="text-[10px] text-primary mt-0.5">← Decisão atual</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score summary */}
        {decisions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Acertos parciais</span>
              <span className="font-semibold">{correct}/{decisions.length}</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${decisions.length > 0 ? (correct / decisions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
