import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Loader2, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";

interface LabItem { name: string; value: number; unit: string; target: string; status: "normal" | "high" | "low" }
interface DrugRx { drug: string; dose: string; frequency: string }
interface ExpectedAction { drug: string; action: "manter" | "aumentar" | "reduzir" | "suspender" | "adicionar"; newDose?: string | null; justification: string }
interface Consultation { month: number; symptoms: string; labs: LabItem[]; currentPrescription: DrugRx[]; expected: { actions: ExpectedAction[] } }
interface CaseData { id?: string; title: string; difficulty: string; isAI?: boolean; patient: { name: string; age: number; diagnoses: string[] }; consultations: Consultation[] }

const BUILT_IN: CaseData[] = [
  {
    title: "Caso 1: DM2 e Dislipidemia", difficulty: "Médio",
    patient: { name: "Roberto", age: 58, diagnoses: ["DM2 recém-descoberto", "Dislipidemia mista"] },
    consultations: [
      { month: 0, symptoms: "Assintomático. IMC 30 (Obesidade grau I).",
        labs: [{ name: "HbA1c", value: 9.0, unit: "%", target: "< 7.0", status: "high" }, { name: "Glicemia Jejum", value: 180, unit: "mg/dL", target: "< 100", status: "high" }, { name: "LDL", value: 170, unit: "mg/dL", target: "< 100", status: "high" }, { name: "AST/TGO", value: 25, unit: "U/L", target: "< 40", status: "normal" }, { name: "ALT/TGP", value: 30, unit: "U/L", target: "< 40", status: "normal" }, { name: "CPK", value: 120, unit: "U/L", target: "< 190", status: "normal" }],
        currentPrescription: [{ drug: "Metformina", dose: "850mg", frequency: "2x/dia" }, { drug: "Atorvastatina", dose: "40mg", frequency: "1x/dia à noite" }],
        expected: { actions: [{ drug: "Metformina", action: "manter", justification: "Dose adequada para início do tratamento." }, { drug: "Atorvastatina", action: "manter", justification: "Dose adequada para LDL 170." }] } },
      { month: 3, symptoms: "Dores musculares intensas (mialgia) nas coxas e fraqueza há 2 semanas. Urina escurecida. Glicemia capilar melhorou.",
        labs: [{ name: "HbA1c", value: 7.5, unit: "%", target: "< 7.0", status: "high" }, { name: "LDL", value: 95, unit: "mg/dL", target: "< 100", status: "normal" }, { name: "AST/TGO", value: 150, unit: "U/L", target: "< 40", status: "high" }, { name: "ALT/TGP", value: 180, unit: "U/L", target: "< 40", status: "high" }, { name: "CPK", value: 1200, unit: "U/L", target: "< 190", status: "high" }],
        currentPrescription: [{ drug: "Metformina", dose: "850mg", frequency: "2x/dia" }, { drug: "Atorvastatina", dose: "40mg", frequency: "1x/dia à noite" }],
        expected: { actions: [{ drug: "Metformina", action: "manter", justification: "HbA1c caindo, eficácia demonstrada." }, { drug: "Atorvastatina", action: "suspender", justification: "Toxicidade grave: miopatia/rabdomiólise e hepatotoxicidade (CPK 1200, TGO/TGP elevados). Suspender imediatamente." }] } },
      { month: 6, symptoms: "Dores musculares desapareceram. Urina clara. Sem queixas.",
        labs: [{ name: "HbA1c", value: 6.9, unit: "%", target: "< 7.0", status: "normal" }, { name: "LDL", value: 155, unit: "mg/dL", target: "< 100", status: "high" }, { name: "AST/TGO", value: 28, unit: "U/L", target: "< 40", status: "normal" }, { name: "ALT/TGP", value: 32, unit: "U/L", target: "< 40", status: "normal" }, { name: "CPK", value: 110, unit: "U/L", target: "< 190", status: "normal" }],
        currentPrescription: [{ drug: "Metformina", dose: "850mg", frequency: "2x/dia" }],
        expected: { actions: [{ drug: "Metformina", action: "manter", justification: "HbA1c na meta." }, { drug: "Ezetimiba", action: "adicionar", newDose: "10mg 1x/dia", justification: "Enzimas normalizaram. LDL voltou a subir. Iniciar terapia não-estatínica (Ezetimiba) ou estatina hidrofílica em dose baixa." }] } },
    ],
  },
  {
    title: "Caso 2: Hipotireoidismo de Hashimoto", difficulty: "Fácil",
    patient: { name: "Sônia", age: 45, diagnoses: ["Hipotireoidismo primário (Hashimoto)"] },
    consultations: [
      { month: 0, symptoms: "Ganho de peso (5kg), fadiga extrema, constipação, queda de cabelo e pele seca.",
        labs: [{ name: "TSH", value: 18.5, unit: "mIU/L", target: "0.4 - 4.0", status: "high" }, { name: "T4 Livre", value: 0.5, unit: "ng/dL", target: "0.8 - 1.8", status: "low" }],
        currentPrescription: [{ drug: "Levotiroxina", dose: "50 mcg", frequency: "1x/dia (jejum)" }],
        expected: { actions: [{ drug: "Levotiroxina", action: "manter", justification: "Dose inicial adequada. Aguardar 6-8 semanas para reavaliar." }] } },
      { month: 2, symptoms: "Leve melhora na disposição, intestino ainda preso, sono à tarde. Tomando corretamente em jejum.",
        labs: [{ name: "TSH", value: 7.2, unit: "mIU/L", target: "0.4 - 4.0", status: "high" }, { name: "T4 Livre", value: 0.9, unit: "ng/dL", target: "0.8 - 1.8", status: "normal" }],
        currentPrescription: [{ drug: "Levotiroxina", dose: "50 mcg", frequency: "1x/dia (jejum)" }],
        expected: { actions: [{ drug: "Levotiroxina", action: "aumentar", newDose: "75 mcg", justification: "TSH ainda elevado, mas houve resposta. Aumentar gradualmente (12.5-25 mcg)." }] } },
      { month: 4, symptoms: "Sente-se ótima. Intestino regular, energia restabelecida. Sem palpitação ou ansiedade.",
        labs: [{ name: "TSH", value: 2.1, unit: "mIU/L", target: "0.4 - 4.0", status: "normal" }, { name: "T4 Livre", value: 1.2, unit: "ng/dL", target: "0.8 - 1.8", status: "normal" }],
        currentPrescription: [{ drug: "Levotiroxina", dose: "75 mcg", frequency: "1x/dia (jejum)" }],
        expected: { actions: [{ drug: "Levotiroxina", action: "manter", justification: "Eutireoidismo alcançado. Manter dose e retorno semestral/anual." }] } },
    ],
  },
  {
    title: "Caso 3: IC e Risco Renal", difficulty: "Difícil",
    patient: { name: "João", age: 68, diagnoses: ["ICFEr"] },
    consultations: [
      { month: 0, symptoms: "Falta de ar aos médios esforços, edema (2+/4+) nas pernas. PA: 140/90 mmHg.",
        labs: [{ name: "Potássio", value: 4.5, unit: "mEq/L", target: "3.5 - 5.0", status: "normal" }, { name: "Creatinina", value: 1.0, unit: "mg/dL", target: "< 1.3", status: "normal" }, { name: "TFG", value: 75, unit: "mL/min", target: "> 60", status: "normal" }],
        currentPrescription: [{ drug: "Enalapril", dose: "10mg", frequency: "2x/dia" }, { drug: "Bisoprolol", dose: "5mg", frequency: "1x/dia" }, { drug: "Furosemida", dose: "40mg", frequency: "1x/dia" }, { drug: "Espironolactona", dose: "25mg", frequency: "1x/dia" }],
        expected: { actions: [{ drug: "Enalapril", action: "manter", justification: "" }, { drug: "Bisoprolol", action: "manter", justification: "" }, { drug: "Furosemida", action: "manter", justification: "" }, { drug: "Espironolactona", action: "manter", justification: "Terapia padrão para ICFEr." }] } },
      { month: 1, symptoms: "Melhor da falta de ar. Edema sumiu. PA: 115/75 mmHg. Leve fraqueza muscular.",
        labs: [{ name: "Potássio", value: 5.9, unit: "mEq/L", target: "3.5 - 5.0", status: "high" }, { name: "Creatinina", value: 1.7, unit: "mg/dL", target: "< 1.3", status: "high" }, { name: "TFG", value: 42, unit: "mL/min", target: "> 60", status: "low" }],
        currentPrescription: [{ drug: "Enalapril", dose: "10mg", frequency: "2x/dia" }, { drug: "Bisoprolol", dose: "5mg", frequency: "1x/dia" }, { drug: "Furosemida", dose: "40mg", frequency: "1x/dia" }, { drug: "Espironolactona", dose: "25mg", frequency: "1x/dia" }],
        expected: { actions: [{ drug: "Enalapril", action: "manter", justification: "Manter IECA." }, { drug: "Bisoprolol", action: "manter", justification: "" }, { drug: "Furosemida", action: "manter", justification: "" }, { drug: "Espironolactona", action: "suspender", justification: "Inibição dupla RAA (Enalapril+Espironolactona) causou hipercalemia perigosa (K+ 5.9) e lesão renal. Suspender temporariamente e monitorar." }] } },
      { month: 3, symptoms: "Assintomático, sem congestão.",
        labs: [{ name: "Potássio", value: 4.8, unit: "mEq/L", target: "3.5 - 5.0", status: "normal" }, { name: "Creatinina", value: 1.2, unit: "mg/dL", target: "< 1.3", status: "normal" }, { name: "TFG", value: 62, unit: "mL/min", target: "> 60", status: "normal" }],
        currentPrescription: [{ drug: "Enalapril", dose: "10mg", frequency: "2x/dia" }, { drug: "Bisoprolol", dose: "5mg", frequency: "1x/dia" }, { drug: "Furosemida", dose: "40mg", frequency: "1x/dia" }],
        expected: { actions: [{ drug: "Enalapril", action: "manter", justification: "" }, { drug: "Bisoprolol", action: "manter", justification: "" }, { drug: "Furosemida", action: "manter", justification: "Estabilizado. Monitorar antes de reintroduzir antagonista mineralocorticoide." }] } },
    ],
  },
];

type UserAction = { drug: string; action: string; newDose?: string; newFrequency?: string };

export default function SimuladorAcompanhamento() {
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("acompanhamento", BUILT_IN);
  const [screen, setScreen] = useState<"dashboard" | "sim" | "report">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);
  const [consultIdx, setConsultIdx] = useState(0);
  const [userActions, setUserActions] = useState<Record<number, UserAction[]>>({});
  const [scores, setScores] = useState<Record<number, number>>({});
  const [modal, setModal] = useState<{ drug: string; idx: number } | null>(null);
  const [modalAction, setModalAction] = useState("manter");
  const [modalDose, setModalDose] = useState("");
  const [modalFrequency, setModalFrequency] = useState("");

  const c = allCases[caseIdx] as CaseData | undefined;
  const consultation = c?.consultations?.[consultIdx];

  const start = (i: number) => { setCaseIdx(i); setConsultIdx(0); setUserActions({}); setScores({}); setScreen("sim"); };

  const submitConsultation = () => {
    if (!c || !consultation) return;
    const expected = consultation.expected.actions;
    const ua = userActions[consultIdx] || [];
    let correct = 0;
    expected.forEach(exp => {
      const found = ua.find(u => u.drug === exp.drug);
      if (found && found.action === exp.action) correct++;
      else if (!found && exp.action === "manter") correct++;
    });
    const score = Math.round((correct / Math.max(expected.length, 1)) * 100);
    setScores(p => ({ ...p, [consultIdx]: score }));
    if (consultIdx < c.consultations.length - 1) {
      setConsultIdx(consultIdx + 1);
    } else {
      setScreen("report");
    }
  };

  const saveModal = () => {
    if (!modal) return;
    const act: UserAction = {
      drug: modal.drug,
      action: modalAction,
      newDose: modalAction !== "manter" && modalAction !== "suspender" ? modalDose : undefined,
      newFrequency: modalAction !== "suspender" && modalFrequency ? modalFrequency : undefined,
    };
    setUserActions(p => {
      const prev = p[consultIdx] || [];
      const filtered = prev.filter(a => a.drug !== modal.drug);
      return { ...p, [consultIdx]: [...filtered, act] };
    });
    setModal(null); setModalAction("manter"); setModalDose(""); setModalFrequency("");
  };

  const chartData = useMemo(() => {
    if (!c) return [];
    const mainLab = c.consultations[0]?.labs[0]?.name;
    if (!mainLab) return [];
    return c.consultations.slice(0, consultIdx + 1).map(cons => ({
      month: `Mês ${cons.month}`,
      value: cons.labs.find(l => l.name === mainLab)?.value ?? 0,
    }));
  }, [c, consultIdx]);

  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold mb-2">Simulador de Acompanhamento Farmacoterapêutico</h1><p className="text-muted-foreground">Monitore pacientes crônicos ao longo de várias consultas</p></div>
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
              <CardContent><p className="text-sm text-muted-foreground">{cs.patient?.name}, {cs.patient?.age} anos – {cs.patient?.diagnoses?.join(", ")}</p></CardContent>
            </Card>
          ))}
          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">{isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}<p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p></div>
          </Card>
        </div>
      </div>
    );
  }

  if (!c || !consultation) return null;

  if (screen === "report") {
    const avg = Object.values(scores).length > 0 ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) : 0;
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <Card className="mb-6"><CardContent className="pt-6 text-center"><div className="text-5xl font-bold">{avg}%</div><p className="text-muted-foreground mt-2">Desempenho geral nas consultas</p></CardContent></Card>
        {c.consultations.map((cons, i) => (
          <Card key={i} className="mb-3">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">Mês {cons.month}{scores[i] !== undefined && <Badge variant={scores[i]! >= 80 ? "secondary" : "destructive"}>{scores[i]}%</Badge>}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              {cons.expected.actions.filter(a => a.justification).map((a, j) => (
                <div key={j} className="p-2 rounded bg-muted"><strong>{a.drug}:</strong> {a.action}{a.newDose ? ` → ${a.newDose}` : ""} – {a.justification}</div>
              ))}
            </CardContent>
          </Card>
        ))}
        <div className="flex gap-3 mt-4"><Button onClick={() => start(caseIdx)}>Tentar Novamente</Button><Button variant="outline" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button></div>
      </div>
    );
  }

  // Simulation
  return (
    <div className="max-w-7xl mx-auto">
      <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      {/* Tabs navigation */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {c.consultations.map((cons, i) => (
          <div key={i} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${i === consultIdx ? "bg-primary text-primary-foreground" : i < consultIdx ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground opacity-50"}`}>
            Mês {cons.month} {i < consultIdx && <CheckCircle className="inline h-3 w-3 ml-1" />}
          </div>
        ))}
      </div>
      <h2 className="text-lg font-bold mb-4">{c.patient.name}, {c.patient.age} anos – Consulta Mês {consultation.month}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Labs & Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Exames Laboratoriais</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {consultation.labs.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span>{l.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${l.status === "high" ? "text-red-600" : l.status === "low" ? "text-yellow-600" : "text-green-600"}`}>{l.value} {l.unit}</span>
                    {l.status === "high" ? <TrendingUp className="h-3 w-3 text-red-500" /> : l.status === "low" ? <TrendingDown className="h-3 w-3 text-yellow-500" /> : <Minus className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Alvos: {consultation.labs.map(l => `${l.name}: ${l.target}`).join(" | ")}</p>
            {chartData.length > 1 && (
              <div className="h-[150px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinical */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Avaliação Clínica</CardTitle></CardHeader>
          <CardContent className="text-sm"><p>{consultation.symptoms}</p></CardContent>
        </Card>

        {/* Prescription */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Prescrição Atual</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {consultation.currentPrescription.map((rx, i) => {
              const ua = (userActions[consultIdx] || []).find(a => a.drug === rx.drug);
              return (
                <div key={i} className={`p-3 rounded-lg border flex items-center justify-between ${ua ? "border-primary/50" : ""}`}>
                  <div>
                    <p className="font-medium text-sm">{rx.drug} {rx.dose}</p>
                    <p className="text-xs text-muted-foreground">{rx.frequency}</p>
                    {ua && (ua.action !== "manter" || ua.newFrequency) && <Badge variant="outline" className="text-xs mt-1">{ua.action}{ua.newDose ? ` → ${ua.newDose}` : ""}{ua.newFrequency ? ` (${ua.newFrequency})` : ""}</Badge>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setModal({ drug: rx.drug, idx: i }); setModalAction("manter"); setModalDose(""); setModalFrequency(""); }}>Modificar</Button>
                </div>
              );
            })}
            <Button onClick={submitConsultation} className="w-full mt-4">
              {consultIdx < c.consultations.length - 1 ? `Finalizar e Avançar para Mês ${c.consultations[consultIdx + 1]?.month}` : "Finalizar Acompanhamento"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modificar: {modal?.drug}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Ação:</Label>
              <Select value={modalAction} onValueChange={setModalAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manter">Manter</SelectItem>
                  <SelectItem value="aumentar">Aumentar Dose</SelectItem>
                  <SelectItem value="reduzir">Reduzir Dose</SelectItem>
                  <SelectItem value="suspender">Suspender</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(modalAction === "aumentar" || modalAction === "reduzir") && (
              <div><Label>Nova Dose:</Label><Input value={modalDose} onChange={e => setModalDose(e.target.value)} placeholder="Ex: 75 mcg" /></div>
            )}
            {modalAction !== "suspender" && (
              <div><Label>Nova Frequência (opcional):</Label><Input value={modalFrequency} onChange={e => setModalFrequency(e.target.value)} placeholder="Ex: 3x/dia" /></div>
            )}
          </div>
          <DialogFooter><Button onClick={saveModal}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
