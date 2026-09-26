import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export const brl = (n: number, casas = 0) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
export const int = (n: number) => Math.round(n).toLocaleString("pt-BR");
export const dec = (n: number, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Tooltips do Recharts herdam texto preto por padrão, ilegível no tema escuro.
export const TOOLTIP_STYLE = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" },
  labelStyle: { color: "hsl(var(--foreground))" },
  itemStyle: { color: "hsl(var(--foreground))" },
};

export type Tom = "ok" | "alerta" | "ruim" | "neutro";
const TOM: Record<Tom, string> = {
  ok: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  alerta: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  ruim: "border-destructive/30 bg-destructive/10 text-destructive",
  neutro: "border-border bg-muted/40 text-foreground",
};

export function Kpi({ label, value, sub, tom = "neutro" }: { label: string; value: ReactNode; sub?: ReactNode; tom?: Tom }) {
  return (
    <div className={`rounded-lg border p-3 ${TOM[tom]}`}>
      <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
      <p className="text-lg font-mono font-bold leading-snug">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>}
    </div>
  );
}

export function SimBadge({ children, tom = "neutro" }: { children: ReactNode; tom?: Tom }) {
  return <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${TOM[tom]}`}>{children}</Badge>;
}

export interface BancadaProps {
  caso: import("@/lib/cadeiaSuprimentos/casos").CasoCadeia;
  /** Recebe o estado atual da bancada (é o `simulatorState` do Modo Desafio). */
  onState: (state: Record<string, any>) => void;
}
