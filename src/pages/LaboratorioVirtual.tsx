import { useState } from "react";
import { TargetValidationPanel } from "@/components/lab-virtual/TargetValidationPanel";
import { DrugDesignPanel, type DrugProperties } from "@/components/lab-virtual/DrugDesignPanel";
import { DockingADMEPanel } from "@/components/lab-virtual/DockingADMEPanel";
import { ClinicalTrialPanel } from "@/components/lab-virtual/ClinicalTrialPanel";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export default function LaboratorioVirtual() {
  const [drugProperties, setDrugProperties] = useState<DrugProperties>({
    mw: 350,
    logP: 2.5,
    hbd: 2,
    hba: 5,
  });
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; name: string } | null>(null);
  const [designMode, setDesignMode] = useState<"sliders" | "smiles">("sliders");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-primary" />
            Laboratório Virtual de Desenvolvimento de Fármacos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline completo: alvo → protótipo → docking → ensaio clínico
          </p>
        </div>
        {selectedTarget && (
          <Badge variant="outline" className="text-xs">
            Alvo: {selectedTarget.name} ({selectedTarget.id})
          </Badge>
        )}
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TargetValidationPanel onTargetSelected={setSelectedTarget} />
        <DrugDesignPanel
          properties={drugProperties}
          onChange={setDrugProperties}
          activeTab={designMode}
          onTabChange={setDesignMode}
        />
        <DockingADMEPanel
          drugProperties={drugProperties}
          hasTarget={!!selectedTarget}
          designMode={designMode}
        />
        <ClinicalTrialPanel drugProperties={drugProperties} hasTarget={!!selectedTarget} />
      </div>
    </div>
  );
}
