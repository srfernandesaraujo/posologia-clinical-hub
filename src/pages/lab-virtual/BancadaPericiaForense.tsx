import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, FlaskConical, TestTubes, Dna, Scale } from "lucide-react";
import { FORENSIC_SCENARIOS, type ForensicScenario } from "@/data/forensicScenarios";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import { ForensicCasePanel } from "@/components/lab-virtual/ForensicCasePanel";
import { ChemicalLabPanel } from "@/components/lab-virtual/ChemicalLabPanel";
import { ToxicologyLabPanel } from "@/components/lab-virtual/ToxicologyLabPanel";
import { DNALabPanel } from "@/components/lab-virtual/DNALabPanel";
import { ForensicConclusionPanel } from "@/components/lab-virtual/ForensicConclusionPanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

interface ChemResult {
  identifiedSubstance: string;
  basePeakAnswer: number;
}

interface ToxResult {
  matrix: string;
  reagent: string;
  estimatedRT: number;
  selectedClass: string;
  identifiedToxin: string;
}

interface DnaResult {
  matchedSuspect: string;
  locusComparison: Record<string, Record<string, boolean>>;
}

export default function BancadaPericiaForense() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("pericia-forense");

  const [selectedId, setSelectedId] = useState("");
  const [scenario, setScenario] = useState<ForensicScenario | null>(null);
  const [chemResult, setChemResult] = useState<ChemResult | null>(null);
  const [toxResult, setToxResult] = useState<ToxResult | null>(null);
  const [dnaResult, setDnaResult] = useState<DnaResult | null>(null);
  const [conclusionResult, setConclusionResult] = useState<{ accusedIndex: number; correct: boolean; score: number } | null>(null);
  const startTimeRef = useRef(Date.now());

  const startCase = (id: string) => {
    const s = FORENSIC_SCENARIOS.find((sc) => sc.id === id);
    if (!s) return;
    setScenario(s);
    setChemResult(null);
    setToxResult(null);
    setDnaResult(null);
    setConclusionResult(null);
    startTimeRef.current = Date.now();
  };

  const modules = [
    { key: "case", label: "Caso", icon: Shield, done: !!scenario },
    { key: "chem", label: "Químico", icon: FlaskConical, done: !!chemResult },
    { key: "tox", label: "Toxicol.", icon: TestTubes, done: !!toxResult },
    { key: "dna", label: "DNA", icon: Dna, done: !!dnaResult },
    { key: "conclusion", label: "Conclusão", icon: Scale, done: !!conclusionResult },
  ];

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    if (!conclusionResult || !scenario) return;
    submitVRResults({
      score: conclusionResult.score,
      actions: {
        caseTitle: scenario.title,
        chemicalResult: chemResult,
        toxicologyResult: toxResult,
        dnaResult: dnaResult,
        accusedSuspect: scenario.suspects[conclusionResult.accusedIndex]?.name,
        accusedCorrect: conclusionResult.correct,
        ...reportData,
      },
      timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Perícia Forense
          </h1>
          <p className="text-xs text-muted-foreground">3 laboratórios interligados para solucionar um caso criminal</p>
        </div>
        {isVirtualRoom && <Badge variant="outline" className="ml-auto">Sala Virtual</Badge>}
      </div>

      {/* Progress bar */}
      {scenario && (
        <div className="flex items-center gap-1">
          {modules.map((m, i) => (
            <div key={m.key} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                m.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <m.icon className="h-3 w-3" />
                {m.label}
              </div>
              {i < modules.length - 1 && <div className={`h-0.5 flex-1 ${m.done ? "bg-primary/40" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Scenario selector */}
      {!scenario && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold">Selecione um Caso Criminal</h2>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Escolha um cenário..." /></SelectTrigger>
              <SelectContent>
                {FORENSIC_SCENARIOS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} — {s.difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => startCase(selectedId)} disabled={!selectedId} className="w-full">
              Iniciar Investigação
            </Button>
            <AIContextGenerator
              labType="pericia-forense"
              onContextGenerated={(data: any) => {
                const s = data as ForensicScenario;
                if (!s.id) s.id = `ai-${Date.now()}`;
                setScenario(s);
                setChemResult(null);
                setToxResult(null);
                setDnaResult(null);
                setConclusionResult(null);
                startTimeRef.current = Date.now();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Case + Labs */}
      {scenario && (
        <div className="space-y-4">
          <ForensicCasePanel scenario={scenario} />

          <ChemicalLabPanel
            scenario={scenario}
            isUnlocked={true}
            onComplete={(r) => setChemResult(r)}
          />

          <ToxicologyLabPanel
            scenario={scenario}
            isUnlocked={!!chemResult}
            onComplete={(r) => setToxResult(r)}
          />

          <DNALabPanel
            scenario={scenario}
            isUnlocked={!!toxResult}
            onComplete={(r) => setDnaResult(r)}
          />

          <ForensicConclusionPanel
            scenario={scenario}
            isUnlocked={!!dnaResult}
            chemResult={chemResult}
            toxResult={toxResult}
            dnaResult={dnaResult}
            onComplete={(r) => setConclusionResult(r)}
          />

          {conclusionResult && (
            <LabReportPanel
              benchTitle="Perícia Forense"
              isUnlocked={true}
              experimentSummary={{
                "Caso": scenario.title,
                "Substância Química": chemResult?.identifiedSubstance || "—",
                "Toxina Identificada": toxResult?.identifiedToxin || "—",
                "DNA Match": dnaResult?.matchedSuspect || "—",
                "Acusado": scenario.suspects[conclusionResult.accusedIndex]?.name || "—",
                "Score": `${conclusionResult.score}%`,
              }}
              isVirtualRoom={isVirtualRoom}
              onVRSubmit={handleVRSubmit}
              vrSubmitted={vrSubmitted}
            />
          )}
        </div>
      )}
    </div>
  );
}
