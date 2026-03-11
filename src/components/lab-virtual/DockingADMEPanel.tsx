import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Zap, Info, AlertTriangle, Activity } from "lucide-react";
import type { DrugProperties } from "./DrugDesignPanel";

interface DockingADMEPanelProps {
  drugProperties: DrugProperties;
  hasTarget: boolean;
  designMode: "sliders" | "smiles";
}

/* ─── Shared computation helpers ─── */

function computeBindingEnergy(p: DrugProperties): number {
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
  return { absorption, distribution, metabolism, excretion, toxicity };
}

function getLipinskiViolations(p: DrugProperties) {
  return [p.mw > 500, p.logP > 5, p.hbd > 5, p.hba > 10].filter(Boolean).length;
}

/* ─── "Rápido" tab (original) ─── */

function RapidoTab({ drugProperties, hasTarget }: { drugProperties: DrugProperties; hasTarget: boolean }) {
  const [result, setResult] = useState<{ dG: number; ki: string; adme: any[] } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      const dG = computeBindingEnergy(drugProperties);
      const kiVal = Math.exp(-dG / (0.001987 * 298.15)) * 1e-9;
      const ki = kiVal < 1e-6 ? `${(kiVal * 1e9).toFixed(2)} nM` : `${(kiVal * 1e6).toFixed(2)} µM`;
      const raw = computeADME(drugProperties);
      const adme = [
        { property: "Absorção", value: raw.absorption, fullMark: 100 },
        { property: "Distribuição", value: raw.distribution, fullMark: 100 },
        { property: "Metabolismo", value: raw.metabolism, fullMark: 100 },
        { property: "Excreção", value: raw.excretion, fullMark: 100 },
        { property: "Toxicidade", value: raw.toxicity, fullMark: 100 },
      ];
      setResult({ dG, ki, adme });
      setSimulating(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSimulate} disabled={simulating || !hasTarget} className="w-full">
        {simulating ? "Simulando..." : "Simular Interação Fármaco-Receptor"}
      </Button>
      {!hasTarget && <p className="text-xs text-muted-foreground">Selecione um alvo no Módulo 1 para habilitar.</p>}
      {result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="ΔG" tooltip="Energia livre de Gibbs de ligação. Valores mais negativos indicam maior afinidade." value={`${result.dG}`} unit="kcal/mol" />
            <MetricCard label="Ki estimado" tooltip="Constante de inibição estimada. Menores valores indicam maior potência." value={result.ki} />
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={result.adme}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="property" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
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
    </div>
  );
}

/* ─── Reusable metric card ─── */

function MetricCard({ label, tooltip, value, unit, colorClass }: { label: string; tooltip: string; value: string; unit?: string; colorClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <p className={`text-xl font-bold font-mono ${colorClass || "text-primary"}`}>
        {value} {unit && <span className="text-xs">{unit}</span>}
      </p>
    </div>
  );
}

/* ─── Circular progress ring (SVG) ─── */

function CircularProgress({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "hsl(152, 70%, 45%)" : value >= 40 ? "hsl(45, 90%, 50%)" : "hsl(0, 75%, 55%)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="text-2xl font-bold font-mono text-primary -mt-[76px]">{value}%</span>
      <span className="text-xs text-muted-foreground mt-8">Score de Afinidade</span>
    </div>
  );
}

/* ─── Loading overlay ─── */

const LOADING_MESSAGES = [
  "Otimizando conformação 3D do ligante...",
  "Calculando energia livre de Gibbs...",
  "Avaliando interações hidrofóbicas...",
];

function DockingLoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-card/90 backdrop-blur-sm rounded-lg">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse text-center px-4">
        {LOADING_MESSAGES[msgIdx]}
      </p>
    </div>
  );
}

/* ─── Docking tab verdict ─── */

function getVerdict(dG: number, violations: number): { text: string; variant: "good" | "warning" | "moderate" | "bad" } {
  if (dG < -8 && violations <= 1) {
    return { text: "Candidato promissor com boa afinidade teórica e perfil farmacocinético favorável. Recomenda-se avançar para ensaios pré-clínicos in vitro.", variant: "good" };
  }
  if (dG < -8 && violations > 1) {
    return { text: "O candidato apresenta excelente afinidade teórica com o alvo, mas problemas severos de biodisponibilidade oral. Considere otimizar a estrutura (Hit-to-Lead) reduzindo a lipofilicidade ou o peso molecular.", variant: "warning" };
  }
  if (dG >= -8 && violations <= 1) {
    return { text: "Afinidade moderada com o receptor-alvo. Considere modificações estruturais para melhorar a interação fármaco-receptor, como a adição de grupos farmacofóricos complementares.", variant: "moderate" };
  }
  return { text: "Candidato desfavorável. Baixa afinidade teórica combinada com problemas farmacocinéticos significativos. Recomenda-se redesenho completo da molécula.", variant: "bad" };
}

/* ─── "Docking" tab (new) ─── */

function DockingTab({ drugProperties, hasTarget }: { drugProperties: DrugProperties; hasTarget: boolean }) {
  const [result, setResult] = useState<{
    dG: number;
    kd: string;
    affinityScore: number;
    admeRadar: any[];
    violations: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = useCallback(() => {
    setSimulating(true);
    setTimeout(() => {
      // ΔG with randomness (-5 to -12 range)
      const baseDG = computeBindingEnergy(drugProperties);
      const randomOffset = (Math.random() - 0.5) * 2; // ±1
      const dG = Math.max(-12, Math.min(-5, Math.round((baseDG + randomOffset) * 100) / 100));

      // Kd from ΔG
      const kdVal = Math.exp(dG / (0.001987 * 298.15)) * 1e9; // in nM
      const kd = kdVal < 1000 ? `${kdVal.toFixed(2)} nM` : `${(kdVal / 1000).toFixed(2)} µM`;

      // Affinity score (0-100)
      const affinityScore = Math.round(Math.min(100, Math.max(0, ((Math.abs(dG) - 5) / 7) * 100)));

      // ADME radar connected to Lipinski
      const violations = getLipinskiViolations(drugProperties);
      const raw = computeADME(drugProperties);
      // Invert toxicity to "Baixa Toxicidade"
      const lowTox = Math.max(10, Math.min(100, 100 - raw.toxicity));
      // If Lipinski violated on absorption-related rules, penalize absorption
      const absorptionFinal = violations > 0
        ? Math.max(10, Math.min(raw.absorption, 20 + Math.random() * 15))
        : Math.max(70, Math.min(100, raw.absorption + Math.random() * 10));

      const admeRadar = [
        { property: "Absorção", value: Math.round(absorptionFinal), fullMark: 100 },
        { property: "Distribuição", value: raw.distribution, fullMark: 100 },
        { property: "Metabolismo", value: raw.metabolism, fullMark: 100 },
        { property: "Excreção", value: raw.excretion, fullMark: 100 },
        { property: "Baixa Toxicidade", value: lowTox, fullMark: 100 },
      ];

      setResult({ dG, kd, affinityScore, admeRadar, violations });
      setSimulating(false);
    }, 3000);
  }, [drugProperties]);

  const verdictData = result ? getVerdict(result.dG, result.violations) : null;
  const verdictColors: Record<string, string> = {
    good: "border-emerald-600/50 bg-emerald-950/30 text-emerald-200",
    warning: "border-yellow-600/50 bg-yellow-950/30 text-yellow-200",
    moderate: "border-blue-600/50 bg-blue-950/30 text-blue-200",
    bad: "border-red-600/50 bg-red-950/30 text-red-200",
  };

  return (
    <div className="space-y-4 relative">
      {simulating && <DockingLoadingOverlay />}

      <Button
        onClick={handleSimulate}
        disabled={simulating || !hasTarget}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        <Activity className="h-5 w-5 mr-2" />
        Simular Interação Fármaco-Receptor (Docking)
      </Button>

      {!hasTarget && <p className="text-xs text-muted-foreground">Selecione um alvo no Módulo 1 para habilitar.</p>}

      {result && (
        <>
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="ΔG"
              tooltip="Energia livre de Gibbs de ligação. Valores mais negativos indicam maior afinidade fármaco-receptor."
              value={`${result.dG}`}
              unit="kcal/mol"
              colorClass={result.dG < -8 ? "text-emerald-400" : "text-orange-400"}
            />
            <MetricCard
              label="Kd"
              tooltip="Constante de dissociação. Valores menores indicam ligação mais forte e estável ao receptor."
              value={result.kd}
            />
            <div className="rounded-lg border border-border bg-background p-3 flex items-center justify-center">
              <CircularProgress value={result.affinityScore} size={100} strokeWidth={8} />
            </div>
          </div>

          {/* ADME-Tox Radar */}
          <div className="rounded-lg border border-border bg-background p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 text-center">Perfil ADME-Tox</h4>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={result.admeRadar}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="property" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="ADME-Tox" dataKey="value" stroke="hsl(168, 80%, 42%)" fill="hsl(168, 80%, 42%)" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
              {result.admeRadar.map((d: any) => (
                <Badge key={d.property} variant={d.value >= 60 ? "default" : "secondary"} className={d.value >= 60 ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                  {d.property}: {d.value}%
                </Badge>
              ))}
            </div>
          </div>

          {/* Verdict */}
          {verdictData && (
            <div className={`rounded-lg border p-4 ${verdictColors[verdictData.variant]}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">Veredito do Protótipo</h4>
                  <p className="text-xs leading-relaxed">{verdictData.text}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export function DockingADMEPanel({ drugProperties, hasTarget, designMode }: DockingADMEPanelProps) {
  const dockingTab = designMode === "smiles" ? "docking" : "rapido";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-primary" />
          Módulo 3 — Docking & ADME
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={dockingTab} className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="rapido" className="flex-1" disabled>Rápido</TabsTrigger>
            <TabsTrigger value="docking" className="flex-1" disabled>Docking</TabsTrigger>
          </TabsList>
          <TabsContent value="rapido">
            <RapidoTab drugProperties={drugProperties} hasTarget={hasTarget} />
          </TabsContent>
          <TabsContent value="docking">
            <DockingTab drugProperties={drugProperties} hasTarget={hasTarget} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
