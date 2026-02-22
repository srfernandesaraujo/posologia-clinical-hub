import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Pill, User, Stethoscope, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";

/* ─── types ─── */
type Sexo = "m" | "f";
type SimNao = "1" | "0";
type SimNaoDesc = "1" | "0" | "desc";
type Modo = "pro" | "paciente";
type MetodoDesmame = "absoluto" | "percentual";

interface FormData {
  nomePaciente: string;
  data: string;
  idade: string;
  sexo: Sexo | "";
  indicacao: string;
  corticoide: string;
  doseAtual: string;
  via: string;
  duracaoSemanas: string;
  pulsoterapia: SimNao;
  comorbidades: string[];
  supressaoHHA: SimNaoDesc;
}

interface EtapaDesmame {
  semana: number;
  dose: number;
  dataInicio: string;
  observacao?: string;
}

interface ResultadoDesmame {
  riscoSupressao: "baixo" | "moderado" | "alto";
  tipoDesmame: "rapido" | "gradual" | "lento";
  esquema: EtapaDesmame[];
  recomendacoes: string[];
  alertas: string[];
}

const CORTICOIDES = [
  { nome: "Prednisona", equivalencia: 5, label: "Prednisona (5mg)" },
  { nome: "Prednisolona", equivalencia: 5, label: "Prednisolona (5mg)" },
  { nome: "Metilprednisolona", equivalencia: 4, label: "Metilprednisolona (4mg)" },
  { nome: "Dexametasona", equivalencia: 0.75, label: "Dexametasona (0.75mg)" },
  { nome: "Hidrocortisona", equivalencia: 20, label: "Hidrocortisona (20mg)" },
  { nome: "Betametasona", equivalencia: 0.6, label: "Betametasona (0.6mg)" },
  { nome: "Deflazacorte", equivalencia: 6, label: "Deflazacorte (6mg)" },
];

const INDICACOES = [
  "Asma", "DPOC", "Lúpus Eritematoso Sistêmico", "Artrite Reumatoide",
  "Doença de Addison", "Vasculites", "Doença Inflamatória Intestinal",
  "Nefrite Lúpica", "Sarcoidose", "Polimialgia Reumática",
  "Transplante de Órgão", "Dermatoses", "Esclerose Múltipla", "Outra",
];

const COMORBIDADES_OPCOES = [
  "Diabetes Mellitus", "Osteoporose", "Hipertensão Arterial", "Glaucoma",
  "Obesidade", "Imunossupressão", "Gestante", "Idoso (>65 anos)",
  "Insuficiência Renal", "Úlcera Péptica",
];

const VIAS = ["Oral", "Intravenosa", "Intramuscular"];

const INITIAL: FormData = {
  nomePaciente: "",
  data: new Date().toISOString().slice(0, 10),
  idade: "",
  sexo: "",
  indicacao: "",
  corticoide: "Prednisona",
  doseAtual: "",
  via: "Oral",
  duracaoSemanas: "",
  pulsoterapia: "0",
  comorbidades: [],
  supressaoHHA: "desc",
};

/* ─── Equivalência de dose (para prednisona) ─── */
function doseEquivalentePrednisona(corticoide: string, dose: number): number {
  const c = CORTICOIDES.find((x) => x.nome === corticoide);
  if (!c) return dose;
  return (dose / c.equivalencia) * 5;
}

/* ─── Avaliação de risco de supressão HHA ─── */
function avaliarRiscoSupressao(
  dosePrednisona: number,
  duracaoSemanas: number,
  pulsoterapia: boolean,
  supressaoClínica: SimNaoDesc
): "baixo" | "moderado" | "alto" {
  if (supressaoClínica === "1") return "alto";

  // Doses ≥ 20mg prednisona por ≥ 3 semanas → alto risco
  if (dosePrednisona >= 20 && duracaoSemanas >= 3) return "alto";
  // Pulsoterapia → alto risco
  if (pulsoterapia) return "alto";
  // Dose ≥ 7.5mg por ≥ 3 semanas → moderado
  if (dosePrednisona >= 7.5 && duracaoSemanas >= 3) return "moderado";
  // Qualquer dose por ≥ 4 semanas → moderado
  if (duracaoSemanas >= 4) return "moderado";
  // < 3 semanas e dose < 20mg → baixo
  return "baixo";
}

/* ─── Tipo de desmame ─── */
function definirTipoDesmame(risco: "baixo" | "moderado" | "alto"): "rapido" | "gradual" | "lento" {
  switch (risco) {
    case "baixo": return "rapido";
    case "moderado": return "gradual";
    case "alto": return "lento";
  }
}

/* ─── Gerar esquema de desmame ─── */
function gerarEsquema(
  doseAtual: number,
  tipoDesmame: "rapido" | "gradual" | "lento",
  metodo: MetodoDesmame,
  percentualReducao: number,
  dataInicio: string
): EtapaDesmame[] {
  const etapas: EtapaDesmame[] = [];
  let dose = doseAtual;
  let semana = 0;
  const inicio = new Date(dataInicio);

  const adicionarEtapa = (d: number, obs?: string) => {
    const dt = new Date(inicio);
    dt.setDate(dt.getDate() + semana * 7);
    etapas.push({
      semana,
      dose: Math.round(d * 100) / 100,
      dataInicio: dt.toISOString().slice(0, 10),
      observacao: obs,
    });
  };

  if (metodo === "percentual") {
    adicionarEtapa(dose, "Dose inicial");
    while (dose > 2.5 && etapas.length < 30) {
      const reducao = dose * (percentualReducao / 100);
      dose = dose - reducao;
      // Arredondar para 2.5mg mais próximo
      dose = Math.round(dose / 2.5) * 2.5;
      if (dose < 2.5) dose = 2.5;
      semana += tipoDesmame === "lento" ? 2 : 1;
      adicionarEtapa(dose);
    }
    if (dose > 0) {
      semana += tipoDesmame === "lento" ? 2 : 1;
      adicionarEtapa(0, "Suspensão do corticoide");
    }
    return etapas;
  }

  // Método absoluto
  adicionarEtapa(dose, "Dose inicial");

  if (tipoDesmame === "rapido") {
    // Desmame rápido: reduzir 5-10mg/semana acima de 20mg, depois 5mg/semana
    while (dose > 0 && etapas.length < 30) {
      const reducao = dose > 20 ? 10 : dose > 10 ? 5 : 2.5;
      dose = Math.max(0, dose - reducao);
      semana += 1;
      adicionarEtapa(dose, dose === 0 ? "Suspensão do corticoide" : undefined);
      if (dose === 0) break;
    }
  } else if (tipoDesmame === "gradual") {
    // Gradual: acima de 40mg reduz 10mg/semana, 20-40mg reduz 5mg/semana, 10-20mg reduz 2.5mg/semana, <10mg reduz 1mg a cada 1-2 semanas
    while (dose > 0 && etapas.length < 40) {
      let reducao: number;
      let intervalo: number;
      if (dose > 40) { reducao = 10; intervalo = 1; }
      else if (dose > 20) { reducao = 5; intervalo = 1; }
      else if (dose > 10) { reducao = 2.5; intervalo = 1; }
      else if (dose > 5) { reducao = 1; intervalo = 2; }
      else { reducao = 1; intervalo = 2; }
      dose = Math.max(0, dose - reducao);
      dose = Math.round(dose * 10) / 10;
      semana += intervalo;
      adicionarEtapa(dose, dose === 0 ? "Suspensão do corticoide" : undefined);
      if (dose === 0) break;
    }
  } else {
    // Lento: acima de 40mg reduz 5mg/semana, 20-40mg reduz 5mg a cada 2 semanas, 10-20mg reduz 2.5mg a cada 2 semanas, <10mg reduz 1mg a cada 2-4 semanas
    while (dose > 0 && etapas.length < 50) {
      let reducao: number;
      let intervalo: number;
      if (dose > 40) { reducao = 5; intervalo = 1; }
      else if (dose > 20) { reducao = 5; intervalo = 2; }
      else if (dose > 10) { reducao = 2.5; intervalo = 2; }
      else if (dose > 5) { reducao = 1; intervalo = 2; }
      else { reducao = 1; intervalo = 4; }
      dose = Math.max(0, dose - reducao);
      dose = Math.round(dose * 10) / 10;
      semana += intervalo;
      adicionarEtapa(dose, dose === 0 ? "Suspensão do corticoide" : dose <= 5 ? "Monitorar sintomas de insuficiência adrenal" : undefined);
      if (dose === 0) break;
    }
  }

  return etapas;
}

/* ─── Recomendações ─── */
function gerarRecomendacoes(
  risco: "baixo" | "moderado" | "alto",
  comorbidades: string[],
  modo: Modo,
  dosePrednisona: number,
  duracaoSemanas: number
): { recomendacoes: string[]; alertas: string[] } {
  const isPro = modo === "pro";
  const recomendacoes: string[] = [];
  const alertas: string[] = [];

  if (risco === "alto") {
    recomendacoes.push(
      isPro
        ? "Solicitar cortisol basal (8h da manhã) antes de iniciar desmame abaixo de 7.5mg/dia de prednisona equivalente."
        : "Seu médico solicitará exames de sangue para verificar como suas glândulas adrenais estão funcionando."
    );
    recomendacoes.push(
      isPro
        ? "Considerar teste de estímulo com ACTH (250µg) se cortisol basal entre 3-15 µg/dL."
        : "Pode ser necessário um exame especial para avaliar a função das suas glândulas."
    );
    recomendacoes.push(
      isPro
        ? "Encaminhamento ao endocrinologista recomendado para acompanhamento do eixo HHA."
        : "Consultar um endocrinologista é recomendado para acompanhar seu tratamento."
    );
  }

  if (risco === "moderado") {
    recomendacoes.push(
      isPro
        ? "Monitorar sinais e sintomas de insuficiência adrenal durante o desmame (fadiga, hipotensão, náusea)."
        : "Fique atento a cansaço extremo, tontura ou enjoo durante a redução do medicamento."
    );
    recomendacoes.push(
      isPro
        ? "Considerar dosagem de cortisol basal quando atingir dose fisiológica (≤5mg prednisona)."
        : "Exames podem ser solicitados quando a dose estiver bem baixa."
    );
  }

  if (risco === "baixo") {
    recomendacoes.push(
      isPro
        ? "Risco baixo de supressão adrenal. Desmame pode ser conduzido de forma mais rápida."
        : "Seu risco é baixo. A redução do medicamento deve ser tranquila."
    );
  }

  // Comorbidade-specific
  if (comorbidades.includes("Diabetes Mellitus")) {
    alertas.push(
      isPro
        ? "⚠ Diabetes: Monitorar glicemia durante desmame — risco de descompensação na redução."
        : "⚠ Atenção: monitore seu açúcar no sangue durante a redução do corticoide."
    );
  }
  if (comorbidades.includes("Osteoporose")) {
    alertas.push(
      isPro
        ? "⚠ Osteoporose: Avaliar densitometria óssea e considerar suplementação de cálcio/vitamina D + bifosfonato se uso > 3 meses."
        : "⚠ Cuidado com os ossos: converse com seu médico sobre suplementos de cálcio."
    );
  }
  if (comorbidades.includes("Glaucoma")) {
    alertas.push(
      isPro
        ? "⚠ Glaucoma: Monitorar pressão intraocular durante e após desmame."
        : "⚠ Importante acompanhar a pressão dos olhos com oftalmologista."
    );
  }
  if (comorbidades.includes("Hipertensão Arterial")) {
    alertas.push(
      isPro
        ? "⚠ HAS: A PA pode melhorar com a redução; ajustar anti-hipertensivos conforme necessário."
        : "⚠ A pressão arterial pode mudar com a redução — monitore regularmente."
    );
  }
  if (comorbidades.includes("Gestante")) {
    alertas.push(
      isPro
        ? "⚠ GESTANTE: Preferir prednisona/prednisolona (metabolizados pela placenta). Desmame com acompanhamento obstétrico."
        : "⚠ Gestante: acompanhamento especial é necessário. Informe seu obstetra."
    );
  }
  if (comorbidades.includes("Idoso (>65 anos)")) {
    alertas.push(
      isPro
        ? "⚠ Idoso: Maior risco de efeitos adversos. Desmame mais cauteloso recomendado."
        : "⚠ Pacientes idosos precisam de reduções mais lentas e cuidadosas."
    );
  }
  if (comorbidades.includes("Imunossupressão")) {
    alertas.push(
      isPro
        ? "⚠ Imunossuprimido: Risco aumentado de infecções oportunistas durante desmame. Monitorar de perto."
        : "⚠ Atenção especial a infecções durante a redução do medicamento."
    );
  }

  // General recommendations
  recomendacoes.push(
    isPro
      ? "Orientar paciente sobre sinais de crise adrenal: hipotensão severa, dor abdominal, confusão mental."
      : "Se sentir tontura forte, dor abdominal intensa ou confusão, procure emergência imediatamente."
  );

  if (duracaoSemanas > 12) {
    recomendacoes.push(
      isPro
        ? "Uso prolongado (>12 semanas): considerar avaliação de densidade mineral óssea e profilaxia de osteoporose."
        : "Como o uso foi prolongado, seu médico pode solicitar exame dos ossos."
    );
  }

  return { recomendacoes, alertas };
}

/* ─── PDF ─── */
function gerarPDF(form: FormData, resultado: ResultadoDesmame, modo: Modo, metodo: MetodoDesmame) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Desmame de Corticoides - Posologia", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Plano Individual de Reducao de Dose", w / 2, y, { align: "center" });
  y += 5;
  doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 8;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 6;

  if (form.nomePaciente) {
    doc.setFont("helvetica", "bold");
    doc.text("Paciente:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(form.nomePaciente, 40, y);
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Data:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(form.data, 30, y);
  y += 8;

  // Clinical data
  doc.setFont("helvetica", "bold");
  doc.text("Dados Clinicos:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const dados = [
    `Idade: ${form.idade} anos`,
    `Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}`,
    `Indicacao: ${form.indicacao}`,
    `Corticoide: ${form.corticoide}`,
    `Dose Atual: ${form.doseAtual} mg (${form.via})`,
    `Duracao do uso: ${form.duracaoSemanas} semanas`,
    `Pulsoterapia recente: ${form.pulsoterapia === "1" ? "Sim" : "Nao"}`,
    form.comorbidades.length > 0 ? `Comorbidades: ${form.comorbidades.join(", ")}` : null,
    `Supressao HHA clinica: ${form.supressaoHHA === "1" ? "Sim" : form.supressaoHHA === "0" ? "Nao" : "Desconhecido"}`,
  ].filter(Boolean) as string[];

  dados.forEach((d) => {
    doc.text(`  ${d}`, 18, y);
    y += 4.5;
  });
  y += 4;

  // Risk assessment
  const riscoLabel = { baixo: "Baixo", moderado: "Moderado", alto: "Alto" };
  const tipoLabel = { rapido: "Rapido", gradual: "Gradual", lento: "Lento com monitoramento" };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Risco de Supressao Adrenal: ${riscoLabel[resultado.riscoSupressao]}`, 14, y);
  y += 5;
  doc.text(`Tipo de Desmame: ${tipoLabel[resultado.tipoDesmame]}`, 14, y);
  y += 8;

  // Tapering table
  doc.setFontSize(10);
  doc.text("Esquema de Desmame:", 14, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Semana", 18, y);
  doc.text("Data", 48, y);
  doc.text("Dose (mg)", 88, y);
  doc.text("Observacao", 118, y);
  y += 1;
  doc.line(14, y, w - 14, y);
  y += 4;
  doc.setFont("helvetica", "normal");

  resultado.esquema.forEach((e) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${e.semana}`, 22, y);
    doc.text(e.dataInicio, 48, y);
    doc.text(`${e.dose}`, 92, y);
    if (e.observacao) {
      const lines = doc.splitTextToSize(e.observacao, 70);
      doc.text(lines, 118, y);
      y += Math.max(lines.length * 4, 4.5);
    } else {
      y += 4.5;
    }
  });
  y += 6;

  // Recommendations
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.text("Recomendacoes:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  resultado.recomendacoes.forEach((r) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(`- ${r}`, w - 32);
    doc.text(lines, 18, y);
    y += lines.length * 4.5 + 1;
  });

  if (resultado.alertas.length > 0) {
    y += 4;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("Alertas:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    resultado.alertas.forEach((a) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(a, w - 32);
      doc.text(lines, 18, y);
      y += lines.length * 4.5 + 1;
    });
  }

  y += 8;
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text("Este plano e uma sugestao e nao substitui avaliacao medica presencial.", 14, y);
  y += 3.5;
  doc.text(`Modo: ${modo === "pro" ? "Profissional" : "Paciente"} | Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);

  doc.save(`desmame-corticoide-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

/* ─── Component ─── */
export default function DesmaCorticoide() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("pro");
  const [metodo, setMetodo] = useState<MetodoDesmame>("absoluto");
  const [percentual, setPercentual] = useState("10");
  const [resultado, setResultado] = useState<ResultadoDesmame | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: any) => {
    setForm((p) => ({ ...p, [field]: value }));
    setResultado(null);
    setErro("");
  };

  const toggleComorbidade = (c: string) => {
    setForm((p) => ({
      ...p,
      comorbidades: p.comorbidades.includes(c)
        ? p.comorbidades.filter((x) => x !== c)
        : [...p.comorbidades, c],
    }));
    setResultado(null);
  };

  const calcular = () => {
    if (!form.sexo || !form.idade || !form.doseAtual || !form.duracaoSemanas || !form.indicacao || !form.corticoide) {
      setErro("Preencha todos os campos obrigatórios (*).");
      return;
    }

    const dose = Number(form.doseAtual);
    const semanas = Number(form.duracaoSemanas);
    const dosePrednisona = doseEquivalentePrednisona(form.corticoide, dose);

    const risco = avaliarRiscoSupressao(
      dosePrednisona,
      semanas,
      form.pulsoterapia === "1",
      form.supressaoHHA
    );

    const tipoDesmame = definirTipoDesmame(risco);

    const esquema = gerarEsquema(
      dosePrednisona,
      tipoDesmame,
      metodo,
      Number(percentual),
      form.data
    );

    const { recomendacoes, alertas } = gerarRecomendacoes(
      risco,
      form.comorbidades,
      modo,
      dosePrednisona,
      semanas
    );

    const res = { riscoSupressao: risco, tipoDesmame, esquema, recomendacoes, alertas };
    setResultado(res);
    saveCalculation({
      calculatorName: "Desmame de Corticoides",
      calculatorSlug: "desmame-corticoide",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${form.corticoide} ${form.doseAtual}mg → Risco: ${risco} | ${esquema.length} etapas`,
      details: { Corticoide: form.corticoide, "Dose atual": `${form.doseAtual} mg`, Risco: risco, Desmame: tipoDesmame, Etapas: esquema.length, "Duração": `${form.duracaoSemanas} semanas` },
    });
  };

  const limpar = () => {
    setForm(INITIAL);
    setResultado(null);
    setErro("");
  };

  const dosePrednisonaEquiv = useMemo(() => {
    if (!form.doseAtual || !form.corticoide) return null;
    const eq = doseEquivalentePrednisona(form.corticoide, Number(form.doseAtual));
    return form.corticoide === "Prednisona" ? null : eq;
  }, [form.doseAtual, form.corticoide]);

  const riscoCorLabel = {
    baixo: { text: "Baixo Risco", bgClass: "border-green-500/30 bg-green-500/10", cor: "hsl(142 71% 45%)", icon: CheckCircle },
    moderado: { text: "Risco Moderado", bgClass: "border-orange-400/30 bg-orange-400/10", cor: "hsl(38 92% 50%)", icon: Clock },
    alto: { text: "Alto Risco", bgClass: "border-red-500/30 bg-red-500/10", cor: "hsl(0 72% 51%)", icon: AlertTriangle },
  };

  const tipoDesmaLabel = {
    rapido: "Desmame Rápido",
    gradual: "Desmame Gradual",
    lento: "Desmame Lento (com monitoramento)",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/calculadoras")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às Calculadoras
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Pill className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Desmame de Corticoides</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Plano individualizado de redução de dose com avaliação de risco de supressão adrenal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalculationHistory calculatorSlug="desmame-corticoide" />
            <span className="text-muted-foreground">Modo:</span>
            <button
              onClick={() => setModo("pro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modo === "pro" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Profissional
            </button>
            <button
              onClick={() => setModo("paciente")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modo === "paciente" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Paciente
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Inputs ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do Paciente</Label>
                <Input value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Patient data */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do Paciente *</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Idade *</Label>
                <Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Anos" min="1" max="120" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Masculino</SelectItem>
                    <SelectItem value="f">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Indicação Clínica *</Label>
                <Select value={form.indicacao} onValueChange={(v) => set("indicacao", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a indicação" /></SelectTrigger>
                  <SelectContent>
                    {INDICACOES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Corticosteroid data */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do Corticoide *</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Corticoide *</Label>
                <Select value={form.corticoide} onValueChange={(v) => set("corticoide", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CORTICOIDES.map((c) => (
                      <SelectItem key={c.nome} value={c.nome}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dose Atual (mg) *</Label>
                <Input type="number" value={form.doseAtual} onChange={(e) => set("doseAtual", e.target.value)} placeholder="mg/dia" min="0" step="0.5" />
                {dosePrednisonaEquiv !== null && (
                  <p className="text-xs text-muted-foreground">≈ {dosePrednisonaEquiv.toFixed(1)} mg de prednisona equivalente</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Via de Administração</Label>
                <Select value={form.via} onValueChange={(v) => set("via", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIAS.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração do Uso (semanas) *</Label>
                <Input type="number" value={form.duracaoSemanas} onChange={(e) => set("duracaoSemanas", e.target.value)} placeholder="Semanas" min="1" />
              </div>
              <div className="flex items-center justify-between sm:col-span-2 py-2">
                <Label className="cursor-pointer">Pulsoterapia recente?</Label>
                <Switch checked={form.pulsoterapia === "1"} onCheckedChange={(c) => set("pulsoterapia", c ? "1" : "0")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Supressão Clínica do Eixo HHA</Label>
                <Select value={form.supressaoHHA} onValueChange={(v) => set("supressaoHHA", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desconhecido</SelectItem>
                    <SelectItem value="1">Sim</SelectItem>
                    <SelectItem value="0">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Comorbidities */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Comorbidades Relevantes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMORBIDADES_OPCOES.map((c) => (
                <label key={c} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.comorbidades.includes(c)}
                    onChange={() => toggleComorbidade(c)}
                    className="rounded border-border h-4 w-4 text-primary"
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tapering method */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Método de Desmame</h2>
            <Tabs value={metodo} onValueChange={(v) => setMetodo(v as MetodoDesmame)} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="absoluto">Dose Absoluta (mg)</TabsTrigger>
                <TabsTrigger value="percentual">Percentual (%)</TabsTrigger>
              </TabsList>
              <TabsContent value="absoluto">
                <p className="text-sm text-muted-foreground mt-3">
                  Redução por valores fixos (ex.: 40 → 30 → 20 → 15 → 10 → 7.5 → 5 → 2.5 → 0).
                </p>
              </TabsContent>
              <TabsContent value="percentual">
                <div className="mt-3 space-y-2">
                  <Label>Percentual de redução por intervalo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={percentual}
                      onChange={(e) => setPercentual(e.target.value)}
                      className="w-24"
                      min="5"
                      max="50"
                      step="5"
                    />
                    <span className="text-sm text-muted-foreground">% a cada intervalo</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={calcular} className="flex-1 sm:flex-none">
              Calcular Desmame
            </Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
            {resultado && (
              <Button variant="outline" onClick={() => gerarPDF(form, resultado, modo, metodo)} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Gerar PDF
              </Button>
            )}
          </div>

          {erro && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {erro}
            </div>
          )}
        </div>

        {/* ─── Right: Results ─── */}
        <div className="space-y-6">
          {!resultado ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Pill className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Preencha os dados e clique em <strong>Calcular Desmame</strong> para obter o plano de redução.
              </p>
            </div>
          ) : (
            <>
              {/* Risk */}
              <div className={`rounded-2xl border p-6 ${riscoCorLabel[resultado.riscoSupressao].bgClass}`}>
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const Icon = riscoCorLabel[resultado.riscoSupressao].icon;
                    return <Icon className="h-6 w-6" style={{ color: riscoCorLabel[resultado.riscoSupressao].cor }} />;
                  })()}
                  <div>
                    <p className="text-sm text-muted-foreground">Risco de Supressão Adrenal</p>
                    <p className="text-xl font-bold" style={{ color: riscoCorLabel[resultado.riscoSupressao].cor }}>
                      {riscoCorLabel[resultado.riscoSupressao].text}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium mt-2">
                  Tipo: {tipoDesmaLabel[resultado.tipoDesmame]}
                </p>
              </div>

              {/* Tapering schedule */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  Esquema de Desmame
                </h3>
                <div className="overflow-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 pr-2">Sem.</th>
                        <th className="text-left py-2 pr-2">Data</th>
                        <th className="text-right py-2">Dose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.esquema.map((e, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-2 font-medium">{e.semana}</td>
                          <td className="py-2 pr-2 text-muted-foreground text-xs">{e.dataInicio}</td>
                          <td className="py-2 text-right font-semibold">
                            {e.dose === 0 ? (
                              <span className="text-green-400">Suspensão</span>
                            ) : (
                              <>{e.dose} mg</>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Doses em equivalente de prednisona. Ajuste conforme o corticoide utilizado.
                </p>
              </div>

              {/* Alerts */}
              {resultado.alertas.length > 0 && (
                <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-6">
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-orange-400">Alertas</h3>
                  <ul className="space-y-2">
                    {resultado.alertas.map((a, i) => (
                      <li key={i} className="text-sm">{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Recomendações</h3>
                <ul className="space-y-2">
                  {resultado.recomendacoes.map((r, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground text-center">
                  Este plano é uma sugestão baseada em diretrizes. Não substitui a avaliação médica presencial. Dados não armazenados.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
