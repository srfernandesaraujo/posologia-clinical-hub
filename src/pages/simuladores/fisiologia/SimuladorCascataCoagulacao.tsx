import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Shield } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCascataCoagulacaoChallenges } from "@/data/simulatorChallenges";

const SLUG = "cascata-coagulacao";

interface CoagCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  disabledFactors: string[];
  expectedTP: [number, number];
  expectedINR: [number, number];
  expectedTTPa: [number, number];
  clinicalTip: string;
}

const ALL_FACTORS = ["I","II","V","VII","VIII","IX","X","XI","XII","XIII"];

const BUILT_IN_CASES: CoagCase[] = [
  {
    title: "Hemofilia A – Deficiência de Fator VIII",
    difficulty: "Fácil",
    patient: { name: "Pedro Henrique", age: 12, weight: 42, diagnosis: "Hemofilia A severa" },
    scenario: "Menino com hemartroses de repetição. Identifique o fator deficiente e observe o impacto nos testes laboratoriais.",
    disabledFactors: ["VIII"],
    expectedTP: [10, 14], expectedINR: [0.8, 1.2], expectedTTPa: [60, 120],
    clinicalTip: "Na hemofilia A (deficiência de FVIII), a via intrínseca é comprometida, resultando em TTPa prolongado com TP normal. O INR permanece inalterado.",
  },
  {
    title: "Uso de Varfarina – Anticoagulação Oral",
    difficulty: "Médio",
    patient: { name: "Maria das Graças", age: 72, weight: 65, diagnosis: "Fibrilação atrial em anticoagulação" },
    scenario: "Paciente em uso de varfarina. Observe quais fatores são afetados (II, VII, IX, X – vitamina K-dependentes).",
    disabledFactors: ["II", "VII", "IX", "X"],
    expectedTP: [20, 40], expectedINR: [2, 3], expectedTTPa: [35, 60],
    clinicalTip: "A varfarina inibe a epóxido-redutase da vitamina K, afetando os fatores II, VII, IX e X. O INR terapêutico em FA é 2,0-3,0.",
  },
  {
    title: "CIVD – Coagulação Intravascular Disseminada",
    difficulty: "Difícil",
    patient: { name: "João Carlos", age: 58, weight: 80, diagnosis: "Sepse com CIVD" },
    scenario: "Paciente séptico com consumo generalizado de fatores. Desative múltiplos fatores e observe a coagulopatia.",
    disabledFactors: ["I", "II", "V", "VIII", "XIII"],
    expectedTP: [25, 50], expectedINR: [2, 5], expectedTTPa: [50, 120],
    clinicalTip: "Na CIVD, há consumo maciço de fatores de coagulação e plaquetas, resultando em prolongamento tanto do TP quanto do TTPa, com fibrinogênio baixo.",
  },
];

function computeCoagulation(disabledFactors: Set<string>) {
  // Intrinsic pathway: XII → XI → IX → VIII → X → V → II → I
  const intrinsicFactors = ["XII","XI","IX","VIII","X","V","II","I"];
  const intrinsicBlocked = intrinsicFactors.some(f => disabledFactors.has(f));
  const intrinsicBlockCount = intrinsicFactors.filter(f => disabledFactors.has(f)).length;

  // Extrinsic pathway: VII → X → V → II → I
  const extrinsicFactors = ["VII","X","V","II","I"];
  const extrinsicBlocked = extrinsicFactors.some(f => disabledFactors.has(f));
  const extrinsicBlockCount = extrinsicFactors.filter(f => disabledFactors.has(f)).length;

  // Common pathway: X → V → II → I
  const commonFactors = ["X","V","II","I"];
  const commonBlocked = commonFactors.some(f => disabledFactors.has(f));

  // TP (normal 10-14s) — affected by extrinsic + common
  const tp = Math.round((12 + extrinsicBlockCount * 8 + (commonBlocked ? 5 : 0)) * 10) / 10;
  
  // INR = (TP / 12)^1.1
  const inr = Math.round(Math.pow(tp / 12, 1.1) * 10) / 10;

  // TTPa (normal 25-35s) — affected by intrinsic + common
  const ttpa = Math.round((30 + intrinsicBlockCount * 12 + (commonBlocked ? 8 : 0)) * 10) / 10;

  // Pathway status
  const intrinsicStatus = intrinsicBlocked ? "Comprometida" : "Normal";
  const extrinsicStatus = extrinsicBlocked ? "Comprometida" : "Normal";
  const commonStatus = commonBlocked ? "Comprometida" : "Normal";

  return { tp, inr, ttpa, intrinsicStatus, extrinsicStatus, commonStatus };
}

export default function SimuladorCascataCoagulacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");

  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<CoagCase | null>(null);
  const [disabledFactors, setDisabledFactors] = useState<Set<string>>(new Set());
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario,
        disabledFactors: cd.disabledFactors ?? [],
        expectedTP: cd.expectedTP ?? [10, 14], expectedINR: cd.expectedINR ?? [0.8, 1.2], expectedTTPa: cd.expectedTTPa ?? [25, 35],
        clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setDisabledFactors(new Set(activeCase.disabledFactors));
    }
  }, [activeCase]);

  const toggleFactor = (factor: string) => {
    setDisabledFactors(prev => {
      const next = new Set(prev);
      if (next.has(factor)) next.delete(factor); else next.add(factor);
      return next;
    });
  };

  const outputs = computeCoagulation(disabledFactors);

  const handleFinish = useCallback(() => {
    if (!activeCase) return 0;
    const tpOk = outputs.tp >= activeCase.expectedTP[0] && outputs.tp <= activeCase.expectedTP[1];
    const ttpaOk = outputs.ttpa >= activeCase.expectedTTPa[0] && outputs.ttpa <= activeCase.expectedTTPa[1];
    const s = (tpOk ? 50 : 0) + (ttpaOk ? 50 : 0);
    if (!submitted) submitResults({ score: s, actions: { disabledFactors: Array.from(disabledFactors), tp: outputs.tp, inr: outputs.inr, ttpa: outputs.ttpa } });
    return s;
  }, [activeCase, outputs, disabledFactors, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      disabledFactors: c.disabledFactors ?? [],
      expectedTP: c.expectedTP ?? [10, 14], expectedINR: c.expectedINR ?? [0.8, 1.2], expectedTTPa: c.expectedTTPa ?? [25, 35],
      clinicalTip: c.clinicalTip ?? "",
    });
  };

  // Presets
  const applyPreset = (preset: string) => {
    switch (preset) {
      case "hemofilia-a": setDisabledFactors(new Set(["VIII"])); break;
      case "hemofilia-b": setDisabledFactors(new Set(["IX"])); break;
      case "varfarina": setDisabledFactors(new Set(["II","VII","IX","X"])); break;
      case "heparina": setDisabledFactors(new Set(["II","IX","X","XI","XII"])); break;
      case "civd": setDisabledFactors(new Set(["I","II","V","VIII","XIII"])); break;
      case "normal": setDisabledFactors(new Set()); break;
    }
  };

  const barData = [
    { name: "TP", valor: outputs.tp, normal: 12, unidade: "s" },
    { name: "INR", valor: outputs.inr, normal: 1.0, unidade: "" },
    { name: "TTPa", valor: outputs.ttpa, normal: 30, unidade: "s" },
  ];

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  if (!activeCase) {
    if (isVirtualRoom) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cascata de Coagulação</h1>
            <p className="text-muted-foreground">Explore as vias intrínseca, extrínseca e comum da hemostasia.</p>
            <AdminPromptViewer toolSlug="sim-cascata-coagulacao" toolName="Cascata de Coagulação" toolType="simulator" prompt={getNativePrompt("sim-cascata-coagulacao") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && (
              <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Caso com IA
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && (
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Fatores de Coagulação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {ALL_FACTORS.map((f) => (
                <div key={f} className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${disabledFactors.has(f) ? "border-destructive/40 bg-destructive/10" : "border-border bg-muted"}`}>
                  <span className={`text-sm font-medium ${disabledFactors.has(f) ? "text-destructive line-through" : ""}`}>Fator {f}</span>
                  <Switch checked={!disabledFactors.has(f)} onCheckedChange={() => toggleFactor(f)} />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cenários Rápidos</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "normal", label: "Normal" },
                  { key: "hemofilia-a", label: "Hemofilia A" },
                  { key: "hemofilia-b", label: "Hemofilia B" },
                  { key: "varfarina", label: "Varfarina" },
                  { key: "heparina", label: "Heparina" },
                  { key: "civd", label: "CIVD" },
                ].map((p) => (
                  <Button key={p.key} variant="outline" size="sm" onClick={() => applyPreset(p.key)} className="text-xs h-7">{p.label}</Button>
                ))}
              </div>
            </div>

            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={handleFinish} fallbackLabel="Finalizar Avaliação" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resultados Laboratoriais</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`p-3 rounded-lg text-center ${outputs.tp > 14 ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                <p className="text-xs text-muted-foreground">TP</p>
                <p className={`text-2xl font-bold ${outputs.tp > 14 ? "text-destructive" : ""}`}>{outputs.tp}s</p>
                <p className="text-xs text-muted-foreground">Ref: 10-14s</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${outputs.inr > 1.2 ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                <p className="text-xs text-muted-foreground">INR</p>
                <p className={`text-2xl font-bold ${outputs.inr > 1.2 ? "text-destructive" : ""}`}>{outputs.inr}</p>
                <p className="text-xs text-muted-foreground">Ref: 0.8-1.2</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${outputs.ttpa > 35 ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                <p className="text-xs text-muted-foreground">TTPa</p>
                <p className={`text-2xl font-bold ${outputs.ttpa > 35 ? "text-destructive" : ""}`}>{outputs.ttpa}s</p>
                <p className="text-xs text-muted-foreground">Ref: 25-35s</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Via Intrínseca", status: outputs.intrinsicStatus },
                { label: "Via Extrínseca", status: outputs.extrinsicStatus },
                { label: "Via Comum", status: outputs.commonStatus },
              ].map((v) => (
                <div key={v.label} className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p className={`text-sm font-bold ${v.status === "Normal" ? "text-green-600" : "text-destructive"}`}>{v.status}</p>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="valor" name="Paciente" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                <Bar dataKey="normal" name="Referência" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cascade diagram */}
      <Card>
        <CardHeader><CardTitle className="text-base">Fluxograma da Cascata</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm text-muted-foreground">Via Intrínseca</p>
              {["XII","XI","IX","VIII"].map((f) => (
                <div key={f} className={`p-2 rounded border ${disabledFactors.has(f) ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : "bg-primary/10 border-primary/20"}`}>
                  Fator {f}
                </div>
              ))}
              <div className="text-muted-foreground">↓</div>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <p className="font-semibold text-sm text-muted-foreground">Via Comum</p>
              {["X","V","II","I"].map((f) => (
                <div key={f} className={`p-2 rounded border ${disabledFactors.has(f) ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : "bg-primary/10 border-primary/20"}`}>
                  Fator {f}{f === "I" ? " (Fibrinogênio)" : f === "II" ? " (Protrombina)" : ""}
                </div>
              ))}
              <div className={`p-2 rounded border font-bold ${disabledFactors.has("XIII") ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700"}`}>
                {disabledFactors.has("XIII") ? "Coágulo Instável ✕" : "Coágulo Estável ✓"}
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm text-muted-foreground">Via Extrínseca</p>
              {["VII"].map((f) => (
                <div key={f} className={`p-2 rounded border ${disabledFactors.has(f) ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : "bg-primary/10 border-primary/20"}`}>
                  Fator {f}
                </div>
              ))}
              <div className="p-2 rounded border bg-muted text-muted-foreground">Fator Tecidual (TF)</div>
              <div className="text-muted-foreground">↓</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getCascataCoagulacaoChallenges()}
        simulatorState={{}}
        onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }}
      />

      {isVirtualRoom && submitted && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setShowFeedback(!showFeedback)}>
              {showFeedback ? "Ocultar Resultados" : "Mostrar Resultados"}
            </Button>
            {showFeedback && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm font-semibold">Pontuação: {lastScore}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
