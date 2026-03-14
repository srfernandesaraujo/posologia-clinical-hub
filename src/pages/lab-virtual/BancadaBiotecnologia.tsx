import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TestTubes, Lock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

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

const MW_RANGES = [
  { label: "< 10 kDa", value: "lt10", min: 0, max: 10 },
  { label: "10 – 20 kDa", value: "10-20", min: 10, max: 20 },
  { label: "20 – 40 kDa", value: "20-40", min: 20, max: 40 },
  { label: "40 – 80 kDa", value: "40-80", min: 40, max: 80 },
  { label: "> 80 kDa", value: "gt80", min: 80, max: 999 },
];

function getMWRange(mw: number): string {
  if (mw < 10) return "lt10";
  if (mw < 20) return "10-20";
  if (mw < 40) return "20-40";
  if (mw < 80) return "40-80";
  return "gt80";
}

const PURIFICATION_STRATEGIES: Record<string, { label: string; ideal: string[] }> = {
  "His-tag": { label: "IMAC (Ni²⁺-NTA)", ideal: ["imac"] },
  "GST-tag": { label: "Glutationa-Sefarose", ideal: ["gst"] },
  "MBP-tag": { label: "Amilose", ideal: ["mbp"] },
};

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
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("biotecnologia");
  const startTimeRef = useRef(Date.now());
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
  // M3 decisions
  const [userMWRange, setUserMWRange] = useState("");
  const [userSolubilityOk, setUserSolubilityOk] = useState("");
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{ mwCorrect: boolean; solCorrect: boolean; realMW: number; realSol: number } | null>(null);
  // M4
  const [expressionCurve, setExpressionCurve] = useState<any[] | null>(null);
  const [userOptimalTime, setUserOptimalTime] = useState("");
  const [userPurification, setUserPurification] = useState("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{ timeCorrect: boolean; purCorrect: boolean; idealTime: string; idealPur: string } | null>(null);

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
    setM3Submitted(false);
    setM3Feedback(null);
    setM4Submitted(false);
    setM4Feedback(null);
  };

  const induceExpression = () => {
    const { totalYield, solubility } = calcExpression(selectedGene, selectedVector, selectedStrain, temp[0], iptg[0]);
    setExpressionResults({ totalYield, solubility, solubleYield: parseFloat((totalYield * solubility).toFixed(1)) });
    setExpressionCurve(null);
    setM3Submitted(false);
    setM3Feedback(null);
    setM4Submitted(false);
    setM4Feedback(null);
    completeModule(2);
  };

  const submitM3Decision = () => {
    if (!expressionResults || !userMWRange || !userSolubilityOk) return;
    const realRange = getMWRange(selectedGene.mw);
    const mwCorrect = userMWRange === realRange;
    const solOk = expressionResults.solubility >= 0.6;
    const solCorrect = userSolubilityOk === (solOk ? "sim" : "nao");
    setM3Feedback({ mwCorrect, solCorrect, realMW: selectedGene.mw, realSol: expressionResults.solubility });
    setM3Submitted(true);

    // Generate expression curve for M4
    const curve = generateExpressionCurve(selectedGene, selectedVector, selectedStrain, temp[0], iptg[0]);
    setExpressionCurve(curve);
    completeModule(3);
  };

  const submitM4Decision = () => {
    if (!expressionCurve || !userOptimalTime || !userPurification) return;

    // Find optimal time: where expression rate starts to plateau (derivative decreases)
    let maxRate = 0;
    let idealTimeIdx = 0;
    for (let i = 1; i < expressionCurve.length; i++) {
      const rate = expressionCurve[i].expressao - expressionCurve[i - 1].expressao;
      if (rate > maxRate) { maxRate = rate; idealTimeIdx = i; }
    }
    // Optimal is ~2 points after max rate (inflection point)
    const optimalIdx = Math.min(idealTimeIdx + 2, expressionCurve.length - 1);
    const idealTimeH = expressionCurve[optimalIdx].hora;
    let idealTimeRange = "";
    if (idealTimeH <= 3) idealTimeRange = "2-3";
    else if (idealTimeH <= 5) idealTimeRange = "4-5";
    else idealTimeRange = "6-8";
    const timeCorrect = userOptimalTime === idealTimeRange;

    // Purification strategy
    const tagStrategy = PURIFICATION_STRATEGIES[selectedVector.tag];
    const idealPur = tagStrategy ? Object.keys(PURIFICATION_STRATEGIES).find(k => PURIFICATION_STRATEGIES[k] === tagStrategy) || selectedVector.tag : selectedVector.tag;
    const purCorrect = (selectedVector.tag === "His-tag" && userPurification === "imac")
      || (selectedVector.tag === "GST-tag" && userPurification === "gst")
      || (selectedVector.tag === "MBP-tag" && userPurification === "mbp");

    setM4Feedback({ timeCorrect, purCorrect, idealTime: `${idealTimeH}h (faixa ${idealTimeRange}h)`, idealPur: tagStrategy?.label || selectedVector.tag });
    setM4Submitted(true);
    completeModule(4);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
    : <XCircle className="h-4 w-4 text-destructive" />;

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

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Gene", userChoice: selectedGene.name, correct: true },
      { label: "Vetor", userChoice: selectedVector.name, correct: true },
      { label: "Cepa", userChoice: selectedStrain.name, correct: true },
      { label: "Temperatura", userChoice: `${temp[0]}°C`, correct: Math.abs(temp[0] - selectedGene.optimalTemp) <= 5 },
      { label: "IPTG", userChoice: `${iptg[0]} mM`, correct: true },
    ];
    if (m3Feedback) {
      decisions.push(
        { label: "Peso molecular no gel", userChoice: userMWRange, correct: m3Feedback.mwCorrect, idealChoice: getMWRange(selectedGene.mw) },
        { label: "Solubilidade adequada", userChoice: userSolubilityOk, correct: m3Feedback.solCorrect },
      );
    }
    if (m4Feedback) {
      decisions.push(
        { label: "Tempo ótimo de coleta", userChoice: userOptimalTime, correct: m4Feedback.timeCorrect, idealChoice: m4Feedback.idealTime },
        { label: "Estratégia de purificação", userChoice: userPurification, correct: m4Feedback.purCorrect, idealChoice: m4Feedback.idealPur },
      );
    }
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({ score, actions: { decisions, report: reportData, experimentSummary }, timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000) });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TestTubes className="h-7 w-7 text-primary" /> Bancada de Biotecnologia</h1>
          <p className="text-sm text-muted-foreground">Clonagem, expressão proteica e otimização de produção</p>
        </div>
        <AdminPromptViewer
          toolSlug={LAB_SYSTEM_PROMPTS.biotecnologia.slug}
          toolName={LAB_SYSTEM_PROMPTS.biotecnologia.name}
          toolType="laboratory"
          prompt={LAB_SYSTEM_PROMPTS.biotecnologia.prompt}
        />
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
                <SelectContent>{allGenes.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.mw} kDa)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Vetor de expressão</label>
              <Select value={vector} onValueChange={setVector}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allVectors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — {v.tag}, {v.promoter}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Cepa hospedeira</label>
              <Select value={strain} onValueChange={setStrain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allStrains.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={confirmConstruct} className="w-full">Confirmar Constructo</Button>
            <AIContextGenerator
              labType="biotecnologia"
              onContextGenerated={(data: any) => {
                setCustomGene(data.gene);
                setCustomVector(data.vector);
                setCustomStrain(data.strain);
                setGene(data.gene.id);
                setVector(data.vector.id);
                setStrain(data.strain.id);
                setCompletedModules(new Set([1]));
                setExpressionResults(null);
                setExpressionCurve(null);
                setM3Submitted(false);
                setM3Feedback(null);
                setM4Submitted(false);
                setM4Feedback(null);
              }}
            />
          </CardContent>
        </Card>

        {/* Plasmid Map */}
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

        {/* M3 — SDS-PAGE Interpretation Challenge */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Interpretação do SDS-PAGE <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!expressionResults ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando indução</div>
            ) : (
              <div className="space-y-4">
                {/* SDS-PAGE gel visualization */}
                <div>
                  <p className="text-xs font-medium mb-2">SDS-PAGE — Analise o gel e identifique a banda-alvo</p>
                  <div className="flex gap-4 bg-blue-950 rounded-lg p-3 justify-center">
                    <div className="flex flex-col items-center gap-0.5 w-8">
                      <p className="text-[8px] text-blue-300 mb-1">M</p>
                      {[250, 150, 100, 75, 50, 37, 25, 20, 15, 10].map((mw) => (
                        <div key={mw} className="w-full flex items-center gap-0.5">
                          <div className="w-full h-1 bg-blue-300 rounded-full opacity-60" />
                          <span className="text-[6px] text-blue-400">{mw}</span>
                        </div>
                      ))}
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

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
                  <p className="font-medium text-foreground">💡 Desafio: Interprete o gel</p>
                  <p className="text-muted-foreground">Compare a banda-alvo com o marcador para estimar o peso molecular. Avalie a intensidade nas frações solúvel (Sol) e insolúvel (Ins).</p>
                </div>

                {!m3Submitted ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Em qual faixa de peso molecular está a banda-alvo?</label>
                      <Select value={userMWRange} onValueChange={setUserMWRange}>
                        <SelectTrigger><SelectValue placeholder="Selecione a faixa" /></SelectTrigger>
                        <SelectContent>
                          {MW_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">A solubilidade é adequada para purificação direta?</label>
                      <p className="text-[10px] text-muted-foreground mb-2">Critério: banda mais intensa na fração Sol que na Ins (≥60% solúvel)</p>
                      <RadioGroup value={userSolubilityOk} onValueChange={setUserSolubilityOk}>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="sol-sim" /><Label htmlFor="sol-sim">Sim — proteína predominantemente solúvel</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="sol-nao" /><Label htmlFor="sol-nao">Não — necessita otimização (reduzir temp/IPTG)</Label></div>
                      </RadioGroup>
                    </div>
                    <Button onClick={submitM3Decision} className="w-full" disabled={!userMWRange || !userSolubilityOk}>Confirmar Interpretação</Button>
                  </div>
                ) : m3Feedback && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{expressionResults.totalYield}</p><p className="text-[10px] text-muted-foreground">mg/L</p></div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Solubilidade</p><p className="text-lg font-bold">{(expressionResults.solubility * 100).toFixed(0)}%</p></div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Solúvel</p><p className="text-lg font-bold">{expressionResults.solubleYield}</p><p className="text-[10px] text-muted-foreground">mg/L</p></div>
                    </div>
                    <div className={`p-3 rounded-lg border text-xs ${m3Feedback.mwCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m3Feedback.mwCorrect} /><span className="font-medium">Peso molecular</span></div>
                      <p className="text-muted-foreground">
                        PM real: <strong className="text-foreground">{m3Feedback.realMW} kDa</strong> (faixa: {MW_RANGES.find(r => r.value === getMWRange(m3Feedback.realMW))?.label}).
                        {m3Feedback.mwCorrect ? " Identificação correta!" : ` Sua escolha (${MW_RANGES.find(r => r.value === userMWRange)?.label}) não corresponde.`}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border text-xs ${m3Feedback.solCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m3Feedback.solCorrect} /><span className="font-medium">Solubilidade</span></div>
                      <p className="text-muted-foreground">
                        Solubilidade real: <strong className="text-foreground">{(m3Feedback.realSol * 100).toFixed(0)}%</strong>.
                        {m3Feedback.realSol >= 0.6
                          ? " Proteína predominantemente solúvel — purificação direta viável."
                          : " Proteína majoritariamente insolúvel — necessita otimização (reduzir temperatura para 16-20°C, diminuir IPTG)."}
                        {!m3Feedback.solCorrect && <span className="text-destructive"> Sua avaliação estava incorreta.</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 — Expression Curve + Decision */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Curva de Expressão e Purificação <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!expressionCurve ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando interpretação do gel</div>
            ) : (
              <div className="space-y-4">
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

                {m3Feedback && !m3Feedback.solCorrect && (
                  <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">Atenção: sua avaliação de solubilidade no módulo anterior estava incorreta. Considere isso ao decidir o tempo de coleta — coletas tardias podem agravar a formação de corpos de inclusão.</p>
                  </div>
                )}

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
                  <p className="font-medium text-foreground">💡 Desafio: Identifique o tempo ótimo e a estratégia de purificação</p>
                  <p className="text-muted-foreground">O tempo ótimo de coleta é o ponto de inflexão onde a expressão ainda cresce mas o crescimento celular desacelera. A estratégia de purificação depende do tag de fusão escolhido.</p>
                </div>

                {!m4Submitted ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tempo ótimo de coleta</label>
                      <Select value={userOptimalTime} onValueChange={setUserOptimalTime}>
                        <SelectTrigger><SelectValue placeholder="Selecione a faixa" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2-3">2–3 horas (coleta precoce)</SelectItem>
                          <SelectItem value="4-5">4–5 horas (coleta intermediária)</SelectItem>
                          <SelectItem value="6-8">6–8 horas (coleta tardia)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estratégia de purificação para {selectedVector.tag}</label>
                      <Select value={userPurification} onValueChange={setUserPurification}>
                        <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imac">IMAC — Cromatografia Ni²⁺-NTA (His-tag)</SelectItem>
                          <SelectItem value="gst">Glutationa-Sefarose (GST-tag)</SelectItem>
                          <SelectItem value="mbp">Amilose (MBP-tag)</SelectItem>
                          <SelectItem value="iec">Troca iônica (genérico)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={submitM4Decision} className="w-full" disabled={!userOptimalTime || !userPurification}>Confirmar Decisões</Button>
                    </div>
                  </div>
                ) : m4Feedback && (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border text-xs ${m4Feedback.timeCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m4Feedback.timeCorrect} /><span className="font-medium">Tempo ótimo de coleta</span></div>
                      <p className="text-muted-foreground">
                        Tempo ideal: <strong className="text-foreground">{m4Feedback.idealTime}</strong>.
                        {m4Feedback.timeCorrect
                          ? " Excelente! Coleta no ponto de inflexão maximiza rendimento com boa qualidade."
                          : " Coleta muito precoce reduz rendimento; muito tardia aumenta proteólise e corpos de inclusão."}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border text-xs ${m4Feedback.purCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m4Feedback.purCorrect} /><span className="font-medium">Estratégia de purificação</span></div>
                      <p className="text-muted-foreground">
                        Método ideal para <strong className="text-foreground">{selectedVector.tag}</strong>: <strong className="text-foreground">{m4Feedback.idealPur}</strong>.
                        {m4Feedback.purCorrect
                          ? " Correto! A cromatografia de afinidade pelo tag garante alta seletividade."
                          : " Método incorreto. Cada tag de fusão requer sua resina específica para purificação eficiente."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Biotecnologia" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
