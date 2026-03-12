import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestTubes, Play, ClipboardCheck, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ForensicScenario } from "@/data/forensicScenarios";

interface ToxicologyLabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: {
    matrix: string;
    reagent: string;
    estimatedRT: number;
    selectedClass: string;
    identifiedToxin: string;
  }) => void;
}

export function ToxicologyLabPanel({ scenario, isUnlocked, onComplete }: ToxicologyLabPanelProps) {
  const [matrix, setMatrix] = useState("");
  const [reagent, setReagent] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showChromatogram, setShowChromatogram] = useState(false);
  const [estimatedRT, setEstimatedRT] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubstance, setSelectedSubstance] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [usedSuboptimalMatrix, setUsedSuboptimalMatrix] = useState(false);

  const tox = scenario.toxicologyAnalysis;

  const injectHPLC = () => {
    setRunning(true);
    setProgress(0);
    setShowChromatogram(false);
    setUsedSuboptimalMatrix(matrix !== tox.correctMatrix);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setRunning(false);
        setShowChromatogram(true);
      }
      setProgress(Math.min(p, 100));
    }, 400);
  };

  const confirmAnalysis = () => {
    setConfirmed(true);
    onComplete({
      matrix,
      reagent,
      estimatedRT: parseFloat(estimatedRT) || 0,
      selectedClass,
      identifiedToxin: selectedSubstance,
    });
  };

  // Use noisy chromatogram if suboptimal matrix
  const chromatogramData = usedSuboptimalMatrix ? tox.noisyChromatogram : tox.chromatogram;

  // Get substances for selected class
  const classRange = tox.retentionRanges.find((r) => r.className === selectedClass);
  const substancesForClass = classRange?.substances || [];

  if (!isUnlocked) {
    return (
      <Card className="opacity-50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TestTubes className="h-4 w-4" /> Lab Toxicológico — HPLC</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">🔒 Complete o Lab Químico para desbloquear.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TestTubes className="h-4 w-4 text-amber-500" />
          Laboratório Toxicológico — HPLC
          {confirmed && <Badge variant="secondary" className="ml-auto text-xs">✓ Resposta registrada</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preparation form */}
        {!showChromatogram && !running && !confirmed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Matriz Biológica</label>
              <Select value={matrix} onValueChange={setMatrix}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tox.matrices.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reagente de Extração</label>
              <Select value={reagent} onValueChange={setReagent}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tox.reagents.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button onClick={injectHPLC} disabled={!matrix || !reagent} size="sm" className="w-full">
                <Play className="h-3 w-3 mr-1" /> Injetar no HPLC
              </Button>
            </div>
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="space-y-2 py-4">
            <p className="text-xs text-muted-foreground text-center">Corrida cromatográfica em andamento...</p>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-center text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Chromatogram + Analysis */}
        {showChromatogram && (
          <>
            {usedSuboptimalMatrix && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                ⚠ A resolução cromatográfica pode estar comprometida pela escolha da matriz. Picos com menor definição e maior ruído de fundo.
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cromatograma HPLC — Tempo de Retenção × Absorbância</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chromatogramData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Tempo (min)", position: "insideBottom", offset: -5 }}
                    tick={{ fontSize: 10 }}
                    type="number"
                    domain={[0, 'dataMax']}
                  />
                  <YAxis label={{ value: "mAU", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} mAU`, "Absorbância"]} labelFormatter={(l) => `t = ${l} min`} />
                  <Area type="monotone" dataKey="absorbance" stroke="hsl(25 95% 53%)" fill="hsl(25 95% 53% / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Reference Ranges Table */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-1 mb-2">
                <Info className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">Tabela de Referência — Faixas de Tempo de Retenção</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1 pr-2 font-semibold text-muted-foreground">Classe</th>
                      <th className="text-center py-1 px-2 font-semibold text-muted-foreground">Faixa (min)</th>
                      <th className="text-left py-1 pl-2 font-semibold text-muted-foreground">Substâncias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tox.retentionRanges.map((range) => (
                      <tr key={range.className} className="border-b border-border/20">
                        <td className="py-1.5 pr-2 font-medium">{range.className}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{range.rangeMin}–{range.rangeMax}</td>
                        <td className="py-1.5 pl-2 text-muted-foreground">{range.substances.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!confirmed && (
              <div className="space-y-3 bg-background rounded-lg p-3 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Interpretação do Cromatograma</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    1. Qual o tempo de retenção estimado do pico principal? <span className="text-muted-foreground">(leia o eixo X)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 4.2"
                    value={estimatedRT}
                    onChange={(e) => setEstimatedRT(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">2. Com base na faixa, qual classe de substância?</label>
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSubstance(""); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione a classe..." /></SelectTrigger>
                    <SelectContent>
                      {tox.retentionRanges.map((r) => (
                        <SelectItem key={r.className} value={r.className}>{r.className}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClass && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">3. Qual substância específica?</label>
                    <Select value={selectedSubstance} onValueChange={setSelectedSubstance}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {substancesForClass.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={confirmAnalysis}
                  disabled={!estimatedRT || !selectedClass || !selectedSubstance}
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
                  <p>Matriz: <span className="font-medium">{matrix}</span> | Reagente: <span className="font-medium">{reagent}</span></p>
                  <p>tR estimado: <span className="font-mono font-medium">{estimatedRT} min</span></p>
                  <p>Classe: <span className="font-medium">{selectedClass}</span></p>
                  <p>Substância: <span className="font-medium">{selectedSubstance}</span></p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
