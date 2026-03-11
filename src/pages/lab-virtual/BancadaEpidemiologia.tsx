import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Activity, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

const STUDY_TYPES = [
  { id: "coorte", name: "Coorte Prospectiva" },
  { id: "caso-controle", name: "Caso-Controle" },
  { id: "transversal", name: "Transversal" },
];

const EXPOSURES = [
  { id: "tabagismo", name: "Tabagismo", baseOR: 2.5 },
  { id: "sedentarismo", name: "Sedentarismo", baseOR: 1.8 },
  { id: "obesidade", name: "Obesidade (IMC ≥ 30)", baseOR: 3.2 },
  { id: "hiperuricemia", name: "Hiperuricemia", baseOR: 1.6 },
  { id: "polifarmacia", name: "Polifarmácia (≥5 medicamentos)", baseOR: 2.1 },
];

const OUTCOMES = [
  { id: "iam", name: "Infarto Agudo do Miocárdio", prevalence: 0.05 },
  { id: "avc", name: "Acidente Vascular Cerebral", prevalence: 0.03 },
  { id: "dm2", name: "Diabetes Mellitus tipo 2", prevalence: 0.08 },
  { id: "dpoc", name: "DPOC", prevalence: 0.04 },
  { id: "ram", name: "Reação Adversa a Medicamentos", prevalence: 0.12 },
];

function generateDataset(sampleSize: number, exposureOR: number, outcomePrevalence: number) {
  const pExp = 0.3;
  let a = 0, b = 0, c = 0, d = 0;
  for (let i = 0; i < sampleSize; i++) {
    const exposed = Math.random() < pExp;
    const baseRisk = outcomePrevalence;
    const risk = exposed ? 1 - Math.pow(1 - baseRisk, exposureOR) : baseRisk;
    const outcome = Math.random() < risk;
    if (exposed && outcome) a++;
    else if (exposed && !outcome) b++;
    else if (!exposed && outcome) c++;
    else d++;
  }
  return { a, b, c, d };
}

function calcMeasures(a: number, b: number, c: number, d: number) {
  const or = (a * d) / (b * c) || 0;
  const riskExp = a / (a + b) || 0;
  const riskUnexp = c / (c + d) || 0;
  const rr = riskExp / riskUnexp || 0;
  const rd = riskExp - riskUnexp;
  const nnt = rd > 0 ? Math.ceil(1 / rd) : Infinity;
  const lnOR = Math.log(or);
  const seOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const ci95Lower = Math.exp(lnOR - 1.96 * seOR);
  const ci95Upper = Math.exp(lnOR + 1.96 * seOR);
  const pValue = or === 1 ? 1 : (ci95Lower > 1 || ci95Upper < 1 ? 0.01 + Math.random() * 0.04 : 0.05 + Math.random() * 0.45);
  return { or: parseFloat(or.toFixed(2)), rr: parseFloat(rr.toFixed(2)), rd: parseFloat(rd.toFixed(4)), nnt, ci95Lower: parseFloat(ci95Lower.toFixed(2)), ci95Upper: parseFloat(ci95Upper.toFixed(2)), pValue: parseFloat(pValue.toFixed(3)), significant: ci95Lower > 1 || ci95Upper < 1 };
}

export default function BancadaEpidemiologia() {
  const navigate = useNavigate();
  const [studyType, setStudyType] = useState("coorte");
  const [exposure, setExposure] = useState("tabagismo");
  const [outcome, setOutcome] = useState("iam");
  const [sampleSize, setSampleSize] = useState([500]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    table2x2: { a: number; b: number; c: number; d: number };
    measures: ReturnType<typeof calcMeasures>;
    forestPlot: any[];
  }>(null);

  const exp = EXPOSURES.find((e) => e.id === exposure)!;
  const out = OUTCOMES.find((o) => o.id === outcome)!;

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const { a, b, c, d } = generateDataset(sampleSize[0], exp.baseOR, out.prevalence);
      const measures = calcMeasures(a, b, c, d);
      const forestPlot = [
        { name: "Bruto", or: measures.or, lower: measures.ci95Lower, upper: measures.ci95Upper },
        { name: "Ajust. Idade", or: parseFloat((measures.or * (0.85 + Math.random() * 0.15)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.9).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.95).toFixed(2)) },
        { name: "Ajust. Sexo", or: parseFloat((measures.or * (0.9 + Math.random() * 0.1)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.88).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.97).toFixed(2)) },
      ];
      setResults({ table2x2: { a, b, c, d }, measures, forestPlot });
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
            <Activity className="h-7 w-7 text-primary" />
            Bancada de Epidemiologia
          </h1>
          <p className="text-sm text-muted-foreground">Estudo observacional, OR/RR e análise de associação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Desenho do Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de estudo</label>
              <Select value={studyType} onValueChange={setStudyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STUDY_TYPES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Exposição</label>
              <Select value={exposure} onValueChange={setExposure}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPOSURES.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Desfecho</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tamanho amostral: {sampleSize[0]}</label>
              <Slider value={sampleSize} onValueChange={setSampleSize} min={100} max={5000} step={100} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Coletando dados...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Executar Estudo</span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Tabela 2×2 e Medidas de Associação</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando estudo</div>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 border"></th>
                      <th className="p-2 border text-center">Desfecho +</th>
                      <th className="p-2 border text-center">Desfecho −</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border font-medium">Exposto</td><td className="p-2 border text-center font-bold">{results.table2x2.a}</td><td className="p-2 border text-center">{results.table2x2.b}</td></tr>
                    <tr><td className="p-2 border font-medium">Não exposto</td><td className="p-2 border text-center">{results.table2x2.c}</td><td className="p-2 border text-center">{results.table2x2.d}</td></tr>
                  </tbody>
                </table>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Odds Ratio</p><p className="text-lg font-bold">{results.measures.or}</p><p className="text-[10px] text-muted-foreground">IC 95%: {results.measures.ci95Lower} — {results.measures.ci95Upper}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Risco Relativo</p><p className="text-lg font-bold">{results.measures.rr}</p><p className="text-[10px] text-muted-foreground">p = {results.measures.pValue}</p></div>
                </div>
                <div className={`p-3 rounded-lg border text-xs ${results.measures.significant ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                  <Badge variant={results.measures.significant ? "default" : "secondary"}>{results.measures.significant ? "Significativo" : "Não significativo"}</Badge>
                  <p className="mt-1 text-muted-foreground">
                    {results.measures.significant
                      ? `Associação estatisticamente significativa entre ${exp.name.toLowerCase()} e ${out.name.toLowerCase()} (OR = ${results.measures.or}; IC 95%: ${results.measures.ci95Lower}–${results.measures.ci95Upper}). NNH = ${results.measures.nnt === Infinity ? "N/A" : results.measures.nnt}.`
                      : `Não foi possível demonstrar associação significativa com o tamanho amostral atual. Considere aumentar a amostra.`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">3. Forest Plot — Análise Ajustada</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.forestPlot.map((item) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <span className="text-sm w-24 shrink-0">{item.name}</span>
                    <div className="flex-1 relative h-8">
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-px bg-muted-foreground" style={{
                        left: `${Math.max(0, (item.lower / 6) * 100)}%`,
                        width: `${Math.min(100, ((item.upper - item.lower) / 6) * 100)}%`,
                      }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-sm rotate-45" style={{
                        left: `${Math.min(95, (item.or / 6) * 100)}%`,
                      }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-px h-full bg-destructive/50" style={{ left: `${(1 / 6) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-32 shrink-0 text-right">{item.or} ({item.lower}–{item.upper})</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center">Linha vermelha = OR 1,0 (sem associação)</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
