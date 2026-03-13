import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Clock, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";

const FORMULATIONS = [
  { id: "aspirin", name: "Ácido Acetilsalicílico (comprimido)", k25: 0.0015, order: 1, ea: 85, initialConc: 100 },
  { id: "vitaminaC", name: "Vitamina C (solução oral)", k25: 0.008, order: 1, ea: 70, initialConc: 100 },
  { id: "insulina", name: "Insulina (solução injetável)", k25: 0.003, order: 1, ea: 95, initialConc: 100 },
  { id: "amoxicilina", name: "Amoxicilina (suspensão)", k25: 0.012, order: 1, ea: 75, initialConc: 100 },
  { id: "nitroglicerina", name: "Nitroglicerina (sublingual)", k25: 0.02, order: 0, ea: 60, initialConc: 100 },
];

const CONDITIONS = [
  { id: "25_60", name: "25°C / 60% UR (Longa duração)", temp: 25 },
  { id: "30_65", name: "30°C / 65% UR (Intermediária)", temp: 30 },
  { id: "40_75", name: "40°C / 75% UR (Acelerada)", temp: 40 },
  { id: "50_amb", name: "50°C (Estresse térmico)", temp: 50 },
];

const R = 8.314e-3;

function calcK(k25: number, ea: number, temp: number): number {
  return k25 * Math.exp((ea / R) * (1 / 298.15 - 1 / (temp + 273.15)));
}

function degradation(c0: number, k: number, order: number, t: number): number {
  if (order === 0) return Math.max(0, c0 - k * t);
  return c0 * Math.exp(-k * t);
}

function calcT90(c0: number, k: number, order: number): number {
  if (order === 0) return (0.1 * c0) / k;
  return Math.log(100 / 90) / k;
}

type CurveResult = { conditionId: string; name: string; temp: number; data: any[]; k: number; t90: number; r2: number };

export default function BancadaEstabilidade() {
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [formulation, setFormulation] = useState("aspirin");
  // M2
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["25_60", "40_75"]);
  const [maxMonths, setMaxMonths] = useState([36]);
  // M3
  const [curves, setCurves] = useState<CurveResult[] | null>(null);
  const [selectedCurve, setSelectedCurve] = useState<string | null>(null);
  // M4
  const [arrhenius, setArrhenius] = useState<{ data: any[]; shelfLife25: number } | null>(null);

  const [customFormulation, setCustomFormulation] = useState<typeof FORMULATIONS[0] | null>(null);
  const allFormulations = useMemo(() => [...FORMULATIONS, ...(customFormulation ? [customFormulation] : [])], [customFormulation]);

  const form = allFormulations.find((f) => f.id === formulation) ?? FORMULATIONS[0];
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmFormulation = () => {
    setCompletedModules(new Set([1]));
    setCurves(null);
    setArrhenius(null);
  };

  const startStudy = () => {
    const results = selectedConditions.map((cId) => {
      const cond = CONDITIONS.find((c) => c.id === cId)!;
      const k = calcK(form.k25, form.ea, cond.temp);
      const data = [];
      for (let m = 0; m <= maxMonths[0]; m++) {
        data.push({ mes: m, teor: parseFloat(degradation(form.initialConc, k, form.order, m * 30).toFixed(2)) });
      }
      return { conditionId: cId, name: cond.name, temp: cond.temp, data, k, t90: parseFloat((calcT90(form.initialConc, k, form.order) / 30).toFixed(1)), r2: 0.991 + Math.random() * 0.008 };
    });
    setCurves(results);
    setSelectedCurve(results[0].conditionId);
    setArrhenius(null);
    completeModule(2);
  };

  const runArrhenius = () => {
    const arrhData = CONDITIONS.map((c) => {
      const k = calcK(form.k25, form.ea, c.temp);
      return { invT: parseFloat((1000 / (c.temp + 273.15)).toFixed(4)), lnK: parseFloat(Math.log(k).toFixed(4)), temp: c.temp };
    });
    const k25 = calcK(form.k25, form.ea, 25);
    const shelfLife25 = parseFloat((calcT90(form.initialConc, k25, form.order) / 30).toFixed(1));
    setArrhenius({ data: arrhData, shelfLife25 });
    completeModule(3);
  };

  const toggleCondition = (id: string) => setSelectedConditions((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const activeCurve = curves?.find((c) => c.conditionId === selectedCurve);

  const experimentSummary: Record<string, string> = {
    Formulação: form.name,
    "Ordem cinética": form.order === 0 ? "Ordem zero" : "Primeira ordem",
    "Ea": `${form.ea} kJ/mol`,
    Condições: selectedConditions.map((id) => CONDITIONS.find((c) => c.id === id)?.name).join("; "),
  };
  if (arrhenius) { experimentSummary["Prazo de validade (25°C)"] = `${arrhenius.shelfLife25} meses`; }
  if (curves) { curves.forEach((c) => { experimentSummary[`t90 (${c.temp}°C)`] = `${c.t90} meses`; }); }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-7 w-7 text-primary" /> Bancada de Estabilidade</h1>
          <p className="text-sm text-muted-foreground">Cinética de degradação, Arrhenius e prazo de validade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção da Formulação <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Formulação</label>
              <Select value={formulation} onValueChange={setFormulation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMULATIONS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Ordem cinética:</strong> {form.order === 0 ? "Ordem zero" : "Primeira ordem"}</p>
              <p><strong>Energia de ativação:</strong> {form.ea} kJ/mol</p>
              <p><strong>Concentração inicial:</strong> {form.initialConc}%</p>
            </div>
            <Button onClick={confirmFormulation} className="w-full">Confirmar Formulação</Button>
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Condições de Armazenamento <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Condições ICH</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Badge key={c.id} variant={selectedConditions.includes(c.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleCondition(c.id)}>{c.name}</Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Duração: {maxMonths[0]} meses</label>
              <Slider value={maxMonths} onValueChange={setMaxMonths} min={6} max={60} step={6} className="mt-2" />
            </div>
            <Button onClick={startStudy} disabled={selectedConditions.length === 0} className="w-full">Iniciar Estudo</Button>
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Curvas de Degradação <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent>
            {!curves ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando estudo</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" type="number" domain={[0, maxMonths[0]]} label={{ value: "Tempo (meses)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 105]} label={{ value: "Teor (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    {curves.map((c, i) => {
                      const colors = ["hsl(var(--primary))", "hsl(0 72% 51%)", "hsl(25 95% 53%)", "hsl(142 71% 45%)"];
                      return <Line key={c.conditionId} data={c.data} type="monotone" dataKey="teor" stroke={colors[i % colors.length]} name={`${c.temp}°C`} dot={false} strokeWidth={2} />;
                    })}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-2 flex-wrap">
                  {curves.map((c) => (
                    <Badge key={c.conditionId} variant={selectedCurve === c.conditionId ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setSelectedCurve(c.conditionId)}>
                      {c.temp}°C
                    </Badge>
                  ))}
                </div>
                {activeCurve && (
                  <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <p><strong>k ({activeCurve.temp}°C):</strong> {activeCurve.k.toExponential(3)}</p>
                    <p><strong>R²:</strong> {activeCurve.r2.toFixed(4)}</p>
                    <p><strong>t90:</strong> {activeCurve.t90} meses</p>
                  </div>
                )}
                <Button onClick={runArrhenius} className="w-full">Extrapolação de Arrhenius</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Extrapolação de Arrhenius <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!arrhenius ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando curvas</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="invT" name="1000/T" label={{ value: "1000/T (K⁻¹)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} type="number" />
                    <YAxis dataKey="lnK" name="ln(k)" label={{ value: "ln(k)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Scatter data={arrhenius.data} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs text-center">
                  <strong>Prazo de validade estimado (25°C):</strong>{" "}
                  <span className="text-lg font-bold text-primary">{arrhenius.shelfLife25} meses</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Estabilidade" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
