import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Syringe, User, Stethoscope, AlertTriangle, ArrowRightLeft, Plus, X } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

/* ─── types ─── */
type Modo = "pro" | "paciente";

interface OpioidInfo {
  nome: string;
  label: string;
  vias: string[];
  /** Fator de conversão para morfina oral equivalente (MME) por mg. Para transdérmico (fentanil mcg/h) é especial. */
  fatorMME: Record<string, number>;
  altoRisco?: boolean;
  notas?: string;
}

interface FormData {
  nomePaciente: string;
  data: string;
  opioideAtual: string;
  viaAtual: string;
  doseDiaria: string;
  frequencia: string;
  tempoUso: string;
  objetivo: string;
  objetivoTexto: string;
  opioideDesejado: string;
  viaDesejada: string;
  opioideTolerant: "1" | "0";
  comorbidades: string[];
  dorNeuropatica: "0" | "1";
  adjuvantes: string[];
  reducaoSeguranca: string; // 25-50%
}

interface Resultado {
  demMg: number; // Dose equivalente de morfina oral
  doseCalculada: number;
  doseComReducao: number;
  reducaoAplicada: number;
  unidade: string;
  alertas: string[];
  recomendacoes: string[];
  orientacoesTitulacao: string[];
}

interface Simulacao {
  opioide: string;
  via: string;
  doseCalculada: number;
  doseComReducao: number;
  unidade: string;
}

/* ─── Opioid database ─── */
const OPIOIDES: OpioidInfo[] = [
  {
    nome: "Morfina", label: "Morfina",
    vias: ["Oral", "Intravenosa", "Subcutânea", "Retal"],
    fatorMME: { "Oral": 1, "Intravenosa": 3, "Subcutânea": 3, "Retal": 1 },
  },
  {
    nome: "Oxicodona", label: "Oxicodona",
    vias: ["Oral"],
    fatorMME: { "Oral": 1.5 },
  },
  {
    nome: "Hidromorfona", label: "Hidromorfona",
    vias: ["Oral", "Intravenosa", "Subcutânea"],
    fatorMME: { "Oral": 4, "Intravenosa": 20, "Subcutânea": 20 },
  },
  {
    nome: "Fentanil", label: "Fentanil",
    vias: ["Transdérmica", "Intravenosa", "Sublingual"],
    fatorMME: { "Transdérmica": -1, "Intravenosa": 100, "Sublingual": 50 },
    altoRisco: true,
    notas: "Conversão transdérmica: fentanil 25 mcg/h ≈ 60-90 mg morfina oral/dia. Cinética de depósito - efeito persiste 12-24h após remoção.",
  },
  {
    nome: "Tramadol", label: "Tramadol",
    vias: ["Oral", "Intravenosa"],
    fatorMME: { "Oral": 0.1, "Intravenosa": 0.2 },
  },
  {
    nome: "Codeína", label: "Codeína",
    vias: ["Oral"],
    fatorMME: { "Oral": 0.15 },
  },
  {
    nome: "Metadona", label: "Metadona",
    vias: ["Oral", "Intravenosa", "Subcutânea"],
    fatorMME: { "Oral": -2, "Intravenosa": -2, "Subcutânea": -2 },
    altoRisco: true,
    notas: "Conversão NÃO linear. Razão morfina:metadona varia conforme dose total: <90mg MME → 4:1; 90-300mg → 8:1; >300mg → 12:1. Meia-vida longa e imprevisível (8-59h). Risco de acúmulo e prolongamento de QTc.",
  },
  {
    nome: "Buprenorfina", label: "Buprenorfina",
    vias: ["Sublingual", "Transdérmica"],
    fatorMME: { "Sublingual": 30, "Transdérmica": -3 },
    altoRisco: true,
    notas: "Agonista parcial com efeito-teto. Conversão para buprenorfina transdérmica: 35 mcg/h ≈ 60-80 mg morfina oral/dia. Pode precipitar abstinência se iniciada com opioide agonista pleno no receptor.",
  },
  {
    nome: "Tapentadol", label: "Tapentadol",
    vias: ["Oral"],
    fatorMME: { "Oral": 0.4 },
    notas: "Mecanismo duplo (agonista mu + inibidor de recaptação de noradrenalina). Útil em dor neuropática mista.",
  },
];

const OBJETIVOS = [
  "Troca por indisponibilidade",
  "Efeitos adversos intoleráveis",
  "Otimização da via de administração",
  "Cuidados paliativos",
  "Rotação por tolerância",
  "Redução de dose / desmame",
  "Outro",
];

const COMORBIDADES = [
  "Insuficiência Renal", "Insuficiência Hepática", "Idade Avançada (>65)",
  "Apneia do Sono", "DPOC / Doença Pulmonar", "Insuficiência Cardíaca",
  "Gestante", "Dependência / Abuso de Substâncias", "Obesidade Mórbida",
];

const ADJUVANTES = [
  "Gabapentina / Pregabalina", "Amitriptilina / Nortriptilina",
  "Duloxetina / Venlafaxina", "Benzodiazepínicos", "Relaxantes Musculares",
];

const INITIAL: FormData = {
  nomePaciente: "",
  data: new Date().toISOString().slice(0, 10),
  opioideAtual: "Morfina",
  viaAtual: "Oral",
  doseDiaria: "",
  frequencia: "",
  tempoUso: "",
  objetivo: "",
  objetivoTexto: "",
  opioideDesejado: "Oxicodona",
  viaDesejada: "Oral",
  opioideTolerant: "0",
  comorbidades: [],
  dorNeuropatica: "0",
  adjuvantes: [],
  reducaoSeguranca: "25",
};

/* ─── Conversão ─── */
function calcularDEM(opioide: string, via: string, doseDiaria: number): number {
  const o = OPIOIDES.find((x) => x.nome === opioide);
  if (!o) return -1;
  const fator = o.fatorMME[via];
  if (fator === undefined) return -1;

  // Fentanil transdérmico: mcg/h → MME
  if (fator === -1) {
    // fentanil 25 mcg/h ≈ 75 mg morfina oral/dia (média)
    return doseDiaria * 3;
  }
  // Metadona: conversão variável
  if (fator === -2) {
    const mme = doseDiaria * (via === "Oral" ? 1 : 2);
    // Estimativa: metadona oral é ~3-12x mais potente que morfina dependendo da dose
    if (mme <= 20) return mme * 4;
    if (mme <= 40) return mme * 8;
    return mme * 12;
  }
  // Buprenorfina transdérmica: mcg/h → MME
  if (fator === -3) {
    // buprenorfina 35 mcg/h ≈ 70 mg morfina oral/dia
    return doseDiaria * 2;
  }

  return doseDiaria * fator;
}

function converterDEMParaOpioide(dem: number, opioide: string, via: string): { dose: number; unidade: string } {
  const o = OPIOIDES.find((x) => x.nome === opioide);
  if (!o) return { dose: -1, unidade: "mg/dia" };
  const fator = o.fatorMME[via];
  if (fator === undefined) return { dose: -1, unidade: "mg/dia" };

  // Fentanil transdérmico
  if (fator === -1) {
    return { dose: Math.round(dem / 3 * 10) / 10, unidade: "mcg/h" };
  }
  // Metadona: reverse
  if (fator === -2) {
    let ratio: number;
    if (dem < 90) ratio = 4;
    else if (dem < 300) ratio = 8;
    else ratio = 12;
    const metadonaDose = dem / ratio;
    return { dose: Math.round(metadonaDose * 10) / 10, unidade: via === "Oral" ? "mg/dia" : "mg/dia" };
  }
  // Buprenorfina transdérmica
  if (fator === -3) {
    return { dose: Math.round(dem / 2 * 10) / 10, unidade: "mcg/h" };
  }

  return { dose: Math.round((dem / fator) * 10) / 10, unidade: "mg/dia" };
}

function gerarAlertas(
  opioideDesejado: string,
  dem: number,
  comorbidades: string[],
  adjuvantes: string[],
  opioideTolerant: boolean,
  modo: Modo
): string[] {
  const alertas: string[] = [];
  const isPro = modo === "pro";
  const o = OPIOIDES.find((x) => x.nome === opioideDesejado);

  if (o?.altoRisco) {
    alertas.push(
      isPro
        ? `⚠ ${o.nome}: opioide de alto risco. ${o.notas || ""}`
        : `⚠ ${o.nome} requer atenção especial. Converse com seu médico sobre os cuidados necessários.`
    );
  }

  if (!opioideTolerant && dem > 50) {
    alertas.push(
      isPro
        ? "⚠ Paciente opioide-naïve com DEM elevada. Considerar início com dose mais baixa e titulação lenta."
        : "⚠ Como você não estava usando opioide anteriormente, a dose será iniciada com cautela."
    );
  }

  if (comorbidades.includes("Insuficiência Renal")) {
    alertas.push(
      isPro
        ? "⚠ IR: Evitar morfina (metabólito ativo M6G acumula). Preferir fentanil, metadona ou hidromorfona com ajuste."
        : "⚠ Função renal reduzida: alguns opioides precisam de ajuste de dose."
    );
  }
  if (comorbidades.includes("Insuficiência Hepática")) {
    alertas.push(
      isPro
        ? "⚠ IH: Reduzir dose em 50% e aumentar intervalo. Codeína e tramadol podem ter eficácia reduzida (pró-fármacos)."
        : "⚠ Função hepática reduzida: doses serão ajustadas."
    );
  }
  if (comorbidades.includes("Idade Avançada (>65)")) {
    alertas.push(
      isPro
        ? "⚠ Idoso: Iniciar com 25-50% da dose calculada. Maior sensibilidade e risco de quedas, delirium e depressão respiratória."
        : "⚠ Pacientes idosos precisam de doses menores e monitoramento cuidadoso."
    );
  }
  if (comorbidades.includes("Apneia do Sono") || comorbidades.includes("DPOC / Doença Pulmonar")) {
    alertas.push(
      isPro
        ? "⚠ Doença pulmonar/apneia: Risco aumentado de depressão respiratória. Monitorar oximetria. Evitar benzodiazepínicos concomitantes."
        : "⚠ Problemas respiratórios: uso de opioide requer monitoramento respiratório."
    );
  }
  if (comorbidades.includes("Gestante")) {
    alertas.push(
      isPro
        ? "⚠ Gestante: Preferir morfina ou metadona. Risco de síndrome de abstinência neonatal. Acompanhamento obstétrico obrigatório."
        : "⚠ Gestante: acompanhamento especial necessário. Informe seu obstetra."
    );
  }
  if (adjuvantes.includes("Benzodiazepínicos")) {
    alertas.push(
      isPro
        ? "⚠ Uso concomitante de benzodiazepínicos: risco sinérgico de depressão respiratória e morte. FDA black box warning. Reavaliar necessidade."
        : "⚠ O uso combinado com calmantes pode ser perigoso. Converse com seu médico."
    );
  }
  if (adjuvantes.includes("Gabapentina / Pregabalina")) {
    alertas.push(
      isPro
        ? "⚠ Gabapentinoides concomitantes: potencializam sedação e depressão respiratória. Considerar redução de dose do opioide em 25-50%."
        : "⚠ Seu medicamento para dor nos nervos pode interagir com o opioide."
    );
  }

  return alertas;
}

function gerarRecomendacoes(modo: Modo, dem: number, dorNeuropatica: boolean, opioideDesejado: string): string[] {
  const isPro = modo === "pro";
  const recs: string[] = [];

  recs.push(
    isPro
      ? "Iniciar com a dose reduzida calculada. Titular em incrementos de 25-50% a cada 24-72h conforme resposta analgésica e tolerabilidade."
      : "O médico iniciará com uma dose segura e ajustará conforme sua resposta."
  );
  recs.push(
    isPro
      ? "Manter medicação de resgate disponível (10-15% da dose diária total por resgate, a cada 1-2h se necessário)."
      : "Terá uma medicação de resgate caso sinta dor forte entre as doses."
  );
  recs.push(
    isPro
      ? "Reavaliar em 24-72h: eficácia analgésica, efeitos adversos (náusea, constipação, sedação, prurido), e sinais de abstinência do opioide prévio."
      : "Seu médico reavaliará em 1-3 dias para verificar se a dose está adequada."
  );

  if (dorNeuropatica) {
    recs.push(
      isPro
        ? "Dor neuropática mista: considerar associação com gabapentinoides ou IRSN (duloxetina). Opioides isolados têm menor eficácia em dor neuropática pura."
        : "Para dor nos nervos, podem ser associados outros medicamentos específicos."
    );
  }

  if (opioideDesejado === "Metadona") {
    recs.push(
      isPro
        ? "Metadona: NÃO aumentar dose em intervalo < 5-7 dias (meia-vida longa, risco de acúmulo). Solicitar ECG basal e controlar QTc."
        : "Este medicamento age por mais tempo no corpo. Ajustes de dose são mais lentos."
    );
  }
  if (opioideDesejado === "Fentanil" || opioideDesejado === "Buprenorfina") {
    recs.push(
      isPro
        ? `${opioideDesejado} transdérmico: efeito pleno em 12-24h. Manter resgate com opioide de ação curta nas primeiras 24h.`
        : "O adesivo demora um pouco para fazer efeito total. Você terá medicação de apoio nesse período."
    );
  }

  recs.push(
    isPro
      ? "Monitorar sinais de abstinência do opioide anterior: diaforese, taquicardia, ansiedade, diarreia, mialgias."
      : "Fique atento a suor excessivo, ansiedade ou diarreia — pode ser sinal de que o corpo está se adaptando."
  );

  return recs;
}

/* ─── PDF ─── */
function gerarPDF(form: FormData, resultado: Resultado, modo: Modo, simulacoes: Simulacao[]) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Equivalencia de Opioides - Posologia", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Plano de Conversao Individualizado", w / 2, y, { align: "center" });
  y += 4;
  doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 7;
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
  y += 7;

  // Clinical data
  doc.setFont("helvetica", "bold");
  doc.text("Dados Clinicos:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const dados = [
    `Opioide atual: ${form.opioideAtual} (${form.viaAtual})`,
    `Dose diaria: ${form.doseDiaria} ${form.opioideAtual === "Fentanil" && form.viaAtual === "Transdérmica" ? "mcg/h" : "mg/dia"}`,
    form.tempoUso ? `Tempo de uso: ${form.tempoUso} dias` : null,
    `Tolerancia a opioides: ${form.opioideTolerant === "1" ? "Sim" : "Nao"}`,
    `Objetivo: ${form.objetivo}${form.objetivoTexto ? " - " + form.objetivoTexto : ""}`,
    `Opioide desejado: ${form.opioideDesejado} (${form.viaDesejada})`,
    form.comorbidades.length > 0 ? `Comorbidades: ${form.comorbidades.join(", ")}` : null,
    form.adjuvantes.length > 0 ? `Adjuvantes em uso: ${form.adjuvantes.join(", ")}` : null,
    form.dorNeuropatica === "1" ? "Dor neuropatica mista: Sim" : null,
  ].filter(Boolean) as string[];

  dados.forEach((d) => { doc.text(`  ${d}`, 18, y); y += 4.5; });
  y += 4;

  // Result
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Dose Equivalente de Morfina Oral (DEM): ${resultado.demMg.toFixed(1)} mg/dia`, 14, y);
  y += 6;
  doc.text(`Dose calculada de ${form.opioideDesejado}: ${resultado.doseCalculada} ${resultado.unidade}`, 14, y);
  y += 5;
  doc.text(`Dose com reducao de seguranca (${resultado.reducaoAplicada}%): ${resultado.doseComReducao} ${resultado.unidade}`, 14, y);
  y += 8;

  // Simulations
  if (simulacoes.length > 0) {
    doc.text("Simulacoes Alternativas:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    simulacoes.forEach((s) => {
      doc.text(`  ${s.opioide} (${s.via}): ${s.doseComReducao} ${s.unidade}`, 18, y);
      y += 4.5;
    });
    y += 4;
  }

  // Alerts
  if (resultado.alertas.length > 0) {
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
    y += 4;
  }

  // Recommendations
  if (y > 240) { doc.addPage(); y = 20; }
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

  y += 6;
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text("Este plano e uma sugestao e nao substitui avaliacao medica presencial.", 14, y);
  y += 3.5;
  doc.text(`Modo: ${modo === "pro" ? "Profissional" : "Paciente"} | Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);

  doc.save(`equivalencia-opioides-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

/* ─── Component ─── */
export default function EquivalenciaOpioides() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("pro");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: any) => {
    setForm((p) => ({ ...p, [field]: value }));
    setResultado(null);
    setErro("");
  };

  const toggleArray = (field: "comorbidades" | "adjuvantes", value: string) => {
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((x) => x !== value)
        : [...p[field], value],
    }));
    setResultado(null);
  };

  const opioideAtualInfo = OPIOIDES.find((o) => o.nome === form.opioideAtual);
  const opioideDesejadoInfo = OPIOIDES.find((o) => o.nome === form.opioideDesejado);

  // Auto-update via when opioide changes
  const viasAtual = opioideAtualInfo?.vias || [];
  const viasDesejada = opioideDesejadoInfo?.vias || [];

  const isTransdermicoAtual = form.opioideAtual === "Fentanil" && form.viaAtual === "Transdérmica";
  const isTransdermicoDesejado = (form.opioideDesejado === "Fentanil" && form.viaDesejada === "Transdérmica") ||
    (form.opioideDesejado === "Buprenorfina" && form.viaDesejada === "Transdérmica");
  const unidadeAtual = isTransdermicoAtual ? "mcg/h" : "mg/dia";

  const calcular = () => {
    if (!form.opioideAtual || !form.viaAtual || !form.doseDiaria || !form.opioideDesejado || !form.viaDesejada || !form.objetivo) {
      setErro("Preencha todos os campos obrigatórios (*).");
      return;
    }

    const dose = Number(form.doseDiaria);
    if (dose <= 0) { setErro("Dose inválida."); return; }

    const dem = calcularDEM(form.opioideAtual, form.viaAtual, dose);
    if (dem < 0) { setErro("Combinação opioide/via não suportada."); return; }

    const { dose: doseCalc, unidade } = converterDEMParaOpioide(dem, form.opioideDesejado, form.viaDesejada);
    if (doseCalc < 0) { setErro("Combinação opioide desejado/via não suportada."); return; }

    const reducao = Number(form.reducaoSeguranca);
    const doseReduzida = Math.round(doseCalc * (1 - reducao / 100) * 10) / 10;

    const alertas = gerarAlertas(
      form.opioideDesejado, dem, form.comorbidades, form.adjuvantes,
      form.opioideTolerant === "1", modo
    );

    const recomendacoes = gerarRecomendacoes(modo, dem, form.dorNeuropatica === "1", form.opioideDesejado);

    const res = {
      demMg: dem,
      doseCalculada: doseCalc,
      doseComReducao: doseReduzida,
      reducaoAplicada: reducao,
      unidade,
      alertas,
      recomendacoes,
      orientacoesTitulacao: [],
    };
    setResultado(res);
    saveCalculation({
      calculatorName: "Equivalência de Opioides",
      calculatorSlug: "equivalencia-opioides",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${form.opioideAtual} → ${form.opioideDesejado}: ${doseReduzida} ${unidade}`,
      details: { Origem: `${form.opioideAtual} ${form.doseDiaria}${isTransdermicoAtual ? "mcg/h" : "mg/dia"}`, Destino: `${form.opioideDesejado} ${doseReduzida} ${unidade}`, DEM: `${dem.toFixed(1)} mg`, "Redução segurança": `${reducao}%` },
    });
  };

  const adicionarSimulacao = () => {
    if (!resultado) return;
    // Simulate all other opioids
    const novasSimulacoes: Simulacao[] = [];
    OPIOIDES.forEach((o) => {
      if (o.nome === form.opioideDesejado) return;
      o.vias.forEach((v) => {
        const { dose, unidade } = converterDEMParaOpioide(resultado.demMg, o.nome, v);
        if (dose > 0) {
          const reducao = Number(form.reducaoSeguranca);
          novasSimulacoes.push({
            opioide: o.nome,
            via: v,
            doseCalculada: dose,
            doseComReducao: Math.round(dose * (1 - reducao / 100) * 10) / 10,
            unidade,
          });
        }
      });
    });
    setSimulacoes(novasSimulacoes);
  };

  const limpar = () => {
    setForm(INITIAL);
    setResultado(null);
    setSimulacoes([]);
    setErro("");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button
          onClick={() => navigate("/calculadoras")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às Calculadoras
        </button>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Syringe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Equivalência de Opioides</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Conversão segura entre opioides com fatores de correção para tolerância cruzada incompleta.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="equivalencia-opioides" toolName="Calculadora de Equivalência de Opioides" />
            <CalculationHistory calculatorSlug="equivalencia-opioides" />
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

          {/* Current opioid */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Opioide Atual *</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Opioide em Uso *</Label>
                <Select value={form.opioideAtual} onValueChange={(v) => {
                  const o = OPIOIDES.find((x) => x.nome === v);
                  set("opioideAtual", v);
                  if (o && !o.vias.includes(form.viaAtual)) {
                    set("viaAtual", o.vias[0]);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPIOIDES.map((o) => (
                      <SelectItem key={o.nome} value={o.nome}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Via de Administração *</Label>
                <Select value={form.viaAtual} onValueChange={(v) => set("viaAtual", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {viasAtual.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dose Diária Total ({unidadeAtual}) *</Label>
                <Input type="number" value={form.doseDiaria} onChange={(e) => set("doseDiaria", e.target.value)} placeholder={unidadeAtual} min="0" step="0.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Frequência (opcional)</Label>
                <Input value={form.frequencia} onChange={(e) => set("frequencia", e.target.value)} placeholder="Ex.: 4/4h, 8/8h" />
              </div>
              <div className="space-y-1.5">
                <Label>Tempo de Uso (dias)</Label>
                <Input type="number" value={form.tempoUso} onChange={(e) => set("tempoUso", e.target.value)} placeholder="Dias" min="0" />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label className="cursor-pointer">Opioide-tolerante?</Label>
                <Switch checked={form.opioideTolerant === "1"} onCheckedChange={(c) => set("opioideTolerant", c ? "1" : "0")} />
              </div>
            </div>
          </div>

          {/* Target opioid */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Opioide Desejado *</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Converter Para *</Label>
                <Select value={form.opioideDesejado} onValueChange={(v) => {
                  const o = OPIOIDES.find((x) => x.nome === v);
                  set("opioideDesejado", v);
                  if (o && !o.vias.includes(form.viaDesejada)) {
                    set("viaDesejada", o.vias[0]);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPIOIDES.map((o) => (
                      <SelectItem key={o.nome} value={o.nome}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Via Desejada *</Label>
                <Select value={form.viaDesejada} onValueChange={(v) => set("viaDesejada", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {viasDesejada.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Objetivo da Conversão *</Label>
                <Select value={form.objetivo} onValueChange={(v) => set("objetivo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                  <SelectContent>
                    {OBJETIVOS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.objetivo === "Outro" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descreva o objetivo</Label>
                  <Input value={form.objetivoTexto} onChange={(e) => set("objetivoTexto", e.target.value)} placeholder="Descrição" />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Redução de segurança (tolerância cruzada incompleta)</Label>
                <div className="flex items-center gap-3">
                  <Select value={form.reducaoSeguranca} onValueChange={(v) => set("reducaoSeguranca", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Redução padrão de 25-50% para segurança na rotação</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical context */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Contexto Clínico</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Dor neuropática mista?</Label>
                <Switch checked={form.dorNeuropatica === "1"} onCheckedChange={(c) => set("dorNeuropatica", c ? "1" : "0")} />
              </div>
              <div>
                <Label className="mb-2 block">Comorbidades Relevantes</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMORBIDADES.map((c) => (
                    <label key={c} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.comorbidades.includes(c)} onChange={() => toggleArray("comorbidades", c)} className="rounded border-border h-4 w-4 text-primary" />
                      <span className="text-sm">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Adjuvantes em Uso</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADJUVANTES.map((a) => (
                    <label key={a} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.adjuvantes.includes(a)} onChange={() => toggleArray("adjuvantes", a)} className="rounded border-border h-4 w-4 text-primary" />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={calcular} className="flex-1 sm:flex-none">Calcular Equivalência</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
            {resultado && (
              <>
                <Button variant="outline" onClick={adicionarSimulacao} className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Simular Alternativas
                </Button>
                <Button variant="outline" onClick={() => gerarPDF(form, resultado, modo, simulacoes)} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Gerar PDF
                </Button>
              </>
            )}
          </div>

          {erro && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>
          )}
        </div>

        {/* ─── Right: Results ─── */}
        <div className="space-y-6">
          {!resultado ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Syringe className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Preencha os dados e clique em <strong>Calcular Equivalência</strong> para obter a conversão.
              </p>
            </div>
          ) : (
            <>
              {/* Main result */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 ring-1 ring-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Dose Equivalente de Morfina Oral (DEM)</p>
                <p className="text-3xl font-bold text-primary">{resultado.demMg.toFixed(1)} <span className="text-lg font-normal">mg/dia</span></p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conversão</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Dose calculada:</span>
                    <span className="font-semibold">{resultado.doseCalculada} {resultado.unidade}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Redução ({resultado.reducaoAplicada}%):</span>
                    <span className="font-bold text-primary text-lg">{resultado.doseComReducao} {resultado.unidade}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    de <strong>{form.opioideDesejado}</strong> ({form.viaDesejada})
                  </p>
                </div>
              </div>

              {/* Alerts */}
              {resultado.alertas.length > 0 && (
                <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-6">
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: "hsl(38 92% 50%)" }}>
                    <AlertTriangle className="h-4 w-4" />
                    Alertas
                  </h3>
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

              {/* Simulations */}
              {simulacoes.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Simulações Alternativas</h3>
                    <button onClick={() => setSimulacoes([])} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-auto max-h-60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border">
                          <th className="text-left py-2 pr-2">Opioide</th>
                          <th className="text-left py-2 pr-2">Via</th>
                          <th className="text-right py-2">Dose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulacoes.map((s, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-1.5 pr-2 font-medium">{s.opioide}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground text-xs">{s.via}</td>
                            <td className="py-1.5 text-right font-semibold">{s.doseComReducao} {s.unidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground text-center">
                  Conversões baseadas em CDC, EAPC, WHO e UpToDate. Não substitui avaliação clínica. Dados não armazenados.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
