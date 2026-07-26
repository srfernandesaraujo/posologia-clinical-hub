import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useFeatureGating } from "@/hooks/useFeatureGating";

interface PdfExportButtonProps {
  /** Actually generates and saves the PDF (e.g. the local gerarPDF() in each calculator page). */
  onExport: () => void;
  label?: string;
}

/**
 * "Relatórios em PDF" is advertised as Premium-only (Planos.tsx), but the local
 * gerarPDF() buttons in every native calculator + ToolDetail.tsx called jsPDF
 * directly with no plan check. Centralizing the gate here instead of repeating
 * an isPremium check in ~26 near-identical call sites.
 */
export function PdfExportButton({ onExport, label = "Gerar Relatório PDF" }: PdfExportButtonProps) {
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  return (
    <>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => (isPremium ? onExport() : showUpgrade("Relatórios em PDF"))}
      >
        <FileText className="h-4 w-4" /> {label}
      </Button>
    </>
  );
}
