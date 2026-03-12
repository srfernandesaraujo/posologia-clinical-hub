import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { FlaskConical, Play, ClipboardCheck, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ForensicScenario, ForensicSample } from "@/data/forensicScenarios";

interface ChemicalLabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: { identifiedSubstance: string; basePeakAnswer: number }) => void;
}

export function ChemicalLabPanel({ scenario, isUnlocked, onComplete }: ChemicalLabPanelProps) {
  const [selectedSample, setSelectedSample] = useState<ForensicSample | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [basePeakInput, setBasePeakInput] = useState("");
  const [selectedSubstance, setSelectedSubstance] = useState("");
  const [confirmed, setConfirmed] = useState(false);

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
    setConfirmed(true);
    onComplete({
      identifiedSubstance: selectedSubstance,
      basePeakAnswer: parseFloat(basePeakInput) || 0,
    });
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
          {confirmed && <Badge variant="secondary" className="ml-auto text-xs">✓ Resposta registrada</Badge>}
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

            {/* Reference Table - shown after spectrum */}
            {showSpectrum && (
              <div className="mt-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-1 mb-2">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Tabela de Referência — Padrões Conhecidos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-semibold text-muted-foreground">Substância</th>
                        <th className="text-center py-1 px-2 font-semibold text-muted-foreground">Pico Base (m/z)</th>
                        <th className="text-left py-1 pl-2 font-semibold text-muted-foreground">Fragmentos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.referenceTable.map((ref) => (
                        <tr key={ref.substance} className="border-b border-border/20">
                          <td className="py-1.5 pr-2 font-medium">{ref.substance}</td>
                          <td className="py-1.5 px-2 text-center font-mono">{ref.basePeak}</td>
                          <td className="py-1.5 pl-2 text-muted-foreground font-mono">{ref.fragments.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: Spectrum + Questions */}
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
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Espectro de Massa — m/z vs Intensidade Relativa (%)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analysis.spectrum}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mz" label={{ value: "m/z", position: "insideBottom", offset: -5 }} tick={{ fontSize: 10 }} />
                      <YAxis label={{ value: "%", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Intensidade"]} labelFormatter={(l) => `m/z = ${l}`} />
                      <Line type="monotone" dataKey="intensity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {!confirmed && (
                  <div className="space-y-3 bg-background rounded-lg p-3 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Análise do Espectro</p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">1. Qual é o pico base (m/z) do espectro? <span className="text-muted-foreground">(maior intensidade)</span></label>
                      <Input
                        type="number"
                        placeholder="Ex: 334"
                        value={basePeakInput}
                        onChange={(e) => setBasePeakInput(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">2. Com base no pico base e nos fragmentos, qual substância corresponde?</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {analysis.referenceTable.map((ref) => (
                          <Button
                            key={ref.substance}
                            variant={selectedSubstance === ref.substance ? "default" : "outline"}
                            size="sm"
                            className="text-xs justify-start h-auto py-1.5"
                            onClick={() => setSelectedSubstance(ref.substance)}
                          >
                            {ref.substance}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={confirmIdentification}
                      disabled={!selectedSubstance || !basePeakInput}
                      size="sm"
                      className="w-full"
                    >
                      <ClipboardCheck className="h-3 w-3 mr-1" /> Registrar Análise
                    </Button>
                  </div>
                )}

                {confirmed && (
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ClipboardCheck className="h-4 w-4" />
                      Resposta registrada. O resultado será revelado na conclusão pericial.
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      <p>Pico base informado: <span className="font-mono font-medium">{basePeakInput} m/z</span></p>
                      <p>Substância selecionada: <span className="font-medium">{selectedSubstance}</span></p>
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
