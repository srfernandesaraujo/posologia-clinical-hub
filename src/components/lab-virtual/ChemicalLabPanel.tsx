import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, Play, CheckCircle2, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ForensicScenario, ForensicSample } from "@/data/forensicScenarios";

interface ChemicalLabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: { identifiedSubstance: string; correct: boolean }) => void;
}

export function ChemicalLabPanel({ scenario, isUnlocked, onComplete }: ChemicalLabPanelProps) {
  const [selectedSample, setSelectedSample] = useState<ForensicSample | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const analysis = scenario.chemicalAnalysis;

  const startAnalysis = () => {
    if (!selectedSample) return;
    setAnalyzing(true);
    setProgress(0);
    setShowSpectrum(false);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setAnalyzing(false);
        setShowSpectrum(true);
      }
      setProgress(Math.min(p, 100));
    }, 300);
  };

  const confirmIdentification = () => {
    const correct = selectedMatch === analysis.correctSubstance;
    setIsCorrect(correct);
    setConfirmed(true);
    onComplete({ identifiedSubstance: selectedMatch, correct });
  };

  if (!isUnlocked) {
    return (
      <Card className="opacity-50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Lab Químico — Espectrômetro de Massa</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">🔒 Complete a etapa anterior para desbloquear.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Laboratório Químico — Espectrômetro de Massa
          {confirmed && <Badge variant={isCorrect ? "default" : "destructive"} className="ml-auto text-xs">{isCorrect ? "✓ Correto" : "✗ Incorreto"}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Samples */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Amostras Recebidas</h4>
            {scenario.samples.map((s) => (
              <div
                key={s.id}
                onClick={() => !confirmed && setSelectedSample(s)}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                  selectedSample?.id === s.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                } ${confirmed ? "pointer-events-none opacity-70" : ""}`}
              >
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}

            {selectedSample && !showSpectrum && !confirmed && (
              <Button onClick={startAnalysis} disabled={analyzing} className="w-full mt-2" size="sm">
                {analyzing ? <><Progress value={progress} className="h-2 w-24 mr-2" /> Analisando...</> : <><Play className="h-3 w-3 mr-1" /> Iniciar Análise</>}
              </Button>
            )}
          </div>

          {/* Right: Spectrum + Result */}
          <div className="space-y-3">
            {analyzing && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Processando amostra no espectrômetro...</p>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {showSpectrum && (
              <>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Espectro de Massa — m/z vs Intensidade</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analysis.spectrum}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mz" label={{ value: "m/z", position: "insideBottom", offset: -5 }} tick={{ fontSize: 10 }} />
                      <YAxis label={{ value: "%", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Intensidade"]} labelFormatter={(l) => `m/z = ${l}`} />
                      <Line type="monotone" dataKey="intensity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-background rounded-lg p-3 border border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Comparação com Banco de Dados</p>
                  {analysis.dbMatches.map((m) => (
                    <div key={m.substance} className="flex items-center justify-between text-sm">
                      <span>{m.substance}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={m.similarity} className="h-1.5 w-20" />
                        <span className="text-xs text-muted-foreground w-8">{m.similarity}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!confirmed && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Selecione a substância identificada:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {analysis.dbMatches.map((m) => (
                        <Button
                          key={m.substance}
                          variant={selectedMatch === m.substance ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setSelectedMatch(m.substance)}
                        >
                          {m.substance}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={confirmIdentification} disabled={!selectedMatch} size="sm" className="w-full">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar Identificação
                    </Button>
                  </div>
                )}

                {confirmed && (
                  <div className={`p-3 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-destructive/30 bg-destructive/10"}`}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      {isCorrect ? "Identificação correta!" : `Incorreto. A substância é ${analysis.correctSubstance}.`}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
