import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Cabeçalho e estado vazio padrão das páginas de ensino e conta (plano de
// redesign, Fase 6): mesmo tamanho de título, ícone, descrição e ações em
// Turmas, Salas, Gamificação, Suporte, Minha conta etc.

export function PageHeader({
  icon, title, description, badges, actions, onBack, backTo, backLabel = "Voltar", className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backTo?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {backTo && (
          <Link to={backTo} aria-label={backLabel} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {icon && <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</div>}
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
          {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon, title, description, action, className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center", className)}>
      {icon && <div className="text-muted-foreground/60 [&_svg]:h-10 [&_svg]:w-10">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
