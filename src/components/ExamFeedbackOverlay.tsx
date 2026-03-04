import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Trophy, Home } from "lucide-react";

const SIMULATOR_LABELS: Record<string, string> = {
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  tdm: "TDM",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
  "bomba-infusao": "Bomba de Infusão",
  interacoes: "Interações",
  "desmame-benzo": "Desmame Benzo",
};

interface ExamFeedbackOverlayProps {
  score: number;
  simulatorSlug: string;
  caseTitle?: string;
  examProgress: { current: number; total: number };
  onProceed: () => void;
  isFinalActivity: boolean;
}

export function ExamFeedbackOverlay({
  score,
  simulatorSlug,
  caseTitle,
  examProgress,
  onProceed,
  isFinalActivity,
}: ExamFeedbackOverlayProps) {
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg = score >= 80 ? "bg-green-100 dark:bg-green-900/30" : score >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30";
  const scoreMessage = score >= 80
    ? "Excelente desempenho! 🎉"
    : score >= 50
      ? "Bom trabalho, mas há pontos a melhorar."
      : "Desempenho abaixo do esperado. Revise os conceitos.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-8 space-y-6 text-center">
          <div className={`mx-auto inline-flex rounded-full p-4 ${scoreBg}`}>
            {isFinalActivity ? (
              <Trophy className={`h-12 w-12 ${scoreColor}`} />
            ) : (
              <CheckCircle className={`h-12 w-12 ${scoreColor}`} />
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Atividade {examProgress.current} de {examProgress.total}
            </p>
            <h2 className="text-xl font-bold">
              {isFinalActivity ? "Prova Finalizada!" : "Atividade Concluída!"}
            </h2>
          </div>

          <div>
            <Badge variant="outline" className="mb-2">
              {SIMULATOR_LABELS[simulatorSlug] || simulatorSlug}
            </Badge>
            {caseTitle && (
              <p className="text-xs text-muted-foreground">{caseTitle}</p>
            )}
          </div>

          <div>
            <p className={`text-5xl font-bold ${scoreColor}`}>{score}%</p>
            <p className="text-sm text-muted-foreground mt-2">{scoreMessage}</p>
          </div>

          {isFinalActivity && (
            <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-1">
              <p className="font-medium">📋 Próximos passos:</p>
              <p className="text-muted-foreground">
                Seus resultados foram registrados. O professor poderá analisar seu desempenho 
                em cada atividade e fornecer um feedback mais estruturado.
              </p>
            </div>
          )}

          <Button onClick={onProceed} size="lg" className="w-full">
            {isFinalActivity ? (
              <>
                <Home className="h-4 w-4 mr-2" />
                Finalizar e Voltar
              </>
            ) : (
              <>
                Próxima Atividade
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
