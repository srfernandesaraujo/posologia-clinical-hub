import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Zap, Info } from "lucide-react";
import type { DrugProperties } from "./DrugDesignPanel";

interface DockingADMEPanelProps {
  drugProperties: DrugProperties;
  hasTarget: boolean;
}

function computeBindingEnergy(p: DrugProperties): number {
  // Heuristic: ideal MW ~350, logP ~2.5, moderate HBD/HBA
  const mwPenalty = Math.abs(p.mw - 350) / 200;
  const logPPenalty = Math.abs(p.logP - 2.5) / 3;
  const hbPenalty = (p.hbd + p.hba) * 0.08;
  const base = -8.5;
  return Math.round((base + mwPenalty + logPPenalty + hbPenalty) * 100) / 100;
}

function computeADME(p: DrugProperties) {
  const clamp = (v: number) => Math.max(10, Math.min(100, Math.round(v)));
  const absorption = clamp(90 - Math.abs(p.logP - 2) * 12 - (p.mw > 500 ? 25 : 0));
  const distribution = clamp(70 + p.logP * 5 - (p.mw > 400 ? 15 : 0));
  const metabolism = clamp(60 + p.logP * 3 - p.hbd * 2);
  const excretion = clamp(80 - p.logP * 8 + p.hba * 2);
  const toxicity = clamp(20 + (p.logP > 5 ? 30 : 0) + (p.mw > 500 ? 15 : 0) + p.hbd * 3);

  return [
    { property: "Absorção", value: absorption, fullMark: 100 },
    { property: "Distribuição", value: distribution, fullMark: 100 },
    { property: "Metabolismo", value: metabolism, fullMark: 100 },
    { property: "Excreção", value: excretion, fullMark: 100 },
    { property: "Toxicidade", value: toxicity, fullMark: 100 },
  ];
}

export function DockingADMEPanel({ drugProperties, hasTarget }: DockingADMEPanelProps) {
  const [result, setResult] = useState<{ dG: number; ki: string; adme: any[] } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      const dG = computeBindingEnergy(drugProperties);
      const kiVal = Math.exp(-dG / (0.001987 * 298.15)) * 1e-9;
      const ki = kiVal < 1e-6 ? `${(kiVal * 1e9).toFixed(2)} nM` : `${(kiVal * 1e6).toFixed(2)} µM`;
      const adme = computeADME(drugProperties);
      setResult({ dG, ki, adme });
      setSimulating(false);
    }, 1200);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-primary" />
          Módulo 3 — Docking & ADME
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSimulate} disabled={simulating || !hasTarget} className="w-full">
          {simulating ? "Simulando..." : "Simular Interação Fármaco-Receptor"}
        </Button>

        {!hasTarget && (
          <p className="text-xs text-muted-foreground">Selecione um alvo no Módulo 1 para habilitar.</p>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-xs text-muted-foreground">ΔG</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Energia livre de Gibbs de ligação. Valores mais negativos indicam maior afinidade fármaco-receptor.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xl font-bold font-mono text-primary">{result.dG} <span className="text-xs">kcal/mol</span></p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-xs text-muted-foreground">Ki estimado</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Constante de inibição estimada. Menores valores indicam maior potência do fármaco.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xl font-bold font-mono text-primary">{result.ki}</p>
              </div>
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={result.adme}>
                  <PolarGrid stroke="hsl(220, 20%, 20%)" />
                  <PolarAngleAxis dataKey="property" tick={{ fill: "hsl(210, 20%, 70%)", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="ADME" dataKey="value" stroke="hsl(168, 80%, 42%)" fill="hsl(168, 80%, 42%)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {result.adme.map((d: any) => (
                <Badge key={d.property} variant={d.property === "Toxicidade" ? (d.value > 50 ? "destructive" : "secondary") : (d.value >= 60 ? "default" : "secondary")}
                  className={d.property !== "Toxicidade" && d.value >= 60 ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                  {d.property}: {d.value}%
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
