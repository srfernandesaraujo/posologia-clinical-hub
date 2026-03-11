import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Award } from "lucide-react";

export interface FeedbackDecision {
  label: string;
  userChoice: string;
  idealChoice: string;
  correct: boolean;
  explanation?: string;
}

interface SimulatorFeedbackProps {
  score: number; // 0-100
  decisions: FeedbackDecision[];
  narrative: string; // "O que aconteceria com o paciente"
  visible: boolean;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const label = score >= 80 ? "Excelente" : score >= 50 ? "Bom" : "Precisa melhorar";
  const Icon = score >= 80 ? Award : score >= 50 ? AlertTriangle : XCircle;
  const arcLength = (score / 100) * 126; // semicircle ~126 units

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 55" className="w-32">
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--muted))" strokeWidth={7} strokeLinecap="round" />
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${arcLength} 126`} />
        <text x={50} y={45} textAnchor="middle" fontSize={18} fontWeight="bold" fill={color}>{score}%</text>
      </svg>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

export default function SimulatorFeedback({ score, decisions, narrative, visible }: SimulatorFeedbackProps) {
  if (!visible) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Resultado da Simulação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreGauge score={score} />

        {/* Decisions comparison */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Suas decisões vs. decisões ideais:</p>
          {decisions.map((d, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm border ${d.correct ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-start gap-2">
                {d.correct
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-muted-foreground">Sua escolha: <span className="font-medium">{d.userChoice}</span></p>
                  {!d.correct && <p className="text-muted-foreground">Ideal: <span className="font-medium text-green-600 dark:text-green-400">{d.idealChoice}</span></p>}
                  {d.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{d.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Narrative */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            O que aconteceria com o paciente:
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{narrative}</p>
        </div>

        <Badge variant="outline" className="mx-auto block w-fit">
          {score >= 80 ? "🏆 Excelente desempenho!" : score >= 50 ? "📈 Bom, mas pode melhorar" : "⚠️ Revise seus conceitos"}
        </Badge>
      </CardContent>
    </Card>
  );
}
