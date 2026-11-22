import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";

// Espaço de trabalho padrão dos simuladores (plano de redesign, Fase 4).
// Só organiza a tela — toda a lógica (motor, desafios, Sala Virtual, embed)
// continua na página do simulador, que preenche os "slots" abaixo.
//
//   ┌ cabeçalho: voltar · área › simulador · título do caso · ações ┐
//   │ caso clínico (recolhível)          ║ conduta                  │
//   │ bancada: exames e gráficos         ║ Modo Desafio             │
//   └──── rola sozinha ──────────────────╨──── rola sozinha ────────┘
// A partir de 1024 px as duas áreas ficam lado a lado com divisória
// arrastável; abaixo disso, tudo empilhado (caso, conduta, bancada, desafio).

export type LabStatus = "baixo" | "alto" | "normal" | "critico" | string;

const DIFFICULTY_TONE: Record<string, string> = {
  "Fácil": "border-status-ok/40 text-status-ok",
  "Baixa": "border-status-ok/40 text-status-ok",
  "Médio": "border-status-warn/40 text-status-warn",
  "Moderada": "border-status-warn/40 text-status-warn",
  "Difícil": "border-status-crit/40 text-status-crit",
  "Alta": "border-status-crit/40 text-status-crit",
};

export function DifficultyPill({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        DIFFICULTY_TONE[value] || "border-border text-muted-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** true a partir de 1024 px: aí cabe a divisão lado a lado. */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return matches;
}

function simulatorMeta(slug?: string) {
  return slug ? NATIVE_SIMULATORS.find((s) => s.slug === slug) : undefined;
}

/** Valor de exame com unidade e estado em forma (seta + texto) e cor semântica. */
export function LabValueTile({ name, value, unit, status }: { name: string; value: number | string; unit: string; status: LabStatus }) {
  const s = String(status).toLowerCase();
  const tone =
    s === "baixo" ? "text-status-warn border-status-warn/30 bg-status-warn/5"
    : s === "alto" ? "text-status-warn border-status-warn/30 bg-status-warn/5"
    : s === "critico" || s === "crítico" ? "text-status-crit border-status-crit/40 bg-status-crit/5"
    : "text-status-ok border-border bg-card";
  const label = s === "baixo" ? "▼ Baixo" : s === "alto" ? "▲ Alto" : s === "critico" || s === "crítico" ? "▲ Crítico" : "● Normal";
  const shown = typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value;
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg border px-3 py-2.5", tone)}>
      <span className="truncate text-[11px] font-medium text-muted-foreground">{name}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{shown}</span>
        <span className="truncate text-[10px] text-muted-foreground">{unit}</span>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
  );
}

/** Painel com título discreto, usado dentro das colunas do espaço de trabalho. */
export function ShellPanel({
  title, icon, aside, children, className, bodyClassName,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border bg-card", className)}>
      {title && (
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {icon && <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
          <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
          {aside}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

interface CasePickerProps {
  slug?: string;
  title: string;
  description: string;
  onBack?: () => void;
  actions?: ReactNode;
  banner?: ReactNode;
  /** Cartões de caso (NativeCaseCard / AICaseCard) */
  children: ReactNode;
  footer?: ReactNode;
}

/** Tela inicial do simulador: escolha do caso clínico. */
export function SimulatorCasePicker({ slug, title, description, onBack, actions, banner, children, footer }: CasePickerProps) {
  const meta = simulatorMeta(slug);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          {meta && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{meta.category}</p>}
          <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
        </div>
      </header>
      {banner}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Escolha um caso clínico</h2>
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
        {footer}
      </section>
    </div>
  );
}

interface WorkspaceProps {
  slug?: string;
  simulatorName: string;
  caseTitle: string;
  difficulty?: string;
  onBack?: () => void;
  actions?: ReactNode;
  /** Banners e sobreposições de prova/Sala Virtual */
  banners?: ReactNode;
  /** Bloco recolhível no topo da área esquerda: paciente, cenário, exames de base */
  patient?: ReactNode;
  /** Área esquerda: gráficos e resultados do motor */
  stage: ReactNode;
  /** Área direita, em cima: conduta/parâmetros que o aluno ajusta */
  controls?: ReactNode;
  /** Área direita, embaixo: Modo Desafio */
  challenge?: ReactNode;
  /** Conteúdo extra abaixo de tudo (resultado enviado, etc.) */
  footer?: ReactNode;
}

/** Tela do caso em andamento, com a mesma disposição em todos os simuladores. */
export function SimulatorWorkspace({
  slug, simulatorName, caseTitle, difficulty, onBack, actions, banners, patient, stage, controls, challenge, footer,
}: WorkspaceProps) {
  const meta = simulatorMeta(slug);
  const isDesktop = useIsDesktop();
  const [caseOpen, setCaseOpen] = useState(true);
  const patientBlock = patient ? (
    <section className="rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setCaseOpen((o) => !o)}
        aria-expanded={caseOpen}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Caso clínico</span>
        <span className="text-xs text-muted-foreground">{caseOpen ? "Recolher" : "Mostrar"}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !caseOpen && "-rotate-90")} />
      </button>
      {caseOpen && <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3 border-t border-border p-3 [&>*]:min-w-0">{patient}</div>}
    </section>
  ) : null;
  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      {banners}
      <header className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para os casos"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {meta ? `${meta.category} · ` : ""}
            <span className="text-primary">{simulatorName}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold md:text-2xl">{caseTitle}</h1>
            <DifficultyPill value={difficulty} />
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {isDesktop ? (
        // Duas áreas lado a lado, cada uma com rolagem própria: o aluno lê a
        // questão e mexe na conduta à direita sem perder de vista os exames e
        // gráficos à esquerda. A divisória é arrastável e a largura fica salva.
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="posologia-sim-workspace-v1"
          className="h-[calc(100dvh-13rem)] min-h-[560px] rounded-xl"
        >
          <ResizablePanel defaultSize={58} minSize={38} className="min-w-0">
            <div className="h-full space-y-4 overflow-y-auto overscroll-contain pr-4">
              {patientBlock}
              {stage}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1 bg-border/70 hover:bg-primary/50" />
          <ResizablePanel defaultSize={42} minSize={30} className="min-w-0">
            <div className="h-full space-y-4 overflow-y-auto overscroll-contain pl-4">
              {controls}
              {challenge}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="space-y-4">
          {patientBlock}
          {controls}
          {stage}
          {challenge}
        </div>
      )}
      {footer}
    </div>
  );
}

/** Ficha do paciente padronizada (nome, idade, peso, sexo, grupos e cenário). */
export function PatientCard({
  name, age, weight, sex, extra, scenario, children,
}: {
  name?: string;
  age?: number | string;
  weight?: number | string;
  sex?: string;
  extra?: ReactNode;
  scenario?: string;
  children?: ReactNode;
}) {
  const facts = [age !== undefined && `${age} anos`, weight !== undefined && `${weight} kg`, sex && (sex === "M" ? "Masculino" : sex === "F" ? "Feminino" : sex)].filter(Boolean);
  return (
    <ShellPanel title="Paciente">
      <div className="space-y-3">
        <div>
          <p className="text-base font-semibold">{name || "Paciente"}</p>
          {facts.length > 0 && <p className="text-xs text-muted-foreground">{facts.join(" · ")}</p>}
        </div>
        {extra}
        {scenario && <p className="text-sm leading-relaxed text-muted-foreground">{scenario}</p>}
        {children}
      </div>
    </ShellPanel>
  );
}
