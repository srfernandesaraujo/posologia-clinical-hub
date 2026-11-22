import { Sparkles } from "lucide-react";
import { DifficultyPill } from "@/components/simulators/shell/SimulatorShell";
import { CaseCardMeta } from "@/components/CaseCardMeta";
import { AdminCaseActions } from "@/components/AdminCaseActions";

interface AICaseCardProps {
  caseItem: any;
  onClick: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: { title: string; difficulty: string }) => Promise<void>;
  onCopy: (id: string, targetSlug: string) => Promise<void>;
  availableTargets: string[];
  onToggleMarketplace?: (id: string, currentValue: boolean) => Promise<void>;
}

export function AICaseCard({
  caseItem: c,
  onClick,
  onDelete,
  onUpdate,
  onCopy,
  availableTargets,
  onToggleMarketplace,
}: AICaseCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/30"
    >
      <div className="absolute top-3 right-3 z-10">
        <AdminCaseActions
          caseItem={c}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onCopy={onCopy}
          availableTargets={availableTargets}
          onToggleMarketplace={onToggleMarketplace}
        />
      </div>
      <div className="flex items-start justify-between gap-3 pr-10">
        <span className="font-semibold leading-snug group-hover:text-primary">{c.title}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-semibold text-accent">
            <Sparkles className="h-3 w-3" /> IA
          </span>
          <DifficultyPill value={c.difficulty} />
        </div>
      </div>
      <div className="pr-10">
        <CaseCardMeta caseItem={c} />
      </div>
    </button>
  );
}
