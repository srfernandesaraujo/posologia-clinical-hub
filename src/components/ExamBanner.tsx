import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const SIMULATOR_LABELS: Record<string, string> = {
  prm: "PRM – Problemas Relacionados a Medicamentos",
  antimicrobianos: "Antimicrobianos / Stewardship",
  tdm: "TDM – Monitoramento Terapêutico",
  acompanhamento: "Acompanhamento Farmacoterapêutico",
  insulina: "Dose de Insulina",
  "bomba-infusao": "Bomba de Infusão",
  interacoes: "Interações Medicamentosas",
  "desmame-benzo": "Desmame de Benzodiazepínicos",
};

interface ExamBannerProps {
  simulatorSlug: string;
  caseTitle?: string;
  examProgress: { current: number; total: number } | null;
}

export function ExamBanner({ simulatorSlug, caseTitle, examProgress }: ExamBannerProps) {
  if (!examProgress) return null;

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3 flex-wrap">
      <ClipboardList className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {SIMULATOR_LABELS[simulatorSlug] || simulatorSlug}
        </p>
        {caseTitle && (
          <p className="text-xs text-muted-foreground truncate">Caso: {caseTitle}</p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0">
        Atividade {examProgress.current} de {examProgress.total}
      </Badge>
    </div>
  );
}
