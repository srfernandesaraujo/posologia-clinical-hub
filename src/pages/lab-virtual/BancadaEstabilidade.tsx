import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Clock, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from "recharts";

const FORMULATIONS = [
  { id: "aspirin", name: "Ácido Acetilsalicílico (comprimido)", k25: 0.0015, order: 1, ea: 85, initialConc: 100 },
  { id: "vitaminaC", name: "Vitamina C (solução oral)", k25: 0.008, order: 1, ea: 70, initialConc: 100 },
  { id: "insulina", name: "Insulina (solução injetável)", k25: 0.003, order: 1, ea: 95, initialConc: 100 },
  { id: "amoxicilina", name: "Amoxicilina (suspensão)", k25: 0.012, order: 1, ea: 75, initialConc: 100 },
  { id: "nitroglicerina", name: "Nitroglicerina (sublingual)", k25: 0.02, order: 0, ea: 60, initialConc: 100 },
];

const CONDITIONS = [
  { id: "25_60", name: "25°C / 60% UR (Longa duração — Zona IVb)", temp: 25 },
  { id: "30_65", name: "30°C / 65% UR (Intermediária)", temp: 30 },
  { id: "40_75", name: "40°C / 75% UR (Acelerada)", temp: 40 },
  { id: "50_amb", name: "50°C (Estresse térmico)", temp: 50 },
];

const R = 8.314e-3; // kJ/(mol·K)

function calcK(k25: number, ea: number, temp: number): number {
  const t25 = 298.15;
  const tK = temp + 273.15;
  return k25 * Math.exp((ea / R) * (1 / t25 - 1 / tK));
}

function degradation(c0: number, k: number, order: number, t: number): number {
  if (order === 0) return Math.max(0, c0 - k * t);
  return c0 * Math.exp(-k * t);
}

function calcT90(c0: number, k: number, order: number): number {
  if (order === 0) return (0.1 * c0) / k;
  return Math.log(100 / 90) / k;
}

export default function BancadaEstabilidade() {
  const navigate = useNavigate();
  const [formulation, setFormulation] = useState("aspirin");
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["25_60", "40_75"]);
  const [maxMonths, setMaxMonths] = useState([36]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    curves: { conditionId: string; name: string; temp: number; data: any[]; k: number; t90: number; r2: number }[];
    arrhenius: any[];
    shelfLife25: number;
  }>(null);

  const form = FORMULATIONS.find((f) => f.id === formulation)!;

  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const curves = selectedConditions.map((cId) => {
        const cond = CONDITIONS.find((c) => c.id === cId)!;
        const k = calcK(form.k25, form.ea, cond.temp);
        const data = [];
        for (let m = 0; m <= maxMonths[0]; m++) {
          const t = m * 30; // days
          const conc = degradation(form.initialConc, k, form.order, t);
          data.push({ mes: m, teor: parseFloat(conc.toFixed(2)) });
        }
        const t90Days = calcT90(form.initialConc, k, form.order);
        return { conditionId: cId, name: cond.name, temp: cond.temp, data, k, t90: parseFloat((t90Days / 30).toFixed(1)), r2: 0.991 + Math.random() * 0.008 };
      });

      const arrhenius = CONDITIONS.map((c) => {
        const k = calcK(form.k25, form.ea, c.temp);
        return { invT: parseFloat((1000 / (c.temp + 273.15)).toFixed(4)), lnK: parseFloat(Math.log(k).toFixed(4)), temp: c.temp };
      });

      const k25 = calcK(form.k25, form.ea, 25);
      const shelfLife25 = calcT90(form.initialConc, k25, form.order) / 30;

      setResults({ curves, arrhenius, shelfLife25: parseFloat(shelfLife25.toFixed(1)) });
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
            <Clock className="h-7 w-7 text-primary" />
            Bancada de Estabilidade
          </h1>
          <p className="text-sm text-muted-foreground">Cinética de degradação, Arrhenius e prazo de validade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Desenho do Estudo de Estabilidade</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Formulação</label>
              <Select value={formulation} onValueChange={setFormulation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMULATIONS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Condições de armazenamento</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Badge key={c.id} variant={selectedConditions.includes(c.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleCondition(c.id)}>
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Duração: {maxMonths[0]} meses</label>
              <Slider value={maxMonths} onValueChange={setMaxMonths} min={6} max={60} step={6} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running || selectedConditions.length === 0} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Realizando coletas...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Executar Estudo de Estabilidade</span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Resultados — Prazo de Validade</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando estudo</div>
            ) : (
              <div className="space-y-3">
                {results.curves.map((c) => (
                  <div key={c.conditionId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{c.temp}°C</p>
                      <p className="text-xs text-muted-foreground">k = {c.k.toExponential(3)} · R² = {c.r2.toFixed(3)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{c.t90} <span className="text-xs font-normal text-muted-foreground">meses</span></p>
                      <p className="text-[10px] text-muted-foreground">t90 (perda de 10%)</p>
                    </div>
                  </div>
                ))}
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs">
                  <strong>Prazo de validade estimado (25°C):</strong>{" "}
                  <span className="text-lg font-bold text-primary">{results.shelfLife25} meses</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">3. Curvas de Degradação</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" type="number" domain={[0, maxMonths[0]]} label={{ value: "Tempo (meses)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 105]} label={{ value: "Teor (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Legend />
                  {results.curves.map((c, i) => {
                    const colors = ["hsl(var(--primary))", "hsl(0 72% 51%)", "hsl(25 95% 53%)", "hsl(142 71% 45%)"];
                    return <Line key={c.conditionId} data={c.data} type="monotone" dataKey="teor" stroke={colors[i % colors.length]} name={`${c.temp}°C`} dot={false} strokeWidth={2} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
