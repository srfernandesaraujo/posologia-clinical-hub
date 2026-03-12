import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { ForensicScenario } from "@/data/forensicScenarios";

interface LabResult {
  identifiedSubstance?: string;
  correct?: boolean;
  identifiedToxin?: string;
  matchedSuspect?: string;
}

interface ForensicConclusionPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  chemResult: LabResult | null;
  toxResult: LabResult | null;
  dnaResult: LabResult | null;
  onComplete: (result: { accusedIndex: number; correct: boolean; score: number }) => void;
}

export function ForensicConclusionPanel({ scenario, isUnlocked, chemResult, toxResult, dnaResult, onComplete }: ForensicConclusionPanelProps) {
  const [accusedIndex, setAccusedIndex] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  if (!isUnlocked) {
    return (
      <Card className="opacity-50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" /> Conclusão Pericial</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">🔒 Complete os 3 laboratórios para desbloquear.</p></CardContent>
      </Card>
    );
  }

  const confirmAccusation = () => {
    if (accusedIndex === null) return;
    const correct = accusedIndex === scenario.correctCulpritIndex;

    // Compute weighted score
    const chemScore = chemResult?.correct ? 25 : 0;
    const toxScore = toxResult?.correct ? 30 : 0;
    const dnaScore = dnaResult?.correct ? 25 : 0;
    const conclusionScore = correct ? 20 : 0;
    const total = chemScore + toxScore + dnaScore + conclusionScore;

    setIsCorrect(correct);
    setFinalScore(total);
    setConfirmed(true);
    onComplete({ accusedIndex, correct, score: total });
  };

  return (
    <Card className="border-green-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-green-600" />
          Conclusão Pericial — Cruzamento de Evidências
          {confirmed && <Badge className="ml-auto">{finalScore}%</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evidence summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground">Lab Químico</p>
            <p className="text-sm font-medium mt-1">{chemResult?.identifiedSubstance || "—"}</p>
            {chemResult && (
              <Badge variant={chemResult.correct ? "default" : "destructive"} className="text-[10px] mt-1">
                {chemResult.correct ? "Correto" : "Incorreto"}
              </Badge>
            )}
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground">Lab Toxicológico</p>
            <p className="text-sm font-medium mt-1">{toxResult?.identifiedToxin || "—"}</p>
            {toxResult && (
              <Badge variant={toxResult.correct ? "default" : "destructive"} className="text-[10px] mt-1">
                {toxResult.correct ? "Correto" : "Incorreto"}
              </Badge>
            )}
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground">Lab DNA</p>
            <p className="text-sm font-medium mt-1">{dnaResult?.matchedSuspect || "—"}</p>
            {dnaResult && (
              <Badge variant={dnaResult.correct ? "default" : "destructive"} className="text-[10px] mt-1">
                {dnaResult.correct ? "Match" : "Exclusão"}
              </Badge>
            )}
          </div>
        </div>

        {/* Accusation */}
        {!confirmed && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Com base nas evidências cruzadas, quem é o culpado?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {scenario.suspects.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setAccusedIndex(i)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                    accusedIndex === i ? "border-destructive bg-destructive/10 ring-1 ring-destructive/30" : "border-border hover:border-destructive/40"
                  }`}
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.relation}</p>
                </div>
              ))}
            </div>
            <Button onClick={confirmAccusation} disabled={accusedIndex === null} className="w-full" variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" /> Confirmar Acusação
            </Button>
          </div>
        )}

        {confirmed && (
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-destructive/30 bg-destructive/10"}`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                {isCorrect ? "Caso Solucionado!" : `Acusação incorreta. O culpado era ${scenario.suspects[scenario.correctCulpritIndex].name}.`}
              </div>
              <p className="text-sm text-muted-foreground">{scenario.solutionExplanation}</p>
            </div>

            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50">
              <span className="text-sm font-semibold">Score Final</span>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground space-x-2">
                  <span>Químico: {chemResult?.correct ? 25 : 0}</span>
                  <span>Toxicol.: {toxResult?.correct ? 30 : 0}</span>
                  <span>DNA: {dnaResult?.correct ? 25 : 0}</span>
                  <span>Conclusão: {isCorrect ? 20 : 0}</span>
                </div>
                <Badge className="text-lg px-3">{finalScore}%</Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
