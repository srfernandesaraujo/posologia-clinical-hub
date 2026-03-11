import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Skull, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";

const SUBSTANCES = [
  { id: "paracetamol", name: "Paracetamol", hillN: 3.5, ld50: 2000, ed50: 15, unit: "mg/kg" },
  { id: "digoxina", name: "Digoxina", hillN: 2.0, ld50: 25, ed50: 0.8, unit: "mg/kg" },
  { id: "warfarina", name: "Warfarina", hillN: 1.8, ld50: 320, ed50: 5, unit: "mg/kg" },
  { id: "lítio", name: "Carbonato de Lítio", hillN: 2.5, ld50: 530, ed50: 20, unit: "mg/kg" },
  { id: "cafeina", name: "Cafeína", hillN: 2.2, ld50: 192, ed50: 3, unit: "mg/kg" },
  { id: "etanol", name: "Etanol", hillN: 1.5, ld50: 7060, ed50: 500, unit: "mg/kg" },
];

function hillEquation(dose: number, ec50: number, n: number): number {
  if (dose <= 0) return 0;
  return (Math.pow(dose, n) / (Math.pow(ec50, n) + Math.pow(dose, n))) * 100;
}

function classifyToxicity(ld50: number): { class: string; category: string; color: string } {
  if (ld50 <= 5) return { class: "1", category: "Extremamente tóxico", color: "hsl(0 72% 40%)" };
  if (ld50 <= 50) return { class: "2", category: "Altamente tóxico", color: "hsl(0 72% 51%)" };
  if (ld50 <= 500) return { class: "3", category: "Moderadamente tóxico", color: "hsl(25 95% 53%)" };
  if (ld50 <= 5000) return { class: "4", category: "Levemente tóxico", color: "hsl(45 93% 47%)" };
  return { class: "5", category: "Praticamente não tóxico", color: "hsl(142 71% 45%)" };
}

export default function BancadaToxicologia() {
  const navigate = useNavigate();
  const [substance, setSubstance] = useState("paracetamol");
  const [doseRange, setDoseRange] = useState([0.1, 100]);
  const [nPoints, setNPoints] = useState([20]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    doseResponse: any[];
    mortalityCurve: any[];
    ld50: number;
    ed50: number;
    ti: number;
    toxClass: { class: string; category: string; color: string };
  }>(null);

  const sub = SUBSTANCES.find((s) => s.id === substance)!;

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const maxDose = sub.ld50 * 3;
      const doseResponse = [];
      const mortalityCurve = [];
      for (let i = 0; i <= nPoints[0]; i++) {
        const dose = (maxDose / nPoints[0]) * i;
        const effect = hillEquation(dose, sub.ed50, sub.hillN);
        const mortality = hillEquation(dose, sub.ld50, sub.hillN);
        doseResponse.push({ dose: parseFloat(dose.toFixed(2)), efeito: parseFloat(effect.toFixed(1)), mortalidade: parseFloat(mortality.toFixed(1)) });
        mortalityCurve.push({ dose: parseFloat(dose.toFixed(2)), mortalidade: parseFloat(mortality.toFixed(1)) });
      }
      const ti = sub.ld50 / sub.ed50;
      setResults({
        doseResponse,
        mortalityCurve,
        ld50: sub.ld50,
        ed50: sub.ed50,
        ti,
        toxClass: classifyToxicity(sub.ld50),
      });
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
            <Skull className="h-7 w-7 text-primary" />
            Bancada de Toxicologia
          </h1>
          <p className="text-sm text-muted-foreground">Curvas dose-resposta, LD50/ED50 e índice terapêutico</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Desenho Experimental</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Substância</label>
              <Select value={substance} onValueChange={setSubstance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBSTANCES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Número de doses: {nPoints[0]}</label>
              <Slider value={nPoints} onValueChange={setNPoints} min={10} max={50} step={5} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Administrando doses...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Executar Estudo Dose-Resposta</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Parâmetros Toxicológicos</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando ensaio</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">LD50</p>
                    <p className="text-lg font-bold">{results.ld50}</p>
                    <p className="text-[10px] text-muted-foreground">{sub.unit}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">ED50</p>
                    <p className="text-lg font-bold">{results.ed50}</p>
                    <p className="text-[10px] text-muted-foreground">{sub.unit}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Índice Terapêutico</p>
                    <p className="text-lg font-bold">{results.ti.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">LD50/ED50</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: results.toxClass.color }}>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: results.toxClass.color, color: "white" }}>Classe {results.toxClass.class}</Badge>
                    <span className="text-sm font-medium">{results.toxClass.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Classificação de Hodge & Sterner</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {results.ti >= 10
                    ? `${sub.name} apresenta margem de segurança ampla (IT = ${results.ti.toFixed(1)}). Risco de toxicidade aguda é baixo em doses terapêuticas.`
                    : results.ti >= 2
                    ? `${sub.name} possui margem de segurança estreita (IT = ${results.ti.toFixed(1)}). Monitoramento clínico recomendado. Risco moderado de toxicidade.`
                    : `${sub.name} tem índice terapêutico perigosamente baixo (IT = ${results.ti.toFixed(1)}). Doses terapêuticas e tóxicas se sobrepõem.`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dose-Response Curve */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">3. Curvas Dose-Resposta</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Execute o estudo para visualizar</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={results.doseResponse}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dose" label={{ value: `Dose (${sub.unit})`, position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} label={{ value: "Resposta (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine x={results.ed50} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" label={{ value: "ED50", fontSize: 10 }} />
                  <ReferenceLine x={results.ld50} stroke="hsl(0 72% 51%)" strokeDasharray="3 3" label={{ value: "LD50", fontSize: 10 }} />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.4} />
                  <Line type="monotone" dataKey="efeito" stroke="hsl(142 71% 45%)" name="Efeito Terapêutico" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="mortalidade" stroke="hsl(0 72% 51%)" name="Mortalidade" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
