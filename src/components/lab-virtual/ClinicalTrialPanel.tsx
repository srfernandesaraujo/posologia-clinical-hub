import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Users, Info } from "lucide-react";
import type { DrugProperties } from "./DrugDesignPanel";

interface ClinicalTrialPanelProps {
  drugProperties: DrugProperties;
  hasTarget: boolean;
}

function generateTrialData(p: DrugProperties, sampleSize: number, phase: string) {
  const baseDrugEfficacy = Math.max(0.2, Math.min(0.95,
    0.75 - Math.abs(p.logP - 2.5) * 0.06 - (p.mw > 500 ? 0.15 : 0) - p.hbd * 0.02
  ));
  const placeboRate = 0.25;
  const toxRate = Math.min(0.6, 0.05 + (p.logP > 5 ? 0.15 : 0) + (p.mw > 500 ? 0.1 : 0) + p.hbd * 0.02);

  const phaseMultiplier = phase === "I" ? 0.7 : phase === "II" ? 0.85 : 1;
  const efficacy = baseDrugEfficacy * phaseMultiplier;

  // Kaplan-Meier style survival data
  const weeks = phase === "I" ? 12 : phase === "II" ? 24 : 52;
  const curve = [];
  let drugSurvival = 100;
  let placeboSurvival = 100;

  for (let w = 0; w <= weeks; w += phase === "III" ? 4 : 2) {
    const drugDecay = (1 - efficacy) * (Math.random() * 3 + 1);
    const placeboDecay = (1 - placeboRate) * (Math.random() * 4 + 2);
    drugSurvival = Math.max(10, drugSurvival - drugDecay);
    placeboSurvival = Math.max(5, placeboSurvival - placeboDecay);
    curve.push({
      semana: `S${w}`,
      "Grupo Tratamento": Math.round(drugSurvival * 10) / 10,
      "Grupo Placebo": Math.round(placeboSurvival * 10) / 10,
    });
  }

  // Metabolizer variation
  const slowMet = { response: efficacy * 1.2, adverse: toxRate * 1.5 };
  const normalMet = { response: efficacy, adverse: toxRate };
  const fastMet = { response: efficacy * 0.6, adverse: toxRate * 0.7 };

  return {
    curve,
    efficacy: Math.round(efficacy * 100),
    adverseRate: Math.round(toxRate * 100),
    sampleSize,
    pValue: efficacy > 0.4 ? (Math.random() * 0.04 + 0.001).toFixed(3) : (Math.random() * 0.3 + 0.05).toFixed(3),
    metabolizers: {
      slow: { response: Math.round(slowMet.response * 100), adverse: Math.round(slowMet.adverse * 100) },
      normal: { response: Math.round(normalMet.response * 100), adverse: Math.round(normalMet.adverse * 100) },
      fast: { response: Math.round(fastMet.response * 100), adverse: Math.round(fastMet.adverse * 100) },
    },
  };
}

export function ClinicalTrialPanel({ drugProperties, hasTarget }: ClinicalTrialPanelProps) {
  const [phase, setPhase] = useState("II");
  const [sampleSize, setSampleSize] = useState(200);
  const [result, setResult] = useState<ReturnType<typeof generateTrialData> | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setResult(generateTrialData(drugProperties, sampleSize, phase));
      setRunning(false);
    }, 1500);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Módulo 4 — Ensaios Clínicos Simulados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Fase do Ensaio</label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="I">Fase I (Segurança)</SelectItem>
                <SelectItem value="II">Fase II (Eficácia)</SelectItem>
                <SelectItem value="III">Fase III (Confirmatório)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <label className="text-xs text-muted-foreground">Tamanho da Amostra</label>
              <span className="text-xs font-mono text-primary">{sampleSize}</span>
            </div>
            <Slider value={[sampleSize]} min={30} max={1000} step={10} onValueChange={([v]) => setSampleSize(v)} />
          </div>
        </div>

        <Button onClick={handleRun} disabled={running || !hasTarget} className="w-full" variant="outline">
          {running ? "Executando ensaio..." : "Iniciar Ensaio Clínico Virtual"}
        </Button>

        {!hasTarget && (
          <p className="text-xs text-muted-foreground">Selecione um alvo no Módulo 1 para habilitar.</p>
        )}

        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-xs text-muted-foreground">Eficácia</p>
                <p className="text-lg font-bold text-primary">{result.efficacy}%</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-xs text-muted-foreground">Eventos Adversos</p>
                <p className="text-lg font-bold text-destructive">{result.adverseRate}%</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-xs text-muted-foreground">p-valor</p>
                <p className={`text-lg font-bold ${parseFloat(result.pValue) < 0.05 ? "text-emerald-400" : "text-yellow-400"}`}>
                  {result.pValue}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Curva de Sobrevida (Kaplan-Meier Simplificada)</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.curve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                    <XAxis dataKey="semana" tick={{ fill: "hsl(210, 20%, 60%)", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(210, 20%, 60%)", fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Grupo Tratamento" stroke="hsl(168, 80%, 42%)" fill="hsl(168, 80%, 42%)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="Grupo Placebo" stroke="hsl(0, 62%, 50%)" fill="hsl(0, 62%, 50%)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs text-muted-foreground font-medium">Variação Farmacogenética</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Polimorfismos genéticos em enzimas CYP afetam a velocidade de metabolização, alterando eficácia e segurança.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["slow", "normal", "fast"] as const).map((type) => {
                  const labels = { slow: "Metabolizador Lento", normal: "Normal", fast: "Ultrarrápido" };
                  const data = result.metabolizers[type];
                  return (
                    <div key={type} className="rounded-lg border border-border bg-background p-2 text-center">
                      <p className="text-muted-foreground mb-1">{labels[type]}</p>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 mb-1">{data.response}% resp.</Badge>
                      <Badge variant="destructive">{data.adverse}% adv.</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
