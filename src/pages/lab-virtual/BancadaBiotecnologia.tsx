import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, TestTubes, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";

const GENES = [
  { id: "gfp", name: "GFP (Green Fluorescent Protein)", mw: 27, optimalTemp: 30, optimalIPTG: 0.5 },
  { id: "insulin", name: "Insulina Humana Recombinante", mw: 5.8, optimalTemp: 25, optimalIPTG: 0.3 },
  { id: "tpa", name: "tPA (Ativador do Plasminogênio)", mw: 68, optimalTemp: 20, optimalIPTG: 0.1 },
  { id: "lysozyme", name: "Lisozima", mw: 14.3, optimalTemp: 37, optimalIPTG: 1.0 },
  { id: "interferon", name: "Interferon-α", mw: 19, optimalTemp: 28, optimalIPTG: 0.5 },
];

const VECTORS = [
  { id: "pet28", name: "pET-28a(+)", size: 5369, promoter: "T7", tag: "His-tag", efficiency: 1.0 },
  { id: "pgex", name: "pGEX-4T-1", size: 4969, promoter: "tac", tag: "GST-tag", efficiency: 0.85 },
  { id: "pmal", name: "pMAL-c5X", size: 5677, promoter: "tac", tag: "MBP-tag", efficiency: 0.9 },
];

const STRAINS = [
  { id: "bl21", name: "E. coli BL21(DE3)", efficiency: 1.0 },
  { id: "rosetta", name: "E. coli Rosetta(DE3)", efficiency: 1.15 },
  { id: "shuffle", name: "E. coli SHuffle", efficiency: 0.8 },
];

function calcExpression(gene: typeof GENES[0], vector: typeof VECTORS[0], strain: typeof STRAINS[0], temp: number, iptg: number) {
  const tempFactor = 1 - Math.pow((temp - gene.optimalTemp) / 20, 2);
  const iptgFactor = iptg / (iptg + gene.optimalIPTG * 0.5);
  const baseYield = 50 * vector.efficiency * strain.efficiency * Math.max(0.1, tempFactor) * iptgFactor;
  const solubility = temp <= 25 ? 0.7 + Math.random() * 0.2 : temp <= 30 ? 0.4 + Math.random() * 0.2 : 0.15 + Math.random() * 0.15;
  return { totalYield: parseFloat(baseYield.toFixed(1)), solubility: parseFloat(solubility.toFixed(2)) };
}

function generateExpressionCurve(gene: typeof GENES[0], vector: typeof VECTORS[0], strain: typeof STRAINS[0], temp: number, iptg: number) {
  const points = [];
  const { totalYield } = calcExpression(gene, vector, strain, temp, iptg);
  for (let t = 0; t <= 8; t += 0.5) {
    const od600 = 0.1 * Math.exp(0.5 * t) / (1 + 0.1 * Math.exp(0.5 * t) / 3.0);
    const expression = t < 1 ? 0 : totalYield * (1 - Math.exp(-0.8 * (t - 1)));
    points.push({ hora: t, od600: parseFloat(od600.toFixed(3)), expressao: parseFloat(Math.max(0, expression).toFixed(1)) });
  }
  return points;
}

export default function BancadaBiotecnologia() {
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [gene, setGene] = useState("gfp");
  const [vector, setVector] = useState("pet28");
  const [strain, setStrain] = useState("bl21");
  // M2
  const [temp, setTemp] = useState([30]);
  const [iptg, setIptg] = useState([0.5]);
  // M3
  const [expressionResults, setExpressionResults] = useState<{ totalYield: number; solubility: number; solubleYield: number } | null>(null);
  // M4
  const [expressionCurve, setExpressionCurve] = useState<any[] | null>(null);

  const [customGene, setCustomGene] = useState<typeof GENES[0] | null>(null);
  const [customVector, setCustomVector] = useState<typeof VECTORS[0] | null>(null);
  const [customStrain, setCustomStrain] = useState<typeof STRAINS[0] | null>(null);
  const allGenes = useMemo(() => [...GENES, ...(customGene ? [customGene] : [])], [customGene]);
  const allVectors = useMemo(() => [...VECTORS, ...(customVector ? [customVector] : [])], [customVector]);
  const allStrains = useMemo(() => [...STRAINS, ...(customStrain ? [customStrain] : [])], [customStrain]);

  const selectedGene = allGenes.find((g) => g.id === gene) ?? GENES[0];
  const selectedVector = allVectors.find((v) => v.id === vector) ?? VECTORS[0];
  const selectedStrain = allStrains.find((s) => s.id === strain) ?? STRAINS[0];
  const geneInsert = Math.round(selectedGene.mw * 30 * 3);
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmConstruct = () => {
    setCompletedModules(new Set([1]));
    setExpressionResults(null);
    setExpressionCurve(null);
  };

  const induceExpression = () => {
    const { totalYield, solubility } = calcExpression(selectedGene, selectedVector, selectedStrain, temp[0], iptg[0]);
    setExpressionResults({ totalYield, solubility, solubleYield: parseFloat((totalYield * solubility).toFixed(1)) });
    setExpressionCurve(null);
    completeModule(2);
  };

  const analyzeCurve = () => {
    const curve = generateExpressionCurve(selectedGene, selectedVector, selectedStrain, temp[0], iptg[0]);
    setExpressionCurve(curve);
    completeModule(3);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const experimentSummary: Record<string, string> = {
    Gene: selectedGene.name,
    Vetor: `${selectedVector.name} (${selectedVector.tag})`,
    Cepa: selectedStrain.name,
    Temperatura: `${temp[0]}°C`,
    IPTG: `${iptg[0]} mM`,
  };
  if (expressionResults) {
    experimentSummary["Rendimento total"] = `${expressionResults.totalYield} mg/L`;
    experimentSummary["Solubilidade"] = `${(expressionResults.solubility * 100).toFixed(0)}%`;
    experimentSummary["Fração solúvel"] = `${expressionResults.solubleYield} mg/L`;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TestTubes className="h-7 w-7 text-primary" /> Bancada de Biotecnologia</h1>
          <p className="text-sm text-muted-foreground">Clonagem, expressão proteica e otimização de produção</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 — Constructo */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Desenho do Constructo <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Gene-alvo</label>
              <Select value={gene} onValueChange={setGene}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENES.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.mw} kDa)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Vetor de expressão</label>
              <Select value={vector} onValueChange={setVector}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VECTORS.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — {v.tag}, {v.promoter}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cepa hospedeira</label>
              <Select value={strain} onValueChange={setStrain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STRAINS.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={confirmConstruct} className="w-full">Confirmar Constructo</Button>
          </CardContent>
        </Card>

        {/* Plasmid Map (always visible, updates in real-time) */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Mapa do Plasmídeo</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <svg viewBox="0 0 260 260" className="w-56 h-56">
                <circle cx="130" cy="130" r="100" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" opacity={0.3} />
                <path d="M 130 30 A 100 100 0 0 1 220 90" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="8" strokeLinecap="round" />
                <text x="195" y="55" fontSize="9" fill="hsl(var(--foreground))" fontWeight="500">{selectedVector.promoter}</text>
                <path d="M 220 90 A 100 100 0 0 1 200 210" fill="none" stroke="hsl(199 89% 48%)" strokeWidth="8" strokeLinecap="round" />
                <text x="220" y="155" fontSize="9" fill="hsl(var(--foreground))" fontWeight="500">{selectedGene.name.split(" ")[0]}</text>
                <path d="M 200 210 A 100 100 0 0 1 130 230" fill="none" stroke="hsl(25 95% 53%)" strokeWidth="8" strokeLinecap="round" />
                <text x="145" y="248" fontSize="9" fill="hsl(var(--foreground))" fontWeight="500">{selectedVector.tag}</text>
                <path d="M 130 230 A 100 100 0 0 1 40 170" fill="none" stroke="hsl(0 72% 51%)" strokeWidth="8" strokeLinecap="round" />
                <text x="10" y="205" fontSize="9" fill="hsl(var(--foreground))" fontWeight="500">AmpR</text>
                <path d="M 40 170 A 100 100 0 0 1 40 90" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="8" strokeLinecap="round" />
                <text x="10" y="125" fontSize="9" fill="hsl(var(--muted-foreground))" fontWeight="500">ori</text>
                <path d="M 40 90 A 100 100 0 0 1 130 30" fill="none" stroke="hsl(262 83% 58%)" strokeWidth="8" strokeLinecap="round" />
                <text x="55" y="50" fontSize="9" fill="hsl(var(--foreground))" fontWeight="500">lacI</text>
                <text x="130" y="125" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontWeight="600">{selectedVector.name}</text>
                <text x="130" y="140" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{selectedVector.size + geneInsert} bp</text>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* M2 — Indução */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Condições de Indução <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Temperatura de indução: {temp[0]}°C</label>
              <Slider value={temp} onValueChange={setTemp} min={16} max={42} step={1} className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium">IPTG: {iptg[0]} mM</label>
              <Slider value={iptg} onValueChange={setIptg} min={0.05} max={2} step={0.05} className="mt-2" />
            </div>
            {selectedGene.mw > 50 && temp[0] > 25 && (
              <p className="text-[10px] text-amber-500">⚠ Temp ≤25°C melhora solubilidade para proteínas grandes ({selectedGene.mw} kDa)</p>
            )}
            <Button onClick={induceExpression} className="w-full">Induzir Expressão</Button>
          </CardContent>
        </Card>

        {/* M3 — Rendimento + SDS-PAGE */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Rendimento e SDS-PAGE <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent>
            {!expressionResults ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando indução</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{expressionResults.totalYield}</p><p className="text-[10px] text-muted-foreground">mg/L</p></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Solubilidade</p><p className="text-lg font-bold">{(expressionResults.solubility * 100).toFixed(0)}%</p></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Solúvel</p><p className="text-lg font-bold">{expressionResults.solubleYield}</p><p className="text-[10px] text-muted-foreground">mg/L</p></div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-2">SDS-PAGE Simulado</p>
                  <div className="flex gap-4 bg-blue-950 rounded-lg p-3 justify-center">
                    <div className="flex flex-col items-center gap-0.5 w-8">
                      <p className="text-[8px] text-blue-300 mb-1">M</p>
                      {[250, 150, 100, 75, 50, 37, 25, 20, 15, 10].map((mw) => <div key={mw} className="w-full h-1 bg-blue-300 rounded-full opacity-60" />)}
                    </div>
                    {["NI", "Ind", "Sol", "Ins"].map((label, li) => (
                      <div key={label} className="flex flex-col items-center gap-0.5 w-8">
                        <p className="text-[8px] text-blue-300 mb-1">{label}</p>
                        {[250, 150, 100, 75, 50, 37, 25, 20, 15, 10].map((mw) => {
                          const isTarget = Math.abs(mw - selectedGene.mw) < 5;
                          const showTarget = isTarget && li >= 1;
                          const intensity = showTarget ? (li === 1 ? 1 : li === 2 ? expressionResults.solubility : 1 - expressionResults.solubility) : 0.1;
                          return <div key={mw} className="w-full rounded-full" style={{ backgroundColor: showTarget ? `rgba(100, 200, 255, ${intensity})` : `rgba(100, 150, 255, ${0.05 + Math.random() * 0.1})`, height: showTarget ? "3px" : "1px" }} />;
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">M = Marcador · NI = Não induzido · Ind = Induzido · Sol = Solúvel · Ins = Insolúvel</p>
                </div>
                <Button onClick={analyzeCurve} className="w-full">Analisar Curva de Expressão</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 — Curva de Expressão */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Curva de Expressão <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!expressionCurve ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando análise</div>
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={expressionCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="od" orientation="left" label={{ value: "OD600", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="exp" orientation="right" label={{ value: "Expressão (mg/L)", angle: 90, position: "insideRight", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="od" type="monotone" dataKey="od600" stroke="hsl(var(--muted-foreground))" name="Crescimento (OD600)" dot={false} strokeDasharray="5 5" />
                    <Line yAxisId="exp" type="monotone" dataKey="expressao" stroke="hsl(var(--primary))" name="Expressão proteica" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {expressionResults && expressionResults.solubility >= 0.6
                    ? `Expressão bem-sucedida com boa solubilidade (${(expressionResults.solubility * 100).toFixed(0)}%). Rendimento de ${expressionResults.solubleYield} mg/L é adequado para purificação por ${selectedVector.tag}.`
                    : `Baixa solubilidade (${expressionResults ? (expressionResults.solubility * 100).toFixed(0) : 0}%). Recomenda-se reduzir temperatura (18-20°C) e/ou IPTG.`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Biotecnologia" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
