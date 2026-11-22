import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layouts/PageHeader";
import type { ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { cn } from "@/lib/utils";

// Espaço de trabalho dos procedimentos do MedView 3D: modelo 3D grande à
// esquerda, passos do procedimento à direita (lista numerada + passo atual).
// Em telas estreitas os passos vão para baixo do modelo.

export function ProcedureWorkspace({
  title, description, badge, tools, viewer, steps, currentStep, onStepChange,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  /** Linha acima do modelo: troca de provedor, busca de modelo */
  tools?: ReactNode;
  /** Modelo 3D com a barra de ferramentas */
  viewer: ReactNode;
  steps: ProcedureStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  const total = steps.length;
  const step = steps[currentStep] ?? steps[0];
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader backTo="/medview-3d" backLabel="Voltar ao MedView 3D" title={title} description={description} actions={badge} className="mb-4" />
      {tools && <div className="mb-3 flex flex-wrap items-center gap-3">{tools}</div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[56vh] min-h-[360px] lg:h-[calc(100dvh-15rem)]">{viewer}</div>
        <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-card lg:h-[calc(100dvh-15rem)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Passos do procedimento</h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{currentStep + 1}/{total}</span>
          </div>
          <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {steps.map((s, i) => {
              const active = i === currentStep;
              return (
                <li key={s.stepNumber}>
                  <button
                    type="button"
                    onClick={() => onStepChange(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn("flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", active ? "bg-primary/10" : "hover:bg-secondary")}
                  >
                    <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold", active ? "border-primary bg-primary text-primary-foreground" : i < currentStep ? "border-status-ok/50 text-status-ok" : "border-border text-muted-foreground")}>
                      {i < currentStep ? "✓" : s.stepNumber}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>{s.title}</span>
                      {active && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{s.description}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Button variant="outline" size="sm" className="flex-1" disabled={currentStep <= 0} onClick={() => onStepChange(currentStep - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />Anterior
            </Button>
            <Button size="sm" className="flex-1" disabled={currentStep >= total - 1} onClick={() => onStepChange(currentStep + 1)}>
              Próximo<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
