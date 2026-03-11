import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Microscope, Play, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis } from "recharts";

const BACTERIA = [
  { id: "ecoli", name: "Escherichia coli", gram: "negativo" },
  { id: "saureus", name: "Staphylococcus aureus (MSSA)", gram: "positivo" },
  { id: "mrsa", name: "Staphylococcus aureus (MRSA)", gram: "positivo" },
  { id: "kpneumoniae", name: "Klebsiella pneumoniae", gram: "negativo" },
  { id: "kpc", name: "Klebsiella pneumoniae (KPC)", gram: "negativo" },
  { id: "paeruginosa", name: "Pseudomonas aeruginosa", gram: "negativo" },
];

const ANTIBIOTICS = [
  { id: "amoxicilina", name: "Amoxicilina", class: "Penicilina" },
  { id: "ciprofloxacino", name: "Ciprofloxacino", class: "Fluoroquinolona" },
  { id: "vancomicina", name: "Vancomicina", class: "Glicopeptídeo" },
  { id: "meropenem", name: "Meropenem", class: "Carbapenêmico" },
  { id: "gentamicina", name: "Gentamicina", class: "Aminoglicosídeo" },
  { id: "sulfametoxazol", name: "Sulfametoxazol-Trimetoprim", class: "Sulfonamida" },
];

// Simulated MIC values (µg/mL) and susceptibility
function getMICData(bacteriaId: string, antibioticId: string) {
  const resistanceMap: Record<string, Record<string, { mic: number; breakpointS: number; breakpointR: number }>> = {
    ecoli: {
      amoxicilina: { mic: 4, breakpointS: 8, breakpointR: 32 },
      ciprofloxacino: { mic: 0.25, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 128, breakpointS: 4, breakpointR: 32 },
      meropenem: { mic: 0.06, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 1, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 2, breakpointS: 2, breakpointR: 4 },
    },
    saureus: {
      amoxicilina: { mic: 0.5, breakpointS: 2, breakpointR: 8 },
      ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 },
      meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 0.5, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 0.5, breakpointS: 2, breakpointR: 4 },
    },
    mrsa: {
      amoxicilina: { mic: 64, breakpointS: 2, breakpointR: 8 },
      ciprofloxacino: { mic: 8, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 },
      meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 16, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 1, breakpointS: 2, breakpointR: 4 },
    },
    kpneumoniae: {
      amoxicilina: { mic: 16, breakpointS: 8, breakpointR: 32 },
      ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 },
      meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 4, breakpointS: 2, breakpointR: 4 },
    },
    kpc: {
      amoxicilina: { mic: 128, breakpointS: 8, breakpointR: 32 },
      ciprofloxacino: { mic: 16, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 },
      meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 32, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 16, breakpointS: 2, breakpointR: 4 },
    },
    paeruginosa: {
      amoxicilina: { mic: 256, breakpointS: 8, breakpointR: 32 },
      ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 },
      vancomicina: { mic: 512, breakpointS: 4, breakpointR: 32 },
      meropenem: { mic: 1, breakpointS: 2, breakpointR: 8 },
      gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 },
      sulfametoxazol: { mic: 64, breakpointS: 2, breakpointR: 4 },
    },
  };
  return resistanceMap[bacteriaId]?.[antibioticId] ?? { mic: 8, breakpointS: 4, breakpointR: 16 };
}

function classify(mic: number, breakpointS: number, breakpointR: number): "S" | "I" | "R" {
  if (mic <= breakpointS) return "S";
  if (mic >= breakpointR) return "R";
  return "I";
}

function getHaloSize(classification: "S" | "I" | "R"): number {
  if (classification === "S") return 22 + Math.random() * 10;
  if (classification === "I") return 12 + Math.random() * 6;
  return Math.random() * 6;
}

function generateGrowthCurve(bacteriaId: string, antibioticId: string, concentration: number) {
  const { mic } = getMICData(bacteriaId, antibioticId);
  const ratio = concentration / mic;
  const points = [];
  for (let t = 0; t <= 24; t += 0.5) {
    const control = 0.05 * Math.exp(0.4 * t) / (1 + 0.05 * Math.exp(0.4 * t) / 2.0);
    let treated: number;
    if (ratio >= 4) {
      treated = 0.05 * Math.exp(-0.1 * t);
    } else if (ratio >= 1) {
      const killRate = 0.4 - 0.5 * ratio;
      treated = 0.05 * Math.exp(killRate * t) / (1 + 0.05 * Math.exp(killRate * t) / (2.0 / ratio));
      treated = Math.max(0.01, treated);
    } else {
      const reducedRate = 0.4 * (1 - ratio * 0.5);
      treated = 0.05 * Math.exp(reducedRate * t) / (1 + 0.05 * Math.exp(reducedRate * t) / 2.0);
    }
    points.push({
      hora: t,
      controle: parseFloat(control.toFixed(3)),
      tratado: parseFloat(Math.max(0.005, treated).toFixed(3)),
    });
  }
  return points;
}

export default function BancadaMicrobiologia() {
  const navigate = useNavigate();
  const [bacteria, setBacteria] = useState("ecoli");
  const [selectedAntibiotics, setSelectedAntibiotics] = useState<string[]>(["amoxicilina", "ciprofloxacino", "meropenem"]);
  const [concentration, setConcentration] = useState([8]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<null | {
    antibiogram: { antibioticId: string; name: string; mic: number; classification: "S" | "I" | "R"; halo: number }[];
    growthCurve: any[];
  }>(null);

  const toggleAntibiotic = (id: string) => {
    setSelectedAntibiotics((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  };

  const runExperiment = () => {
    setRunning(true);
    setTimeout(() => {
      const antibiogram = selectedAntibiotics.map((aId) => {
        const ab = ANTIBIOTICS.find((a) => a.id === aId)!;
        const { mic, breakpointS, breakpointR } = getMICData(bacteria, aId);
        const classification = classify(mic, breakpointS, breakpointR);
        return { antibioticId: aId, name: ab.name, mic, classification, halo: getHaloSize(classification) };
      });
      const growthCurve = generateGrowthCurve(bacteria, selectedAntibiotics[0], concentration[0]);
      setResults({ antibiogram, growthCurve });
      setRunning(false);
    }, 2000);
  };

  const selectedBacteria = BACTERIA.find((b) => b.id === bacteria)!;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Microscope className="h-7 w-7 text-primary" />
            Bancada de Microbiologia
          </h1>
          <p className="text-sm text-muted-foreground">Antibiograma, curvas de crescimento e classificação S/I/R</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Hypothesis & Setup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Hipótese e Desenho Experimental</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bactéria</label>
              <Select value={bacteria} onValueChange={setBacteria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BACTERIA.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} (Gram-{b.gram})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Antibióticos (selecione até 6)</label>
              <div className="flex flex-wrap gap-2">
                {ANTIBIOTICS.map((ab) => (
                  <Badge
                    key={ab.id}
                    variant={selectedAntibiotics.includes(ab.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleAntibiotic(ab.id)}
                  >
                    {ab.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Concentração do teste: {concentration[0]} µg/mL</label>
              <Slider value={concentration} onValueChange={setConcentration} min={0.5} max={128} step={0.5} className="mt-2" />
            </div>
            <Button onClick={runExperiment} disabled={running || selectedAntibiotics.length === 0} className="w-full">
              {running ? (
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Incubando cultura...</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Executar Antibiograma</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Panel 2: Petri Plate Visualization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Placa de Petri — Halos de Inibição</CardTitle>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Execute o antibiograma para visualizar</div>
            ) : (
              <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
                <svg viewBox="0 0 280 280" className="w-full h-full">
                  <circle cx="140" cy="140" r="135" fill="hsl(45 60% 85%)" stroke="hsl(var(--border))" strokeWidth="2" />
                  {results.antibiogram.map((r, i) => {
                    const angle = (i / results.antibiogram.length) * 2 * Math.PI - Math.PI / 2;
                    const dist = 70;
                    const cx = 140 + dist * Math.cos(angle);
                    const cy = 140 + dist * Math.sin(angle);
                    const haloR = r.halo * 2.5;
                    const color = r.classification === "S" ? "hsl(142 71% 45%)" : r.classification === "I" ? "hsl(45 93% 47%)" : "hsl(0 72% 51%)";
                    return (
                      <g key={r.antibioticId}>
                        {r.halo > 2 && <circle cx={cx} cy={cy} r={haloR} fill="hsl(45 60% 95%)" opacity={0.7} />}
                        <circle cx={cx} cy={cy} r={8} fill={color} />
                        <text x={cx} y={cy + haloR + 14} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))" fontWeight="500">
                          {r.name.substring(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: Antibiogram Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Resultados — Classificação S/I/R</CardTitle>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando resultados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Antibiótico</th>
                      <th className="text-center py-2 font-medium">MIC (µg/mL)</th>
                      <th className="text-center py-2 font-medium">Halo (mm)</th>
                      <th className="text-center py-2 font-medium">Classificação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.antibiogram.map((r) => (
                      <tr key={r.antibioticId} className="border-b border-border/50">
                        <td className="py-2">{r.name}</td>
                        <td className="text-center">{r.mic}</td>
                        <td className="text-center">{r.halo.toFixed(1)}</td>
                        <td className="text-center">
                          <Badge variant={r.classification === "S" ? "default" : r.classification === "I" ? "secondary" : "destructive"} className="text-xs">
                            {r.classification === "S" ? "Sensível" : r.classification === "I" ? "Intermediário" : "Resistente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {results.antibiogram.filter((r) => r.classification === "S").length === 0
                    ? `${selectedBacteria.name} apresenta resistência a todos os antibióticos testados. Considerar terapia combinada ou antimicrobianos de resgate.`
                    : `${selectedBacteria.name} é sensível a ${results.antibiogram.filter((r) => r.classification === "S").map((r) => r.name).join(", ")}. Primeira escolha recomendada com base no perfil de sensibilidade.`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 4: Growth Curve */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Curva de Crescimento Bacteriano (OD600)</CardTitle>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={results.growthCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hora" label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis label={{ value: "OD600", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="controle" stroke="hsl(var(--muted-foreground))" name="Controle" dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="tratado" stroke="hsl(var(--primary))" name={`Tratado (${concentration[0]} µg/mL)`} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
