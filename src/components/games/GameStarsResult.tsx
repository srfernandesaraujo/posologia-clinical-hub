import { Star, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface GameStarsResultProps {
  score: number;
  maxScore: number;
  timeSeconds?: number;
  errors?: number;
  title: string;
  subtitle?: string;
  onRestart: () => void;
  onBack?: () => void;
  details?: { label: string; value: string }[];
}

function calculateStars(score: number, maxScore: number, errors?: number): number {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.9 && (!errors || errors <= 1)) return 3;
  if (pct >= 0.6) return 2;
  if (pct > 0) return 1;
  return 0;
}

export default function GameStarsResult({
  score,
  maxScore,
  timeSeconds,
  errors,
  title,
  subtitle,
  onRestart,
  onBack,
  details,
}: GameStarsResultProps) {
  const stars = calculateStars(score, maxScore, errors);

  useEffect(() => {
    if (stars >= 2) {
      confetti({ particleCount: stars === 3 ? 150 : 60, spread: 70, origin: { y: 0.6 } });
    }
  }, [stars]);

  const starColors = [
    "text-muted-foreground/30",
    "text-status-warn",
    "text-status-warn",
    "text-status-warn",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
      <div className="rounded-full bg-primary/10 p-6">
        <Trophy className="h-14 w-14 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground max-w-md">{subtitle}</p>}

      {/* Stars */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <Star
            key={s}
            className={`h-10 w-10 transition-all duration-500 ${
              s <= stars ? "text-status-warn fill-status-warn scale-110" : "text-muted-foreground/30"
            }`}
            style={{ transitionDelay: `${s * 150}ms` }}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="rounded-xl border border-border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Pontuação</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">{score}/{maxScore}</p>
        </div>
        {errors !== undefined && (
          <div className="rounded-xl border border-border bg-card px-5 py-3">
            <p className="text-xs text-muted-foreground">Erros</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{errors}</p>
          </div>
        )}
        {timeSeconds !== undefined && (
          <div className="rounded-xl border border-border bg-card px-5 py-3">
            <p className="text-xs text-muted-foreground">Tempo</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{Math.floor(timeSeconds / 60)}:{String(timeSeconds % 60).padStart(2, "0")}</p>
          </div>
        )}
      </div>

      {details && details.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4 max-w-sm w-full space-y-2">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
        <Button onClick={onRestart} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Jogar Novamente
        </Button>
      </div>
    </div>
  );
}

export { calculateStars };
