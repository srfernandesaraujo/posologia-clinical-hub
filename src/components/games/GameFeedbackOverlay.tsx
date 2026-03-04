import { CheckCircle2, XCircle, BookOpen, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameFeedbackOverlayProps {
  isCorrect: boolean;
  title: string;
  explanation: string;
  reference?: string;
  tip?: string;
  onContinue: () => void;
}

export default function GameFeedbackOverlay({
  isCorrect,
  title,
  explanation,
  reference,
  tip,
  onContinue,
}: GameFeedbackOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-md w-full mx-4 rounded-xl border bg-card shadow-2xl p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <div className="rounded-full bg-green-500/10 p-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          ) : (
            <div className="rounded-full bg-destructive/10 p-2">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          )}
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
          </div>
        </div>

        {tip && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p>{tip}</p>
          </div>
        )}

        {reference && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Ref: {reference}
          </p>
        )}

        <Button onClick={onContinue} className="w-full" size="lg">
          Continuar
        </Button>
      </div>
    </div>
  );
}
