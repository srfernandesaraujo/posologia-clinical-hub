import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Sparkles, Loader2, User, Pill, ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { AdminCaseActions } from "@/components/AdminCaseActions";

type PRM_TYPE = "Seguranca" | "Efetividade" | "Indicacao" | "Adesao" | null;

interface DrugPrescription {
  drug: string; dose: string; route: string; frequency: string;
}
interface Answer {
  drugIndex: number; hasPRM: boolean; type: PRM_TYPE; justification: string;
}
interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; height: number; sex: string };
  history: { diseases: string[]; mainComplaint: string; allergies: string[]; creatinineClearance: number | null; vitalSigns?: { bp?: string; hr?: string; temp?: string; spo2?: string } };
  prescription: DrugPrescription[];
  answers: Answer[];
}
interface UserAnswer {
  hasPRM: boolean | null; type: PRM_TYPE; suggestion: string;
}

const BUILT_IN_CASES: CaseData[] = [
  {
    title: "Caso 1: Idosa Polimedicada", difficulty: "Médio",
    patient: { name: "Maria de Lourdes", age: 78, weight: 65, height: 155, sex: "Feminino" },
    history: { diseases: ["HAS", "DM2", "Osteoartrite grave nos joelhos"], mainComplaint: "Dores intensas nos joelhos e azia esporádica", allergies: [], creatinineClearance: 32, vitalSigns: { bp: "140/85 mmHg", hr: "76 bpm", temp: "36.2°C", spo2: "96%" } },
    prescription: [
      { drug: "Losartana", dose: "50mg", route: "VO", frequency: "12/12h" },
      { drug: "Glibenclamida", dose: "5mg", route: "VO", frequency: "1x/dia (manhã)" },
      { drug: "Ibuprofeno", dose: "600mg", route: "VO", frequency: "8/8h" },
      { drug: "Omeprazol", dose: "20mg", route: "VO", frequency: "Jejum" },
    ],
    answers: [
      { drugIndex: 0, hasPRM: false, type: null, justification: "" },
      { drugIndex: 1, hasPRM: true, type: "Seguranca", justification: "Medicamento potencialmente inapropriado para idosos (Critérios de Beers). Alto risco de hipoglicemia severa e prolongada, agravado pela função renal reduzida (ClCr 32 mL/min). Sugestão: Trocar por inibidor de DPP-4 ou ajustar para gliclazida." },
      { drugIndex: 2, hasPRM: true, type: "Seguranca", justification: "AINEs são contraindicados em DRC (ClCr < 60 mL/min) devido ao alto risco de nefrotoxicidade aguda e piora da função renal, além do risco cardiovascular. Sugestão: Suspender e usar Paracetamol/Dipirona ou avaliar opioides fracos." },
      { drugIndex: 3, hasPRM: false, type: null, justification: "" },
    ],
  },
  {
    title: "Caso 2: Paciente Pediátrico", difficulty: "Fácil",
    patient: { name: "Enzo Gabriel", age: 4, weight: 16, height: 105, sex: "Masculino" },
    history: { diseases: ["Otite Média Aguda (OMA) bacteriana"], mainComplaint: "Dor de ouvido intensa, irritabilidade e febre (39°C)", allergies: [], creatinineClearance: null, vitalSigns: { temp: "39.0°C", hr: "120 bpm" } },
    prescription: [
      { drug: "Amoxicilina + Clavulanato (400/57mg/5mL)", dose: "8 mL", route: "VO", frequency: "12/12h (10 dias)" },
      { drug: "Paracetamol gotas (200mg/mL)", dose: "40 gotas (2mL = 400mg)", route: "VO", frequency: "6/6h (se febre/dor)" },
      { drug: "Loratadina xarope (1mg/mL)", dose: "5 mL", route: "VO", frequency: "1x/dia" },
    ],
    answers: [
      { drugIndex: 0, hasPRM: false, type: null, justification: "" },
      { drugIndex: 1, hasPRM: true, type: "Seguranca", justification: "40 gotas = 2mL = 400mg. Para 16kg: 25 mg/kg/dose. Dose máxima pediátrica: 10-15 mg/kg/dose. Risco de hepatotoxicidade. Reduzir para 16-24 gotas (160-240mg = 10-15 mg/kg)." },
      { drugIndex: 2, hasPRM: true, type: "Indicacao", justification: "Loratadina é anti-histamínico sem eficácia comprovada para OMA bacteriana sem componente alérgico. Sugestão: Suspender." },
    ],
  },
  {
    title: "Caso 3: Adulto Jovem - Interação Grave", difficulty: "Difícil",
    patient: { name: "Lucas Martins", age: 32, weight: 80, height: 180, sex: "Masculino" },
    history: { diseases: ["Transtorno Depressivo Maior crônico", "Pneumonia Adquirida na Comunidade (PAC) leve"], mainComplaint: "Tosse produtiva, febre (38.5°C) há 3 dias e dispneia leve", allergies: ["Amoxicilina (Anafilaxia prévia)"], creatinineClearance: null, vitalSigns: { bp: "120/78 mmHg", hr: "92 bpm", temp: "38.5°C", spo2: "94%" } },
    prescription: [
      { drug: "Escitalopram", dose: "20mg", route: "VO", frequency: "1x/dia (uso contínuo)" },
      { drug: "Claritromicina", dose: "500mg", route: "VO", frequency: "12/12h (7 dias)" },
      { drug: "Dipirona", dose: "1g", route: "VO", frequency: "6/6h (se febre/dor)" },
    ],
    answers: [
      { drugIndex: 0, hasPRM: false, type: null, justification: "" },
      { drugIndex: 1, hasPRM: true, type: "Seguranca", justification: "Claritromicina (inibidor CYP3A4 + prolongador do QT) + Escitalopram (risco QT dose-dependente) = risco significativo de arritmias ventriculares graves (Torsades de Pointes). Como paciente é alérgico a penicilina, considerar Doxiciclina." },
      { drugIndex: 2, hasPRM: false, type: null, justification: "" },
    ],
  },
];

const PRM_LABELS: Record<string, string> = { Seguranca: "Segurança", Efetividade: "Efetividade", Indicacao: "Indicação", Adesao: "Adesão" };

export default function SimuladorPRM() {
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("prm", BUILT_IN_CASES);
  const [screen, setScreen] = useState<"dashboard" | "sim" | "report">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [selectedDrug, setSelectedDrug] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(new Set());

  const currentCase = allCases[caseIdx] as CaseData | undefined;

  const startCase = (i: number) => {
    setCaseIdx(i);
    setUserAnswers({});
    setSelectedDrug(null);
    setReviewed(new Set());
    setExpandedFeedback(new Set());
    setScreen("sim");
  };

  const markReviewed = (i: number) => {
    setReviewed(p => new Set(p).add(i));
    if (!userAnswers[i]) setUserAnswers(p => ({ ...p, [i]: { hasPRM: null, type: null, suggestion: "" } }));
  };

  const allReviewed = currentCase ? currentCase.prescription.every((_, i) => reviewed.has(i)) : false;

  const getScore = () => {
    if (!currentCase) return { found: 0, total: 0, details: [] as any[] };
    const realPRMs = currentCase.answers.filter(a => a.hasPRM);
    let found = 0;
    const details = currentCase.answers.map(ans => {
      const ua = userAnswers[ans.drugIndex];
      const correct = ans.hasPRM ? (ua?.hasPRM === true && ua?.type === ans.type) : (ua?.hasPRM === false || ua?.hasPRM === null);
      if (ans.hasPRM && ua?.hasPRM === true) found++;
      return { ...ans, userAnswer: ua, correct, drug: currentCase.prescription[ans.drugIndex] };
    });
    return { found, total: realPRMs.length, details };
  };

  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Simulador de PRM</h1>
            <p className="text-muted-foreground">Problemas Relacionados a Medicamentos – Treine a avaliação de prescrições médicas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any, i: number) => (
            <Card key={c.id || i} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => startCase(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={c.difficulty === "Fácil" ? "secondary" : c.difficulty === "Difícil" ? "destructive" : "default"}>
                    {c.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {c.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                    <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.patient?.name}, {c.patient?.age} anos</p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed hover:shadow-lg transition-shadow cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="font-medium">{isGenerating ? "Gerando caso..." : "Gerar com IA"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentCase) return null;

  if (screen === "report") {
    const { found, total, details } = getScore();
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Relatório de Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{found}/{total}</div>
              <p className="text-muted-foreground">PRMs identificados corretamente</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${total > 0 ? (found / total) * 100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {details.map((d, i) => (
            <Card key={i} className={`border-l-4 ${d.correct ? "border-l-green-500" : d.hasPRM ? "border-l-red-500" : "border-l-muted"}`}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedFeedback(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {d.correct ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="font-semibold">{d.drug.drug} {d.drug.dose}</span>
                    {d.hasPRM && <Badge variant="destructive" className="text-xs">PRM: {PRM_LABELS[d.type!] || d.type}</Badge>}
                  </div>
                  {expandedFeedback.has(i) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedFeedback.has(i) && (
                <CardContent className="text-sm space-y-2">
                  {d.hasPRM && <div className="bg-muted p-3 rounded"><strong>Justificativa:</strong> {d.justification}</div>}
                  {d.userAnswer && (
                    <div className="text-muted-foreground">
                      <strong>Sua resposta:</strong> {d.userAnswer.hasPRM ? `PRM - ${PRM_LABELS[d.userAnswer.type!] || "Não classificado"}` : "Sem PRM"}
                      {d.userAnswer.suggestion && <p className="mt-1"><strong>Intervenção sugerida:</strong> {d.userAnswer.suggestion}</p>}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => startCase(caseIdx)}>Tentar Novamente</Button>
          <Button variant="outline" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button>
        </div>
      </div>
    );
  }

  // Simulation screen
  return (
    <div className="max-w-7xl mx-auto">
      <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      <h2 className="text-xl font-bold mb-4">{currentCase.title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient profile */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Perfil do Paciente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{currentCase.patient.name}</strong></p>
            <p>{currentCase.patient.age} anos | {currentCase.patient.sex} | {currentCase.patient.weight}kg | {currentCase.patient.height}cm</p>
            <Separator />
            <p className="font-medium">Doenças:</p>
            <ul className="list-disc list-inside">{currentCase.history.diseases.map((d, i) => <li key={i}>{d}</li>)}</ul>
            <p><strong>Queixa:</strong> {currentCase.history.mainComplaint}</p>
            {currentCase.history.allergies.length > 0 && <p className="text-red-600"><strong>Alergias:</strong> {currentCase.history.allergies.join(", ")}</p>}
            {currentCase.history.creatinineClearance != null && (
              <Tooltip><TooltipTrigger asChild>
                <p className="flex items-center gap-1"><strong>ClCr:</strong> {currentCase.history.creatinineClearance} mL/min <Info className="h-3 w-3" /></p>
              </TooltipTrigger><TooltipContent>Clearance de Creatinina estimado</TooltipContent></Tooltip>
            )}
            {currentCase.history.vitalSigns && (
              <>
                <Separator />
                <p className="font-medium">Sinais Vitais:</p>
                {currentCase.history.vitalSigns.bp && <p>PA: {currentCase.history.vitalSigns.bp}</p>}
                {currentCase.history.vitalSigns.hr && <p>FC: {currentCase.history.vitalSigns.hr}</p>}
                {currentCase.history.vitalSigns.temp && <p>Temp: {currentCase.history.vitalSigns.temp}</p>}
                {currentCase.history.vitalSigns.spo2 && <p>SpO2: {currentCase.history.vitalSigns.spo2}</p>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Prescription */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Pill className="h-4 w-4" />Prescrição Médica</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentCase.prescription.map((p, i) => (
              <div key={i} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedDrug === i ? "ring-2 ring-primary border-primary" : reviewed.has(i) ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "hover:border-primary/50"}`}
                onClick={() => { setSelectedDrug(i); markReviewed(i); }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.drug}</p>
                    <p className="text-xs text-muted-foreground">{p.dose} - {p.route} - {p.frequency}</p>
                  </div>
                  {reviewed.has(i) && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Intervention panel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" />Análise</CardTitle></CardHeader>
          <CardContent>
            {selectedDrug !== null ? (
              <div className="space-y-4">
                <p className="font-medium">{currentCase.prescription[selectedDrug].drug}</p>
                <div>
                  <Label className="text-sm">Há algum PRM?</Label>
                  <RadioGroup value={userAnswers[selectedDrug]?.hasPRM === true ? "sim" : userAnswers[selectedDrug]?.hasPRM === false ? "nao" : ""} onValueChange={(v) => setUserAnswers(p => ({ ...p, [selectedDrug!]: { ...p[selectedDrug!], hasPRM: v === "sim", type: v === "nao" ? null : p[selectedDrug!]?.type || null, suggestion: p[selectedDrug!]?.suggestion || "" } }))}>
                    <div className="flex items-center space-x-2 mt-2"><RadioGroupItem value="sim" id="sim" /><Label htmlFor="sim">Sim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="nao" /><Label htmlFor="nao">Não</Label></div>
                  </RadioGroup>
                </div>
                {userAnswers[selectedDrug]?.hasPRM && (
                  <div>
                    <Label className="text-sm">Categoria do PRM:</Label>
                    <RadioGroup value={userAnswers[selectedDrug]?.type || ""} onValueChange={(v) => setUserAnswers(p => ({ ...p, [selectedDrug!]: { ...p[selectedDrug!], type: v as PRM_TYPE } }))}>
                      {Object.entries(PRM_LABELS).map(([k, v]) => (
                        <div key={k} className="flex items-center space-x-2"><RadioGroupItem value={k} id={k} /><Label htmlFor={k}>{v}</Label></div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                <div>
                  <Label className="text-sm">Intervenção sugerida (opcional):</Label>
                  <Textarea value={userAnswers[selectedDrug]?.suggestion || ""} onChange={(e) => setUserAnswers(p => ({ ...p, [selectedDrug!]: { ...p[selectedDrug!], suggestion: e.target.value } }))} rows={3} className="mt-1" />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique em um medicamento para avaliar</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!allReviewed} onClick={() => setScreen("report")}>
          <ClipboardCheck className="h-4 w-4 mr-2" />Finalizar Avaliação
        </Button>
      </div>
    </div>
  );
}
