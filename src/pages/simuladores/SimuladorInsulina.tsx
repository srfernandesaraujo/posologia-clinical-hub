import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Loader2, BrainCircuit, Apple, Dumbbell, FileText, AlertTriangle } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatientData {
  name: string; age: number; weight: number; sex: string; diagnosis: string;
  hba1c: number; fastingGlucose: number; bp: string;
  lipidProfile: { ldl: number; hdl: number; tg: number }; clinicalSummary: string;
}
interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: PatientData; glycemicProfile: number[]; initialTDD: number;
}

const DEFAULT_PATIENT: PatientData = {
  name: "A.H.", age: 42, weight: 70, sex: "Masculino", diagnosis: "DM1",
  hba1c: 9.2, fastingGlucose: 210, bp: "130/85 mmHg",
  lipidProfile: { ldl: 145, hdl: 42, tg: 220 },
  clinicalSummary: "Paciente com DM1, controle glicêmico inadequado, com múltiplas hiperglicemias diárias. Relata dificuldade de adesão ao esquema anterior."
};

const BUILT_IN: CaseData[] = [{
  title: "Caso 1: DM1 - Controle Inadequado", difficulty: "Médio",
  patient: DEFAULT_PATIENT,
  glycemicProfile: [180, 250, 200, 160],
  initialTDD: Math.round(0.45 * 70),
}];

const TIMES = ["07:00", "12:00", "17:00", "23:00"];

type Regime = "basal-bolus" | "split-mixed" | "basal-unico";
type BasalType = "Glargina" | "NPH" | "Detemir" | "Degludeca";
type PrandialType = "Lispro" | "Aspart" | "Regular" | "Glulisina";

interface LogEntry { timestamp: string; action: string; before: string; after: string }

function calcICR(tdd: number, isAnalog: boolean) { return Math.round((isAnalog ? 500 : 450) / tdd); }
function calcISF(tdd: number, isAnalog: boolean) { return Math.round((isAnalog ? 1700 : 1500) / tdd); }
function estimateA1c(glycemics: number[]) { const avg = glycemics.reduce((a, b) => a + b, 0) / glycemics.length; return Math.round(((avg + 46.7) / 28.7) * 10) / 10; }

export default function SimuladorInsulina() {
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("insulina", BUILT_IN);
  const [screen, setScreen] = useState<"dashboard" | "prontuario" | "prescricao" | "painel">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);

  // Prescription state
  const [regime, setRegime] = useState<Regime>("basal-bolus");
  const [basalType, setBasalType] = useState<BasalType>("Glargina");
  const [prandialType, setPrandialType] = useState<PrandialType>("Lispro");
  const [tdd, setTdd] = useState(0);
  const [basalPct, setBasalPct] = useState(50);
  const [glycemics, setGlycemics] = useState<number[]>([180, 250, 200, 160]);
  const [log, setLog] = useState<LogEntry[]>([]);

  // Preceptor modal
  const [preceptorOpen, setPreceptorOpen] = useState(false);
  const [preceptorJustification, setPreceptorJustification] = useState("");
  const [preceptorFeedback, setPreceptorFeedback] = useState("");
  const [preceptorLoading, setPreceptorLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState<(() => void) | null>(null);

  const c = allCases[caseIdx] as CaseData | undefined;

  const start = (i: number) => {
    setCaseIdx(i);
    const cs = allCases[i] as CaseData;
    setTdd(cs?.initialTDD || 32);
    setGlycemics(cs?.glycemicProfile || [180, 250, 200, 160]);
    setBasalPct(50); setRegime("basal-bolus"); setBasalType("Glargina"); setPrandialType("Lispro");
    setLog([]); setScreen("prontuario");
  };

  const isAnalog = prandialType !== "Regular";
  const icr = calcICR(tdd, isAnalog);
  const isf = calcISF(tdd, isAnalog);
  const basalDose = Math.round(tdd * basalPct / 100);
  const bolusDose = tdd - basalDose;
  const hba1c = estimateA1c(glycemics);

  const addLog = (action: string, before: string, after: string) => {
    setLog(p => [{ timestamp: new Date().toLocaleTimeString(), action, before, after }, ...p]);
  };

  const requestPreceptor = (changeFn: () => void) => {
    setPendingChange(() => changeFn);
    setPreceptorJustification(""); setPreceptorFeedback(""); setPreceptorOpen(true);
  };

  const submitPreceptor = async () => {
    setPreceptorLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-case", {
        body: { simulator_slug: "__preceptor", preceptor: true, context: JSON.stringify({
          patient: c?.patient, glycemics, tdd, regime, basalPct, icr, isf, hba1c, justification: preceptorJustification,
        }) },
      });
      // If the edge function doesn't support preceptor mode, use a fallback
      if (error || data?.error) {
        setPreceptorFeedback("Considere: como essa mudança afeta o equilíbrio entre a insulina basal e os bolus prandiais? O perfil glicêmico sugere que o principal problema é pré ou pós-prandial?");
      } else {
        setPreceptorFeedback(data?.case?.case_data?.feedback || "Reflita sobre o impacto desta mudança nos picos glicêmicos observados.");
      }
    } catch {
      setPreceptorFeedback("Analise: em qual horário há maior descontrole? Sua proposta atua nesse período específico?");
    }
    setPreceptorLoading(false);
  };

  const confirmPreceptor = () => {
    if (pendingChange) pendingChange();
    setPreceptorOpen(false);
  };

  const applyMeal = (timeIdx: number) => {
    const idealBolus = 45 / icr; // assume 45g CHO
    const diff = (Math.random() - 0.3) * 40;
    const newG = [...glycemics];
    const old = newG[timeIdx];
    newG[timeIdx] = Math.max(70, Math.round(old + diff));
    setGlycemics(newG);
    addLog("Refeição", `Glicemia ${TIMES[timeIdx]}: ${old}`, `→ ${newG[timeIdx]} mg/dL`);
  };

  const applyExercise = () => {
    const newG = glycemics.map(g => Math.max(70, Math.round(g - 35)));
    addLog("Exercício", `Perfil: ${glycemics.join(", ")}`, `→ ${newG.join(", ")}`);
    setGlycemics(newG);
  };

  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><BrainCircuit className="h-7 w-7 cursor-pointer" onClick={() => setScreen("dashboard")} />Simulador de Dose de Insulina</h1><p className="text-muted-foreground">Treinamento de insulinoterapia intensiva (Koda-Kimble)</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((cs: any, i: number) => (
            <Card key={cs.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => start(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={cs.difficulty === "Fácil" ? "secondary" : cs.difficulty === "Difícil" ? "destructive" : "default"}>{cs.difficulty}</Badge>
                  <div className="flex items-center gap-1">
                    {cs.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                    <AdminCaseActions caseItem={cs} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{cs.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{cs.patient?.name}, {cs.patient?.age} anos – {cs.patient?.diagnosis}</p></CardContent>
            </Card>
          ))}
          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">{isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}<p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p></div>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-8">Applied Therapeutics • Sergio Araujo</p>
      </div>
    );
  }

  if (!c) return null;

  if (screen === "prontuario") {
    const p = c.patient;
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <Card>
          <CardHeader><CardTitle>Prontuário de Admissão</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>Paciente:</strong> {p.name}, {p.age} anos, {p.sex}, {p.weight}kg</p>
            <p><strong>Diagnóstico:</strong> {p.diagnosis}</p>
            <Separator />
            <p><strong>HbA1c:</strong> {p.hba1c}% | <strong>Glicemia Jejum:</strong> {p.fastingGlucose} mg/dL</p>
            <p><strong>PA:</strong> {p.bp} | <strong>LDL:</strong> {p.lipidProfile.ldl} | <strong>HDL:</strong> {p.lipidProfile.hdl} | <strong>TG:</strong> {p.lipidProfile.tg}</p>
            <Separator />
            <p>{p.clinicalSummary}</p>
            <p className="text-muted-foreground"><strong>TDD sugerida (0,45 U/kg):</strong> {c.initialTDD} U</p>
          </CardContent>
        </Card>
        <Button className="w-full mt-4" onClick={() => setScreen("prescricao")}>Avançar para Prescrição →</Button>
        <p className="text-xs text-muted-foreground text-center mt-4">Applied Therapeutics • Sergio Araujo</p>
      </div>
    );
  }

  if (screen === "prescricao") {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setScreen("prontuario")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <Card>
          <CardHeader><CardTitle>Prescrição Farmacológica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Regime:</Label>
              <Select value={regime} onValueChange={v => setRegime(v as Regime)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="basal-bolus">Basal-Bolus</SelectItem><SelectItem value="split-mixed">Split-Mixed</SelectItem><SelectItem value="basal-unico">Basal Único</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Insulina Basal:</Label>
                <Select value={basalType} onValueChange={v => setBasalType(v as BasalType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Glargina", "NPH", "Detemir", "Degludeca"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {regime !== "basal-unico" && (
                <div><Label>Insulina Prandial:</Label>
                  <Select value={prandialType} onValueChange={v => setPrandialType(v as PrandialType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Lispro", "Aspart", "Regular", "Glulisina"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div><Label>Dose Total Diária (TDD): {tdd} U</Label><Input type="number" value={tdd} onChange={e => setTdd(Number(e.target.value))} /></div>
            <div><Label>Distribuição Basal: {basalPct}%</Label><Input type="range" min={20} max={80} value={basalPct} onChange={e => setBasalPct(Number(e.target.value))} /><p className="text-xs text-muted-foreground">Basal: {basalDose}U | Bolus: {bolusDose}U</p></div>
          </CardContent>
        </Card>
        <Button className="w-full mt-4" onClick={() => setScreen("painel")}>Iniciar Dashboard →</Button>
        <p className="text-xs text-muted-foreground text-center mt-4">Applied Therapeutics • Sergio Araujo</p>
      </div>
    );
  }

  // Dashboard panel
  const targetMin = 70; const targetMax = 180;
  const chartData = TIMES.map((t, i) => ({ time: t, value: glycemics[i] }));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => setScreen("prescricao")}><ArrowLeft className="h-4 w-4 mr-2" />Prescrição</Button>
        <BrainCircuit className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setScreen("dashboard")} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Glycemic Profile */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Perfil Glicêmico de 4 Pontos</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" /><YAxis domain={[40, 350]} />
                  <ReferenceArea y1={targetMin} y2={targetMax} fill="#22c55e" fillOpacity={0.1} />
                  <ReferenceLine y={targetMax} stroke="#22c55e" strokeDasharray="3 3" />
                  <ReferenceLine y={targetMin} stroke="#eab308" strokeDasharray="3 3" />
                  <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {TIMES.map((t, i) => (
                <Button key={t} variant="outline" size="sm" onClick={() => applyMeal(i)}><Apple className="h-3 w-3 mr-1" />Refeição {t}</Button>
              ))}
              <Button variant="outline" size="sm" onClick={applyExercise}><Dumbbell className="h-3 w-3 mr-1" />Exercício</Button>
            </div>
          </CardContent>
        </Card>

        {/* Metas & Protocol */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Metas</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span>HbA1c estimada</span><span className={`font-bold ${hba1c <= 7 ? "text-green-600" : "text-red-600"}`}>{String(hba1c)}%</span></div>
              <div className="flex justify-between"><span>Glicemia média</span><span>{String(Math.round(glycemics.reduce((a, b) => a + b, 0) / 4))} mg/dL</span></div>
              <div className="flex justify-between"><span>PA</span><span>{c.patient.bp}</span></div>
              <div className="flex justify-between"><span>LDL</span><span>{String(c.patient.lipidProfile.ldl)} mg/dL</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Protocolo Ativo</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Regime:</strong> {regime}</p>
              <p><strong>TDD:</strong> {String(tdd)}U (Basal {String(basalDose)}U + Bolus {String(bolusDose)}U)</p>
              <p><strong>ICR:</strong> 1:{String(icr)} (1U para cada {String(icr)}g CHO)</p>
              <p><strong>ISF:</strong> 1:{String(isf)} (1U reduz {String(isf)} mg/dL)</p>
              <Separator />
              <div className="space-y-2 mt-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => requestPreceptor(() => { const old = tdd; setTdd(tdd + 2); addLog("Ajuste TDD", `${old}U`, `${old + 2}U`); })}>↑ Aumentar TDD (+2U)</Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => requestPreceptor(() => { const old = tdd; setTdd(Math.max(4, tdd - 2)); addLog("Ajuste TDD", `${old}U`, `${Math.max(4, old - 2)}U`); })}>↓ Reduzir TDD (-2U)</Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => requestPreceptor(() => { const old = basalPct; setBasalPct(Math.min(80, basalPct + 5)); addLog("Redistribuição", `Basal ${old}%`, `Basal ${Math.min(80, old + 5)}%`); })}>↑ Mais Basal (+5%)</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Diário de Bordo</CardTitle></CardHeader>
            <CardContent className="max-h-[200px] overflow-y-auto">
              {log.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma ação registrada.</p> : log.map((l, i) => (
                <div key={i} className="text-xs py-1 border-b last:border-0"><span className="text-muted-foreground">{l.timestamp}</span> <strong>{l.action}</strong>: {l.before} {l.after}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preceptor Modal */}
      <Dialog open={preceptorOpen} onOpenChange={setPreceptorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" />Parecer Clínico – Preceptor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Justificativa para a mudança:</Label><Textarea value={preceptorJustification} onChange={e => setPreceptorJustification(e.target.value)} rows={3} placeholder="Explique seu raciocínio clínico..." /></div>
            {!preceptorFeedback && <Button onClick={submitPreceptor} disabled={!preceptorJustification || preceptorLoading}>{preceptorLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enviar para Preceptor</Button>}
            {preceptorFeedback && (
              <div className="p-3 rounded-lg bg-muted border"><p className="text-sm font-medium mb-1 flex items-center gap-1"><BrainCircuit className="h-4 w-4" />Feedback Socrático:</p><p className="text-sm">{preceptorFeedback}</p></div>
            )}
          </div>
          <DialogFooter>{preceptorFeedback && <Button onClick={confirmPreceptor}>Aplicar Mudança</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center mt-6">Applied Therapeutics • Sergio Araujo</p>
    </div>
  );
}
