import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestTubes, Play, CheckCircle2, XCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { ForensicScenario } from "@/data/forensicScenarios";

interface ToxicologyLabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: { identifiedToxin: string; correct: boolean }) => void;
}

export function ToxicologyLabPanel({ scenario, isUnlocked, onComplete }: ToxicologyLabPanelProps) {
  const [matrix, setMatrix] = useState("");
  const [reagent, setReagent] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showChromatogram, setShowChromatogram] = useState(false);
  const [selectedSubstance, setSelectedSubstance] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const tox = scenario.toxicologyAnalysis;

  const injectHPLC = () => {
    setRunning(true);
    setProgress(0);
    setShowChromatogram(false);

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

  const confirmMatch = () => {
    const correct = selectedSubstance === tox.correctSubstance;
    setIsCorrect(correct);
    setConfirmed(true);
    onComplete({ identifiedToxin: selectedSubstance, correct });
  };

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
          {confirmed && <Badge variant={isCorrect ? "default" : "destructive"} className="ml-auto text-xs">{isCorrect ? "✓ Correto" : "✗ Incorreto"}</Badge>}
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

        {/* Chromatogram */}
        {showChromatogram && (
          <>
            {matrix !== tox.correctMatrix && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Matriz subótima selecionada. A matriz ideal era <strong>{tox.correctMatrix}</strong>. Os picos podem ter menor resolução.
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cromatograma HPLC — Tempo de Retenção × Absorbância</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={tox.chromatogram}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="time" label={{ value: "Tempo (min)", position: "insideBottom", offset: -5 }} tick={{ fontSize: 10 }} />
                  <YAxis label={{ value: "mAU", angle: -90, position: "insideLeft" }} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} mAU`, "Absorbância"]} labelFormatter={(l) => `t = ${l} min`} />
                  <ReferenceLine x={tox.peakRetentionTime} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Pico: ${tox.peakRetentionTime} min`, position: "top", fontSize: 10 }} />
                  <Area type="monotone" dataKey="absorbance" stroke="hsl(25 95% 53%)" fill="hsl(25 95% 53% / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {!confirmed && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">O pico principal está em <strong>{tox.peakRetentionTime} min</strong>. Qual substância corresponde?</p>
                <Select value={selectedSubstance} onValueChange={setSelectedSubstance}>
                  <SelectTrigger><SelectValue placeholder="Biblioteca de Padrões..." /></SelectTrigger>
                  <SelectContent>
                    {tox.library.map((l) => (
                      <SelectItem key={l.substance} value={l.substance}>
                        {l.substance} (tR = {l.retentionTime} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={confirmMatch} disabled={!selectedSubstance} size="sm" className="w-full">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar Identificação
                </Button>
              </div>
            )}

            {confirmed && (
              <div className={`p-3 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-destructive/30 bg-destructive/10"}`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  {isCorrect ? "Identificação toxicológica correta!" : `Incorreto. A substância é ${tox.correctSubstance}.`}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
