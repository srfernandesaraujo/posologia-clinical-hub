import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Brain, User, Stethoscope, AlertTriangle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

type Modo = "clinico" | "academico";

interface Antidepressivo {
  nome: string;
  classe: string;
  doseEquiv: number; // dose equivalente a fluoxetina 20mg
  doseMin: number;
  doseMax: number;
  meiaVida: string;
  inicioAcao: string;
  sedacao: "baixa" | "moderada" | "alta";
  ganPeso: "baixo" | "moderado" | "alto";
  disfSexual: "baixo" | "moderado" | "alto";
  riscoQT: "baixo" | "moderado" | "alto";
  washout: boolean;
  washoutDias: number;
  cyp: string;
}

const ANTIDEPRESSIVOS: Record<string, Antidepressivo> = {
  fluoxetina: { nome: "Fluoxetina", classe: "ISRS", doseEquiv: 20, doseMin: 20, doseMax: 80, meiaVida: "2-6 dias (norfluoxetina: 4-16 dias)", inicioAcao: "2-4 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "alto", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Inibidor potente CYP2D6" },
  sertralina: { nome: "Sertralina", classe: "ISRS", doseEquiv: 50, doseMin: 50, doseMax: 200, meiaVida: "26h", inicioAcao: "2-4 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "moderado", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Inibidor leve CYP2D6" },
  escitalopram: { nome: "Escitalopram", classe: "ISRS", doseEquiv: 10, doseMin: 10, doseMax: 20, meiaVida: "27-32h", inicioAcao: "1-2 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "moderado", riscoQT: "moderado", washout: false, washoutDias: 0, cyp: "Inibição mínima CYP" },
  paroxetina: { nome: "Paroxetina", classe: "ISRS", doseEquiv: 20, doseMin: 20, doseMax: 60, meiaVida: "21h", inicioAcao: "2-4 semanas", sedacao: "moderada", ganPeso: "alto", disfSexual: "alto", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Inibidor potente CYP2D6" },
  venlafaxina: { nome: "Venlafaxina", classe: "IRSN", doseEquiv: 75, doseMin: 75, doseMax: 375, meiaVida: "5h (metabólito: 11h)", inicioAcao: "2-4 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "alto", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Substrato CYP2D6/3A4" },
  duloxetina: { nome: "Duloxetina", classe: "IRSN", doseEquiv: 60, doseMin: 30, doseMax: 120, meiaVida: "12h", inicioAcao: "1-2 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "moderado", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Inibidor moderado CYP2D6" },
  amitriptilina: { nome: "Amitriptilina", classe: "Tricíclico", doseEquiv: 100, doseMin: 25, doseMax: 300, meiaVida: "10-28h", inicioAcao: "2-4 semanas", sedacao: "alta", ganPeso: "alto", disfSexual: "moderado", riscoQT: "alto", washout: false, washoutDias: 0, cyp: "Substrato CYP2D6/2C19" },
  nortriptilina: { nome: "Nortriptilina", classe: "Tricíclico", doseEquiv: 75, doseMin: 25, doseMax: 150, meiaVida: "28-31h", inicioAcao: "2-4 semanas", sedacao: "moderada", ganPeso: "moderado", disfSexual: "moderado", riscoQT: "alto", washout: false, washoutDias: 0, cyp: "Substrato CYP2D6" },
  mirtazapina: { nome: "Mirtazapina", classe: "Atípico (NaSSA)", doseEquiv: 30, doseMin: 15, doseMax: 45, meiaVida: "20-40h", inicioAcao: "1-2 semanas", sedacao: "alta", ganPeso: "alto", disfSexual: "baixo", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Substrato CYP3A4/2D6/1A2" },
  bupropiona: { nome: "Bupropiona", classe: "Atípico (IRND)", doseEquiv: 150, doseMin: 150, doseMax: 450, meiaVida: "21h", inicioAcao: "2-4 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "baixo", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Inibidor CYP2D6" },
  trazodona: { nome: "Trazodona", classe: "Atípico (SARI)", doseEquiv: 150, doseMin: 50, doseMax: 400, meiaVida: "5-9h", inicioAcao: "1-3 semanas", sedacao: "alta", ganPeso: "baixo", disfSexual: "baixo", riscoQT: "moderado", washout: false, washoutDias: 0, cyp: "Substrato CYP3A4" },
  vortioxetina: { nome: "Vortioxetina", classe: "Multimodal", doseEquiv: 10, doseMin: 5, doseMax: 20, meiaVida: "66h", inicioAcao: "2-4 semanas", sedacao: "baixa", ganPeso: "baixo", disfSexual: "baixo", riscoQT: "baixo", washout: false, washoutDias: 0, cyp: "Substrato CYP2D6" },
};

const DRUG_LIST = Object.entries(ANTIDEPRESSIVOS).map(([key, v]) => ({ value: key, label: `${v.nome} (${v.classe})` }));

const PERFIL_LABELS: Record<string, string> = { baixa: "Baixo", baixo: "Baixo", moderada: "Moderado", moderado: "Moderado", alta: "Alto", alto: "Alto" };
const PERFIL_COLORS: Record<string, string> = { baixa: "text-green-600", baixo: "text-green-600", moderada: "text-yellow-600", moderado: "text-yellow-600", alta: "text-red-600", alto: "text-red-600" };

interface FormData {
  nomePaciente: string;
  data: string;
  origem: string;
  doseOrigem: string;
  duracaoUso: string;
  resposta: string;
  eventosAdversos: string;
  destino: string;
  objetivoTroca: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  origem: "", doseOrigem: "", duracaoUso: "", resposta: "",
  eventosAdversos: "", destino: "", objetivoTroca: "",
};

interface Resultado {
  doseEquivCalculada: number;
  doseDestinoSugerida: number;
  faixaDestino: string;
  estrategia: string;
  estrategiaDetalhe: string;
  alertas: string[];
  observacoes: string[];
}

function calcularConversao(form: FormData): Resultado | null {
  const orig = ANTIDEPRESSIVOS[form.origem];
  const dest = ANTIDEPRESSIVOS[form.destino];
  if (!orig || !dest) return null;

  const doseOrigem = Number(form.doseOrigem);
  if (!doseOrigem || doseOrigem <= 0) return null;

  // Calculate fluoxetine equivalent
  const fluoxEquiv = (doseOrigem / orig.doseEquiv) * 20;
  // Convert to destination dose
  const doseDestino = (fluoxEquiv / 20) * dest.doseEquiv;
  // Clamp to therapeutic range
  const doseSugerida = Math.round(Math.min(Math.max(doseDestino, dest.doseMin), dest.doseMax) / 5) * 5 || dest.doseMin;

  const alertas: string[] = [];
  const observacoes: string[] = [];

  // Strategy determination
  let estrategia = "Troca cruzada (cross-tapering)";
  let estrategiaDetalhe = `Reduzir ${orig.nome} gradualmente (25-50% a cada 3-7 dias) enquanto inicia ${dest.nome} em dose baixa (${dest.doseMin}mg), titulando até a dose-alvo.`;

  // Check for serotonergic risk
  if ((orig.classe === "ISRS" || orig.classe === "IRSN") && (dest.classe === "ISRS" || dest.classe === "IRSN")) {
    alertas.push("⚠ Risco de Síndrome Serotoninérgica: monitorar sinais como agitação, tremor, hiperreflexia, hipertermia e diarreia durante a transição.");
  }

  // Fluoxetine long half-life warning
  if (form.origem === "fluoxetina") {
    alertas.push("⚠ Fluoxetina tem meia-vida muito longa (norfluoxetina: 4-16 dias). Considerar período de washout de 2-5 semanas antes de iniciar o novo antidepressivo, especialmente se destino for IMAO.");
    estrategia = "Troca com washout parcial";
    estrategiaDetalhe = `Suspender Fluoxetina e aguardar 1-2 semanas antes de iniciar ${dest.nome} em dose baixa (${dest.doseMin}mg). A longa meia-vida da fluoxetina oferece um "autotapering" natural.`;
  }

  // Paroxetine withdrawal warning
  if (form.origem === "paroxetina") {
    alertas.push("⚠ Paroxetina tem alto risco de síndrome de descontinuação. Reduzir lentamente (10% a cada 1-2 semanas) antes de iniciar o novo fármaco.");
  }

  // Venlafaxine withdrawal
  if (form.origem === "venlafaxina") {
    alertas.push("⚠ Venlafaxina: risco elevado de sintomas de descontinuação (tontura, irritabilidade, \"brain zaps\"). Reduzir 37.5mg a cada 1-2 semanas.");
  }

  // CYP interaction
  if (orig.cyp.includes("Inibidor") && dest.cyp.includes("Substrato")) {
    const cypTypes: string[] = orig.cyp.match(/CYP\w+/g) || [];
    const substTypes: string[] = dest.cyp.match(/CYP\w+/g) || [];
    const overlap = cypTypes.filter((c) => substTypes.includes(c));
    if (overlap.length > 0) {
      alertas.push(`⚠ Interação farmacocinética: ${orig.nome} inibe ${overlap.join(", ")}, por onde ${dest.nome} é metabolizado. Risco de níveis elevados do destino durante transição.`);
    }
  }

  // Tricyclic QT risk
  if (dest.classe === "Tricíclico") {
    alertas.push("⚠ Tricíclicos: realizar ECG antes e após ajuste de dose. Monitorar intervalo QTc. Risco cardiotóxico em superdosagem.");
  }

  observacoes.push(`Dose equivalente estimada (base fluoxetina 20mg): ${Math.round(fluoxEquiv)}mg de fluoxetina equivalente.`);
  observacoes.push(`Faixa terapêutica de ${dest.nome}: ${dest.doseMin}-${dest.doseMax}mg/dia.`);
  observacoes.push(`Início de ação esperado: ${dest.inicioAcao}.`);
  observacoes.push(`Meia-vida de ${dest.nome}: ${dest.meiaVida}.`);

  return {
    doseEquivCalculada: Math.round(fluoxEquiv),
    doseDestinoSugerida: doseSugerida,
    faixaDestino: `${dest.doseMin}-${dest.doseMax}mg/dia`,
    estrategia, estrategiaDetalhe, alertas, observacoes,
  };
}

function sanitizePDF(text: string): string {
  const map: Record<string, string> = {
    "\u00e1":"a","\u00e0":"a","\u00e3":"a","\u00e2":"a","\u00e9":"e","\u00ea":"e","\u00ed":"i",
    "\u00f3":"o","\u00f4":"o","\u00f5":"o","\u00fa":"u","\u00fc":"u","\u00e7":"c",
    "\u00c1":"A","\u00c0":"A","\u00c3":"A","\u00c2":"A","\u00c9":"E","\u00ca":"E","\u00cd":"I",
    "\u00d3":"O","\u00d4":"O","\u00d5":"O","\u00da":"U","\u00c7":"C",
    "\u2013":"-","\u2014":"-","\u2018":"'","\u2019":"'","\u201c":"\"","\u201d":"\"","\u2026":"...",
    "\u26a0":"[!]",
  };
  return text.replace(/[^\x00-\x7F]/g, (c) => map[c] || "");
}

function gerarPDF(form: FormData, resultado: Resultado, modo: Modo) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Equivalencia de Antidepressivos - Posologia", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Plano de Transicao Terapeutica", w / 2, y, { align: "center" });
  y += 5;
  doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 8;
  doc.line(14, y, w - 14, y); y += 6;

  if (form.nomePaciente) { doc.setFont("helvetica", "bold"); doc.text("Paciente:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.nomePaciente, 40, y); y += 5; }
  doc.setFont("helvetica", "bold"); doc.text("Data:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.data, 30, y); y += 8;

  const orig = ANTIDEPRESSIVOS[form.origem];
  const dest = ANTIDEPRESSIVOS[form.destino];

  doc.setFont("helvetica", "bold"); doc.text("Dados da Conversao:", 14, y); y += 5;
  doc.setFont("helvetica", "normal");
  [
    `Origem: ${orig?.nome} ${form.doseOrigem}mg/dia (${orig?.classe})`,
    `Destino: ${dest?.nome} (${dest?.classe})`,
    `Duracao do uso atual: ${form.duracaoUso} semanas`,
    form.resposta ? `Resposta terapeutica: ${form.resposta}` : null,
    form.objetivoTroca ? `Objetivo da troca: ${form.objetivoTroca}` : null,
  ].filter(Boolean).forEach((d) => { doc.text(sanitizePDF(`  ${d}`), 18, y); y += 4.5; });
  y += 4;

  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(sanitizePDF(`Dose equivalente (fluoxetina): ${resultado.doseEquivCalculada}mg`), 14, y); y += 5;
  doc.text(sanitizePDF(`Dose sugerida de ${dest?.nome}: ${resultado.doseDestinoSugerida}mg/dia`), 14, y); y += 5;
  doc.text(sanitizePDF(`Estrategia: ${resultado.estrategia}`), 14, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const stratLines = doc.splitTextToSize(sanitizePDF(resultado.estrategiaDetalhe), w - 32);
  doc.text(stratLines, 18, y); y += stratLines.length * 4 + 4;

  if (resultado.alertas.length > 0) {
    doc.setFont("helvetica", "bold"); doc.text("Alertas:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    resultado.alertas.forEach((a) => { const l = doc.splitTextToSize(sanitizePDF(a), w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
    y += 2;
  }

  if (resultado.observacoes.length > 0) {
    doc.setFont("helvetica", "bold"); doc.text("Observacoes:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    resultado.observacoes.forEach((o) => { const l = doc.splitTextToSize(sanitizePDF(`- ${o}`), w - 32); doc.text(l, 18, y); y += l.length * 4 + 1; });
  }

  y += 8;
  doc.setFontSize(7); doc.setTextColor(130);
  doc.text("Este plano e uma sugestao e nao substitui avaliacao medica presencial.", 14, y); y += 3.5;
  doc.text(`Modo: ${modo === "clinico" ? "Clinico" : "Academico"} | Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);
  doc.save(`equivalencia-antidepressivos-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function EquivalenciaAntidepressivos() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const calcular = () => {
    if (!form.origem || !form.destino || !form.doseOrigem) { setErro("Preencha antidepressivo de origem, destino e dose atual."); return; }
    if (form.origem === form.destino) { setErro("Origem e destino devem ser diferentes."); return; }
    const res = calcularConversao(form);
    if (!res) { setErro("Erro no cálculo. Verifique os dados."); return; }
    setResultado(res);
    const orig = ANTIDEPRESSIVOS[form.origem];
    const dest = ANTIDEPRESSIVOS[form.destino];
    saveCalculation({
      calculatorName: "Equivalência de Antidepressivos",
      calculatorSlug: "equivalencia-antidepressivos",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${orig?.nome} → ${dest?.nome}: ${res.doseDestinoSugerida}mg`,
      details: { Origem: `${orig?.nome} ${form.doseOrigem}mg`, Destino: `${dest?.nome} ${res.doseDestinoSugerida}mg`, Estratégia: res.estrategia, "Faixa destino": res.faixaDestino },
    });
  };

  const limpar = () => { setForm(INITIAL); setResultado(null); setErro(""); };

  const origDrug = form.origem ? ANTIDEPRESSIVOS[form.origem] : null;
  const destDrug = form.destino ? ANTIDEPRESSIVOS[form.destino] : null;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar às Calculadoras
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Brain className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Equivalência de Antidepressivos</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Conversão segura entre antidepressivos com estratégia de transição.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalculationHistory calculatorSlug="equivalencia-antidepressivos" />
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("clinico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "clinico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Profissional
            </button>
            <button onClick={() => setModo("academico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "academico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <User className="h-3.5 w-3.5" /> Acadêmico
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Antidepressivo de Origem</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Antidepressivo atual *</Label>
                <Select value={form.origem} onValueChange={(v) => set("origem", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{DRUG_LIST.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Dose diária atual (mg) *</Label><Input type="number" value={form.doseOrigem} onChange={(e) => set("doseOrigem", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Duração do uso (semanas)</Label><Input type="number" value={form.duracaoUso} onChange={(e) => set("duracaoUso", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Resposta terapêutica</Label>
                <Select value={form.resposta} onValueChange={(v) => set("resposta", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adequada">Adequada</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="ausente">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5"><Label>Eventos adversos relevantes</Label><Textarea value={form.eventosAdversos} onChange={(e) => set("eventosAdversos", e.target.value)} placeholder="Ex: insônia, ganho de peso, disfunção sexual..." className="h-20" /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Antidepressivo de Destino</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Antidepressivo desejado *</Label>
                <Select value={form.destino} onValueChange={(v) => set("destino", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{DRUG_LIST.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Objetivo da troca</Label><Input value={form.objetivoTroca} onChange={(e) => set("objetivoTroca", e.target.value)} placeholder="Ex: menos efeitos sexuais" /></div>
            </div>
          </div>

          {/* Comparative view */}
          {origDrug && destDrug && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Comparação de Perfil</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-2 pr-4 text-muted-foreground">Parâmetro</th><th className="text-center py-2 px-4">{origDrug.nome}</th><th className="text-center py-2 px-4">{destDrug.nome}</th></tr></thead>
                  <tbody className="divide-y divide-border/50">
                    <tr><td className="py-2 pr-4 text-muted-foreground">Classe</td><td className="text-center py-2">{origDrug.classe}</td><td className="text-center py-2">{destDrug.classe}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Sedação</td><td className={`text-center py-2 ${PERFIL_COLORS[origDrug.sedacao]}`}>{PERFIL_LABELS[origDrug.sedacao]}</td><td className={`text-center py-2 ${PERFIL_COLORS[destDrug.sedacao]}`}>{PERFIL_LABELS[destDrug.sedacao]}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Ganho de peso</td><td className={`text-center py-2 ${PERFIL_COLORS[origDrug.ganPeso]}`}>{PERFIL_LABELS[origDrug.ganPeso]}</td><td className={`text-center py-2 ${PERFIL_COLORS[destDrug.ganPeso]}`}>{PERFIL_LABELS[destDrug.ganPeso]}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Disf. sexual</td><td className={`text-center py-2 ${PERFIL_COLORS[origDrug.disfSexual]}`}>{PERFIL_LABELS[origDrug.disfSexual]}</td><td className={`text-center py-2 ${PERFIL_COLORS[destDrug.disfSexual]}`}>{PERFIL_LABELS[destDrug.disfSexual]}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Risco QT</td><td className={`text-center py-2 ${PERFIL_COLORS[origDrug.riscoQT]}`}>{PERFIL_LABELS[origDrug.riscoQT]}</td><td className={`text-center py-2 ${PERFIL_COLORS[destDrug.riscoQT]}`}>{PERFIL_LABELS[destDrug.riscoQT]}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Meia-vida</td><td className="text-center py-2 text-xs">{origDrug.meiaVida}</td><td className="text-center py-2 text-xs">{destDrug.meiaVida}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Início de ação</td><td className="text-center py-2">{origDrug.inicioAcao}</td><td className="text-center py-2">{destDrug.inicioAcao}</td></tr>
                    <tr><td className="py-2 pr-4 text-muted-foreground">Interação CYP</td><td className="text-center py-2 text-xs">{origDrug.cyp}</td><td className="text-center py-2 text-xs">{destDrug.cyp}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {modo === "academico" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Informações Acadêmicas</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Equivalência:</strong> A conversão utiliza a dose equivalente a 20mg de fluoxetina como referência, baseada em dados de meta-análises (Cipriani et al., Lancet 2018) e guidelines (Maudsley, APA).</p>
                <p><strong>Cross-tapering:</strong> Técnica de redução gradual do fármaco de origem enquanto se inicia o destino em dose baixa, minimizando sintomas de descontinuação e risco serotoninérgico.</p>
                <p><strong>Washout:</strong> Período sem nenhum antidepressivo. Obrigatório na transição para/de IMAOs (14 dias mínimo; 5 semanas após fluoxetina).</p>
                <p><strong>Síndrome serotoninérgica:</strong> Emergência médica causada por excesso de serotonina. Sintomas: agitação, tremor, mioclonia, hipertermia, diarreia. Risco maior ao combinar dois serotoninérgicos.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular Equivalência</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Resultado da Conversão</h2>
                <div className="space-y-3">
                  <div><span className="text-xs text-muted-foreground">Equiv. Fluoxetina</span><p className="text-xl font-bold text-primary">{resultado.doseEquivCalculada}mg</p></div>
                  <div><span className="text-xs text-muted-foreground">Dose sugerida — {ANTIDEPRESSIVOS[form.destino]?.nome}</span><p className="text-2xl font-bold text-primary">{resultado.doseDestinoSugerida}mg/dia</p><p className="text-xs text-muted-foreground">Faixa: {resultado.faixaDestino}</p></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Estratégia de Transição</h2>
                <p className="font-medium text-sm mb-2">{resultado.estrategia}</p>
                <p className="text-sm text-muted-foreground">{resultado.estrategiaDetalhe}</p>
              </div>

              {resultado.alertas.length > 0 && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-2">
                  <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alertas</h2>
                  {resultado.alertas.map((a, i) => <p key={i} className="text-sm text-destructive/90">{a}</p>)}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Observações</h2>
                <ul className="space-y-1.5">{resultado.observacoes.map((o, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />{o}</li>)}</ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(form, resultado, modo)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione os antidepressivos e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
