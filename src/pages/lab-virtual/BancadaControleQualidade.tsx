import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ClipboardCheck, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";

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
  for (let i = 0; i < nReplicas; i++) {
    const noise = (Math.random() - 0.5) * 0.02;
    const response = slope * (trueConc / 10) + intercept + noise;
    const backCalcConc = ((response - intercept) / slope) * 10;
    const recovery = (backCalcConc / trueConc) * 100;
    readings.push({ replica: i + 1, resposta: parseFloat(response.toFixed(4)), concentracao: parseFloat(backCalcConc.toFixed(2)), recuperacao: parseFloat(recovery.toFixed(1)) });
  }
  return readings;
}

export default function BancadaControleQualidade() {
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [method, setMethod] = useState("uv-vis");
  const [analyte, setAnalyte] = useState("paracetamol");
  const [customAnalyte, setCustomAnalyte] = useState<typeof ANALYTES[0] | null>(null);
  // M2
  const [nStandards, setNStandards] = useState([6]);
  const [calibration, setCalibration] = useState<any[] | null>(null);
  const [regression, setRegression] = useState<ReturnType<typeof linearRegression> | null>(null);
  // M3
  const [nReplicas, setNReplicas] = useState([6]);
  const [samples, setSamples] = useState<any[] | null>(null);
  // M4
  const [validation, setValidation] = useState<{ meanConc: number; rsd: number; meanRecovery: number; approved: boolean } | null>(null);

  const allAnalytes = useMemo(() => [...ANALYTES, ...(customAnalyte ? [customAnalyte] : [])], [customAnalyte]);
  const selectedAnalyte = allAnalytes.find((a) => a.id === analyte)!;
  const selectedMethod = METHODS.find((m) => m.id === method)!;
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmAnalysis = () => {
    setCompletedModules(new Set([1]));
    setCalibration(null);
    setRegression(null);
    setSamples(null);
    setValidation(null);
  };

  const runCalibration = () => {
    const cal = generateCalibration(nStandards[0]);
    const reg = linearRegression(cal);
    setCalibration(cal);
    setRegression(reg);
    setSamples(null);
    setValidation(null);
    completeModule(2);
  };

  const runSamples = () => {
    if (!regression) return;
    const s = generateSampleReadings(selectedAnalyte.trueConc, regression.slope, regression.intercept, nReplicas[0]);
    setSamples(s);
    setValidation(null);
    completeModule(3);
  };

  const runValidation = () => {
    if (!samples || !regression) return;
    const meanConc = samples.reduce((s, r) => s + r.concentracao, 0) / samples.length;
    const std = Math.sqrt(samples.reduce((s, r) => s + Math.pow(r.concentracao - meanConc, 2), 0) / (samples.length - 1));
    const rsd = (std / meanConc) * 100;
    const meanRecovery = samples.reduce((s, r) => s + r.recuperacao, 0) / samples.length;
    const approved = regression.r2 >= 0.999 && rsd <= 2 && meanRecovery >= 98 && meanRecovery <= 102;
    setValidation({ meanConc: parseFloat(meanConc.toFixed(2)), rsd: parseFloat(rsd.toFixed(2)), meanRecovery: parseFloat(meanRecovery.toFixed(1)), approved });
    completeModule(4);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

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
  if (validation) {
    experimentSummary["RSD"] = `${validation.rsd}%`;
    experimentSummary["Recuperação"] = `${validation.meanRecovery}%`;
    experimentSummary["Laudo"] = validation.approved ? "APROVADO" : "REPROVADO";
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-7 w-7 text-primary" /> Bancada de Controle de Qualidade</h1>
          <p className="text-sm text-muted-foreground">Curva de calibração, LOD/LOQ e validação analítica ICH Q2</p>
        </div>
        <AdminPromptViewer
          toolSlug={LAB_SYSTEM_PROMPTS["controle-qualidade"].slug}
          toolName={LAB_SYSTEM_PROMPTS["controle-qualidade"].name}
          toolType="laboratory"
          prompt={LAB_SYSTEM_PROMPTS["controle-qualidade"].prompt}
        />
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
            <AIContextGenerator
              labType="controle-qualidade"
              onContextGenerated={(data: any) => {
                setCustomAnalyte(data.analyte);
                setAnalyte(data.analyte.id);
                setCompletedModules(new Set([1]));
                setCalibration(null);
                setRegression(null);
                setSamples(null);
                setValidation(null);
              }}
            />
          </CardContent>
        </Card>

        {/* M2 */}
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
                <Button onClick={runSamples} variant="outline" className="w-full">Preparar Amostras</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Quantificação das Amostras <ModuleBadge n={3} /></CardTitle></CardHeader>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b"><th className="py-1 text-left">#</th><th className="py-1 text-center">Resposta</th><th className="py-1 text-center">Conc.</th><th className="py-1 text-center">Recup.</th></tr></thead>
                      <tbody>
                        {samples.map((s) => (
                          <tr key={s.replica} className="border-b border-border/50">
                            <td className="py-1">{s.replica}</td>
                            <td className="py-1 text-center">{s.resposta}</td>
                            <td className="py-1 text-center">{s.concentracao} {selectedAnalyte.unit}</td>
                            <td className="py-1 text-center">{s.recuperacao}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button onClick={runValidation} className="w-full mt-3">Validar Análise</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Validação Analítica <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!validation ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando amostras</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">R²</p><p className="text-lg font-bold">{regression!.r2.toFixed(4)}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">RSD (%)</p><p className="text-lg font-bold">{validation.rsd}%</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">LOD</p><p className="text-lg font-bold">{regression!.lod.toFixed(2)}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">LOQ</p><p className="text-lg font-bold">{regression!.loq.toFixed(2)}</p></div>
                </div>
                <p className="text-sm">Recuperação: <strong>{validation.meanRecovery}%</strong> · Teor: <strong>{validation.meanConc} {selectedAnalyte.unit}</strong></p>
                <div className={`p-3 rounded-lg border text-xs ${validation.approved ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <Badge variant={validation.approved ? "default" : "destructive"}>{validation.approved ? "APROVADO" : "REPROVADO"}</Badge>
                  <p className="mt-1 text-muted-foreground">
                    {validation.approved ? "Atende ICH Q2: R² ≥ 0,999, RSD ≤ 2%, recuperação 98-102%." : "Não atende a um ou mais critérios."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Controle de Qualidade" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
