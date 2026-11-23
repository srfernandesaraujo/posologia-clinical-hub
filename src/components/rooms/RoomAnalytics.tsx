import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Peças da aba Analytics do detalhe da sala (plano de redesign): faixa de
// indicadores, distribuição das notas, desempenho por atividade e ranking.
// Tudo desenhado em HTML (sem gráfico) para que nomes longos e muitos alunos
// continuem legíveis.

export function scoreTone(score: number) {
  if (score >= 80) return { text: "text-status-ok", bg: "bg-status-ok", soft: "bg-status-ok/10 text-status-ok border-status-ok/30" };
  if (score >= 60) return { text: "text-status-info", bg: "bg-status-info", soft: "bg-status-info/10 text-status-info border-status-info/30" };
  if (score >= 40) return { text: "text-status-warn", bg: "bg-status-warn", soft: "bg-status-warn/10 text-status-warn border-status-warn/30" };
  return { text: "text-status-crit", bg: "bg-status-crit", soft: "bg-status-crit/10 text-status-crit border-status-crit/30" };
}

export function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
  return m > 0 ? `${m}min ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function KpiTile({ icon, label, value, sub, valueClassName }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 font-mono text-2xl font-semibold tabular-nums leading-tight", valueClassName)}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ScoreDistributionCard({ scores }: { scores: number[] }) {
  const buckets = [
    { label: "80–100%", test: (s: number) => s >= 80, tone: scoreTone(90) },
    { label: "60–79%", test: (s: number) => s >= 60 && s < 80, tone: scoreTone(70) },
    { label: "40–59%", test: (s: number) => s >= 40 && s < 60, tone: scoreTone(50) },
    { label: "0–39%", test: (s: number) => s < 40, tone: scoreTone(10) },
  ].map((b) => ({ ...b, count: scores.filter(b.test).length }));
  const total = scores.length;
  return (
    <Panel title="Distribuição das notas" aside={<span className="text-xs tabular-nums text-muted-foreground">{total} envios</span>}>
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sem envios ainda.</p>
      ) : (
        <ul className="space-y-3">
          {buckets.map((b) => {
            const pct = Math.round((b.count / total) * 100);
            return (
              <li key={b.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground"><strong className="text-foreground">{b.count}</strong> · {pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full transition-[width] duration-700", b.tone.bg)} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export interface ActivityRow { id: string; index: number; label: string; caseTitle?: string | null; avg: number | null; count: number }

export function ActivityPerformanceCard({ rows }: { rows: ActivityRow[] }) {
  return (
    <Panel title="Desempenho por atividade">
      <ul className="space-y-3">
        {rows.map((r) => {
          const tone = r.avg === null ? null : scoreTone(r.avg);
          return (
            <li key={r.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-border text-xs font-semibold text-muted-foreground">{r.index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.label}</p>
                {r.caseTitle && <p className="truncate text-xs text-muted-foreground">{r.caseTitle}</p>}
              </div>
              <div className="text-right">
                <p className={cn("font-mono text-sm font-semibold tabular-nums", tone?.text)}>{r.avg === null ? "—" : `${r.avg}%`}</p>
                <p className="text-[11px] text-muted-foreground">{r.count} envios</p>
              </div>
              <div className="col-span-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                {r.avg !== null && <div className={cn("h-full rounded-full transition-[width] duration-700", tone!.bg)} style={{ width: `${r.avg}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export interface RankingRow { id: string; name: string; score: number; subs: number }

export function RankingCard({ rows, onSelect }: { rows: RankingRow[]; onSelect?: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <Panel title="Ranking" aside={rows.length > 8 ? (
      <button type="button" onClick={() => setAll((v) => !v)} className="text-xs font-medium text-primary hover:underline">{all ? "Mostrar menos" : `Ver todos (${rows.length})`}</button>
    ) : undefined}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sem envios ainda.</p>
      ) : (
        <ol className="space-y-1.5">
          {shown.map((r, i) => {
            const tone = scoreTone(r.score);
            return (
              <li key={r.id}>
                <button type="button" onClick={() => onSelect?.(r.id)} className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{r.name}</span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-secondary"><span className={cn("block h-full rounded-full", tone.bg)} style={{ width: `${r.score}%` }} /></span>
                  </span>
                  <span className={cn("text-right font-mono text-sm font-semibold tabular-nums", tone.text)}>{r.score}%</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
