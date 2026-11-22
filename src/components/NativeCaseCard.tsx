import { ArrowRight } from "lucide-react";
import { DifficultyPill } from "@/components/simulators/shell/SimulatorShell";

interface NativeCaseCardProps {
  caseItem: any;
  onClick: () => void;
}

export function NativeCaseCard({ caseItem: c, onClick }: NativeCaseCardProps) {
  const patient = c.patient;
  const facts = [patient?.name, patient?.age !== undefined && `${patient.age} anos`].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/30"
    >
      <span className="flex items-start justify-between gap-3 pr-8">
        <span className="font-semibold leading-snug group-hover:text-primary">{c.title}</span>
        <DifficultyPill value={c.difficulty} />
      </span>
      {patient?.diagnosis && <span className="line-clamp-2 text-sm text-muted-foreground">{patient.diagnosis}</span>}
      <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="truncate">{facts}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Abrir caso <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </button>
  );
}
