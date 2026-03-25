import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atom, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { CompoundSearchPanel, type CompoundData } from "@/components/lab-virtual/molmod/CompoundSearchPanel";
import { MoleculeEditorPanel } from "@/components/lab-virtual/molmod/MoleculeEditorPanel";
import { InSilicoPredictionPanel } from "@/components/lab-virtual/molmod/InSilicoPredictionPanel";
import { BioactivityPanel } from "@/components/lab-virtual/molmod/BioactivityPanel";
import { MolModCompoundLibrary, type MolModCompoundEntry } from "@/components/lab-virtual/molmod/MolModCompoundLibrary";
import { DruglikenessPanel } from "@/components/lab-virtual/molmod/DruglikenessPanel";
import { SimilaritySearchPanel } from "@/components/lab-virtual/molmod/SimilaritySearchPanel";
import { DockingComparativoPanel } from "@/components/lab-virtual/molmod/DockingComparativoPanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

export default function BancadaModelagemMolecular() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("modelagem-molecular");
  const startTimeRef = useRef(Date.now());
  const [compound, setCompound] = useState<CompoundData | null>(null);
  const [currentSmiles, setCurrentSmiles] = useState("");
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [library, setLibrary] = useState<MolModCompoundEntry[]>([]);
  const [lastAdmetScore, setLastAdmetScore] = useState<number | undefined>();
  const [lastLipinskiViolations, setLastLipinskiViolations] = useState<number | undefined>();
  const [analogCompound, setAnalogCompound] = useState<CompoundData | null>(null);

  const handleCompoundSelected = (data: CompoundData) => {
    setCompound(data);
    setCurrentSmiles(data.smiles);
    setLastAdmetScore(undefined);
    setLastLipinskiViolations(undefined);
    setCompletedModules((prev) => new Set([...prev, 1]));
  };

  const handleSmilesChange = (smiles: string) => {
    setCurrentSmiles(smiles);
    if (!completedModules.has(2)) {
      setCompletedModules((prev) => new Set([...prev, 2]));
    }
  };

  const handleLipinskiCalculated = (data: any) => {
    if (data) {
      const violations = [data.mw > 500, data.logP !== null && data.logP > 5, data.hbd > 5, data.hba > 10].filter(Boolean).length;
      setLastLipinskiViolations(violations);
    }
    if (!completedModules.has(3)) {
      setCompletedModules((prev) => new Set([...prev, 3]));
    }
  };

  const addToLibrary = useCallback((comp?: CompoundData) => {
    const c = comp || compound;
    if (!c) return;
    if (library.some(e => e.compound.cid === c.cid && e.currentSmiles === (comp ? c.smiles : currentSmiles))) {
      toast.info("Este composto já está na biblioteca");
      return;
    }
    const entry: MolModCompoundEntry = {
      id: `${c.cid}-${Date.now()}`,
      compound: c,
      currentSmiles: comp ? c.smiles : currentSmiles,
      lipinskiViolations: comp ? undefined : lastLipinskiViolations,
      admetScore: comp ? undefined : lastAdmetScore,
    };
    setLibrary(prev => [...prev, entry]);
    toast.success(`${c.name} adicionado à biblioteca`);
  }, [compound, currentSmiles, lastLipinskiViolations, lastAdmetScore, library]);

  const removeFromLibrary = (id: string) => {
    setLibrary(prev => prev.filter(e => e.id !== id));
  };

  const selectFromLibrary = (entry: MolModCompoundEntry) => {
    setCompound(entry.compound);
    setCurrentSmiles(entry.currentSmiles);
    setLastLipinskiViolations(entry.lipinskiViolations);
    setLastAdmetScore(entry.admetScore);
  };

  const experimentSummary: Record<string, string> = {
    "Composto Base": compound?.name || "Não selecionado",
    "SMILES Original": compound?.smiles || "—",
    "SMILES Modificado": currentSmiles || "—",
    "MW Original": compound ? `${compound.mw.toFixed(2)} g/mol` : "—",
    "Compostos na Biblioteca": `${library.length}`,
    "Módulos Concluídos": `${completedModules.size}/4`,
  };

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean }[] = [
      { label: "Composto selecionado", userChoice: compound?.name || "—", correct: !!compound },
      { label: "SMILES modificado", userChoice: currentSmiles || "—", correct: !!currentSmiles },
      { label: "Módulos concluídos", userChoice: `${completedModules.size}/4`, correct: completedModules.size >= 3 },
    ];
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({ score, actions: { decisions, report: reportData, experimentSummary, library: library.map(l => ({ name: l.compound.name, smiles: l.currentSmiles })) }, timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000) });
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
            <>
              <Badge variant="outline" className="text-xs">
                Composto: {compound.name} (CID {compound.cid})
              </Badge>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => addToLibrary()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Biblioteca
              </Button>
            </>
          )}
          <AdminPromptViewer
            toolSlug={LAB_SYSTEM_PROMPTS["modelagem-molecular"].slug}
            toolName={LAB_SYSTEM_PROMPTS["modelagem-molecular"].name}
            toolType="laboratory"
            prompt={LAB_SYSTEM_PROMPTS["modelagem-molecular"].prompt}
          />
        </div>
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

      {/* Compound Library */}
      <MolModCompoundLibrary
        compounds={library}
        onRemove={removeFromLibrary}
        onSelect={selectFromLibrary}
      />

      {/* Main modules grid */}
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
          originalSmiles={compound?.smiles}
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

      {/* New research modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DruglikenessPanel
          compound={compound}
          smiles={currentSmiles}
        />

        <SimilaritySearchPanel
          smiles={currentSmiles}
          compoundName={compound?.name}
          disabled={!currentSmiles}
          onAddToLibrary={(c) => addToLibrary(c)}
          onSelectForDocking={(c) => setAnalogCompound(c)}
        />
      </div>

      {/* Docking Comparativo — full width */}
      <DockingComparativoPanel
        originalCompound={compound}
        modifiedSmiles={currentSmiles}
        analogCompound={analogCompound}
      />

      {/* M5 — Report */}
      <LabReportPanel
        benchTitle="Modelagem Molecular"
        isUnlocked={completedModules.size >= 3}
        experimentSummary={experimentSummary}
        isVirtualRoom={isVirtualRoom}
        onVRSubmit={handleVRSubmit}
        vrSubmitted={vrSubmitted}
      />
    </div>
  );
}
