import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TargetValidationPanel } from "@/components/lab-virtual/TargetValidationPanel";
import { DrugDesignPanel, type DrugProperties } from "@/components/lab-virtual/DrugDesignPanel";
import { DockingADMEPanel } from "@/components/lab-virtual/DockingADMEPanel";
import { ClinicalTrialPanel } from "@/components/lab-virtual/ClinicalTrialPanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, ArrowLeft } from "lucide-react";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

export default function BancadaFarmacos() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("farmacos");
  const startTimeRef = useRef(Date.now());

  const [drugProperties, setDrugProperties] = useState<DrugProperties>({
    mw: 350,
    logP: 2.5,
    hbd: 2,
    hba: 5,
  });
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; name: string } | null>(null);
  const [designMode, setDesignMode] = useState<"sliders" | "smiles">("sliders");

  const experimentSummary = selectedTarget ? {
    "Alvo": `${selectedTarget.name} (${selectedTarget.id})`,
    "MW": `${drugProperties.mw}`,
    "LogP": `${drugProperties.logP}`,
    "HBD": `${drugProperties.hbd}`,
    "HBA": `${drugProperties.hba}`,
    "Modo de design": designMode,
  } : undefined;

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    if (!selectedTarget) return;
    const decisions = [
      { label: "Alvo selecionado", userChoice: `${selectedTarget.name} (${selectedTarget.id})`, correct: true },
      { label: "MW", userChoice: `${drugProperties.mw} g/mol`, correct: drugProperties.mw >= 150 && drugProperties.mw <= 500 },
      { label: "LogP", userChoice: `${drugProperties.logP}`, correct: drugProperties.logP >= 0 && drugProperties.logP <= 5 },
      { label: "HBD (Lipinski ≤5)", userChoice: `${drugProperties.hbd}`, correct: drugProperties.hbd <= 5 },
      { label: "HBA (Lipinski ≤10)", userChoice: `${drugProperties.hba}`, correct: drugProperties.hba <= 10 },
      { label: "Modo de design", userChoice: designMode, correct: true },
    ];
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({
      score,
      actions: { decisions, report: reportData, experimentSummary },
      timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-primary" />
              Desenvolvimento de Fármacos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pipeline completo: alvo → protótipo → docking → ensaio clínico
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedTarget && (
            <Badge variant="outline" className="text-xs">
              Alvo: {selectedTarget.name} ({selectedTarget.id})
            </Badge>
          )}
          <AdminPromptViewer
            toolSlug={LAB_SYSTEM_PROMPTS.farmacos.slug}
            toolName={LAB_SYSTEM_PROMPTS.farmacos.name}
            toolType="laboratory"
            prompt={LAB_SYSTEM_PROMPTS.farmacos.prompt}
          />
        </div>
      </div>

      {/* AI Context Generator */}
      <AIContextGenerator
        labType="farmacos"
        onContextGenerated={(data: any) => {
          setSelectedTarget({ id: data.target.id, name: data.target.name });
          setDrugProperties(data.drugProperties);
        }}
      />

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

      {/* M5 — Mini-Relatório */}
      <LabReportPanel
        benchTitle="Desenvolvimento de Fármacos"
        isUnlocked={!!selectedTarget}
        experimentSummary={experimentSummary}
        isVirtualRoom={isVirtualRoom}
        onVRSubmit={handleVRSubmit}
        vrSubmitted={vrSubmitted}
      />
    </div>
  );
}
