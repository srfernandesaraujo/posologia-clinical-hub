import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProcedureStep } from "./ProcedureTimeline";

interface ProcedureStepCardProps {
  step: ProcedureStep;
  totalSteps: number;
}

export function ProcedureStepCard({ step, totalSteps }: ProcedureStepCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {step.stepNumber}/{totalSteps}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
