import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TargetValidationPanel } from "@/components/lab-virtual/TargetValidationPanel";
import { DrugDesignPanel, type DrugProperties } from "@/components/lab-virtual/DrugDesignPanel";
import { DockingADMEPanel } from "@/components/lab-virtual/DockingADMEPanel";
import { ClinicalTrialPanel } from "@/components/lab-virtual/ClinicalTrialPanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import { CompoundLibraryPanel, type CompoundEntry } from "@/components/lab-virtual/CompoundLibraryPanel";
import { DruglikenessScorePanel } from "@/components/lab-virtual/DruglikenessScorePanel";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, ArrowLeft } from "lucide-react";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { toast } from "sonner";
import type { PubChemCompound } from "@/components/lab-virtual/PubChemSearchBar";

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

  // PubChem compound data
  const [currentCompound, setCurrentCompound] = useState<PubChemCompound | null>(null);

  // Compound library
  const [compounds, setCompounds] = useState<CompoundEntry[]>([]);
  const [latestADMET, setLatestADMET] = useState<number | undefined>();

  const handlePubChemImport = useCallback((compound: PubChemCompound) => {
    setCurrentCompound(compound);
  }, []);

  const handleAddToLibrary = useCallback(() => {
    const name = currentCompound?.name || `Composto ${compounds.length + 1}`;
    const entry: CompoundEntry = {
      id: crypto.randomUUID(),
      name,
      smiles: currentCompound?.smiles || "",
      properties: { ...drugProperties },
      tpsa: currentCompound?.tpsa,
      rotatableBonds: currentCompound?.rotatableBonds,
      formula: currentCompound?.formula,
      cid: currentCompound?.cid,
      admetScore: latestADMET,
    };
    setCompounds(prev => [...prev, entry]);
    toast.success(`"${name}" adicionado à biblioteca!`);
  }, [currentCompound, drugProperties, compounds.length, latestADMET]);

  const handleRemoveFromLibrary = useCallback((id: string) => {
    setCompounds(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleSelectFromLibrary = useCallback((entry: CompoundEntry) => {
    setDrugProperties(entry.properties);
    if (entry.smiles) {
      setCurrentCompound({
        cid: entry.cid || 0,
        name: entry.name,
        smiles: entry.smiles,
        mw: entry.properties.mw,
        logP: entry.properties.logP,
        hbd: entry.properties.hbd,
        hba: entry.properties.hba,
        tpsa: entry.tpsa || 0,
        formula: entry.formula || "",
        rotatableBonds: entry.rotatableBonds || 0,
      });
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    if (compounds.length === 0) return;
    const headers = ["Nome", "SMILES", "CID", "Formula", "MW", "LogP", "HBD", "HBA", "TPSA", "Rot. Bonds", "ADMET Score", "ΔG"];
    const rows = compounds.map(c => [
      c.name,
      c.smiles,
      c.cid ?? "",
      c.formula ?? "",
      c.properties.mw,
      c.properties.logP,
      c.properties.hbd,
      c.properties.hba,
      c.tpsa?.toFixed(1) ?? "",
      c.rotatableBonds ?? "",
      c.admetScore ?? "",
      c.dG?.toFixed(2) ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biblioteca-candidatos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }, [compounds]);

  const experimentSummary = selectedTarget ? {
    "Alvo": `${selectedTarget.name} (${selectedTarget.id})`,
    "MW": `${drugProperties.mw}`,
    "LogP": `${drugProperties.logP}`,
    "HBD": `${drugProperties.hbd}`,
    "HBA": `${drugProperties.hba}`,
    "Modo de design": designMode,
    ...(currentCompound ? { "Composto PubChem": `${currentCompound.name} (CID: ${currentCompound.cid})` } : {}),
    "Compostos na biblioteca": `${compounds.length}`,
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
      actions: { decisions, report: reportData, experimentSummary, library: compounds },
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
          {currentCompound && (
            <Badge variant="outline" className="text-xs">
              Composto: {currentCompound.name}
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
          onPubChemImport={handlePubChemImport}
        />
        <DockingADMEPanel
          drugProperties={drugProperties}
          hasTarget={!!selectedTarget}
          designMode={designMode}
          smiles={currentCompound?.smiles}
          compoundName={currentCompound?.name}
          onADMETResult={setLatestADMET}
        />
        <DruglikenessScorePanel
          properties={drugProperties}
          tpsa={currentCompound?.tpsa}
          rotatableBonds={currentCompound?.rotatableBonds}
          smiles={currentCompound?.smiles}
        />
        <ClinicalTrialPanel drugProperties={drugProperties} hasTarget={!!selectedTarget} />
      </div>

      {/* Compound Library */}
      <CompoundLibraryPanel
        compounds={compounds}
        onAdd={handleAddToLibrary}
        onRemove={handleRemoveFromLibrary}
        onSelect={handleSelectFromLibrary}
        onExportCSV={handleExportCSV}
      />

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
