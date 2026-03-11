import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Dna, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

const DRUGS = [
  { id: "codeina", name: "Codeína", enzyme: "CYP2D6", type: "prodrug", baseParams: { ka: 1.2, ke: 0.15, vd: 200, f: 0.9 } },
  { id: "tamoxifeno", name: "Tamoxifeno", enzyme: "CYP2D6", type: "prodrug", baseParams: { ka: 0.8, ke: 0.05, vd: 800, f: 0.95 } },
  { id: "omeprazol", name: "Omeprazol", enzyme: "CYP2C19", type: "drug", baseParams: { ka: 1.5, ke: 0.35, vd: 35, f: 0.65 } },
  { id: "clopidogrel", name: "Clopidogrel", enzyme: "CYP2C19", type: "prodrug", baseParams: { ka: 1.0, ke: 0.12, vd: 120, f: 0.5 } },
  { id: "warfarina", name: "Warfarina", enzyme: "CYP2C9", type: "drug", baseParams: { ka: 0.9, ke: 0.02, vd: 10, f: 0.99 } },
];

const PHENOTYPES = [
  { id: "PM", name: "Metabolizador Lento (PM)", factor: 0.2, color: "hsl(0 72% 51%)" },
  { id: "IM", name: "Metabolizador Intermediário (IM)", factor: 0.6, color: "hsl(25 95% 53%)" },
  { id: "EM", name: "Metabolizador Extensivo (EM)", factor: 1.0, color: "hsl(142 71% 45%)" },
  { id: "UM", name: "Metabolizador Ultrarrápido (UM)", factor: 1.8, color: "hsl(199 89% 48%)" },
];

function generatePKCurve(params: { ka: number; ke: number; vd: number; f: number }, dose: number, metabolismFactor: number, isProdrug: boolean) {
  const points = [];
  const ke = isProdrug ? params.ke * (1 / metabolismFactor) : params.ke * metabolismFactor;
  const effectiveDose = isProdrug ? dose * params.f * metabolismFactor : dose * params.f;
  for (let t = 0; t <= 24; t += 0.25) {
    const cp = (effectiveDose * params.ka / (params.vd * (params.ka - ke))) * (Math.exp(-ke * t) - Math.exp(-params.ka * t));
    points.push({ hora: t, concentracao: Math.max(0, parseFloat(cp.toFixed(3))) });
  }
  return points;
}

function calcAUC(points: { hora: number; concentracao: number }[]): number {
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    auc += ((points[i - 1].concentracao + points[i].concentracao) / 2) * (points[i].hora - points[i - 1].hora);
  }
  return parseFloat(auc.toFixed(2));
}

export default function BancadaFarmacogenomica() {
  const navigate = useNavigate();
  const [drug, setDrug] = useState("codeina");
  const [dose, setDose] = useState([100]);
  const [popSize, setPopSize] = useState([50]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    curves: { phenotype: string; color: string; data: any[] }[];
    aucComparison: { phenotype: string; auc: number; cmax: number; clearance: number; fill: string }[];
  }>(null);

  const selectedDrug = DRUGS.find((d) => d.id === drug)!;

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const curves = PHENOTYPES.map((p) => {
        const data = generatePKCurve(selectedDrug.baseParams, dose[0], p.factor, selectedDrug.type === "prodrug");
        return { phenotype: p.id, color: p.color, data };
      });
      const aucComparison = curves.map((c, i) => {
        const auc = calcAUC(c.data);
        const cmax = Math.max(...c.data.map((d) => d.concentracao));
        return { phenotype: PHENOTYPES[i].id, auc, cmax: parseFloat(cmax.toFixed(2)), clearance: parseFloat((dose[0] / auc).toFixed(2)), fill: PHENOTYPES[i].color };
      });
      setResults({ curves, aucComparison });
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
            <Dna className="h-7 w-7 text-primary" />
            Bancada de Farmacogenômica
          </h1>
          <p className="text-sm text-muted-foreground">Variabilidade genética CYP450 e resposta farmacológica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Desenho do Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fármaco</label>
              <Select value={drug} onValueChange={setDrug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRUGS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.enzyme}) — {d.type === "prodrug" ? "Pró-fármaco" : "Fármaco ativo"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Dose: {dose[0]} mg</label>
              <Slider value={dose} onValueChange={setDose} min={10} max={500} step={10} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Genotipando população...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Simular Estudo Farmacogenômico</span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Comparação de AUC por Fenótipo</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando simulação</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={results.aucComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="phenotype" fontSize={11} />
                  <YAxis label={{ value: "AUC (mg·h/L)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="auc" name="AUC" radius={[4, 4, 0, 0]}>
                    {results.aucComparison.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">3. Curvas Farmacocinéticas por Genótipo</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Execute o estudo para visualizar</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" type="number" domain={[0, 24]} label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis label={{ value: "Concentração (mg/L)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    {results.curves.map((c) => (
                      <Line key={c.phenotype} data={c.data} type="monotone" dataKey="concentracao" stroke={c.color} name={c.phenotype} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {selectedDrug.type === "prodrug"
                    ? `Como ${selectedDrug.name} é um pró-fármaco metabolizado por ${selectedDrug.enzyme}, metabolizadores lentos (PM) apresentam menor conversão ao metabólito ativo, resultando em eficácia reduzida. Metabolizadores ultrarrápidos (UM) podem ter resposta exagerada.`
                    : `${selectedDrug.name} é metabolizado diretamente por ${selectedDrug.enzyme}. Metabolizadores lentos (PM) acumulam mais fármaco (maior AUC), aumentando risco de toxicidade. Considerar redução de dose para PM.`}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
