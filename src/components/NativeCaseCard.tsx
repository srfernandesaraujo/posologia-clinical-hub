import { Badge } from "@/components/ui/badge";

interface NativeCaseCardProps {
  caseItem: any;
  onClick: () => void;
}

export function NativeCaseCard({ caseItem: c, onClick }: NativeCaseCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <div className="flex items-center justify-between mb-1 pr-10">
        <span className="font-semibold">{c.title}</span>
        <Badge variant="outline">{c.difficulty}</Badge>
      </div>
      <p className="text-sm text-muted-foreground pr-10">{c.patient.diagnosis}</p>
    </button>
  );
}
