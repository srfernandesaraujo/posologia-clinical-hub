import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Dna, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";

const DRUGS = [
  { id: "codeina", name: "Codeína", enzyme: "CYP2D6", type: "prodrug" as const, baseParams: { ka: 1.2, ke: 0.15, vd: 200, f: 0.9 } },
  { id: "tamoxifeno", name: "Tamoxifeno", enzyme: "CYP2D6", type: "prodrug" as const, baseParams: { ka: 0.8, ke: 0.05, vd: 800, f: 0.95 } },
  { id: "omeprazol", name: "Omeprazol", enzyme: "CYP2C19", type: "drug" as const, baseParams: { ka: 1.5, ke: 0.35, vd: 35, f: 0.65 } },
  { id: "clopidogrel", name: "Clopidogrel", enzyme: "CYP2C19", type: "prodrug" as const, baseParams: { ka: 1.0, ke: 0.12, vd: 120, f: 0.5 } },
  { id: "warfarina", name: "Warfarina", enzyme: "CYP2C9", type: "drug" as const, baseParams: { ka: 0.9, ke: 0.02, vd: 10, f: 0.99 } },
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
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [drug, setDrug] = useState("codeina");
  // M2
  const [dose, setDose] = useState([100]);
  const [phenoDist, setPhenoDist] = useState({ PM: 10, IM: 20, EM: 60, UM: 10 });
  // M3
  const [curves, setCurves] = useState<{ phenotype: string; color: string; data: any[]; visible: boolean }[] | null>(null);
  // M4
  const [aucData, setAucData] = useState<{ phenotype: string; auc: number; cmax: number; clearance: number; fill: string }[] | null>(null);

  const [customDrug, setCustomDrug] = useState<typeof DRUGS[0] | null>(null);
  const allDrugs = useMemo(() => [...DRUGS, ...(customDrug ? [customDrug] : [])], [customDrug]);

  const selectedDrug = allDrugs.find((d) => d.id === drug) ?? DRUGS[0];
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmDrug = () => {
    setCompletedModules(new Set([1]));
    setCurves(null);
    setAucData(null);
  };

  const genotypePopulation = () => {
    const c = PHENOTYPES.map((p) => {
      const data = generatePKCurve(selectedDrug.baseParams, dose[0], p.factor, selectedDrug.type === "prodrug");
      return { phenotype: p.id, color: p.color, data, visible: true };
    });
    setCurves(c);
    setAucData(null);
    completeModule(2);
  };

  const compareAUC = () => {
    if (!curves) return;
    const auc = curves.map((c, i) => {
      const a = calcAUC(c.data);
      const cmax = Math.max(...c.data.map((d) => d.concentracao));
      return { phenotype: PHENOTYPES[i].id, auc: a, cmax: parseFloat(cmax.toFixed(2)), clearance: parseFloat((dose[0] / a).toFixed(2)), fill: PHENOTYPES[i].color };
    });
    setAucData(auc);
    completeModule(3);
  };

  const togglePhenotype = (id: string) => {
    setCurves((prev) => prev?.map((c) => c.phenotype === id ? { ...c, visible: !c.visible } : c) ?? null);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const experimentSummary: Record<string, string> = {
    Fármaco: selectedDrug.name,
    Enzima: selectedDrug.enzyme,
    Tipo: selectedDrug.type === "prodrug" ? "Pró-fármaco" : "Fármaco ativo",
    Dose: `${dose[0]} mg`,
  };
  if (aucData) {
    aucData.forEach((a) => { experimentSummary[`AUC ${a.phenotype}`] = `${a.auc} mg·h/L`; });
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Dna className="h-7 w-7 text-primary" /> Bancada de Farmacogenômica</h1>
          <p className="text-sm text-muted-foreground">Variabilidade genética CYP450 e resposta farmacológica</p>
        </div>
        <AdminPromptViewer
          toolSlug={LAB_SYSTEM_PROMPTS.farmacogenomica.slug}
          toolName={LAB_SYSTEM_PROMPTS.farmacogenomica.name}
          toolType="laboratory"
          prompt={LAB_SYSTEM_PROMPTS.farmacogenomica.prompt}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção do Fármaco <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fármaco</label>
              <Select value={drug} onValueChange={setDrug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allDrugs.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.enzyme})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Enzima metabolizadora:</strong> {selectedDrug.enzyme}</p>
              <p><strong>Tipo:</strong> {selectedDrug.type === "prodrug" ? "Pró-fármaco (requer ativação metabólica)" : "Fármaco ativo (metabolismo = inativação)"}</p>
              <p><strong>Parâmetros PK base:</strong> ka={selectedDrug.baseParams.ka} h⁻¹, ke={selectedDrug.baseParams.ke} h⁻¹, Vd={selectedDrug.baseParams.vd} L, F={selectedDrug.baseParams.f}</p>
            </div>
            <Button onClick={confirmDrug} className="w-full">Confirmar Fármaco</Button>
            <AIContextGenerator
              labType="farmacogenomica"
              onContextGenerated={(data: any) => {
                setCustomDrug(data.drug);
                setDrug(data.drug.id);
                setCompletedModules(new Set([1]));
                setCurves(null);
                setAucData(null);
              }}
            />
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Configuração da População <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dose: {dose[0]} mg</label>
              <Slider value={dose} onValueChange={setDose} min={10} max={500} step={10} className="mt-2" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Distribuição de fenótipos (%)</label>
              {PHENOTYPES.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-xs w-8" style={{ color: p.color }}>{p.id}</span>
                  <Slider
                    value={[phenoDist[p.id as keyof typeof phenoDist]]}
                    onValueChange={(v) => setPhenoDist((prev) => ({ ...prev, [p.id]: v[0] }))}
                    min={0} max={100} step={5} className="flex-1"
                  />
                  <span className="text-xs w-8 text-right">{phenoDist[p.id as keyof typeof phenoDist]}%</span>
                </div>
              ))}
            </div>
            <Button onClick={genotypePopulation} className="w-full">Genotipar População</Button>
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Curvas PK por Genótipo <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent>
            {!curves ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando genotipagem</div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {curves.map((c) => (
                    <Badge key={c.phenotype} variant={c.visible ? "default" : "outline"} className="cursor-pointer text-xs" style={c.visible ? { backgroundColor: c.color } : {}} onClick={() => togglePhenotype(c.phenotype)}>
                      {c.phenotype}
                    </Badge>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" type="number" domain={[0, 24]} label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis label={{ value: "Concentração (mg/L)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    {curves.filter((c) => c.visible).map((c) => (
                      <Line key={c.phenotype} data={c.data} type="monotone" dataKey="concentracao" stroke={c.color} name={c.phenotype} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <Button onClick={compareAUC} className="w-full">Comparar AUC entre Fenótipos</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Comparação de AUC <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!aucData ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando análise</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aucData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="phenotype" fontSize={11} />
                    <YAxis label={{ value: "AUC (mg·h/L)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Bar dataKey="auc" name="AUC" radius={[4, 4, 0, 0]}>
                      {aucData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="py-1 text-left">Fenótipo</th><th className="py-1 text-center">AUC</th><th className="py-1 text-center">Cmax</th><th className="py-1 text-center">Clearance</th></tr></thead>
                  <tbody>
                    {aucData.map((a) => (
                      <tr key={a.phenotype} className="border-b border-border/50">
                        <td className="py-1 font-medium" style={{ color: a.fill }}>{a.phenotype}</td>
                        <td className="py-1 text-center">{a.auc}</td>
                        <td className="py-1 text-center">{a.cmax}</td>
                        <td className="py-1 text-center">{a.clearance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {selectedDrug.type === "prodrug"
                    ? `Como ${selectedDrug.name} é um pró-fármaco metabolizado por ${selectedDrug.enzyme}, metabolizadores lentos (PM) apresentam menor conversão ao metabólito ativo. Metabolizadores ultrarrápidos (UM) podem ter resposta exagerada.`
                    : `${selectedDrug.name} é metabolizado por ${selectedDrug.enzyme}. Metabolizadores lentos (PM) acumulam mais fármaco, aumentando risco de toxicidade. Considerar redução de dose para PM.`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Farmacogenômica" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
