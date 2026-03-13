import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Stethoscope, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PatientRecordPanel, type PatientData, type PatientVitals } from "@/components/lab-virtual/PatientRecordPanel";
import { BranchingDecisionPanel, type DecisionNode, type DecisionOption, type DecisionRecord } from "@/components/lab-virtual/BranchingDecisionPanel";
import { PatientMonitorPanel } from "@/components/lab-virtual/PatientMonitorPanel";
import { DecisionTimelinePanel } from "@/components/lab-virtual/DecisionTimelinePanel";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

// ─── Native scenarios ────────────────────────────────────────
const NATIVE_SCENARIOS: { id: string; title: string; specialty: string; difficulty: string }[] = [
  { id: "emergencia-hipertensiva", title: "Emergência Hipertensiva", specialty: "Cardiologia", difficulty: "Difícil" },
  { id: "choque-septico", title: "Choque Séptico", specialty: "Terapia Intensiva", difficulty: "Difícil" },
  { id: "cetoacidose-diabetica", title: "Cetoacidose Diabética", specialty: "Endocrinologia", difficulty: "Médio" },
  { id: "intoxicacao-medicamentosa", title: "Intoxicação Medicamentosa", specialty: "Toxicologia", difficulty: "Médio" },
  { id: "reacao-anafilatica", title: "Reação Anafilática", specialty: "Emergência", difficulty: "Difícil" },
  { id: "ira", title: "Insuficiência Renal Aguda", specialty: "Nefrologia", difficulty: "Médio" },
  { id: "dor-toracica", title: "Dor Torácica — Diagnóstico Diferencial", specialty: "Cardiologia", difficulty: "Médio" },
  { id: "politerapia-idoso", title: "Politerapia no Idoso", specialty: "Geriatria", difficulty: "Fácil" },
];

interface ScenarioData {
  patient: PatientData;
  nodes: DecisionNode[];
  outcome: { good: string; bad: string };
}

export default function BancadaSimulacaoRealistica() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    virtualRoomCase, isVirtualRoom, loading: vrLoading,
    submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("simulacao-realistica");

  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [customTheme, setCustomTheme] = useState("");
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [currentVitals, setCurrentVitals] = useState<PatientVitals | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [fdaAlerts, setFdaAlerts] = useState<string[]>([]);
  const [loadingFDA, setLoadingFDA] = useState(false);
  const completed = scenario ? currentStage >= scenario.nodes.length : false;
  const startTimeRef = useRef(Date.now());

  // ─── Load scenario via AI ─────────────────────────────────
  const loadScenario = async (scenarioId: string) => {
    setLoading(true);
    setDecisions([]);
    setCurrentStage(0);
    setAlerts([]);
    setFdaAlerts([]);
    setVitalsHistory([]);

    try {
      const chosen = NATIVE_SCENARIOS.find(s => s.id === scenarioId);
      const { data, error } = await supabase.functions.invoke("generate-simulation-scenario", {
        body: {
          scenarioId,
          title: chosen?.title ?? scenarioId,
          specialty: chosen?.specialty ?? "Geral",
          difficulty: chosen?.difficulty ?? "Médio",
        },
      });

      if (error) throw error;
      const scenarioData = data as ScenarioData;
      setScenario(scenarioData);
      setCurrentVitals(scenarioData.patient.vitals);
      setVitalsHistory([{
        stage: "Admissão",
        fc: scenarioData.patient.vitals.fc,
        pas: scenarioData.patient.vitals.pas,
        spo2: scenarioData.patient.vitals.spo2,
        fr: scenarioData.patient.vitals.fr,
      }]);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar cenário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Load VR case
  useEffect(() => {
    if (isVirtualRoom && virtualRoomCase?.scenarioData) {
      const sd = virtualRoomCase.scenarioData as ScenarioData;
      setScenario(sd);
      setCurrentVitals(sd.patient.vitals);
      setVitalsHistory([{
        stage: "Admissão",
        fc: sd.patient.vitals.fc,
        pas: sd.patient.vitals.pas,
        spo2: sd.patient.vitals.spo2,
        fr: sd.patient.vitals.fr,
      }]);
      startTimeRef.current = Date.now();
    }
  }, [isVirtualRoom, virtualRoomCase]);

  // ─── OpenFDA lookup ────────────────────────────────────────
  const checkFDA = useCallback(async (drugName: string) => {
    if (!drugName) return;
    setLoadingFDA(true);
    try {
      const res = await fetch(
        `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&limit=3`
      );
      if (res.ok) {
        const json = await res.json();
        const reactions = json.results?.flatMap((r: any) =>
          r.patient?.reaction?.map((rx: any) => rx.reactionmeddrapt) ?? []
        ).filter(Boolean).slice(0, 5);
        if (reactions.length > 0) {
          setFdaAlerts(prev => [
            ...prev,
            `OpenFDA: Eventos adversos reportados para "${drugName}": ${reactions.join(", ")}`,
          ]);
        }
      }
    } catch { /* silent */ } finally {
      setLoadingFDA(false);
    }
  }, []);

  // ─── Handle decision ──────────────────────────────────────
  const handleDecision = useCallback((nodeId: string, option: DecisionOption) => {
    if (!scenario) return;
    const node = scenario.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const correctOpt = node.options.find(o => o.isCorrect) ?? node.options[0];
    const record: DecisionRecord = {
      nodeId,
      stage: node.stage,
      title: node.title,
      chosenId: option.id,
      chosenLabel: option.label,
      correctId: correctOpt.id,
      correctLabel: correctOpt.label,
      isCorrect: option.isCorrect,
      feedback: option.feedback,
    };
    setDecisions(prev => [...prev, record]);

    // Apply vital effects — use fallback if AI didn't provide them
    if (currentVitals) {
      const newVitals = { ...currentVitals };
      const effects = option.vitalEffects && Object.keys(option.vitalEffects).length > 0
        ? option.vitalEffects
        : option.isCorrect
          ? { fc: -Math.floor(Math.random() * 8 + 3), pas: -Math.floor(Math.random() * 10 + 5), spo2: Math.floor(Math.random() * 2 + 1), fr: -Math.floor(Math.random() * 3 + 1) }
          : { fc: Math.floor(Math.random() * 10 + 5), pas: Math.floor(Math.random() * 15 + 5), spo2: -Math.floor(Math.random() * 3 + 1), fr: Math.floor(Math.random() * 3 + 1) };

      Object.entries(effects).forEach(([key, delta]) => {
        if (key in newVitals) {
          (newVitals as any)[key] = Math.max(0, Math.min(300, (newVitals as any)[key] + delta));
        }
      });
      setCurrentVitals(newVitals);
      setVitalsHistory(prev => [...prev, {
        stage: `Etapa ${node.stage + 1}`,
        fc: newVitals.fc,
        pas: newVitals.pas,
        spo2: newVitals.spo2,
        fr: newVitals.fr,
      }]);

      // Generate alerts
      const newAlerts: string[] = [];
      if (newVitals.spo2 < 90) newAlerts.push("⚠️ SpO₂ crítico! Considere oxigenoterapia.");
      if (newVitals.pas < 80) newAlerts.push("⚠️ Hipotensão grave! Risco de choque.");
      if (newVitals.pas > 180) newAlerts.push("⚠️ Hipertensão grave! Risco de lesão em órgão-alvo.");
      if (newVitals.fc > 120) newAlerts.push("⚠️ Taquicardia significativa.");
      if (newVitals.fc < 50) newAlerts.push("⚠️ Bradicardia! Avaliar necessidade de atropina.");
      if (newVitals.glasgow < 9) newAlerts.push("⚠️ Rebaixamento grave do nível de consciência.");
      if (newVitals.fr > 28) newAlerts.push("⚠️ Taquipneia! Avaliar insuficiência respiratória.");
      setAlerts(newAlerts);
    }

    // Check FDA for drug-related decisions
    if (option.label.toLowerCase().includes("mg") || option.description.toLowerCase().includes("prescrev")) {
      const match = option.label.match(/([A-Za-záéíóúâêîôûãõç]+)\s+\d/i);
      if (match) checkFDA(match[1]);
    }

    setCurrentStage(prev => prev + 1);
  }, [scenario, currentVitals, checkFDA]);

  // ─── VR submit ─────────────────────────────────────────────
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const correct = decisions.filter(d => d.isCorrect).length;
    const total = decisions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

    submitVRResults({
      score,
      actions: {
        decisions: decisions.map(d => ({
          label: d.title,
          userChoice: d.chosenLabel,
          idealChoice: d.correctLabel,
          correct: d.isCorrect,
        })),
        report: reportData,
      },
      timeSpentSeconds: elapsed,
    });
  };

  // ─── Score calc ────────────────────────────────────────────
  const score = (() => {
    if (!scenario) return 0;
    const maxW = scenario.nodes.reduce((s, n) => s + n.weight, 0);
    const gotW = decisions.reduce((s, d) => {
      const n = scenario.nodes.find(x => x.id === d.nodeId);
      return s + (d.isCorrect ? (n?.weight ?? 1) : 0);
    }, 0);
    return maxW > 0 ? Math.round((gotW / maxW) * 100) : 0;
  })();

  // ─── Scenario selection screen ────────────────────────────
  if (!scenario && !loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              Simulação Realística
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Tomada de decisão clínica ramificada com paciente virtual</p>
          </div>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Selecione um Cenário Clínico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um cenário..." />
              </SelectTrigger>
              <SelectContent>
                {NATIVE_SCENARIOS.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.title}
                      <Badge variant="secondary" className="text-[9px] ml-1">{s.specialty}</Badge>
                      <Badge variant="outline" className="text-[9px]">{s.difficulty}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => loadScenario(selectedScenario)}
              disabled={!selectedScenario}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Cenário com IA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Gerando cenário clínico com IA...</p>
        <p className="text-xs text-muted-foreground/60">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              Simulação Realística
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {scenario?.patient.chiefComplaint ?? "Tomada de decisão clínica"}
            </p>
          </div>
        </div>
        {completed && (
          <Badge variant={score >= 70 ? "default" : "destructive"} className="text-sm px-3 py-1">
            Score Final: {score}%
          </Badge>
        )}
      </div>

      {/* 4-panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatientRecordPanel patient={scenario?.patient ?? null} alerts={alerts} />
        <BranchingDecisionPanel
          nodes={scenario?.nodes ?? []}
          currentStage={currentStage}
          decisions={decisions}
          onDecision={handleDecision}
          completed={completed}
          fdaAlerts={fdaAlerts}
          loadingFDA={loadingFDA}
        />
        <PatientMonitorPanel vitalsHistory={vitalsHistory} currentVitals={currentVitals} />
        <DecisionTimelinePanel
          nodes={scenario?.nodes ?? []}
          decisions={decisions}
          currentStage={currentStage}
          completed={completed}
        />
      </div>

      {/* M5 — Lab Report */}
      <LabReportPanel
        benchTitle="Simulação Realística"
        isUnlocked={completed}
        experimentSummary={completed && scenario ? {
          "Paciente": scenario.patient.name,
          "Queixa": scenario.patient.chiefComplaint,
          "Decisões corretas": `${decisions.filter(d => d.isCorrect).length}/${decisions.length}`,
          "Score": `${score}%`,
          "Desfecho": score >= 70 ? scenario.outcome.good : scenario.outcome.bad,
        } : undefined}
        isVirtualRoom={isVirtualRoom}
        onVRSubmit={handleVRSubmit}
        vrSubmitted={vrSubmitted}
      />
    </div>
  );
}
