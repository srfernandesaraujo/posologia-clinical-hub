import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Eye } from "lucide-react";

interface VirtualRoomSubmitButtonProps {
  isVirtualRoom: boolean;
  submitted: boolean;
  disabled?: boolean;
  onSubmit: () => number; // returns score
  fallbackLabel?: string;
  extraInfo?: string;
}

export default function VirtualRoomSubmitButton({
  isVirtualRoom,
  submitted,
  disabled,
  onSubmit,
  fallbackLabel = "Finalizar Caso",
  extraInfo,
}: VirtualRoomSubmitButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  if (!isVirtualRoom) {
    return (
      <Button variant="outline" onClick={() => onSubmit()} disabled={disabled || submitted} className="w-full">
        {fallbackLabel}
      </Button>
    );
  }

  if (!submitted) {
    return (
      <Button
        onClick={() => {
          const score = onSubmit();
          setLastScore(score);
        }}
        disabled={disabled}
        className="w-full gap-2"
      >
        <Send className="h-4 w-4" /> Enviar Resultados
      </Button>
    );
  }

  if (!showFeedback) {
    return (
      <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2">
        <Eye className="h-4 w-4" /> Mostrar Resultados
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
      <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>
        {lastScore}%
      </div>
      <p className="text-sm text-muted-foreground">
        {lastScore >= 80 ? "🏆 Excelente desempenho!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}
      </p>
      {extraInfo && <p className="text-xs text-muted-foreground">{extraInfo}</p>}
    </div>
  );
}
