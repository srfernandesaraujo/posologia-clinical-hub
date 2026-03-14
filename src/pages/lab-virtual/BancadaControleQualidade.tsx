import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ClipboardCheck, Lock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const METHODS = [
  { id: "uv-vis", name: "Espectrofotometria UV-Vis", lambda: "254 nm" },
  { id: "hplc", name: "HPLC-UV", lambda: "220 nm" },
  { id: "titulacao", name: "Titulação Potenciométrica", lambda: "—" },
];

const ANALYTES = [
  { id: "paracetamol", name: "Paracetamol", trueConc: 500, unit: "mg", spec: "95-105% do declarado" },
  { id: "ibuprofeno", name: "Ibuprofeno", trueConc: 400, unit: "mg", spec: "90-110% do declarado" },
  { id: "metformina", name: "Metformina", trueConc: 850, unit: "mg", spec: "95-105% do declarado" },
  { id: "losartana", name: "Losartana", trueConc: 50, unit: "mg", spec: "90-110% do declarado" },
];

function generateCalibration(nPoints: number) {
  const standards = [];
  for (let i = 1; i <= nPoints; i++) {
    const conc = (i / nPoints) * 100;
    const response = 0.0125 * conc + 0.015 + (Math.random() - 0.5) * 0.008;
    standards.push({ concentracao: parseFloat(conc.toFixed(1)), resposta: parseFloat(response.toFixed(4)) });
  }
  return standards;
}

function linearRegression(data: { concentracao: number; resposta: number }[]) {
  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.concentracao, 0);
  const sumY = data.reduce((s, d) => s + d.resposta, 0);
  const sumXY = data.reduce((s, d) => s + d.concentracao * d.resposta, 0);
  const sumX2 = data.reduce((s, d) => s + d.concentracao * d.concentracao, 0);
  const sumY2 = data.reduce((s, d) => s + d.resposta * d.resposta, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const r2Num = Math.pow(n * sumXY - sumX * sumY, 2);
  const r2Den = (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY);
  const r2 = r2Num / r2Den;
  const residuals = data.map((d) => d.resposta - (slope * d.concentracao + intercept));
  const sy = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2));
  const lod = (3.3 * sy) / slope;
  const loq = (10 * sy) / slope;
  return { slope, intercept, r2, lod, loq };
}

function generateSampleReadings(trueConc: number, slope: number, intercept: number, nReplicas: number) {
  const readings = [];
  // Inject one potential outlier in a random position
  const outlierIdx = Math.floor(Math.random() * nReplicas);
  for (let i = 0; i < nReplicas; i++) {
    const isOutlier = i === outlierIdx && Math.random() > 0.5;
    const noise = isOutlier ? (Math.random() - 0.5) * 0.08 : (Math.random() - 0.5) * 0.02;
    const response = slope * (trueConc / 10) + intercept + noise;
    const backCalcConc = ((response - intercept) / slope) * 10;
    const recovery = (backCalcConc / trueConc) * 100;
    readings.push({ replica: i + 1, resposta: parseFloat(response.toFixed(4)), concentracao: parseFloat(backCalcConc.toFixed(2)), recuperacao: parseFloat(recovery.toFixed(1)), isOutlier });
  }
  return readings;
}

export default function BancadaControleQualidade() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("controle-qualidade");
  const startTimeRef = useRef(Date.now());
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [method, setMethod] = useState("uv-vis");
  const [analyte, setAnalyte] = useState("paracetamol");
  const [customAnalyte, setCustomAnalyte] = useState<typeof ANALYTES[0] | null>(null);
  // M2
  const [nStandards, setNStandards] = useState([6]);
  const [calibration, setCalibration] = useState<any[] | null>(null);
  const [regression, setRegression] = useState<ReturnType<typeof linearRegression> | null>(null);
  // M2 decision: R² validation
  const [userR2Decision, setUserR2Decision] = useState("");
  const [m2DecisionSubmitted, setM2DecisionSubmitted] = useState(false);
  const [m2Feedback, setM2Feedback] = useState<{ correct: boolean; r2Value: number; meetsICH: boolean } | null>(null);
  // M3
  const [nReplicas, setNReplicas] = useState([6]);
  const [samples, setSamples] = useState<ReturnType<typeof generateSampleReadings> | null>(null);
  // M3 decision: outlier identification
  const [userExcluded, setUserExcluded] = useState<Set<number>>(new Set());
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{ correctExclusions: boolean; realOutliers: number[]; consequence: string } | null>(null);
  // M4 decision: emit verdict
  const [userVerdict, setUserVerdict] = useState("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{
    correct: boolean; realVerdict: string;
    meanConc: number; rsd: number; meanRecovery: number;
    r2Pass: boolean; rsdPass: boolean; recoveryPass: boolean;
  } | null>(null);

  const allAnalytes = useMemo(() => [...ANALYTES, ...(customAnalyte ? [customAnalyte] : [])], [customAnalyte]);
  const selectedAnalyte = allAnalytes.find((a) => a.id === analyte)!;
  const selectedMethod = METHODS.find((m) => m.id === method)!;
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmAnalysis = () => {
    setCompletedModules(new Set([1]));
    setCalibration(null); setRegression(null); setSamples(null);
    setM2DecisionSubmitted(false); setM2Feedback(null); setUserR2Decision("");
    setM3Submitted(false); setM3Feedback(null); setUserExcluded(new Set());
    setM4Submitted(false); setM4Feedback(null); setUserVerdict("");
  };

  const runCalibration = () => {
    const cal = generateCalibration(nStandards[0]);
    const reg = linearRegression(cal);
    setCalibration(cal);
    setRegression(reg);
    setSamples(null);
    setM2DecisionSubmitted(false); setM2Feedback(null); setUserR2Decision("");
    setM3Submitted(false); setM3Feedback(null); setUserExcluded(new Set());
    setM4Submitted(false); setM4Feedback(null); setUserVerdict("");
  };

  // M2 decision: evaluate R²
  const submitM2Decision = () => {
    if (!regression) return;
    const meetsICH = regression.r2 >= 0.999;
    const correct = (userR2Decision === "aprovar" && meetsICH) || (userR2Decision === "rejeitar" && !meetsICH);
    setM2Feedback({ correct, r2Value: regression.r2, meetsICH });
    setM2DecisionSubmitted(true);
    completeModule(2);
  };

  const runSamples = () => {
    if (!regression) return;
    const s = generateSampleReadings(selectedAnalyte.trueConc, regression.slope, regression.intercept, nReplicas[0]);
    setSamples(s);
    setM3Submitted(false); setM3Feedback(null); setUserExcluded(new Set());
    setM4Submitted(false); setM4Feedback(null); setUserVerdict("");
  };

  // M3 decision: identify outliers
  const toggleExclude = (replica: number) => {
    setUserExcluded(prev => {
      const next = new Set(prev);
      if (next.has(replica)) next.delete(replica); else next.add(replica);
      return next;
    });
  };

  const submitM3Decision = () => {
    if (!samples) return;
    const realOutliers = samples.filter(s => s.isOutlier).map(s => s.replica);
    // Check if user correctly identified outliers (tolerance: outliers are those with recovery <96% or >104%)
    const suspectReplicas = samples.filter(s => s.recuperacao < 96 || s.recuperacao > 104).map(s => s.replica);
    const correctExclusions = suspectReplicas.length === 0
      ? userExcluded.size === 0
      : suspectReplicas.every(r => userExcluded.has(r)) && userExcluded.size <= suspectReplicas.length + 1;

    const consequence = correctExclusions
      ? "Boa identificação! Exclusão adequada de outliers melhora a precisão da análise."
      : userExcluded.size > suspectReplicas.length
        ? "Excluir réplicas válidas reduz o poder estatístico. Apenas exclua leituras com desvio >2σ ou recuperação fora de 96-104%."
        : "Outliers não removidos podem inflacionar o RSD e comprometer a validação.";

    setM3Feedback({ correctExclusions, realOutliers: suspectReplicas, consequence });
    setM3Submitted(true);
    completeModule(3);
  };

  // M4 decision: emit final verdict
  const submitM4Decision = () => {
    if (!samples || !regression) return;
    const filteredSamples = samples.filter(s => !userExcluded.has(s.replica));
    const meanConc = filteredSamples.reduce((s, r) => s + r.concentracao, 0) / filteredSamples.length;
    const std = Math.sqrt(filteredSamples.reduce((s, r) => s + Math.pow(r.concentracao - meanConc, 2), 0) / (filteredSamples.length - 1));
    const rsd = (std / meanConc) * 100;
    const meanRecovery = filteredSamples.reduce((s, r) => s + r.recuperacao, 0) / filteredSamples.length;
    const r2Pass = regression.r2 >= 0.999;
    const rsdPass = rsd <= 2;
    const recoveryPass = meanRecovery >= 98 && meanRecovery <= 102;
    const approved = r2Pass && rsdPass && recoveryPass;
    const realVerdict = approved ? "APROVADO" : "REPROVADO";
    const correct = userVerdict === realVerdict;
    setM4Feedback({
      correct, realVerdict,
      meanConc: parseFloat(meanConc.toFixed(2)),
      rsd: parseFloat(rsd.toFixed(2)),
      meanRecovery: parseFloat(meanRecovery.toFixed(1)),
      r2Pass, rsdPass, recoveryPass,
    });
    setM4Submitted(true);
    completeModule(4);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;
  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    : <XCircle className="h-4 w-4 text-destructive shrink-0" />;

  const experimentSummary: Record<string, string> = {
    Método: selectedMethod.name,
    Analito: `${selectedAnalyte.name} (${selectedAnalyte.trueConc} ${selectedAnalyte.unit})`,
    λ: selectedMethod.lambda,
  };
  if (regression) {
    experimentSummary["R²"] = regression.r2.toFixed(4);
    experimentSummary["LOD"] = `${regression.lod.toFixed(2)} µg/mL`;
    experimentSummary["LOQ"] = `${regression.loq.toFixed(2)} µg/mL`;
  }
  if (m4Feedback) {
    experimentSummary["RSD"] = `${m4Feedback.rsd}%`;
    experimentSummary["Recuperação"] = `${m4Feedback.meanRecovery}%`;
    experimentSummary["Laudo"] = m4Feedback.realVerdict;
  }

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Método analítico", userChoice: selectedMethod.name, correct: true },
      { label: "Analito", userChoice: selectedAnalyte.name, correct: true },
    ];
    if (m2Feedback) {
      decisions.push({ label: "Avaliação R² (≥0,999)", userChoice: userR2Decision, correct: m2Feedback.correct, idealChoice: m2Feedback.meetsICH ? "aprovar" : "rejeitar" });
    }
    if (m3Feedback) {
      decisions.push({ label: "Identificação de outliers", userChoice: `${userExcluded.size} excluídos`, correct: m3Feedback.correctExclusions, idealChoice: `${m3Feedback.realOutliers.length} outliers` });
    }
    if (m4Feedback) {
      decisions.push({ label: "Laudo final", userChoice: userVerdict, correct: m4Feedback.correct, idealChoice: m4Feedback.realVerdict });
    }
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({ score, actions: { decisions, report: reportData, experimentSummary }, timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000) });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-7 w-7 text-primary" /> Bancada de Controle de Qualidade</h1>
          <p className="text-sm text-muted-foreground">Curva de calibração, LOD/LOQ e validação analítica ICH Q2</p>
        </div>
        <AdminPromptViewer toolSlug={LAB_SYSTEM_PROMPTS["controle-qualidade"].slug} toolName={LAB_SYSTEM_PROMPTS["controle-qualidade"].name} toolType="laboratory" prompt={LAB_SYSTEM_PROMPTS["controle-qualidade"].prompt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção do Método e Analito <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Método</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Analito</label>
              <Select value={analyte} onValueChange={setAnalyte}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allAnalytes.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.trueConc} {a.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>λ:</strong> {selectedMethod.lambda}</p>
              <p><strong>Especificação:</strong> {selectedAnalyte.spec}</p>
            </div>
            <Button onClick={confirmAnalysis} className="w-full">Confirmar Análise</Button>
            <AIContextGenerator labType="controle-qualidade" onContextGenerated={(data: any) => {
              setCustomAnalyte(data.analyte); setAnalyte(data.analyte.id);
              setCompletedModules(new Set([1])); setCalibration(null); setRegression(null); setSamples(null);
              setM2DecisionSubmitted(false); setM2Feedback(null);
              setM3Submitted(false); setM3Feedback(null);
              setM4Submitted(false); setM4Feedback(null);
            }} />
          </CardContent>
        </Card>

        {/* M2 - Calibração + Decisão R² */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Curva de Calibração <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pontos da curva: {nStandards[0]}</label>
              <Slider value={nStandards} onValueChange={setNStandards} min={5} max={10} step={1} className="mt-2" />
            </div>
            <Button onClick={runCalibration} className="w-full">Executar Curva</Button>
            {calibration && regression && (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="concentracao" name="Conc" label={{ value: "Concentração (µg/mL)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} type="number" />
                    <YAxis dataKey="resposta" name="Resp" label={{ value: "Absorbância", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Scatter data={calibration} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="p-2 bg-muted/50 rounded text-xs space-y-0.5">
                  <p>y = {regression.slope.toFixed(5)}x + {regression.intercept.toFixed(4)}</p>
                  <p>R² = {regression.r2.toFixed(4)}</p>
                </div>

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão: O R² atende o critério ICH (≥ 0,999)?
                  </div>
                  <RadioGroup value={userR2Decision} onValueChange={setUserR2Decision} disabled={m2DecisionSubmitted} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="aprovar" id="r2-aprovar" />
                      <Label htmlFor="r2-aprovar" className="text-xs cursor-pointer">Aprovar – R² adequado para prosseguir</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="rejeitar" id="r2-rejeitar" />
                      <Label htmlFor="r2-rejeitar" className="text-xs cursor-pointer">Rejeitar – Refazer curva com mais pontos</Label>
                    </div>
                  </RadioGroup>

                  {!m2DecisionSubmitted ? (
                    <Button onClick={submitM2Decision} disabled={!userR2Decision} className="w-full" size="sm">Confirmar</Button>
                  ) : m2Feedback && (
                    <div className="flex items-center gap-2 text-xs animate-fade-in">
                      <FeedbackIcon correct={m2Feedback.correct} />
                      <span>R² = {m2Feedback.r2Value.toFixed(4)} → {m2Feedback.meetsICH ? "Atende ICH (≥0,999)" : "NÃO atende ICH (<0,999)"}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M3 - Amostras + Decisão: outliers */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Análise de Amostras <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!completedModules.has(2) || !regression ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando curva de calibração</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Réplicas: {nReplicas[0]}</label>
                  <Slider value={nReplicas} onValueChange={setNReplicas} min={3} max={10} step={1} className="mt-2" />
                </div>
                {!samples && <Button onClick={runSamples} className="w-full">Executar Leituras</Button>}
                {samples && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="py-1 text-left">#</th>
                            <th className="py-1 text-center">Resposta</th>
                            <th className="py-1 text-center">Conc.</th>
                            <th className="py-1 text-center">Recup.</th>
                            {!m3Submitted && <th className="py-1 text-center">Excluir?</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {samples.map((s) => (
                            <tr key={s.replica} className={`border-b border-border/50 ${userExcluded.has(s.replica) ? "opacity-40 line-through" : ""}`}>
                              <td className="py-1">{s.replica}</td>
                              <td className="py-1 text-center">{s.resposta}</td>
                              <td className="py-1 text-center">{s.concentracao} {selectedAnalyte.unit}</td>
                              <td className="py-1 text-center">{s.recuperacao}%</td>
                              {!m3Submitted && (
                                <td className="py-1 text-center">
                                  <Checkbox
                                    checked={userExcluded.has(s.replica)}
                                    onCheckedChange={() => toggleExclude(s.replica)}
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {m2Feedback && !m2Feedback.correct && !m3Submitted && (
                      <div className="p-2 rounded bg-destructive/10 text-xs text-destructive">
                        ⚠️ Sua avaliação do R² foi incorreta. Considere como isso pode impactar a confiabilidade das leituras.
                      </div>
                    )}

                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <AlertTriangle className="h-3 w-3" />
                        Decisão: Identifique e exclua leituras outliers (recuperação fora de 96-104%)
                      </div>

                      {!m3Submitted ? (
                        <Button onClick={submitM3Decision} className="w-full" size="sm">
                          Confirmar Exclusões ({userExcluded.size} excluídas)
                        </Button>
                      ) : m3Feedback && (
                        <div className="space-y-1 animate-fade-in text-xs">
                          <div className="flex items-center gap-2">
                            <FeedbackIcon correct={m3Feedback.correctExclusions} />
                            <span>Outliers reais: réplicas {m3Feedback.realOutliers.length > 0 ? m3Feedback.realOutliers.join(", ") : "nenhum"}</span>
                          </div>
                          <p className="text-muted-foreground">{m3Feedback.consequence}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 - Validação + Decisão: Laudo */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Emissão do Laudo <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!completedModules.has(3) || !samples ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando análise de amostras</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">R²</p><p className="text-lg font-bold">{regression!.r2.toFixed(4)}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">LOD</p><p className="text-lg font-bold">{regression!.lod.toFixed(2)}</p></div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <p><strong>Critérios ICH Q2:</strong></p>
                  <p>• Linearidade: R² ≥ 0,999</p>
                  <p>• Precisão: RSD ≤ 2%</p>
                  <p>• Exatidão: Recuperação 98-102%</p>
                </div>

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Emita o laudo final
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Com base nos dados de linearidade, precisão e exatidão, o lote atende os critérios de qualidade?
                  </p>

                  <RadioGroup value={userVerdict} onValueChange={setUserVerdict} disabled={m4Submitted} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="APROVADO" id="verdict-ap" />
                      <Label htmlFor="verdict-ap" className="text-xs cursor-pointer font-semibold text-green-600">APROVADO – Atende todos os critérios ICH Q2</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="REPROVADO" id="verdict-rp" />
                      <Label htmlFor="verdict-rp" className="text-xs cursor-pointer font-semibold text-red-600">REPROVADO – Não atende um ou mais critérios</Label>
                    </div>
                  </RadioGroup>

                  {!m4Submitted ? (
                    <Button onClick={submitM4Decision} disabled={!userVerdict} className="w-full">
                      Emitir Laudo
                    </Button>
                  ) : m4Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.correct} />
                        <span>Seu laudo: <strong>{userVerdict}</strong> | Real: <strong>{m4Feedback.realVerdict}</strong></span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <FeedbackIcon correct={m4Feedback.r2Pass} />
                          <span>R² = {regression!.r2.toFixed(4)} {m4Feedback.r2Pass ? "✓" : "✗"} (≥0,999)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FeedbackIcon correct={m4Feedback.rsdPass} />
                          <span>RSD = {m4Feedback.rsd}% {m4Feedback.rsdPass ? "✓" : "✗"} (≤2%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FeedbackIcon correct={m4Feedback.recoveryPass} />
                          <span>Recuperação = {m4Feedback.meanRecovery}% {m4Feedback.recoveryPass ? "✓" : "✗"} (98-102%)</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Teor médio: {m4Feedback.meanConc} {selectedAnalyte.unit}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Controle de Qualidade" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
