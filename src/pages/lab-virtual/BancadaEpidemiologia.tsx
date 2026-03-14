import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Activity, Lock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

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

const OR_RANGES = [
  { label: "< 1.0", value: "lt1" },
  { label: "1.0 – 1.5", value: "1-1.5" },
  { label: "1.5 – 2.5", value: "1.5-2.5" },
  { label: "2.5 – 4.0", value: "2.5-4" },
  { label: "> 4.0", value: "gt4" },
];

function getORRange(or: number): string {
  if (or < 1) return "lt1";
  if (or <= 1.5) return "1-1.5";
  if (or <= 2.5) return "1.5-2.5";
  if (or <= 4) return "2.5-4";
  return "gt4";
}

export default function BancadaEpidemiologia() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("epidemiologia");
  const startTimeRef = useRef(Date.now());
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [studyType, setStudyType] = useState("coorte");
  // M2
  const [exposure, setExposure] = useState("tabagismo");
  const [outcome, setOutcome] = useState("iam");
  const [sampleSize, setSampleSize] = useState([500]);
  // M3 data
  const [table2x2, setTable2x2] = useState<{ a: number; b: number; c: number; d: number } | null>(null);
  const [measures, setMeasures] = useState<ReturnType<typeof calcMeasures> | null>(null);
  // M3 decisions
  const [userORRange, setUserORRange] = useState("");
  const [userSignificance, setUserSignificance] = useState("");
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{ orCorrect: boolean; sigCorrect: boolean } | null>(null);
  // M4
  const [forestPlot, setForestPlot] = useState<any[] | null>(null);
  const [userConfounding, setUserConfounding] = useState("");
  const [userConclusion, setUserConclusion] = useState("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{ confCorrect: boolean; conclCorrect: boolean; realConfounding: boolean; idealConclusion: string } | null>(null);

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
    setM3Submitted(false);
    setM3Feedback(null);
    setM4Submitted(false);
    setM4Feedback(null);
  };

  const collectData = () => {
    const t = generateDataset(sampleSize[0], exp.baseOR, out.prevalence);
    const m = calcMeasures(t.a, t.b, t.c, t.d);
    setTable2x2(t);
    setMeasures(m);
    setForestPlot(null);
    setM3Submitted(false);
    setM3Feedback(null);
    setM4Submitted(false);
    setM4Feedback(null);
    completeModule(2);
  };

  const submitM3Decision = () => {
    if (!measures || !userORRange || !userSignificance) return;
    const realRange = getORRange(measures.or);
    const orCorrect = userORRange === realRange;
    const sigCorrect = userSignificance === (measures.significant ? "sim" : "nao");
    setM3Feedback({ orCorrect, sigCorrect });
    setM3Submitted(true);

    // Generate forest plot for M4
    const fp = [
      { name: "Bruto", or: measures.or, lower: measures.ci95Lower, upper: measures.ci95Upper },
      { name: "Ajust. Idade", or: parseFloat((measures.or * (0.85 + Math.random() * 0.15)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.9).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.95).toFixed(2)) },
      { name: "Ajust. Sexo", or: parseFloat((measures.or * (0.9 + Math.random() * 0.1)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.88).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.97).toFixed(2)) },
      { name: "Multivariado", or: parseFloat((measures.or * (0.82 + Math.random() * 0.18)).toFixed(2)), lower: parseFloat((measures.ci95Lower * 0.85).toFixed(2)), upper: parseFloat((measures.ci95Upper * 0.92).toFixed(2)) },
    ];
    setForestPlot(fp);
    completeModule(3);
  };

  const submitM4Decision = () => {
    if (!forestPlot || !measures || !userConfounding || !userConclusion) return;
    const bruteOR = forestPlot[0].or;
    const adjustedOR = forestPlot[3].or;
    const orChange = Math.abs(bruteOR - adjustedOR) / bruteOR;
    const realConfounding = orChange > 0.10;
    const confCorrect = userConfounding === (realConfounding ? "sim" : "nao");

    // Ideal conclusion: if significant and no major confounding → association; if confounding → association with reservations; if not significant → no association
    let idealConclusion = "associacao";
    if (!measures.significant) idealConclusion = "sem-associacao";
    else if (realConfounding) idealConclusion = "confundimento";
    const conclCorrect = userConclusion === idealConclusion;

    setM4Feedback({ confCorrect, conclCorrect, realConfounding, idealConclusion });
    setM4Submitted(true);
    completeModule(4);
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

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Tipo de estudo", userChoice: study.name, correct: true },
      { label: "Exposição", userChoice: exp.name, correct: true },
      { label: "Desfecho", userChoice: out.name, correct: true },
      { label: "Tamanho amostral", userChoice: String(sampleSize[0]), correct: sampleSize[0] >= 200 },
    ];
    if (m3Feedback) {
      decisions.push(
        { label: "Estimativa do OR", userChoice: userORRange, correct: m3Feedback.orCorrect, idealChoice: measures ? getORRange(measures.or) : "" },
        { label: "Significância estatística", userChoice: userSignificance, correct: m3Feedback.sigCorrect, idealChoice: measures?.significant ? "sim" : "nao" },
      );
    }
    if (m4Feedback) {
      decisions.push(
        { label: "Confundimento", userChoice: userConfounding, correct: m4Feedback.confCorrect, idealChoice: m4Feedback.realConfounding ? "sim" : "nao" },
        { label: "Conclusão causal", userChoice: userConclusion, correct: m4Feedback.conclCorrect, idealChoice: m4Feedback.idealConclusion },
      );
    }
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({ score, actions: { decisions, report: reportData, experimentSummary }, timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000) });
  };

  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
    : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
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
                setM3Submitted(false);
                setM3Feedback(null);
                setM4Submitted(false);
                setM4Feedback(null);
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

        {/* M3 — Tabela 2x2 + Decisão de OR e Significância */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Interpretação da Tabela 2×2 <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!table2x2 || !measures ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando dados</div>
            ) : (
              <div className="space-y-4">
                {/* Raw data: the 2x2 table */}
                <table className="w-full text-sm border">
                  <thead><tr className="bg-muted/50"><th className="p-2 border"></th><th className="p-2 border text-center">D+</th><th className="p-2 border text-center">D−</th><th className="p-2 border text-center">Total</th></tr></thead>
                  <tbody>
                    <tr><td className="p-2 border font-medium">Exposto</td><td className="p-2 border text-center font-bold">{table2x2.a}</td><td className="p-2 border text-center">{table2x2.b}</td><td className="p-2 border text-center text-muted-foreground">{table2x2.a + table2x2.b}</td></tr>
                    <tr><td className="p-2 border font-medium">Não exposto</td><td className="p-2 border text-center">{table2x2.c}</td><td className="p-2 border text-center">{table2x2.d}</td><td className="p-2 border text-center text-muted-foreground">{table2x2.c + table2x2.d}</td></tr>
                  </tbody>
                </table>

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
                  <p className="font-medium text-foreground">💡 Lembre-se: OR = (a × d) / (b × c)</p>
                  <p className="text-muted-foreground">Analise a tabela e estime o OR antes de ver o resultado calculado.</p>
                </div>

                {!m3Submitted ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Em qual faixa está o OR?</label>
                      <Select value={userORRange} onValueChange={setUserORRange}>
                        <SelectTrigger><SelectValue placeholder="Selecione a faixa do OR" /></SelectTrigger>
                        <SelectContent>
                          {OR_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">A associação é estatisticamente significativa?</label>
                      <p className="text-[10px] text-muted-foreground mb-2">Considere: IC 95% que não cruza 1.0 indica significância</p>
                      <RadioGroup value={userSignificance} onValueChange={setUserSignificance}>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="sig-sim" /><Label htmlFor="sig-sim">Sim (IC 95% não inclui 1.0)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="sig-nao" /><Label htmlFor="sig-nao">Não (IC 95% inclui 1.0)</Label></div>
                      </RadioGroup>
                    </div>
                    <Button onClick={submitM3Decision} className="w-full" disabled={!userORRange || !userSignificance}>Confirmar Interpretação</Button>
                  </div>
                ) : m3Feedback && (
                  <div className="space-y-3">
                    {/* Feedback: OR */}
                    <div className={`p-3 rounded-lg border text-xs ${m3Feedback.orCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m3Feedback.orCorrect} /><span className="font-medium">Estimativa do OR</span></div>
                      <p className="text-muted-foreground">
                        OR calculado: <strong className="text-foreground">{measures.or}</strong> (IC 95%: {measures.ci95Lower}–{measures.ci95Upper}).
                        {m3Feedback.orCorrect
                          ? " Sua estimativa está correta!"
                          : ` Sua escolha (${OR_RANGES.find(r => r.value === userORRange)?.label}) não corresponde à faixa real (${OR_RANGES.find(r => r.value === getORRange(measures.or))?.label}).`}
                      </p>
                    </div>
                    {/* Feedback: Significance */}
                    <div className={`p-3 rounded-lg border text-xs ${m3Feedback.sigCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m3Feedback.sigCorrect} /><span className="font-medium">Significância estatística</span></div>
                      <p className="text-muted-foreground">
                        {measures.significant
                          ? `Associação significativa (p = ${measures.pValue}, IC não cruza 1.0).`
                          : `Não significativa (p = ${measures.pValue}, IC cruza 1.0).`}
                        {!m3Feedback.sigCorrect && (
                          <span className="text-destructive"> Sua interpretação estava incorreta. {!measures.significant ? "Aumente o tamanho amostral para detectar associações fracas." : "Verifique se o IC 95% exclui o valor nulo (1.0)."}</span>
                        )}
                      </p>
                    </div>
                    {showRR && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs">
                        <span className="text-muted-foreground">RR = </span><strong>{measures.rr}</strong>
                        <span className="text-muted-foreground ml-2">RD = </span><strong>{measures.rd}</strong>
                        {measures.rd > 0 && <span className="text-muted-foreground ml-2">NNT ≈ </span>}
                        {measures.rd > 0 && <strong>{measures.nnt}</strong>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 — Forest Plot + Decisão de Confundimento e Conclusão */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Análise Ajustada e Conclusão <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!forestPlot ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando interpretação da tabela 2×2</div>
            ) : (
              <div className="space-y-4">
                {/* Forest plot visualization */}
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

                {m3Feedback && !m3Feedback.orCorrect && (
                  <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">Atenção: sua estimativa do OR bruto estava incorreta no módulo anterior. Analise o forest plot com cuidado para avaliar se o ajuste por confundidores altera a magnitude da associação.</p>
                  </div>
                )}

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
                  <p className="font-medium text-foreground">💡 Confundimento: OR bruto vs. ajustado difere &gt;10%?</p>
                  <p className="text-muted-foreground">Compare o OR bruto ({forestPlot[0].or}) com o multivariado ({forestPlot[3].or}) e avalie se a mudança é relevante.</p>
                </div>

                {!m4Submitted ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Há evidência de confundimento?</label>
                      <RadioGroup value={userConfounding} onValueChange={setUserConfounding}>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="conf-sim" /><Label htmlFor="conf-sim">Sim (OR mudou &gt;10% após ajuste)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="conf-nao" /><Label htmlFor="conf-nao">Não (OR permaneceu estável)</Label></div>
                      </RadioGroup>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Qual sua conclusão sobre a relação?</label>
                      <Select value={userConclusion} onValueChange={setUserConclusion}>
                        <SelectTrigger><SelectValue placeholder="Selecione sua conclusão" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="associacao">Associação significativa independente</SelectItem>
                          <SelectItem value="confundimento">Associação presente, mas com confundimento relevante</SelectItem>
                          <SelectItem value="sem-associacao">Sem associação estatisticamente significativa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={submitM4Decision} className="w-full" disabled={!userConfounding || !userConclusion}>Confirmar Conclusão</Button>
                  </div>
                ) : m4Feedback && (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border text-xs ${m4Feedback.confCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m4Feedback.confCorrect} /><span className="font-medium">Confundimento</span></div>
                      <p className="text-muted-foreground">
                        Variação do OR: {((Math.abs(forestPlot[0].or - forestPlot[3].or) / forestPlot[0].or) * 100).toFixed(1)}%.
                        {m4Feedback.realConfounding
                          ? " Há confundimento relevante (>10%). Os confundidores alteram a magnitude da associação."
                          : " Não há confundimento relevante (≤10%). A associação é robusta após ajuste."}
                        {!m4Feedback.confCorrect && <span className="text-destructive"> Sua avaliação estava incorreta.</span>}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border text-xs ${m4Feedback.conclCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2 mb-1"><FeedbackIcon correct={m4Feedback.conclCorrect} /><span className="font-medium">Conclusão</span></div>
                      <p className="text-muted-foreground">
                        {m4Feedback.idealConclusion === "associacao" && "A conclusão ideal é: associação significativa independente — OR ajustado mantém significância sem confundimento relevante."}
                        {m4Feedback.idealConclusion === "confundimento" && "A conclusão ideal é: associação presente, mas com confundimento relevante — a magnitude do efeito muda consideravelmente após ajuste."}
                        {m4Feedback.idealConclusion === "sem-associacao" && "A conclusão ideal é: sem associação significativa — o IC 95% cruza o valor nulo."}
                        {!m4Feedback.conclCorrect && <span className="text-destructive"> Sua conclusão divergiu da interpretação epidemiológica adequada.</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Epidemiologia" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
