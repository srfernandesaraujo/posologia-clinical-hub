import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ClipboardCheck, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ReferenceLine } from "recharts";

const METHODS = [
  { id: "uv-vis", name: "Espectrofotometria UV-Vis", lambda: "254 nm" },
  { id: "hplc", name: "HPLC-UV", lambda: "220 nm" },
  { id: "titulacao", name: "Titulação Potenciométrica", lambda: "—" },
];

const ANALYTES = [
  { id: "paracetamol", name: "Paracetamol", trueConc: 500, unit: "mg" },
  { id: "ibuprofeno", name: "Ibuprofeno", trueConc: 400, unit: "mg" },
  { id: "metformina", name: "Metformina", trueConc: 850, unit: "mg" },
  { id: "losartana", name: "Losartana", trueConc: 50, unit: "mg" },
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
  return { slope, intercept, r2, lod, loq, sy };
}

function generateSampleReadings(trueConc: number, slope: number, intercept: number, nReplicas: number) {
  const readings = [];
  for (let i = 0; i < nReplicas; i++) {
    const noise = (Math.random() - 0.5) * 0.02;
    const response = slope * (trueConc / 10) + intercept + noise; // diluted 1:10
    const backCalcConc = ((response - intercept) / slope) * 10;
    const recovery = (backCalcConc / trueConc) * 100;
    readings.push({ replica: i + 1, resposta: parseFloat(response.toFixed(4)), concentracao: parseFloat(backCalcConc.toFixed(2)), recuperacao: parseFloat(recovery.toFixed(1)) });
  }
  return readings;
}

export default function BancadaControleQualidade() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("uv-vis");
  const [analyte, setAnalyte] = useState("paracetamol");
  const [nStandards, setNStandards] = useState([6]);
  const [nReplicas, setNReplicas] = useState([6]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    calibration: any[];
    regression: { slope: number; intercept: number; r2: number; lod: number; loq: number };
    samples: any[];
    meanConc: number;
    rsd: number;
    meanRecovery: number;
    approved: boolean;
  }>(null);

  const selectedAnalyte = ANALYTES.find((a) => a.id === analyte)!;

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const calibration = generateCalibration(nStandards[0]);
      const regression = linearRegression(calibration);
      const samples = generateSampleReadings(selectedAnalyte.trueConc, regression.slope, regression.intercept, nReplicas[0]);
      const meanConc = samples.reduce((s, r) => s + r.concentracao, 0) / samples.length;
      const std = Math.sqrt(samples.reduce((s, r) => s + Math.pow(r.concentracao - meanConc, 2), 0) / (samples.length - 1));
      const rsd = (std / meanConc) * 100;
      const meanRecovery = samples.reduce((s, r) => s + r.recuperacao, 0) / samples.length;
      const approved = regression.r2 >= 0.999 && rsd <= 2 && meanRecovery >= 98 && meanRecovery <= 102;
      setResults({ calibration, regression, samples, meanConc: parseFloat(meanConc.toFixed(2)), rsd: parseFloat(rsd.toFixed(2)), meanRecovery: parseFloat(meanRecovery.toFixed(1)), approved });
      setRunning(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Bancada de Controle de Qualidade
          </h1>
          <p className="text-sm text-muted-foreground">Curva de calibração, LOD/LOQ e validação analítica ICH Q2</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Desenho Analítico</CardTitle></CardHeader>
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
                <SelectContent>{ANALYTES.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.trueConc} {a.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Pontos da curva: {nStandards[0]}</label>
              <Slider value={nStandards} onValueChange={setNStandards} min={5} max={10} step={1} className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium">Réplicas da amostra: {nReplicas[0]}</label>
              <Slider value={nReplicas} onValueChange={setNReplicas} min={3} max={10} step={1} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Processando amostras...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Executar Análise</span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Validação Analítica</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando análise</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">R²</p><p className="text-lg font-bold">{results.regression.r2.toFixed(4)}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">RSD (%)</p><p className="text-lg font-bold">{results.rsd}%</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">LOD</p><p className="text-lg font-bold">{results.regression.lod.toFixed(2)} µg/mL</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">LOQ</p><p className="text-lg font-bold">{results.regression.loq.toFixed(2)} µg/mL</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Recuperação média: <strong>{results.meanRecovery}%</strong></span>
                  <span className="text-sm">Teor: <strong>{results.meanConc} {selectedAnalyte.unit}</strong></span>
                </div>
                <div className={`p-3 rounded-lg border text-xs ${results.approved ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <Badge variant={results.approved ? "default" : "destructive"}>{results.approved ? "APROVADO" : "REPROVADO"}</Badge>
                  <p className="mt-1 text-muted-foreground">
                    {results.approved
                      ? "O lote atende aos critérios farmacopeicos: linearidade (R² ≥ 0,999), precisão (RSD ≤ 2%) e exatidão (recuperação 98-102%)."
                      : "O lote não atende a um ou mais critérios de aceitação. Repetir análise ou investigar desvio."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">3. Curva de Calibração</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Execute a análise</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="concentracao" name="Concentração" label={{ value: "Concentração (µg/mL)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} type="number" />
                  <YAxis dataKey="resposta" name="Resposta" label={{ value: "Absorbância (UA)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Scatter data={results.calibration} fill="hsl(var(--primary))" name="Padrões" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
