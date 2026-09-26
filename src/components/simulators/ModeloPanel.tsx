import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { evalExpr } from "@/lib/safeExpr";

/**
 * Painel "modelo" dos simuladores criados por IA (generate-tool): o aluno ajusta parâmetros (controles deslizantes) e vê
 * resultados e curvas recalculados por fórmulas, sem motor escrito à mão. Não é corrigido: serve para explorar antes de
 * decidir no painel radio/checklist da etapa (é o "ajuste" quando o simulador precisa de cálculo, não só de comparação).
 * As fórmulas são avaliadas por `evalExpr` (sem eval).
 */
export interface ModeloConfig {
  inputs: { name: string; label: string; unit?: string; min: number; max: number; step?: number; default: number }[];
  outputs: { label: string; expr: string; unit?: string; decimals?: number; bom?: string; ruim?: string }[];
  series?: {
    xLabel?: string; yLabel?: string; xFrom: number; xTo: number; xStep?: number;
    lines: { name: string; expr: string; color?: string }[];
    refLines?: { y: number; label?: string; color?: string }[];
  };
  formulaHint?: string;
}

const CORES = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-5))", "hsl(var(--chart-4))"];
const TOOLTIP_STYLE = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" },
  labelStyle: { color: "hsl(var(--foreground))" },
  itemStyle: { color: "hsl(var(--foreground))" },
};

const safe = (expr: string, scope: Record<string, number>): number | null => {
  try {
    const v = evalExpr(expr, scope);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

export default function ModeloPanel({ config }: { config: ModeloConfig }) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(config.inputs.map((i) => [i.name, i.default])));
  const outs = useMemo(
    () => config.outputs.map((o) => {
      const v = safe(o.expr, vals);
      const dec = o.decimals ?? 1;
      const ruim = o.ruim ? safe(o.ruim, vals) : null;
      const bom = o.bom ? safe(o.bom, vals) : null;
      return { ...o, v, texto: v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }), tom: ruim ? "ruim" : bom ? "bom" : "neutro" };
    }),
    [config.outputs, vals],
  );
  const dados = useMemo(() => {
    const s = config.series;
    if (!s) return [];
    const passo = s.xStep && s.xStep > 0 ? s.xStep : (s.xTo - s.xFrom) / 24;
    const pts: Record<string, number | null>[] = [];
    for (let t = s.xFrom, n = 0; t <= s.xTo + 1e-9 && n < 400; t += passo, n++) {
      const row: Record<string, number | null> = { t: +t.toFixed(4) };
      s.lines.forEach((l, i) => { row[`y${i}`] = safe(l.expr, { ...vals, t }); });
      pts.push(row);
    }
    return pts;
  }, [config.series, vals]);

  const tom = { bom: "border-green-500/40 bg-green-500/10", ruim: "border-destructive/40 bg-destructive/10", neutro: "border-border bg-muted/30" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.inputs.map((i) => (
          <div key={i.name} className="space-y-1.5">
            <div className="flex justify-between gap-2">
              <label className="text-xs font-medium">{i.label}</label>
              <span className="text-xs font-bold whitespace-nowrap">{vals[i.name].toLocaleString("pt-BR")}{i.unit ? ` ${i.unit}` : ""}</span>
            </div>
            <Slider value={[vals[i.name]]} onValueChange={([v]) => setVals((c) => ({ ...c, [i.name]: v }))} min={i.min} max={i.max} step={i.step ?? (i.max - i.min) / 50} aria-label={i.label} />
          </div>
        ))}
      </div>
      {config.formulaHint && <p className="text-[11px] text-muted-foreground">{config.formulaHint}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {outs.map((o, k) => (
          <div key={k} className={`rounded-lg border p-2 text-center ${tom[o.tom as "bom" | "ruim" | "neutro"]}`}>
            <p className="text-[11px] text-muted-foreground leading-tight">{o.label}</p>
            <p className="font-mono font-semibold text-sm">{o.texto}{o.v !== null && o.unit ? ` ${o.unit}` : ""}</p>
          </div>
        ))}
      </div>
      {config.series && dados.length > 1 && (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dados} margin={{ right: 8, left: 8, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" type="number" domain={[config.series.xFrom, config.series.xTo]} label={{ value: config.series.xLabel, position: "insideBottom", offset: -8 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis width={64} label={config.series.yLabel ? { value: config.series.yLabel, angle: -90, position: "insideLeft" } : undefined} stroke="hsl(var(--muted-foreground))" />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
            {(config.series.refLines ?? []).map((r, k) => (
              <ReferenceLine key={k} y={r.y} stroke={r.color ?? "hsl(var(--destructive))"} strokeDasharray="5 4" label={{ value: r.label, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            ))}
            {config.series.lines.map((l, i) => (
              <Line key={i} type="monotone" dataKey={`y${i}`} name={l.name} stroke={l.color ?? CORES[i % CORES.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
