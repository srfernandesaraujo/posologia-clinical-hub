import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, AlertTriangle, CheckCircle, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";

interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; serumCreatinine: number; creatinineClearance: number };
  infection: string;
  currentPrescription: { drug: string; dose: number; interval: number; route: string };
  tdmResult: { troughLevel: number; peakLevel: number | null; unit: string };
  therapeuticRange: { troughMin: number; troughMax: number; peakMin: number | null; peakMax: number | null };
  expected: { newDose: number; newInterval: number; holdDose: boolean; justification: string };
  pharmacokineticData: { halfLife: number; vd: number; elimination: string };
}

const BUILT_IN: CaseData[] = [
  {
    title: "Caso 1: Vancomicina em Declínio Renal", difficulty: "Médio",
    patient: { name: "Antônio Carlos", age: 65, weight: 80, sex: "Masculino", serumCreatinine: 1.8, creatinineClearance: 46 },
    infection: "Bacteremia por MRSA",
    currentPrescription: { drug: "Vancomicina", dose: 1000, interval: 12, route: "IV" },
    tdmResult: { troughLevel: 28, peakLevel: null, unit: "mcg/mL" },
    therapeuticRange: { troughMin: 15, troughMax: 20, peakMin: null, peakMax: null },
    expected: { newDose: 1000, newInterval: 24, holdDose: true, justification: "Vancomicina é de eliminação exclusivamente renal. ClCr < 50 mL/min exige espaçamento do intervalo. Suspender próxima dose até nível < 20 mcg/mL, depois reiniciar 1000mg 24/24h." },
    pharmacokineticData: { halfLife: 12, vd: 0.7, elimination: "Renal (>90%)" },
  },
  {
    title: "Caso 2: Gentamicina e Acúmulo", difficulty: "Fácil",
    patient: { name: "Beatriz Souza", age: 40, weight: 60, sex: "Feminino", serumCreatinine: 0.9, creatinineClearance: 78 },
    infection: "Endocardite infecciosa (sinergismo)",
    currentPrescription: { drug: "Gentamicina", dose: 100, interval: 8, route: "IV" },
    tdmResult: { troughLevel: 2.5, peakLevel: 4.5, unit: "mcg/mL" },
    therapeuticRange: { troughMin: 0, troughMax: 1, peakMin: 3, peakMax: 5 },
    expected: { newDose: 100, newInterval: 12, holdDose: false, justification: "Pico adequado (4.5 mcg/mL): dose correta para eficácia. Vale alto (2.5 mcg/mL > 1): corpo não elimina antes da próxima dose. Aumentar intervalo para 12/12h mantém eficácia e reduz toxicidade." },
    pharmacokineticData: { halfLife: 2.5, vd: 0.25, elimination: "Renal (>95%)" },
  },
  {
    title: "Caso 3: Fenitoína - Cinética Não-Linear", difficulty: "Difícil",
    patient: { name: "Marcos Paulo", age: 50, weight: 70, sex: "Masculino", serumCreatinine: 1.0, creatinineClearance: 85 },
    infection: "Epilepsia - Controle de crises",
    currentPrescription: { drug: "Fenitoína", dose: 300, interval: 24, route: "VO" },
    tdmResult: { troughLevel: 28, peakLevel: null, unit: "mcg/mL" },
    therapeuticRange: { troughMin: 10, troughMax: 20, peakMin: null, peakMax: null },
    expected: { newDose: 265, newInterval: 24, holdDose: true, justification: "Fenitoína segue cinética não-linear (Michaelis-Menten). Enzimas hepáticas saturam rapidamente. Aumento de 50mg (250→300mg/dia) causou salto de 8→28 mcg/mL. Suspender 1-2 doses e reiniciar com redução mínima (260-270 mg/dia). Ajuste deve ser 'cirúrgico' (10-30mg)." },
    pharmacokineticData: { halfLife: 22, vd: 0.65, elimination: "Hepática (CYP2C9/2C19)" },
  },
];

function generateCurveData(dose: number, interval: number, halfLife: number, vd: number, weight: number, troughTarget: number) {
  const ke = 0.693 / halfLife;
  const vdTotal = vd * weight;
  const points: { time: number; concentration: number }[] = [];
  let accum = 0;
  for (let cycle = 0; cycle < 3; cycle++) {
    const cMax = accum + dose / vdTotal;
    for (let t = 0; t <= interval; t += 0.5) {
      const conc = cMax * Math.exp(-ke * t);
      points.push({ time: cycle * interval + t, concentration: Math.round(conc * 10) / 10 });
    }
    accum = cMax * Math.exp(-ke * interval);
  }
  return points;
}

export default function SimuladorTDM() {
  const { allCases, generateCase, isGenerating } = useSimulatorCases("tdm", BUILT_IN);
  const [screen, setScreen] = useState<"dashboard" | "sim" | "feedback">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);
  const [newDose, setNewDose] = useState("");
  const [newInterval, setNewInterval] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [expandedJust, setExpandedJust] = useState(false);

  const c = allCases[caseIdx] as CaseData | undefined;

  const start = (i: number) => { setCaseIdx(i); setNewDose(""); setNewInterval(""); setSubmitted(false); setExpandedJust(false); setScreen("sim"); };

  const currentCurve = useMemo(() => {
    if (!c) return [];
    return generateCurveData(c.currentPrescription.dose, c.currentPrescription.interval, c.pharmacokineticData.halfLife, c.pharmacokineticData.vd, c.patient.weight, c.therapeuticRange.troughMax);
  }, [c]);

  const newCurve = useMemo(() => {
    if (!c || !submitted || !newDose || !newInterval) return [];
    return generateCurveData(Number(newDose), Number(newInterval), c.pharmacokineticData.halfLife, c.pharmacokineticData.vd, c.patient.weight, c.therapeuticRange.troughMax);
  }, [c, submitted, newDose, newInterval]);

  const isCorrect = c && submitted ? Math.abs(Number(newDose) - c.expected.newDose) < 50 && Math.abs(Number(newInterval) - c.expected.newInterval) <= 6 : false;

  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold mb-2">Simulador TDM</h1><p className="text-muted-foreground">Monitoramento Terapêutico de Fármacos – Ajuste de doses de medicamentos de baixo índice terapêutico</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((cs: any, i: number) => (
            <Card key={cs.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => start(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between"><Badge variant={cs.difficulty === "Fácil" ? "secondary" : cs.difficulty === "Difícil" ? "destructive" : "default"}>{cs.difficulty}</Badge>{cs.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}</div>
                <CardTitle className="text-lg mt-2">{cs.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{cs.patient?.name} | {cs.currentPrescription?.drug}</p></CardContent>
            </Card>
          ))}
          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">{isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}<p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p></div>
          </Card>
        </div>
      </div>
    );
  }

  if (!c) return null;

  const troughStatus = c.tdmResult.troughLevel > c.therapeuticRange.troughMax ? "toxic" : c.tdmResult.troughLevel < c.therapeuticRange.troughMin ? "sub" : "ok";

  return (
    <div className="max-w-7xl mx-auto">
      <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      <h2 className="text-xl font-bold mb-4">{c.title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient & Labs */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Paciente &amp; Labs</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{c.patient.name}</strong>, {c.patient.age} anos, {c.patient.weight}kg, {c.patient.sex}</p>
            <p><strong>Infecção/Indicação:</strong> {c.infection}</p>
            <Separator />
            <p><strong>Creatinina:</strong> {c.patient.serumCreatinine} mg/dL</p>
            <p><strong>ClCr:</strong> {c.patient.creatinineClearance} mL/min</p>
            <Separator />
            <p className="font-medium">Prescrição Atual:</p>
            <p>{c.currentPrescription.drug} {c.currentPrescription.dose}mg {c.currentPrescription.route} {c.currentPrescription.interval}/{c.currentPrescription.interval}h</p>
            <Separator />
            <div className={`p-3 rounded-lg ${troughStatus === "toxic" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : troughStatus === "sub" ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${troughStatus === "toxic" ? "text-red-600 dark:text-red-400" : troughStatus === "sub" ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`} />
                <span className={`font-medium text-sm ${troughStatus === "toxic" ? "text-red-800 dark:text-red-200" : troughStatus === "sub" ? "text-yellow-800 dark:text-yellow-200" : "text-green-800 dark:text-green-200"}`}>Nível de Vale: {String(c.tdmResult.troughLevel)} {String(c.tdmResult.unit)}</span>
              </div>
              <p className={`text-xs mt-1 ${troughStatus === "toxic" ? "text-red-700 dark:text-red-300" : troughStatus === "sub" ? "text-yellow-700 dark:text-yellow-300" : "text-green-700 dark:text-green-300"}`}>Alvo: {String(c.therapeuticRange.troughMin)}-{String(c.therapeuticRange.troughMax)} {String(c.tdmResult.unit)}</p>
              {c.tdmResult.peakLevel && <p className={`text-xs ${troughStatus === "toxic" ? "text-red-700 dark:text-red-300" : troughStatus === "sub" ? "text-yellow-700 dark:text-yellow-300" : "text-green-700 dark:text-green-300"}`}>Pico: {String(c.tdmResult.peakLevel)} {String(c.tdmResult.unit)} (Alvo: {String(c.therapeuticRange.peakMin)}-{String(c.therapeuticRange.peakMax)})</p>}
            </div>
            <p className="text-xs text-muted-foreground"><strong>Meia-vida:</strong> {c.pharmacokineticData.halfLife}h | <strong>Vd:</strong> {c.pharmacokineticData.vd} L/kg | <strong>Eliminação:</strong> {c.pharmacokineticData.elimination}</p>
          </CardContent>
        </Card>

        {/* Graph */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Curva Concentração x Tempo</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" type="number" domain={[0, "auto"]} label={{ value: "Tempo (h)", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: c.tdmResult.unit, angle: -90, position: "insideLeft" }} />
                  <ReferenceArea y1={c.therapeuticRange.troughMin} y2={c.therapeuticRange.troughMax} fill="#22c55e" fillOpacity={0.15} />
                  <ReferenceLine y={c.therapeuticRange.troughMax} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Máx: ${c.therapeuticRange.troughMax}`, position: "right", fontSize: 10 }} />
                  <ReferenceLine y={c.therapeuticRange.troughMin} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Mín: ${c.therapeuticRange.troughMin}`, position: "right", fontSize: 10 }} />
                  <Line data={currentCurve} dataKey="concentration" stroke="#ef4444" strokeWidth={2} dot={false} name="Atual" />
                  {submitted && newCurve.length > 0 && <Line data={newCurve} dataKey="concentration" stroke="#3b82f6" strokeWidth={2} dot={false} name="Novo" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 text-xs"><span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-500" />Atual</span>{submitted && <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500" />Novo esquema</span>}<span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded" />Janela terapêutica</span></div>
          </CardContent>
        </Card>

        {/* Adjustment panel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ajuste Posológico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nova Dose (mg)</Label><Input type="number" value={newDose} onChange={e => setNewDose(e.target.value)} placeholder="Ex: 1000" /></div>
            <div>
              <Label>Novo Intervalo (h)</Label>
              <Select value={newInterval} onValueChange={setNewInterval}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{[6, 8, 12, 24, 36, 48].map(h => <SelectItem key={h} value={String(h)}>{h}h</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => setSubmitted(true)} disabled={!newDose || !newInterval} className="w-full">Aplicar Novo Esquema</Button>
            {submitted && (
              <div className={`p-3 rounded-lg ${isCorrect ? "bg-green-50 dark:bg-green-950/30 border border-green-200" : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200"}`}>
                <div className="flex items-center gap-2">{isCorrect ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-orange-600" />}<span className="font-medium text-sm">{isCorrect ? "Ajuste adequado!" : "Ajuste pode ser melhorado"}</span></div>
                <p className="text-xs mt-1">Esperado: {c.expected.newDose}mg {c.expected.newInterval}/{c.expected.newInterval}h</p>
                <div className="mt-2">
                  <button className="text-xs text-primary flex items-center gap-1" onClick={() => setExpandedJust(!expandedJust)}>{expandedJust ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Justificativa</button>
                  {expandedJust && <p className="text-xs mt-2 text-muted-foreground">{c.expected.justification}</p>}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => { setNewDose(""); setNewInterval(""); setSubmitted(false); }}>Novo Ajuste</Button>
              <Button variant="outline" size="sm" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
