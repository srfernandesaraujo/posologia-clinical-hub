import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Stethoscope, User, FlaskConical } from "lucide-react";
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { CALCULATOR_SIMULATOR_LINKS } from "@/data/calculatorSimulatorLinks";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { cn } from "@/lib/utils";

// Cabeçalho padrão das calculadoras nativas (plano de redesign, Fase 5).
// Título, ícone, descrição e categoria vêm do catálogo (calculatorCatalog.ts),
// então o nome é o mesmo no menu, na busca e na página. Cada calculadora só
// entrega as ações (compartilhar, histórico, modo) e o conteúdo.

export function calculatorBySlug(slug: string) {
  return NATIVE_CALCULATORS.find((c) => c.path === `/calculadoras/${slug}`);
}

export function CalculatorHeader({ slug, actions, className }: { slug: string; actions?: ReactNode; className?: string }) {
  const isEmbed = useIsEmbed();
  const calc = calculatorBySlug(slug);
  if (!calc) return null;
  const Icon = calc.icon;
  const simulators = (CALCULATOR_SIMULATOR_LINKS[slug] ?? [])
    .map((s) => NATIVE_SIMULATORS.find((n) => n.slug === s))
    .filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <header className={cn("mb-6 space-y-4", className)}>
      {!isEmbed && (
        <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/calculadoras" className="transition-colors hover:text-foreground">Calculadoras</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{calc.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{calc.name}</span>
        </nav>
      )}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">{calc.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{calc.description}</p>
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 text-sm">{actions}</div>}
        </div>
        {simulators.length > 0 && !isEmbed && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted-foreground"><FlaskConical className="h-3.5 w-3.5" /> Praticar no simulador</span>
            {simulators.map((s) => (
              <Link
                key={s.slug}
                to={`/simuladores/${s.slug}`}
                className="rounded-full border border-border px-3 py-1 font-medium transition-colors hover:border-primary/40 hover:text-primary"
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

/** Alternância Clínico / Educativo usada em quase todas as calculadoras. */
export function CalcModeToggle({ modo, onChange }: { modo: "clinico" | "educativo"; onChange: (m: "clinico" | "educativo") => void }) {
  const base = "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-primary text-primary-foreground";
  const off = "bg-muted text-muted-foreground hover:text-foreground";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Modo">
      <span className="text-muted-foreground">Modo:</span>
      <button type="button" aria-pressed={modo === "clinico"} onClick={() => onChange("clinico")} className={cn(base, modo === "clinico" ? on : off)}>
        <Stethoscope className="h-3.5 w-3.5" /> Clínico
      </button>
      <button type="button" aria-pressed={modo === "educativo"} onClick={() => onChange("educativo")} className={cn(base, modo === "educativo" ? on : off)}>
        <User className="h-3.5 w-3.5" /> Educativo
      </button>
    </div>
  );
}
