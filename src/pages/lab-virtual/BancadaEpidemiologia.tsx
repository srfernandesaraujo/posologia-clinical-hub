import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Activity, Lock, CheckCircle2 } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";

const STUDY_TYPES = [
  { id: "coorte", name: "Coorte Prospectiva", desc: "Segue expostos e não-expostos ao longo do tempo. Calcula RR e RD." },
  { id: "caso-controle", name: "Caso-Controle", desc: "Parte do desfecho. Compara proporção de expostos entre casos e controles. Calcula apenas OR." },
  { id: "transversal", name: "Transversal", desc: "Avalia exposição e desfecho simultaneamente. Calcula RP (razão de prevalência)." },
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
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [studyType, setStudyType] = useState("coorte");
  // M2
  const [exposure, setExposure] = useState("tabagismo");
  const [outcome, setOutcome] = useState("iam");
  const [sampleSize, setSampleSize] = useState([500]);
  // M3
  const [table2x2, setTable2x2] = useState<{ a: number; b: number; c: number; d: number } | null>(null);
  const [measures, setMeasures] = useState<ReturnType<typeof calcMeasures> | null>(null);
  // M4
  const [forestPlot, setForestPlot] = useState<any[] | null>(null);

  const [customExposure, setCustomExposure] = useState<typeof EXPOSURES[0] | null>(null);
  const [customOutcome, setCustomOutcome] = useState<typeof OUTCOMES[0] | null>(null);
  const allExposures = useMemo(() => [...EXPOSURES, ...(customExposure ? [customExposure] : [])], [customExposure]);
  const allOutcomes = useMemo(() => [...OUTCOMES, ...(customOutcome ? [customOutcome] : [])], [customOutcome]);

  const study = STUDY_TYPES.find((s) => s.id === studyType)!;
  const exp = allExposures.find((e) => e.id === exposure) ?? EXPOSURES[0];
  const out = allOutcomes.find((o) => o.id === outcome) ?? OUTCOMES[0];
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmStudy = () => {
    setCompletedModules(new Set([1]));
    setTable2x2(null);
    setMeasures(null);
    setForestPlot(null);
  };

  const collectData = () => {
    const t = generateDataset(sampleSize[0], exp.baseOR, out.prevalence);
    const m = calcMeasures(t.a, t.b, t.c, t.d);
    setTable2x2(t);
    setMeasures(m);
    setForestPlot(null);
    completeModule(2);
  };

  const adjustedAnalysis = () => {
    if (!measures) return;
    const fp = [
      { name: "Bruto", or: measures.or, lower: measures.ci95Lower, upper: measures.ci95Upper },
      { name: "Ajust. Idade", or: parseFloat((measures.or * (0.85 + Math.random() * 0.15)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.9).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.95).toFixed(2)) },
      { name: "Ajust. Sexo", or: parseFloat((measures.or * (0.9 + Math.random() * 0.1)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.88).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.97).toFixed(2)) },
      { name: "Multivariado", or: parseFloat((measures.or * (0.82 + Math.random() * 0.18)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.85).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.92).toFixed(2)) },
    ];
    setForestPlot(fp);
    completeModule(3);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const showRR = studyType === "coorte";

  const experimentSummary: Record<string, string> = {
    "Tipo de estudo": study.name,
    Exposição: exp.name,
    Desfecho: out.name,
    "Tamanho amostral": String(sampleSize[0]),
  };
  if (measures) {
    experimentSummary["OR"] = `${measures.or} (IC 95%: ${measures.ci95Lower}–${measures.ci95Upper})`;
    if (showRR) experimentSummary["RR"] = String(measures.rr);
    experimentSummary["p-valor"] = String(measures.pValue);
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> Bancada de Epidemiologia</h1>
          <p className="text-sm text-muted-foreground">Estudo observacional, OR/RR e análise de associação</p>
        </div>
        <AdminPromptViewer
          toolSlug={LAB_SYSTEM_PROMPTS.epidemiologia.slug}
          toolName={LAB_SYSTEM_PROMPTS.epidemiologia.name}
          toolType="laboratory"
          prompt={LAB_SYSTEM_PROMPTS.epidemiologia.prompt}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Desenho do Estudo <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de estudo</label>
              <Select value={studyType} onValueChange={setStudyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STUDY_TYPES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs">{study.desc}</div>
            <Button onClick={confirmStudy} className="w-full">Confirmar Desenho</Button>
            <AIContextGenerator
              labType="epidemiologia"
              onContextGenerated={(data: any) => {
                setCustomExposure(data.exposure);
                setCustomOutcome(data.outcome);
                setExposure(data.exposure.id);
                setOutcome(data.outcome.id);
                setCompletedModules(new Set([1]));
                setTable2x2(null);
                setMeasures(null);
                setForestPlot(null);
              }}
            />
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Variáveis e Amostra <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Exposição</label>
              <Select value={exposure} onValueChange={setExposure}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allExposures.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Desfecho</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allOutcomes.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tamanho amostral: {sampleSize[0]}</label>
              <Slider value={sampleSize} onValueChange={setSampleSize} min={100} max={5000} step={100} className="mt-2" />
            </div>
            {studyType === "caso-controle" && (
              <p className="text-[10px] text-muted-foreground">⚠ Em estudos caso-controle, apenas o OR é válido (RR não deve ser calculado).</p>
            )}
            <Button onClick={collectData} className="w-full">Coletar Dados</Button>
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Tabela 2×2 e Medidas <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent>
            {!table2x2 || !measures ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando dados</div>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-sm border">
                  <thead><tr className="bg-muted/50"><th className="p-2 border"></th><th className="p-2 border text-center">D+</th><th className="p-2 border text-center">D−</th></tr></thead>
                  <tbody>
                    <tr><td className="p-2 border font-medium">Exposto</td><td className="p-2 border text-center font-bold">{table2x2.a}</td><td className="p-2 border text-center">{table2x2.b}</td></tr>
                    <tr><td className="p-2 border font-medium">Não exposto</td><td className="p-2 border text-center">{table2x2.c}</td><td className="p-2 border text-center">{table2x2.d}</td></tr>
                  </tbody>
                </table>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">OR</p><p className="text-lg font-bold">{measures.or}</p><p className="text-[10px] text-muted-foreground">IC: {measures.ci95Lower}–{measures.ci95Upper}</p></div>
                  {showRR && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">RR</p><p className="text-lg font-bold">{measures.rr}</p><p className="text-[10px] text-muted-foreground">p = {measures.pValue}</p></div>}
                  {!showRR && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">p-valor</p><p className="text-lg font-bold">{measures.pValue}</p></div>}
                </div>
                <div className={`p-3 rounded-lg border text-xs ${measures.significant ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                  <Badge variant={measures.significant ? "default" : "secondary"}>{measures.significant ? "Significativo" : "Não significativo"}</Badge>
                  <p className="mt-1 text-muted-foreground">
                    {measures.significant
                      ? `Associação significativa entre ${exp.name.toLowerCase()} e ${out.name.toLowerCase()}.`
                      : `Não foi demonstrada associação significativa. Considere aumentar a amostra.`}
                  </p>
                </div>
                <Button onClick={adjustedAnalysis} className="w-full">Análise Ajustada</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Forest Plot Ajustado <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!forestPlot ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando análise bruta</div>
            ) : (
              <div className="space-y-3">
                {forestPlot.map((item) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <span className="text-xs w-20 shrink-0">{item.name}</span>
                    <div className="flex-1 relative h-8">
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-px bg-muted-foreground" style={{ left: `${Math.max(0, (item.lower / 6) * 100)}%`, width: `${Math.min(100, ((item.upper - item.lower) / 6) * 100)}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-sm rotate-45" style={{ left: `${Math.min(95, (item.or / 6) * 100)}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-px h-full bg-destructive/50" style={{ left: `${(1 / 6) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 text-right">{item.or} ({item.lower}–{item.upper})</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center">Linha vermelha = OR 1,0 (sem associação)</p>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Epidemiologia" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
