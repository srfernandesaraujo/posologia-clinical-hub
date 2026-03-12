import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, CheckCircle2, XCircle, Clock, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  isCorrect: boolean;
  feedback: string;
  vitalEffects?: Record<string, number>;
}

export interface DecisionNode {
  id: string;
  stage: number;
  title: string;
  context: string;
  options: DecisionOption[];
  weight: number;
}

export interface DecisionRecord {
  nodeId: string;
  stage: number;
  title: string;
  chosenId: string;
  chosenLabel: string;
  correctId: string;
  correctLabel: string;
  isCorrect: boolean;
  feedback: string;
}

interface Props {
  nodes: DecisionNode[];
  currentStage: number;
  decisions: DecisionRecord[];
  onDecision: (nodeId: string, option: DecisionOption) => void;
  completed: boolean;
  fdaAlerts?: string[];
  loadingFDA?: boolean;
}

export function BranchingDecisionPanel({ nodes, currentStage, decisions, onDecision, completed, fdaAlerts, loadingFDA }: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  const currentNode = nodes[currentStage];
  const progress = nodes.length > 0 ? ((currentStage) / nodes.length) * 100 : 0;

  const handleConfirm = () => {
    if (!selectedOption || !currentNode) return;
    const option = currentNode.options.find(o => o.id === selectedOption);
    if (!option) return;
    setLastFeedback({ correct: option.isCorrect, text: option.feedback });
    setShowFeedback(true);
  };

  const handleProceed = () => {
    if (!selectedOption || !currentNode) return;
    const option = currentNode.options.find(o => o.id === selectedOption);
    if (!option) return;
    onDecision(currentNode.id, option);
    setSelectedOption(null);
    setShowFeedback(false);
    setLastFeedback(null);
  };

  if (completed) {
    const correct = decisions.filter(d => d.isCorrect).length;
    const total = decisions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" /> 2. Decisões Clínicas
            <Badge className="ml-auto text-[10px]" variant={score >= 70 ? "default" : "destructive"}>{score}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-primary mb-1">{correct}/{total}</div>
            <p className="text-sm text-muted-foreground">decisões corretas</p>
          </div>
          <div className="space-y-2">
            {decisions.map((d, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded text-xs border ${d.isCorrect ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                {d.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                <span className="flex-1">{d.title}</span>
                <span className="font-medium">{d.chosenLabel}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentNode) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> 2. Decisões Clínicas
          </CardTitle>
        </CardHeader>
        <CardContent><div className="h-48 bg-muted/30 rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> 2. Decisões Clínicas
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Etapa {currentStage + 1}/{nodes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-1.5" />

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{currentNode.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{currentNode.context}</p>
        </div>

        {/* FDA Alerts */}
        {loadingFDA && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Consultando OpenFDA...
          </div>
        )}
        {fdaAlerts && fdaAlerts.length > 0 && (
          <div className="space-y-1">
            {fdaAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}

        {/* Options */}
        {!showFeedback && (
          <div className="space-y-2">
            {currentNode.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                  selectedOption === opt.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {showFeedback && lastFeedback && (
          <div className={`p-4 rounded-lg border ${lastFeedback.correct ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {lastFeedback.correct
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <XCircle className="h-5 w-5 text-destructive" />}
              <span className="font-semibold text-sm">
                {lastFeedback.correct ? "Decisão Correta!" : "Decisão Incorreta"}
              </span>
            </div>
            <p className="text-xs leading-relaxed">{lastFeedback.text}</p>
          </div>
        )}

        {/* Action buttons */}
        {!showFeedback ? (
          <Button onClick={handleConfirm} disabled={!selectedOption} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar Decisão
          </Button>
        ) : (
          <Button onClick={handleProceed} className="w-full">
            <ChevronRight className="h-4 w-4 mr-2" />
            {currentStage + 1 < nodes.length ? "Próxima Etapa" : "Finalizar Simulação"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
