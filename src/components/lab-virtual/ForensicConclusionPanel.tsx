import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import type { ForensicScenario } from "@/data/forensicScenarios";

interface ChemResult {
  identifiedSubstance: string;
  basePeakAnswer: number;
}

interface ToxResult {
  matrix: string;
  reagent: string;
  estimatedRT: number;
  selectedClass: string;
  identifiedToxin: string;
}

interface DnaResult {
  matchedSuspect: string;
  locusComparison: Record<string, Record<string, boolean>>;
}

interface ForensicConclusionPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  chemResult: ChemResult | null;
  toxResult: ToxResult | null;
  dnaResult: DnaResult | null;
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

  const chem = scenario.chemicalAnalysis;
  const tox = scenario.toxicologyAnalysis;
  const dna = scenario.dnaAnalysis;

  const confirmAccusation = () => {
    if (accusedIndex === null) return;
    const correct = accusedIndex === scenario.correctCulpritIndex;

    // Compute detailed scores
    const chemSubstanceOk = chemResult?.identifiedSubstance === chem.correctSubstance;
    const chemPeakOk = chemResult?.basePeakAnswer === chem.correctBasePeak;
    const chemScore = (chemSubstanceOk ? 15 : 0) + (chemPeakOk ? 10 : 0);

    const toxSubstanceOk = toxResult?.identifiedToxin === tox.correctSubstance;
    const toxClassOk = toxResult?.selectedClass === tox.correctClass;
    const toxMatrixOk = toxResult?.matrix === tox.correctMatrix;
    const toxReagentOk = toxResult?.reagent === tox.correctReagent;
    const toxRTOk = toxResult && Math.abs(toxResult.estimatedRT - tox.correctRetentionTime) <= 0.3;
    const toxScore = (toxSubstanceOk ? 10 : 0) + (toxClassOk ? 5 : 0) + (toxMatrixOk ? 5 : 0) + (toxReagentOk ? 5 : 0) + (toxRTOk ? 5 : 0);

    const dnaMatchOk = dnaResult?.matchedSuspect === dna.suspects[dna.correctSuspectIndex].label;
    const dnaScore = dnaMatchOk ? 25 : 0;

    const conclusionScore = correct ? 20 : 0;
    const total = chemScore + toxScore + dnaScore + conclusionScore;

    setIsCorrect(correct);
    setFinalScore(total);
    setConfirmed(true);
    onComplete({ accusedIndex, correct, score: total });
  };

  // Scoring helpers for display
  const chemSubstanceOk = chemResult?.identifiedSubstance === chem.correctSubstance;
  const chemPeakOk = chemResult?.basePeakAnswer === chem.correctBasePeak;
  const toxSubstanceOk = toxResult?.identifiedToxin === tox.correctSubstance;
  const toxClassOk = toxResult?.selectedClass === tox.correctClass;
  const toxMatrixOk = toxResult?.matrix === tox.correctMatrix;
  const toxReagentOk = toxResult?.reagent === tox.correctReagent;
  const toxRTOk = toxResult && Math.abs(toxResult.estimatedRT - tox.correctRetentionTime) <= 0.3;
  const dnaMatchOk = dnaResult?.matchedSuspect === dna.suspects[dna.correctSuspectIndex].label;

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
        {/* Pre-accusation: show collected answers (no correct/incorrect) */}
        {!confirmed && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">Lab Químico</p>
                <p className="text-sm font-medium mt-1">{chemResult?.identifiedSubstance || "—"}</p>
                <p className="text-[10px] text-muted-foreground">Pico base: {chemResult?.basePeakAnswer || "—"} m/z</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">Lab Toxicológico</p>
                <p className="text-sm font-medium mt-1">{toxResult?.identifiedToxin || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  Matriz: {toxResult?.matrix || "—"} | tR: {toxResult?.estimatedRT || "—"} min
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">Lab DNA</p>
                <p className="text-sm font-medium mt-1">{dnaResult?.matchedSuspect || "—"}</p>
              </div>
            </div>

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
          </>
        )}

        {/* Post-accusation: reveal ALL answers */}
        {confirmed && (
          <div className="space-y-4">
            {/* Verdict */}
            <div className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-destructive/30 bg-destructive/10"}`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                {isCorrect ? "Caso Solucionado!" : `Acusação incorreta. O culpado era ${scenario.suspects[scenario.correctCulpritIndex].name}.`}
              </div>
              <p className="text-sm text-muted-foreground">{scenario.solutionExplanation}</p>
            </div>

            {/* Detailed Lab Results Comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Análise Detalhada — Suas Respostas vs. Respostas Corretas</p>
              </div>

              {/* Chemical Lab */}
              <div className="bg-muted/20 rounded-lg p-3 border border-border/50 space-y-2">
                <p className="text-xs font-semibold uppercase text-primary">🔬 Laboratório Químico</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Pico base informado:</span>
                    <p className={`font-mono font-medium ${chemPeakOk ? "text-green-600" : "text-destructive"}`}>
                      {chemResult?.basePeakAnswer || "—"} m/z {chemPeakOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pico base correto:</span>
                    <p className="font-mono font-medium">{chem.correctBasePeak} m/z</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Substância selecionada:</span>
                    <p className={`font-medium ${chemSubstanceOk ? "text-green-600" : "text-destructive"}`}>
                      {chemResult?.identifiedSubstance || "—"} {chemSubstanceOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Substância correta:</span>
                    <p className="font-medium">{chem.correctSubstance}</p>
                  </div>
                </div>

                <div className="bg-background/50 rounded p-2 border border-border/30">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{scenario.chemicalExplanation}</p>
                </div>
              </div>

              {/* Toxicology Lab */}
              <div className="bg-muted/20 rounded-lg p-3 border border-border/50 space-y-2">
                <p className="text-xs font-semibold uppercase text-amber-500">🧪 Laboratório Toxicológico</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Matriz selecionada:</span>
                    <p className={`font-medium ${toxMatrixOk ? "text-green-600" : "text-destructive"}`}>
                      {toxResult?.matrix || "—"} {toxMatrixOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Matriz correta:</span>
                    <p className="font-medium">{tox.correctMatrix}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reagente selecionado:</span>
                    <p className={`font-medium ${toxReagentOk ? "text-green-600" : "text-destructive"}`}>
                      {toxResult?.reagent || "—"} {toxReagentOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reagente correto:</span>
                    <p className="font-medium">{tox.correctReagent}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">tR estimado:</span>
                    <p className={`font-mono font-medium ${toxRTOk ? "text-green-600" : "text-destructive"}`}>
                      {toxResult?.estimatedRT || "—"} min {toxRTOk ? "✓" : "✗"} <span className="text-[9px] text-muted-foreground">(±0.3)</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">tR correto:</span>
                    <p className="font-mono font-medium">{tox.correctRetentionTime} min</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe selecionada:</span>
                    <p className={`font-medium ${toxClassOk ? "text-green-600" : "text-destructive"}`}>
                      {toxResult?.selectedClass || "—"} {toxClassOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe correta:</span>
                    <p className="font-medium">{tox.correctClass}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Substância selecionada:</span>
                    <p className={`font-medium ${toxSubstanceOk ? "text-green-600" : "text-destructive"}`}>
                      {toxResult?.identifiedToxin || "—"} {toxSubstanceOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Substância correta:</span>
                    <p className="font-medium">{tox.correctSubstance}</p>
                  </div>
                </div>

                <div className="bg-background/50 rounded p-2 border border-border/30">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{scenario.toxExplanation}</p>
                </div>
              </div>

              {/* DNA Lab */}
              <div className="bg-muted/20 rounded-lg p-3 border border-border/50 space-y-2">
                <p className="text-xs font-semibold uppercase text-violet-500">🧬 Laboratório de DNA</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Suspeito selecionado:</span>
                    <p className={`font-medium ${dnaMatchOk ? "text-green-600" : "text-destructive"}`}>
                      {dnaResult?.matchedSuspect || "—"} {dnaMatchOk ? "✓" : "✗"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Suspeito correto:</span>
                    <p className="font-medium">{dna.suspects[dna.correctSuspectIndex].label}</p>
                  </div>
                </div>

                <div className="bg-background/50 rounded p-2 border border-border/30">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{scenario.dnaExplanation}</p>
                </div>
              </div>
            </div>

            {/* Final Score */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Score Final</span>
                <Badge className="text-lg px-3">{finalScore}%</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-background border border-border/30">
                  <p className="text-muted-foreground">Substância</p>
                  <p className="font-semibold">{chemSubstanceOk ? "15" : "0"}/15</p>
                </div>
                <div className="text-center p-2 rounded bg-background border border-border/30">
                  <p className="text-muted-foreground">Pico base</p>
                  <p className="font-semibold">{chemPeakOk ? "10" : "0"}/10</p>
                </div>
                <div className="text-center p-2 rounded bg-background border border-border/30">
                  <p className="text-muted-foreground">Toxicologia</p>
                  <p className="font-semibold">
                    {(toxSubstanceOk ? 10 : 0) + (toxClassOk ? 5 : 0) + (toxMatrixOk ? 5 : 0) + (toxReagentOk ? 5 : 0) + (toxRTOk ? 5 : 0)}/30
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-background border border-border/30">
                  <p className="text-muted-foreground">DNA</p>
                  <p className="font-semibold">{dnaMatchOk ? "25" : "0"}/25</p>
                </div>
                <div className="text-center p-2 rounded bg-background border border-border/30">
                  <p className="text-muted-foreground">Acusação</p>
                  <p className="font-semibold">{isCorrect ? "20" : "0"}/20</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
