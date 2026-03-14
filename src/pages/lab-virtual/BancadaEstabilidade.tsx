import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Lock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

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

function generateT90Options(realT90: number): string[] {
  const options = new Set<number>();
  options.add(parseFloat(realT90.toFixed(1)));
  options.add(parseFloat((realT90 * 0.4).toFixed(1)));
  options.add(parseFloat((realT90 * 0.7).toFixed(1)));
  options.add(parseFloat((realT90 * 1.4).toFixed(1)));
  options.add(parseFloat((realT90 * 2.0).toFixed(1)));
  return Array.from(options).sort((a, b) => a - b).map(v => String(v));
}

export default function BancadaEstabilidade() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("estabilidade");
  const startTimeRef = useRef(Date.now());
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [formulation, setFormulation] = useState("aspirin");
  // M2
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["25_60", "40_75"]);
  const [maxMonths, setMaxMonths] = useState([36]);
  // M3
  const [curves, setCurves] = useState<CurveResult[] | null>(null);
  const [selectedCurve, setSelectedCurve] = useState<string | null>(null);
  // M3 decisions
  const [userT90Estimates, setUserT90Estimates] = useState<Record<string, string>>({});
  const [userKineticOrder, setUserKineticOrder] = useState("");
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{
    t90Results: { condId: string; temp: number; userValue: string; real: number; correct: boolean }[];
    orderCorrect: boolean;
    realOrder: string;
  } | null>(null);
  // M4
  const [arrhenius, setArrhenius] = useState<{ data: any[]; shelfLife25: number } | null>(null);
  // M4 decisions
  const [userShelfLife, setUserShelfLife] = useState("");
  const [userAnvisaDecision, setUserAnvisaDecision] = useState("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{
    shelfLifeCorrect: boolean; realShelfLife: number;
    anvisaCorrect: boolean; anvisaVerdict: string;
  } | null>(null);

  const [customFormulation, setCustomFormulation] = useState<typeof FORMULATIONS[0] | null>(null);
  const allFormulations = useMemo(() => [...FORMULATIONS, ...(customFormulation ? [customFormulation] : [])], [customFormulation]);

  const form = allFormulations.find((f) => f.id === formulation) ?? FORMULATIONS[0];
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmFormulation = () => {
    setCompletedModules(new Set([1]));
    setCurves(null); setArrhenius(null);
    setM3Submitted(false); setM3Feedback(null); setUserT90Estimates({}); setUserKineticOrder("");
    setM4Submitted(false); setM4Feedback(null); setUserShelfLife(""); setUserAnvisaDecision("");
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
    setM3Submitted(false); setM3Feedback(null); setUserT90Estimates({}); setUserKineticOrder("");
    setM4Submitted(false); setM4Feedback(null); setUserShelfLife(""); setUserAnvisaDecision("");
    completeModule(2);
  };

  // M3 decision
  const submitM3Decision = () => {
    if (!curves) return;
    const t90Results = curves.map(c => {
      const userVal = parseFloat(userT90Estimates[c.conditionId] || "0");
      const correct = Math.abs(userVal - c.t90) / c.t90 <= 0.35;
      return { condId: c.conditionId, temp: c.temp, userValue: userT90Estimates[c.conditionId] || "—", real: c.t90, correct };
    });
    const realOrder = form.order === 0 ? "zero" : "primeira";
    const orderCorrect = userKineticOrder === realOrder;
    setM3Feedback({ t90Results, orderCorrect, realOrder });
    setM3Submitted(true);

    // Auto-generate Arrhenius for M4
    const arrhData = CONDITIONS.map((c) => {
      const k = calcK(form.k25, form.ea, c.temp);
      return { invT: parseFloat((1000 / (c.temp + 273.15)).toFixed(4)), lnK: parseFloat(Math.log(k).toFixed(4)), temp: c.temp };
    });
    const k25 = calcK(form.k25, form.ea, 25);
    const shelfLife25 = parseFloat((calcT90(form.initialConc, k25, form.order) / 30).toFixed(1));
    setArrhenius({ data: arrhData, shelfLife25 });
    completeModule(3);
  };

  // M4 decision
  const shelfLifeOptions = useMemo(() => {
    if (!arrhenius) return [];
    return generateT90Options(arrhenius.shelfLife25);
  }, [arrhenius]);

  const submitM4Decision = () => {
    if (!arrhenius) return;
    const userSL = parseFloat(userShelfLife);
    const shelfLifeCorrect = Math.abs(userSL - arrhenius.shelfLife25) / arrhenius.shelfLife25 <= 0.35;
    const meetsAnvisa = arrhenius.shelfLife25 >= 24;
    const anvisaCorrect = userAnvisaDecision === (meetsAnvisa ? "atende" : "nao_atende");
    const anvisaVerdict = meetsAnvisa
      ? `O prazo de validade estimado (${arrhenius.shelfLife25} meses) atende o mínimo regulatório de 24 meses (ANVISA/ICH).`
      : `O prazo de validade estimado (${arrhenius.shelfLife25} meses) NÃO atende o mínimo de 24 meses. Necessário reformulação ou nova embalagem.`;
    setM4Feedback({ shelfLifeCorrect, realShelfLife: arrhenius.shelfLife25, anvisaCorrect, anvisaVerdict });
    setM4Submitted(true);
    completeModule(4);
  };

  const toggleCondition = (id: string) => setSelectedConditions((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req}</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;
  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    : <XCircle className="h-4 w-4 text-destructive shrink-0" />;

  const activeCurve = curves?.find((c) => c.conditionId === selectedCurve);

  const experimentSummary: Record<string, string> = {
    Formulação: form.name,
    "Ordem cinética": form.order === 0 ? "Ordem zero" : "Primeira ordem",
    "Ea": `${form.ea} kJ/mol`,
    Condições: selectedConditions.map((id) => CONDITIONS.find((c) => c.id === id)?.name).join("; "),
  };
  if (arrhenius) { experimentSummary["Prazo de validade (25°C)"] = `${arrhenius.shelfLife25} meses`; }
  if (curves) { curves.forEach((c) => { experimentSummary[`t90 (${c.temp}°C)`] = `${c.t90} meses`; }); }

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Formulação", userChoice: form.name, correct: true },
      { label: "Condições selecionadas", userChoice: selectedConditions.map(id => CONDITIONS.find(c => c.id === id)?.name).join("; "), correct: selectedConditions.length >= 2 },
    ];
    if (m3Feedback) {
      decisions.push({ label: "Ordem cinética", userChoice: userKineticOrder, correct: m3Feedback.orderCorrect, idealChoice: m3Feedback.realOrder });
      m3Feedback.t90Results.forEach(r => {
        decisions.push({ label: `t90 (${r.temp}°C)`, userChoice: `${r.userValue} meses`, correct: r.correct, idealChoice: `${r.real} meses` });
      });
    }
    if (m4Feedback) {
      decisions.push(
        { label: "Prazo de validade (25°C)", userChoice: `${userShelfLife} meses`, correct: m4Feedback.shelfLifeCorrect, idealChoice: `${m4Feedback.realShelfLife} meses` },
        { label: "Atende ANVISA (≥24 meses)", userChoice: userAnvisaDecision === "atende" ? "Sim" : "Não", correct: m4Feedback.anvisaCorrect, idealChoice: m4Feedback.realShelfLife >= 24 ? "Sim" : "Não" },
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-7 w-7 text-primary" /> Bancada de Estabilidade</h1>
          <p className="text-sm text-muted-foreground">Cinética de degradação, Arrhenius e prazo de validade</p>
        </div>
        <AdminPromptViewer toolSlug={LAB_SYSTEM_PROMPTS.estabilidade.slug} toolName={LAB_SYSTEM_PROMPTS.estabilidade.name} toolType="laboratory" prompt={LAB_SYSTEM_PROMPTS.estabilidade.prompt} />
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
                <SelectContent>{allFormulations.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Ordem cinética:</strong> {form.order === 0 ? "Ordem zero" : "Primeira ordem"}</p>
              <p><strong>Energia de ativação:</strong> {form.ea} kJ/mol</p>
              <p><strong>Concentração inicial:</strong> {form.initialConc}%</p>
            </div>
            <Button onClick={confirmFormulation} className="w-full">Confirmar Formulação</Button>
            <AIContextGenerator labType="estabilidade" onContextGenerated={(data: any) => {
              setCustomFormulation(data.formulation); setFormulation(data.formulation.id);
              setCompletedModules(new Set([1])); setCurves(null); setArrhenius(null);
              setM3Submitted(false); setM3Feedback(null); setM4Submitted(false); setM4Feedback(null);
            }} />
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

        {/* M3 - Curvas + Decisão: estimar t90 e ordem cinética */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Interpretação das Curvas de Degradação <ModuleBadge n={3} /></CardTitle></CardHeader>
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
                  </div>
                )}

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Interprete as curvas de degradação
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Identifique a ordem cinética observando o formato das curvas:</Label>
                    <RadioGroup value={userKineticOrder} onValueChange={setUserKineticOrder} disabled={m3Submitted} className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="zero" id="order-zero" />
                        <Label htmlFor="order-zero" className="text-xs cursor-pointer">Ordem zero (degradação linear)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="primeira" id="order-first" />
                        <Label htmlFor="order-first" className="text-xs cursor-pointer">Primeira ordem (degradação exponencial)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Estime o t90 (tempo até 90% do teor) para cada condição:</Label>
                    {curves.map(c => {
                      const options = generateT90Options(c.t90);
                      return (
                        <div key={c.conditionId} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-12">{c.temp}°C:</span>
                          <Select value={userT90Estimates[c.conditionId] || ""} onValueChange={v => setUserT90Estimates(prev => ({ ...prev, [c.conditionId]: v }))} disabled={m3Submitted}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="t90..." /></SelectTrigger>
                            <SelectContent>
                              {options.map(o => <SelectItem key={o} value={o}>{o} meses</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>

                  {!m3Submitted ? (
                    <Button
                      onClick={submitM3Decision}
                      disabled={!userKineticOrder || Object.keys(userT90Estimates).length < curves.length}
                      className="w-full"
                    >
                      Confirmar Interpretação
                    </Button>
                  ) : m3Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m3Feedback.orderCorrect} />
                        <span>Ordem cinética: você = "{userKineticOrder}" | real = <strong>"{m3Feedback.realOrder}"</strong></span>
                      </div>
                      {m3Feedback.t90Results.map(r => (
                        <div key={r.condId} className="flex items-center gap-2 text-xs">
                          <FeedbackIcon correct={r.correct} />
                          <span>t90 ({r.temp}°C): você = {r.userValue} meses | real = <strong>{r.real} meses</strong></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 - Arrhenius + Decisão: prazo de validade e ANVISA */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Prazo de Validade e Regulamentação <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!arrhenius ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Aguardando interpretação das curvas</div>
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

                {m3Feedback && m3Feedback.t90Results.some(r => !r.correct) && !m4Submitted && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                    ⚠️ Suas estimativas de t90 tiveram imprecisões. Use o gráfico de Arrhenius para refinar sua estimativa do prazo de validade a 25°C.
                  </div>
                )}

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Determine o prazo de validade e avalie conformidade regulatória
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Estime o prazo de validade a 25°C (extrapolação de Arrhenius):</Label>
                    <Select value={userShelfLife} onValueChange={setUserShelfLife} disabled={m4Submitted}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {shelfLifeOptions.map(o => <SelectItem key={o} value={o}>{o} meses</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Este produto atende o prazo mínimo regulatório de 24 meses (ANVISA/ICH)?</Label>
                    <RadioGroup value={userAnvisaDecision} onValueChange={setUserAnvisaDecision} disabled={m4Submitted} className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="atende" id="anvisa-sim" />
                        <Label htmlFor="anvisa-sim" className="text-xs cursor-pointer">Sim, atende o prazo mínimo de 24 meses</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="nao_atende" id="anvisa-nao" />
                        <Label htmlFor="anvisa-nao" className="text-xs cursor-pointer">Não atende — necessário reformulação ou embalagem protetora</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {!m4Submitted ? (
                    <Button onClick={submitM4Decision} disabled={!userShelfLife || !userAnvisaDecision} className="w-full">
                      Confirmar Avaliação
                    </Button>
                  ) : m4Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.shelfLifeCorrect} />
                        <span>Prazo de validade: você = {userShelfLife} meses | real = <strong>{m4Feedback.realShelfLife} meses</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.anvisaCorrect} />
                        <span>Conformidade ANVISA: {userAnvisaDecision === "atende" ? "Atende" : "Não atende"}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <strong className="text-foreground">Veredito:</strong> {m4Feedback.anvisaVerdict}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Estabilidade" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
