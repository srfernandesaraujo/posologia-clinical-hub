import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ProcedureStep {
  stepNumber: number;
  title: string;
  description: string;
  modelId?: string;
}

interface ProcedureTimelineProps {
  steps: ProcedureStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function ProcedureTimeline({ steps, currentStep, onStepChange }: ProcedureTimelineProps) {
  const total = steps.length;
  const step = steps[currentStep] || steps[0];

  return (
    <div className="w-full rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={currentStep <= 0}
          onClick={() => onStepChange(currentStep - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentStep]}
            min={0}
            max={total - 1}
            step={1}
            onValueChange={([v]) => onStepChange(v)}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={currentStep >= total - 1}
          onClick={() => onStepChange(currentStep + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Passo {currentStep + 1} de {total}
        </span>
      </div>

      {step && (
        <div className="px-1">
          <p className="text-sm font-semibold text-foreground">{step.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        </div>
      )}
    </div>
  );
}
