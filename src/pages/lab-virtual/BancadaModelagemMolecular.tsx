import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atom, ArrowLeft } from "lucide-react";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { CompoundSearchPanel, type CompoundData } from "@/components/lab-virtual/molmod/CompoundSearchPanel";
import { MoleculeEditorPanel } from "@/components/lab-virtual/molmod/MoleculeEditorPanel";
import { InSilicoPredictionPanel } from "@/components/lab-virtual/molmod/InSilicoPredictionPanel";
import { BioactivityPanel } from "@/components/lab-virtual/molmod/BioactivityPanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";

export default function BancadaModelagemMolecular() {
  const navigate = useNavigate();
  const [compound, setCompound] = useState<CompoundData | null>(null);
  const [currentSmiles, setCurrentSmiles] = useState("");
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  const handleCompoundSelected = (data: CompoundData) => {
    setCompound(data);
    setCurrentSmiles(data.smiles);
    setCompletedModules((prev) => new Set([...prev, 1]));
  };

  const handleSmilesChange = (smiles: string) => {
    setCurrentSmiles(smiles);
    if (!completedModules.has(2)) {
      setCompletedModules((prev) => new Set([...prev, 2]));
    }
  };

  const handleLipinskiCalculated = () => {
    if (!completedModules.has(3)) {
      setCompletedModules((prev) => new Set([...prev, 3]));
    }
  };

  const experimentSummary: Record<string, string> = {
    "Composto Base": compound?.name || "Não selecionado",
    "SMILES Original": compound?.smiles || "—",
    "SMILES Modificado": currentSmiles || "—",
    "MW Original": compound ? `${compound.mw.toFixed(2)} g/mol` : "—",
    "Módulos Concluídos": `${completedModules.size}/4`,
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
            onClick={() => navigate("/laboratorio-virtual")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Atom className="h-7 w-7 text-primary" />
              Modelagem Molecular
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Busque, modifique e analise moléculas com dados reais de PubChem, ChEMBL e Open Targets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {compound && (
            <Badge variant="outline" className="text-xs">
              Composto: {compound.name} (CID {compound.cid})
            </Badge>
          )}
          <AdminPromptViewer
            toolSlug={LAB_SYSTEM_PROMPTS["modelagem-molecular"].slug}
            toolName={LAB_SYSTEM_PROMPTS["modelagem-molecular"].name}
            toolType="laboratory"
            prompt={LAB_SYSTEM_PROMPTS["modelagem-molecular"].prompt}
          />
        </div>

      {/* AI Context Generator */}
      <AIContextGenerator
        labType="modelagem-molecular"
        onContextGenerated={(data: any) => {
          if (data?.compound) {
            handleCompoundSelected({
              cid: data.compound.cid || 0,
              name: data.compound.name,
              smiles: data.compound.smiles,
              mw: data.compound.mw || 0,
              xLogP: data.compound.xLogP ?? null,
              hbd: data.compound.hbd || 0,
              hba: data.compound.hba || 0,
              tpsa: data.compound.tpsa || 0,
              formula: data.compound.formula || "",
            });
          }
        }}
      />

      {/* Modules grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompoundSearchPanel onCompoundSelected={handleCompoundSelected} />

        <MoleculeEditorPanel
          smiles={currentSmiles}
          onSmilesChange={handleSmilesChange}
          compoundName={compound?.name}
          originalCid={compound?.cid}
          disabled={!compound}
        />

        <InSilicoPredictionPanel
          smiles={currentSmiles}
          compoundName={compound?.name}
          disabled={!currentSmiles}
          onLipinskiCalculated={handleLipinskiCalculated}
        />

        <BioactivityPanel
          compoundName={compound?.name || ""}
          smiles={currentSmiles}
          disabled={!compound}
        />
      </div>

      {/* M5 — Report */}
      <LabReportPanel
        benchTitle="Modelagem Molecular"
        isUnlocked={completedModules.size >= 3}
        experimentSummary={experimentSummary}
      />
    </div>
  );
}
