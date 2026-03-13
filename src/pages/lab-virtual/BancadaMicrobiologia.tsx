import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Microscope, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";

const BACTERIA = [
  { id: "ecoli", name: "Escherichia coli", gram: "negativo", habitat: "Trato gastrointestinal", resistance: "Bombas de efluxo, β-lactamases" },
  { id: "saureus", name: "Staphylococcus aureus (MSSA)", gram: "positivo", habitat: "Pele, narinas", resistance: "Penicilinase" },
  { id: "mrsa", name: "Staphylococcus aureus (MRSA)", gram: "positivo", habitat: "Ambiente hospitalar", resistance: "PBP2a (mecA), multirresistência" },
  { id: "kpneumoniae", name: "Klebsiella pneumoniae", gram: "negativo", habitat: "Trato respiratório", resistance: "ESBL, biofilme" },
  { id: "kpc", name: "Klebsiella pneumoniae (KPC)", gram: "negativo", habitat: "UTI hospitalar", resistance: "Carbapenemase KPC, pan-resistência" },
  { id: "paeruginosa", name: "Pseudomonas aeruginosa", gram: "negativo", habitat: "Solo, água, ambiente hospitalar", resistance: "Efluxo, porinas, β-lactamases" },
];

const ANTIBIOTICS = [
  { id: "amoxicilina", name: "Amoxicilina", class: "Penicilina", gramTip: "Gram-negativos produtores de β-lactamase são naturalmente resistentes" },
  { id: "ciprofloxacino", name: "Ciprofloxacino", class: "Fluoroquinolona", gramTip: "Boa cobertura para Gram-negativos" },
  { id: "vancomicina", name: "Vancomicina", class: "Glicopeptídeo", gramTip: "Ineficaz contra Gram-negativos (não penetra membrana externa)" },
  { id: "meropenem", name: "Meropenem", class: "Carbapenêmico", gramTip: "Amplo espectro, reservado para multirresistentes" },
  { id: "gentamicina", name: "Gentamicina", class: "Aminoglicosídeo", gramTip: "Boa contra Gram-negativos aeróbios" },
  { id: "sulfametoxazol", name: "Sulfametoxazol-Trimetoprim", class: "Sulfonamida", gramTip: "Cobertura variável, resistência crescente" },
];

let _customResistance: Record<string, Record<string, { mic: number; breakpointS: number; breakpointR: number }>> = {};

function getMICData(bacteriaId: string, antibioticId: string) {
  if (_customResistance[bacteriaId]?.[antibioticId]) {
    return _customResistance[bacteriaId][antibioticId];
  }
  const resistanceMap: Record<string, Record<string, { mic: number; breakpointS: number; breakpointR: number }>> = {
    ecoli: { amoxicilina: { mic: 4, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.25, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 128, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 0.06, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 1, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 2, breakpointS: 2, breakpointR: 4 } },
    saureus: { amoxicilina: { mic: 0.5, breakpointS: 2, breakpointR: 8 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 }, meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 0.5, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 0.5, breakpointS: 2, breakpointR: 4 } },
    mrsa: { amoxicilina: { mic: 64, breakpointS: 2, breakpointR: 8 }, ciprofloxacino: { mic: 8, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 }, meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 16, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 1, breakpointS: 2, breakpointR: 4 } },
    kpneumoniae: { amoxicilina: { mic: 16, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 4, breakpointS: 2, breakpointR: 4 } },
    kpc: { amoxicilina: { mic: 128, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 16, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 32, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 16, breakpointS: 2, breakpointR: 4 } },
    paeruginosa: { amoxicilina: { mic: 256, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 512, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 1, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 64, breakpointS: 2, breakpointR: 4 } },
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
    points.push({ hora: t, controle: parseFloat(control.toFixed(3)), tratado: parseFloat(Math.max(0.005, treated).toFixed(3)) });
  }
  return points;
}

type AntibiogramResult = { antibioticId: string; name: string; mic: number; classification: "S" | "I" | "R"; halo: number };

export default function BancadaMicrobiologia() {
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1 state
  const [bacteria, setBacteria] = useState("ecoli");
  // M2 state
  const [selectedAntibiotics, setSelectedAntibiotics] = useState<string[]>(["amoxicilina", "ciprofloxacino", "meropenem"]);
  const [concentration, setConcentration] = useState([8]);
  // M3 state
  const [antibiogram, setAntibiogram] = useState<AntibiogramResult[] | null>(null);
  // M4 state
  const [growthAntibiotic, setGrowthAntibiotic] = useState<string | null>(null);
  const [growthConc, setGrowthConc] = useState([8]);
  const [growthCurve, setGrowthCurve] = useState<any[] | null>(null);

  const [customBacterium, setCustomBacterium] = useState<typeof BACTERIA[0] | null>(null);
  const allBacteria = useMemo(() => [...BACTERIA, ...(customBacterium ? [customBacterium] : [])], [customBacterium]);

  const selectedBacteria = allBacteria.find((b) => b.id === bacteria) ?? BACTERIA[0];

  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmStrain = () => {
    setCompletedModules(new Set([1]));
    setAntibiogram(null);
    setGrowthCurve(null);
  };

  const runIncubation = () => {
    const results = selectedAntibiotics.map((aId) => {
      const ab = ANTIBIOTICS.find((a) => a.id === aId)!;
      const { mic, breakpointS, breakpointR } = getMICData(bacteria, aId);
      const c = classify(mic, breakpointS, breakpointR);
      return { antibioticId: aId, name: ab.name, mic, classification: c, halo: getHaloSize(c) };
    });
    setAntibiogram(results);
    const firstSensitive = results.find((r) => r.classification === "S");
    setGrowthAntibiotic(firstSensitive?.antibioticId ?? results[0].antibioticId);
    setGrowthConc([concentration[0]]);
    setGrowthCurve(null);
    completeModule(2);
  };

  const runGrowthCurve = () => {
    if (!growthAntibiotic) return;
    const curve = generateGrowthCurve(bacteria, growthAntibiotic, growthConc[0]);
    setGrowthCurve(curve);
    completeModule(3);
  };

  const updateGrowthRealtime = (abId: string, conc: number) => {
    setGrowthAntibiotic(abId);
    setGrowthConc([conc]);
    if (completedModules.has(3)) {
      setGrowthCurve(generateGrowthCurve(bacteria, abId, conc));
    }
  };

  const toggleAntibiotic = (id: string) => {
    setSelectedAntibiotics((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  };

  const experimentSummary: Record<string, string> = {
    "Bactéria": selectedBacteria.name,
    "Gram": `Gram-${selectedBacteria.gram}`,
    "Antibióticos testados": selectedAntibiotics.map((id) => ANTIBIOTICS.find((a) => a.id === id)?.name).join(", "),
    "Concentração teste": `${concentration[0]} µg/mL`,
  };
  if (antibiogram) {
    const sensitive = antibiogram.filter((r) => r.classification === "S").map((r) => r.name);
    experimentSummary["Sensível a"] = sensitive.length > 0 ? sensitive.join(", ") : "Nenhum";
    experimentSummary["Resistente a"] = antibiogram.filter((r) => r.classification === "R").map((r) => r.name).join(", ") || "Nenhum";
  }

  const LockedOverlay = ({ requiredModule }: { requiredModule: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Complete o módulo {requiredModule} para desbloquear</p>
    </div>
  );

  const ModuleBadge = ({ n }: { n: number }) => (
    completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null
  );

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
        {/* M1 — Seleção do Microrganismo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">1. Seleção do Microrganismo <ModuleBadge n={1} /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bactéria</label>
              <Select value={bacteria} onValueChange={setBacteria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allBacteria.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Gram:</strong> {selectedBacteria.gram}</p>
              <p><strong>Habitat:</strong> {selectedBacteria.habitat}</p>
              <p><strong>Mecanismos de resistência:</strong> {selectedBacteria.resistance}</p>
            </div>
            <Button onClick={confirmStrain} className="w-full">Confirmar Cepa</Button>
            <AIContextGenerator
              labType="microbiologia"
              onContextGenerated={(data: any) => {
                setCustomBacterium(data.bacteria);
                const resMap: Record<string, { mic: number; breakpointS: number; breakpointR: number }> = {};
                (data.resistanceData || []).forEach((r: any) => { resMap[r.antibioticId] = { mic: r.mic, breakpointS: r.breakpointS, breakpointR: r.breakpointR }; });
                _customResistance = { [data.bacteria.id]: resMap };
                setBacteria(data.bacteria.id);
                setCompletedModules(new Set([1]));
                setAntibiogram(null);
                setGrowthCurve(null);
              }}
            />
          </CardContent>
        </Card>

        {/* M2 — Painel de Antibióticos */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay requiredModule={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">2. Painel de Antibióticos <ModuleBadge n={2} /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {selectedAntibiotics.length > 0 && (
              <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground space-y-0.5">
                {selectedAntibiotics.map((id) => {
                  const ab = ANTIBIOTICS.find((a) => a.id === id)!;
                  return <p key={id}><strong>{ab.name}</strong> ({ab.class}): {ab.gramTip}</p>;
                })}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Concentração do teste: {concentration[0]} µg/mL</label>
              <Slider value={concentration} onValueChange={setConcentration} min={0.5} max={128} step={0.5} className="mt-2" />
            </div>
            <Button onClick={runIncubation} disabled={selectedAntibiotics.length === 0} className="w-full">Iniciar Incubação</Button>
          </CardContent>
        </Card>

        {/* M3 — Placa de Petri + Tabela S/I/R */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay requiredModule={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">3. Placa de Petri + Classificação S/I/R <ModuleBadge n={3} /></CardTitle>
          </CardHeader>
          <CardContent>
            {!antibiogram ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando incubação</div>
            ) : (
              <div className="space-y-4">
                <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
                  <svg viewBox="0 0 240 240" className="w-full h-full">
                    <circle cx="120" cy="120" r="115" fill="hsl(45 60% 85%)" stroke="hsl(var(--border))" strokeWidth="2" />
                    {antibiogram.map((r, i) => {
                      const angle = (i / antibiogram.length) * 2 * Math.PI - Math.PI / 2;
                      const dist = 60;
                      const cx = 120 + dist * Math.cos(angle);
                      const cy = 120 + dist * Math.sin(angle);
                      const haloR = r.halo * 2;
                      const color = r.classification === "S" ? "hsl(142 71% 45%)" : r.classification === "I" ? "hsl(45 93% 47%)" : "hsl(0 72% 51%)";
                      return (
                        <g key={r.antibioticId}>
                          {r.halo > 2 && <circle cx={cx} cy={cy} r={haloR} fill="hsl(45 60% 95%)" opacity={0.7} />}
                          <circle cx={cx} cy={cy} r={7} fill={color} />
                          <text x={cx} y={cy + haloR + 12} textAnchor="middle" fontSize="7" fill="hsl(var(--foreground))">{r.name.substring(0, 6)}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-1 font-medium">Antibiótico</th><th className="text-center py-1 font-medium">MIC</th><th className="text-center py-1 font-medium">Halo</th><th className="text-center py-1 font-medium">Class.</th></tr></thead>
                    <tbody>
                      {antibiogram.map((r) => (
                        <tr key={r.antibioticId} className="border-b border-border/50">
                          <td className="py-1 text-xs">{r.name}</td>
                          <td className="text-center text-xs">{r.mic}</td>
                          <td className="text-center text-xs">{r.halo.toFixed(1)}</td>
                          <td className="text-center">
                            <Badge variant={r.classification === "S" ? "default" : r.classification === "I" ? "secondary" : "destructive"} className="text-[10px]">
                              {r.classification === "S" ? "Sensível" : r.classification === "I" ? "Intermediário" : "Resistente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {antibiogram.filter((r) => r.classification === "S").length === 0
                    ? `${selectedBacteria.name} apresenta resistência a todos os antibióticos testados.`
                    : `${selectedBacteria.name} é sensível a ${antibiogram.filter((r) => r.classification === "S").map((r) => r.name).join(", ")}.`}
                </div>
                <Button onClick={runGrowthCurve} className="w-full">Gerar Curva de Crescimento</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 — Curva de Crescimento */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay requiredModule={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">4. Curva de Crescimento (OD600) <ModuleBadge n={3} /></CardTitle>
          </CardHeader>
          <CardContent>
            {!growthCurve ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando módulo 3</div>
            ) : (
              <div className="space-y-3">
                {antibiogram && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-xs font-medium">Antibiótico:</label>
                    {antibiogram.map((r) => (
                      <Badge
                        key={r.antibioticId}
                        variant={growthAntibiotic === r.antibioticId ? "default" : "outline"}
                        className="cursor-pointer text-[10px]"
                        onClick={() => updateGrowthRealtime(r.antibioticId, growthConc[0])}
                      >
                        {r.name.substring(0, 8)}
                      </Badge>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium">Concentração: {growthConc[0]} µg/mL</label>
                  <Slider value={growthConc} onValueChange={(v) => updateGrowthRealtime(growthAntibiotic!, v[0])} min={0.5} max={128} step={0.5} className="mt-1" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={growthCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis label={{ value: "OD600", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="controle" stroke="hsl(var(--muted-foreground))" name="Controle" dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="tratado" stroke="hsl(var(--primary))" name={`Tratado (${growthConc[0]} µg/mL)`} dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M5 — Mini-Relatório */}
        <LabReportPanel benchTitle="Bancada de Microbiologia" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
