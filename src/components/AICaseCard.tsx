import { Badge } from "@/components/ui/badge";
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
      className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors relative"
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
      <div className="flex items-center justify-between mb-1 pr-10">
        <span className="font-semibold">{c.title}</span>
        <div className="flex gap-2">
          <Badge variant="secondary">IA</Badge>
          <Badge variant="outline">{c.difficulty}</Badge>
        </div>
      </div>
      <div className="pr-10">
        <CaseCardMeta caseItem={c} />
      </div>
    </button>
  );
}
