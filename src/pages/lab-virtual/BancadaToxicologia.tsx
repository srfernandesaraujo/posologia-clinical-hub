import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Skull, Lock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const SUBSTANCES = [
  { id: "paracetamol", name: "Paracetamol", hillN: 3.5, ld50: 2000, ed50: 15, unit: "mg/kg", mechanism: "Hepatotoxicidade por NAPQI (metabólito reativo via CYP2E1)", clinical: "Analgésico/antipirético de venda livre" },
  { id: "digoxina", name: "Digoxina", hillN: 2.0, ld50: 25, ed50: 0.8, unit: "mg/kg", mechanism: "Inibição da Na+/K+-ATPase → arritmias cardíacas", clinical: "Glicosídeo cardíaco para IC e FA" },
  { id: "warfarina", name: "Warfarina", hillN: 1.8, ld50: 320, ed50: 5, unit: "mg/kg", mechanism: "Inibição da vitamina K epóxido redutase → hemorragia", clinical: "Anticoagulante oral" },
  { id: "litio", name: "Carbonato de Lítio", hillN: 2.5, ld50: 530, ed50: 20, unit: "mg/kg", mechanism: "Nefrotoxicidade, neurotoxicidade, hipotireoidismo", clinical: "Estabilizador de humor" },
  { id: "cafeina", name: "Cafeína", hillN: 2.2, ld50: 192, ed50: 3, unit: "mg/kg", mechanism: "Antagonismo de adenosina → arritmias, convulsões em sobredose", clinical: "Estimulante do SNC" },
  { id: "etanol", name: "Etanol", hillN: 1.5, ld50: 7060, ed50: 500, unit: "mg/kg", mechanism: "Depressão do SNC, hepatotoxicidade crônica", clinical: "Substância recreacional" },
];

const ANIMAL_MODELS = [
  { id: "rato", name: "Rato Wistar", factor: 1.0 },
  { id: "camundongo", name: "Camundongo Swiss", factor: 0.85 },
  { id: "coelho", name: "Coelho Nova Zelândia", factor: 1.2 },
];

function hillEquation(dose: number, ec50: number, n: number): number {
  if (dose <= 0) return 0;
  return (Math.pow(dose, n) / (Math.pow(ec50, n) + Math.pow(dose, n))) * 100;
}

function classifyToxicity(ld50: number) {
  if (ld50 <= 5) return { class: "1", category: "Extremamente tóxico", color: "hsl(0 72% 40%)" };
  if (ld50 <= 50) return { class: "2", category: "Altamente tóxico", color: "hsl(0 72% 51%)" };
  if (ld50 <= 500) return { class: "3", category: "Moderadamente tóxico", color: "hsl(25 95% 53%)" };
  if (ld50 <= 5000) return { class: "4", category: "Levemente tóxico", color: "hsl(45 93% 47%)" };
  return { class: "5", category: "Praticamente não tóxico", color: "hsl(142 71% 45%)" };
}

// Generate ED50/LD50 estimate options based on actual values with distractors
function generateEstimateOptions(realValue: number): { label: string; value: string }[] {
  const magnitude = Math.pow(10, Math.floor(Math.log10(realValue)));
  const normalized = realValue / magnitude;
  const options = new Set<number>();
  options.add(realValue);
  // Add distractors
  options.add(parseFloat((normalized * 0.3 * magnitude).toFixed(1)));
  options.add(parseFloat((normalized * 0.6 * magnitude).toFixed(1)));
  options.add(parseFloat((normalized * 1.5 * magnitude).toFixed(1)));
  options.add(parseFloat((normalized * 2.5 * magnitude).toFixed(1)));
  const sorted = Array.from(options).sort((a, b) => a - b).slice(0, 5);
  return sorted.map(v => ({ label: `${v}`, value: String(v) }));
}

const TOXICITY_CLASSES = [
  { value: "1", label: "Classe 1 – Extremamente tóxico (≤5 mg/kg)" },
  { value: "2", label: "Classe 2 – Altamente tóxico (5–50 mg/kg)" },
  { value: "3", label: "Classe 3 – Moderadamente tóxico (50–500 mg/kg)" },
  { value: "4", label: "Classe 4 – Levemente tóxico (500–5000 mg/kg)" },
  { value: "5", label: "Classe 5 – Praticamente não tóxico (>5000 mg/kg)" },
];

export default function BancadaToxicologia() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("toxicologia");
  const startTimeRef = useRef(Date.now());

  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [substance, setSubstance] = useState("paracetamol");
  const [nPoints, setNPoints] = useState([20]);
  const [animalModel, setAnimalModel] = useState("rato");
  const [doseResponse, setDoseResponse] = useState<any[] | null>(null);
  const [customSubstance, setCustomSubstance] = useState<typeof SUBSTANCES[0] | null>(null);
  const allSubstances = useMemo(() => [...SUBSTANCES, ...(customSubstance ? [customSubstance] : [])], [customSubstance]);

  // M3 decision state
  const [userED50Estimate, setUserED50Estimate] = useState<string>("");
  const [userLD50Estimate, setUserLD50Estimate] = useState<string>("");
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{ ed50Correct: boolean; ld50Correct: boolean; realED50: number; realLD50: number } | null>(null);

  // M4 decision state
  const [userToxClass, setUserToxClass] = useState<string>("");
  const [userITSafe, setUserITSafe] = useState<string>("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{
    classCorrect: boolean; itCorrect: boolean;
    realClass: string; realCategory: string;
    realIT: number; itVerdict: string;
  } | null>(null);

  const sub = allSubstances.find((s) => s.id === substance) ?? SUBSTANCES[0];
  const model = ANIMAL_MODELS.find((m) => m.id === animalModel)!;
  const adjustedLD50 = sub.ld50 * model.factor;
  const adjustedED50 = sub.ed50 * model.factor;

  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmSubstance = () => {
    setCompletedModules(new Set([1]));
    setDoseResponse(null);
    setM3Submitted(false); setM3Feedback(null); setUserED50Estimate(""); setUserLD50Estimate("");
    setM4Submitted(false); setM4Feedback(null); setUserToxClass(""); setUserITSafe("");
  };

  const administerDoses = () => {
    const maxDose = adjustedLD50 * 3;
    const data = [];
    for (let i = 0; i <= nPoints[0]; i++) {
      const dose = (maxDose / nPoints[0]) * i;
      data.push({ dose: parseFloat(dose.toFixed(2)), efeito: parseFloat(hillEquation(dose, adjustedED50, sub.hillN).toFixed(1)), mortalidade: parseFloat(hillEquation(dose, adjustedLD50, sub.hillN).toFixed(1)) });
    }
    setDoseResponse(data);
    setM3Submitted(false); setM3Feedback(null); setUserED50Estimate(""); setUserLD50Estimate("");
    setM4Submitted(false); setM4Feedback(null); setUserToxClass(""); setUserITSafe("");
    completeModule(2);
  };

  // M3 decision: estimate ED50/LD50
  const ed50Options = useMemo(() => generateEstimateOptions(parseFloat(adjustedED50.toFixed(1))), [adjustedED50]);
  const ld50Options = useMemo(() => generateEstimateOptions(parseFloat(adjustedLD50.toFixed(1))), [adjustedLD50]);

  const submitM3Decision = () => {
    const realED50 = parseFloat(adjustedED50.toFixed(1));
    const realLD50 = parseFloat(adjustedLD50.toFixed(1));
    const userED = parseFloat(userED50Estimate);
    const userLD = parseFloat(userLD50Estimate);
    // Accept if within 30% of real value
    const ed50Correct = Math.abs(userED - realED50) / realED50 <= 0.35;
    const ld50Correct = Math.abs(userLD - realLD50) / realLD50 <= 0.35;
    setM3Feedback({ ed50Correct, ld50Correct, realED50, realLD50 });
    setM3Submitted(true);
    completeModule(3);
  };

  // M4 decision: classify toxicity + IT safety
  const submitM4Decision = () => {
    const realClass = classifyToxicity(adjustedLD50);
    const realIT = adjustedLD50 / adjustedED50;
    const itSafe = realIT >= 10 ? "ampla" : realIT >= 2 ? "estreita" : "inseguro";
    const classCorrect = userToxClass === realClass.class;
    const itCorrect = userITSafe === itSafe;
    const itVerdict = realIT >= 10
      ? `Margem de segurança ampla (IT = ${realIT.toFixed(1)}).`
      : realIT >= 2
      ? `Margem de segurança estreita (IT = ${realIT.toFixed(1)}). Monitoramento recomendado.`
      : `IT perigosamente baixo (IT = ${realIT.toFixed(1)}). Risco de toxicidade grave.`;
    setM4Feedback({ classCorrect, itCorrect, realClass: realClass.class, realCategory: realClass.category, realIT, itVerdict });
    setM4Submitted(true);
    completeModule(4);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {req} para desbloquear</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    : <XCircle className="h-4 w-4 text-destructive shrink-0" />;

  const experimentSummary: Record<string, string> = {
    Substância: sub.name, Modelo: model.name, "Nº de doses": String(nPoints[0]),
  };
  if (m3Feedback) {
    experimentSummary["LD50 (real)"] = `${m3Feedback.realLD50} ${sub.unit}`;
    experimentSummary["ED50 (real)"] = `${m3Feedback.realED50} ${sub.unit}`;
  }
  if (m4Feedback) {
    experimentSummary["IT"] = m4Feedback.realIT.toFixed(1);
    experimentSummary["Classificação"] = `${m4Feedback.realCategory} (Classe ${m4Feedback.realClass})`;
  }

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Substância", userChoice: sub.name, correct: true },
      { label: "Modelo animal", userChoice: model.name, correct: true },
      { label: "Nº de doses", userChoice: String(nPoints[0]), correct: nPoints[0] >= 15 },
    ];
    if (m3Feedback) {
      decisions.push(
        { label: "Estimativa ED50", userChoice: userED50Estimate, correct: m3Feedback.ed50Correct, idealChoice: String(m3Feedback.realED50) },
        { label: "Estimativa LD50", userChoice: userLD50Estimate, correct: m3Feedback.ld50Correct, idealChoice: String(m3Feedback.realLD50) },
      );
    }
    if (m4Feedback) {
      decisions.push(
        { label: "Classificação Hodge & Sterner", userChoice: `Classe ${userToxClass}`, correct: m4Feedback.classCorrect, idealChoice: `Classe ${m4Feedback.realClass}` },
        { label: "Avaliação do IT", userChoice: userITSafe, correct: m4Feedback.itCorrect, idealChoice: m4Feedback.realIT >= 10 ? "ampla" : m4Feedback.realIT >= 2 ? "estreita" : "inseguro" },
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Skull className="h-7 w-7 text-primary" /> Bancada de Toxicologia</h1>
          <p className="text-sm text-muted-foreground">Curvas dose-resposta, LD50/ED50 e índice terapêutico</p>
        </div>
        <AdminPromptViewer toolSlug={LAB_SYSTEM_PROMPTS.toxicologia.slug} toolName={LAB_SYSTEM_PROMPTS.toxicologia.name} toolType="laboratory" prompt={LAB_SYSTEM_PROMPTS.toxicologia.prompt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção da Substância <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Substância</label>
              <Select value={substance} onValueChange={setSubstance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allSubstances.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Uso clínico:</strong> {sub.clinical}</p>
              <p><strong>Mecanismo de toxicidade:</strong> {sub.mechanism}</p>
            </div>
            <Button onClick={confirmSubstance} className="w-full">Confirmar Substância</Button>
            <AIContextGenerator labType="toxicologia" onContextGenerated={(data: any) => { setCustomSubstance(data.substance); setSubstance(data.substance.id); setCompletedModules(new Set([1])); setDoseResponse(null); setM3Submitted(false); setM3Feedback(null); setM4Submitted(false); setM4Feedback(null); }} />
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Desenho do Ensaio <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Modelo animal</label>
              <Select value={animalModel} onValueChange={setAnimalModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANIMAL_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Número de doses: {nPoints[0]}</label>
              <Slider value={nPoints} onValueChange={setNPoints} min={10} max={50} step={5} className="mt-2" />
            </div>
            <p className="text-[10px] text-muted-foreground">Fator de correção para {model.name}: ×{model.factor}</p>
            <Button onClick={administerDoses} className="w-full">Administrar Doses</Button>
          </CardContent>
        </Card>

        {/* M3 - Curvas + Decisão de estimativa ED50/LD50 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Interpretação das Curvas Dose-Resposta <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!doseResponse ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando administração de doses</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={doseResponse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dose" label={{ value: `Dose (${sub.unit})`, position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} label={{ value: "Resposta (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.4} label={{ value: "50%", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Line type="monotone" dataKey="efeito" stroke="hsl(142 71% 45%)" name="Efeito Terapêutico" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="mortalidade" stroke="hsl(0 72% 51%)" name="Mortalidade" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Estime os parâmetros a partir do gráfico
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Estimativa do ED50 (dose para 50% de efeito terapêutico):</Label>
                      <Select value={userED50Estimate} onValueChange={setUserED50Estimate} disabled={m3Submitted}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a faixa..." /></SelectTrigger>
                        <SelectContent>
                          {ed50Options.map(o => <SelectItem key={o.value} value={o.value}>{o.label} {sub.unit}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Estimativa do LD50 (dose para 50% de mortalidade):</Label>
                      <Select value={userLD50Estimate} onValueChange={setUserLD50Estimate} disabled={m3Submitted}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a faixa..." /></SelectTrigger>
                        <SelectContent>
                          {ld50Options.map(o => <SelectItem key={o.value} value={o.value}>{o.label} {sub.unit}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!m3Submitted ? (
                    <Button onClick={submitM3Decision} disabled={!userED50Estimate || !userLD50Estimate} className="w-full">
                      Confirmar Estimativas
                    </Button>
                  ) : m3Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m3Feedback.ed50Correct} />
                        <span>ED50: sua estimativa = {userED50Estimate}, valor real = <strong>{m3Feedback.realED50} {sub.unit}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m3Feedback.ld50Correct} />
                        <span>LD50: sua estimativa = {userLD50Estimate}, valor real = <strong>{m3Feedback.realLD50} {sub.unit}</strong></span>
                      </div>
                      {(!m3Feedback.ed50Correct || !m3Feedback.ld50Correct) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Dica: A linha de 50% no gráfico indica onde cada curva cruza para encontrar o ED50 (verde) e LD50 (vermelha).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 - Classificação toxicológica + IT (decisão) */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Classificação e Índice Terapêutico <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!m3Feedback ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando interpretação das curvas</div>
            ) : (
              <div className="space-y-4">
                {/* Context from M3: show the real values */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">LD50 (confirmado)</p>
                    <p className="text-lg font-bold">{m3Feedback.realLD50}</p>
                    <p className="text-[10px] text-muted-foreground">{sub.unit}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">ED50 (confirmado)</p>
                    <p className="text-lg font-bold">{m3Feedback.realED50}</p>
                    <p className="text-[10px] text-muted-foreground">{sub.unit}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">IT = LD50/ED50</p>
                    <p className="text-lg font-bold">?</p>
                    <p className="text-[10px] text-muted-foreground">Determine abaixo</p>
                  </div>
                </div>

                {m3Feedback && !m3Feedback.ed50Correct && !m4Submitted && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                    ⚠️ Sua estimativa de ED50 no módulo anterior foi imprecisa. Isso pode afetar seu raciocínio sobre o IT. Considere os valores reais confirmados acima.
                  </div>
                )}

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Classifique e avalie a segurança
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Classificação de Hodge & Sterner (baseada no LD50 de {m3Feedback.realLD50} {sub.unit}):</Label>
                    <RadioGroup value={userToxClass} onValueChange={setUserToxClass} disabled={m4Submitted} className="mt-2 space-y-1">
                      {TOXICITY_CLASSES.map(tc => (
                        <div key={tc.value} className="flex items-center gap-2">
                          <RadioGroupItem value={tc.value} id={`tox-${tc.value}`} />
                          <Label htmlFor={`tox-${tc.value}`} className="text-xs cursor-pointer">{tc.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">O Índice Terapêutico indica que esta substância é:</Label>
                    <RadioGroup value={userITSafe} onValueChange={setUserITSafe} disabled={m4Submitted} className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="ampla" id="it-ampla" />
                        <Label htmlFor="it-ampla" className="text-xs cursor-pointer">Margem de segurança ampla (IT ≥ 10)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="estreita" id="it-estreita" />
                        <Label htmlFor="it-estreita" className="text-xs cursor-pointer">Margem de segurança estreita (2 ≤ IT &lt; 10)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="inseguro" id="it-inseguro" />
                        <Label htmlFor="it-inseguro" className="text-xs cursor-pointer">Inseguro para uso clínico (IT &lt; 2)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {!m4Submitted ? (
                    <Button onClick={submitM4Decision} disabled={!userToxClass || !userITSafe} className="w-full">
                      Confirmar Classificação
                    </Button>
                  ) : m4Feedback && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.classCorrect} />
                        <span>
                          Classificação: sua escolha = Classe {userToxClass}, correta = <strong>Classe {m4Feedback.realClass} ({m4Feedback.realCategory})</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.itCorrect} />
                        <span>
                          IT: sua avaliação = "{userITSafe}", IT real = <strong>{m4Feedback.realIT.toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <strong className="text-foreground">Veredito:</strong> {m4Feedback.itVerdict}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Toxicologia" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
