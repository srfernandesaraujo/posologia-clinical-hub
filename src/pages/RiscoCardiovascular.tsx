import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, FileText, Heart, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
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
type Modelo = "framingham" | "ascvd" | "score2";
type SimNao = "1" | "0";
type Regiao = "low" | "moderate" | "high" | "very_high";
type Modo = "pro" | "paciente";

interface FormData {
  nomePaciente: string;
  data: string;
  modelo: Modelo;
  idade: string;
  sexo: Sexo | "";
  tabagismo: SimNao;
  diabetes: SimNao;
  pas: string;
  colTotal: string;
  hdl: string;
  ldl: string;
  tratHipertensao: SimNao;
  histFamiliar: SimNao;
  imc: string;
  altura: string;
  peso: string;
  glicemia: string;
  regiao: Regiao;
}

interface Resultado {
  risco: number;
  faixa: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

const INITIAL: FormData = {
  nomePaciente: "",
  data: new Date().toISOString().slice(0, 10),
  modelo: "ascvd",
  idade: "",
  sexo: "",
  tabagismo: "0",
  diabetes: "0",
  pas: "",
  colTotal: "",
  hdl: "",
  ldl: "",
  tratHipertensao: "0",
  histFamiliar: "0",
  imc: "",
  altura: "",
  peso: "",
  glicemia: "",
  regiao: "moderate",
};

/* ─── algoritmos ─── */

function calcFramingham(d: FormData): number {
  const age = Number(d.idade);
  const tc = Number(d.colTotal);
  const hdl = Number(d.hdl);
  const sbp = Number(d.pas);
  const isMale = d.sexo === "m";
  const smoker = d.tabagismo === "1";
  const bpTx = d.tratHipertensao === "1";
  const diabetic = d.diabetes === "1";

  if (!age || !tc || !hdl || !sbp) return -1;

  // Simplified Framingham point-based (D'Agostino 2008 general CVD)
  let lnAge = Math.log(age);
  let lnTC = Math.log(tc);
  let lnHDL = Math.log(hdl);
  let lnSBP = Math.log(sbp);

  let s: number, mean: number, beta: number;

  if (isMale) {
    beta =
      3.06117 * lnAge +
      1.1237 * lnTC -
      0.93263 * lnHDL +
      (bpTx ? 1.99881 * lnSBP : 1.93303 * lnSBP) +
      (smoker ? 0.65451 : 0) +
      (diabetic ? 0.57367 : 0);
    mean = 23.9802;
    s = 0.88936;
  } else {
    beta =
      2.32888 * lnAge +
      1.20904 * lnTC -
      0.70833 * lnHDL +
      (bpTx ? 2.82263 * lnSBP : 2.76157 * lnSBP) +
      (smoker ? 0.52873 : 0) +
      (diabetic ? 0.69154 : 0);
    mean = 26.1931;
    s = 0.95012;
  }

  const risk = 1 - Math.pow(s, Math.exp(beta - mean));
  return Math.max(0, Math.min(risk * 100, 100));
}

function calcASCVD(d: FormData): number {
  const age = Number(d.idade);
  const tc = Number(d.colTotal);
  const hdl = Number(d.hdl);
  const sbp = Number(d.pas);
  const isMale = d.sexo === "m";
  const smoker = d.tabagismo === "1";
  const bpTx = d.tratHipertensao === "1";
  const diabetic = d.diabetes === "1";

  if (!age || !tc || !hdl || !sbp || age < 40 || age > 79) return -1;

  // Pooled Cohort Equations (White race coefficients)
  let lnAge = Math.log(age);
  let lnTC = Math.log(tc);
  let lnHDL = Math.log(hdl);
  let lnTreatedSBP = bpTx ? Math.log(sbp) : 0;
  let lnUntreatedSBP = !bpTx ? Math.log(sbp) : 0;

  let indSum: number, meanCoeff: number, baseline: number;

  if (isMale) {
    indSum =
      12.344 * lnAge +
      11.853 * lnTC -
      2.664 * lnAge * lnTC -
      7.99 * lnHDL +
      1.769 * lnAge * lnHDL +
      (bpTx ? 1.797 * lnTreatedSBP : 1.764 * lnUntreatedSBP) +
      (smoker ? 7.837 - 1.795 * lnAge : 0) +
      (diabetic ? 0.658 : 0);
    meanCoeff = 61.18;
    baseline = 0.9144;
  } else {
    indSum =
      -29.799 * lnAge +
      4.884 * lnAge * lnAge +
      13.54 * lnTC -
      3.114 * lnAge * lnTC -
      13.578 * lnHDL +
      3.149 * lnAge * lnHDL +
      (bpTx ? 2.019 * lnTreatedSBP : 1.957 * lnUntreatedSBP) +
      (smoker ? 7.574 - 1.665 * lnAge : 0) +
      (diabetic ? 0.661 : 0);
    meanCoeff = -29.18;
    baseline = 0.9665;
  }

  const risk = 1 - Math.pow(baseline, Math.exp(indSum - meanCoeff));
  return Math.max(0, Math.min(risk * 100, 100));
}

function calcSCORE2(d: FormData): number {
  const age = Number(d.idade);
  const tc = Number(d.colTotal);
  const hdl = Number(d.hdl);
  const sbp = Number(d.pas);
  const isMale = d.sexo === "m";
  const smoker = d.tabagismo === "1";

  if (!age || !tc || !hdl || !sbp || age < 40 || age > 69) return -1;

  const nonHDL = tc - hdl;
  // Simplified SCORE2 estimation
  let base = isMale ? 5.0 : 2.5;

  const ageFactor = (age - 50) * 0.25;
  const sbpFactor = (sbp - 120) * 0.04;
  const cholFactor = (nonHDL - 130) * 0.02;
  const smokeFactor = smoker ? 2.0 : 0;

  const regionMultiplier: Record<Regiao, number> = {
    low: 0.7,
    moderate: 1.0,
    high: 1.3,
    very_high: 1.6,
  };

  let risk = (base + ageFactor + sbpFactor + cholFactor + smokeFactor) * regionMultiplier[d.regiao];
  return Math.max(0, Math.min(risk, 60));
}

function classificar(risco: number, modo: Modo, histFamiliar: boolean): Resultado {
  let multiplier = histFamiliar ? 1.2 : 1;
  const r = risco * multiplier;
  const isPro = modo === "pro";

  if (r < 5) {
    return {
      risco: Math.round(r * 10) / 10,
      faixa: "Baixo Risco",
      cor: "hsl(142 71% 45%)",
      bgClass: "border-green-500/30 bg-green-500/10",
      recomendacoes: isPro
        ? [
            "Manter estilo de vida saudável com dieta equilibrada e atividade física regular.",
            "Monitorar fatores de risco a cada 3-5 anos.",
            "Não há indicação de estatinas neste momento.",
            "Reforçar cessação tabágica se aplicável.",
          ]
        : [
            "Seu risco cardiovascular está baixo. Continue com hábitos saudáveis!",
            "Faça exercícios regularmente e mantenha uma alimentação balanceada.",
            "Visite seu médico para check-up a cada 3-5 anos.",
          ],
    };
  }
  if (r < 7.5) {
    return {
      risco: Math.round(r * 10) / 10,
      faixa: "Risco Moderado",
      cor: "hsl(38 92% 50%)",
      bgClass: "border-orange-400/30 bg-orange-400/10",
      recomendacoes: isPro
        ? [
            "Intensificar mudanças no estilo de vida: dieta mediterrânea, 150min/semana de atividade moderada.",
            "Considerar estatina de intensidade moderada se agravantes presentes.",
            "Avaliar escore de cálcio coronariano (CAC) para reclassificação de risco.",
            "Controle da PA < 130/80 mmHg se fatores adicionais.",
          ]
        : [
            "Seu risco é moderado. Mudanças no estilo de vida são recomendadas.",
            "Converse com seu médico sobre medicamentos para o colesterol.",
            "Um exame de cálcio nas artérias pode ajudar a entender melhor seu risco.",
          ],
    };
  }
  if (r < 20) {
    return {
      risco: Math.round(r * 10) / 10,
      faixa: "Alto Risco",
      cor: "hsl(20 90% 48%)",
      bgClass: "border-orange-600/30 bg-orange-600/10",
      recomendacoes: isPro
        ? [
            "Iniciar estatina de alta intensidade (ex.: Atorvastatina 40-80mg ou Rosuvastatina 20-40mg).",
            "Alvo de LDL-c < 70 mg/dL.",
            "Controle estrito de PA < 130/80 mmHg.",
            "Solicitar escore de cálcio se dúvida na conduta.",
            "Considerar encaminhamento ao cardiologista.",
          ]
        : [
            "Seu risco é alto. É importante iniciar tratamento medicamentoso.",
            "Seu médico provavelmente indicará remédios para baixar o colesterol.",
            "Mudanças na alimentação e exercícios são essenciais.",
            "Considere consultar um cardiologista.",
          ],
    };
  }
  return {
    risco: Math.round(r * 10) / 10,
    faixa: "Muito Alto Risco",
    cor: "hsl(0 72% 51%)",
    bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? [
          "Terapia hipolipemiante de alta intensidade obrigatória.",
          "Alvo de LDL-c < 55 mg/dL. Considerar associação com Ezetimiba ou inibidor de PCSK9.",
          "Controle agressivo de todos os fatores de risco.",
          "Encaminhamento prioritário ao cardiologista.",
          "Avaliar necessidade de antiagregação plaquetária.",
        ]
      : [
          "Seu risco é muito alto. Tratamento intensivo é necessário.",
          "Procure um cardiologista o mais rápido possível.",
          "Medicamentos são indispensáveis neste cenário.",
          "Pare de fumar imediatamente se for o caso.",
        ],
  };
}

/* ─── PDF ─── */
function gerarPDF(form: FormData, resultado: Resultado, modo: Modo) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Risco Cardiovascular Posologia", w / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Individual", w / 2, y, { align: "center" });
  y += 5;
  doc.text(`Autor: Sérgio Araújo • Posologia Produções`, w / 2, y, { align: "center" });
  y += 10;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 8;

  // Patient info
  if (form.nomePaciente) {
    doc.setFont("helvetica", "bold");
    doc.text("Paciente:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(form.nomePaciente, 40, y);
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Data:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(form.data, 30, y);
  y += 6;

  const modeloNome = { framingham: "Framingham", ascvd: "ASCVD (ACC/AHA)", score2: "SCORE2 (ESC)" };
  doc.setFont("helvetica", "bold");
  doc.text("Modelo:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(modeloNome[form.modelo], 36, y);
  y += 10;

  // Data block
  doc.setFont("helvetica", "bold");
  doc.text("Dados Clínicos:", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const dados = [
    `Idade: ${form.idade} anos`,
    `Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}`,
    `PAS: ${form.pas} mmHg`,
    `Colesterol Total: ${form.colTotal} mg/dL`,
    `HDL: ${form.hdl} mg/dL`,
    form.ldl ? `LDL: ${form.ldl} mg/dL` : null,
    `Tabagismo: ${form.tabagismo === "1" ? "Sim" : "Não"}`,
    `Diabetes: ${form.diabetes === "1" ? "Sim" : "Não"}`,
    `Anti-hipertensivo: ${form.tratHipertensao === "1" ? "Sim" : "Não"}`,
    `Hist. Familiar DCV: ${form.histFamiliar === "1" ? "Sim" : "Não"}`,
    form.imc ? `IMC: ${form.imc} kg/m²` : null,
  ].filter(Boolean) as string[];

  dados.forEach((d) => {
    doc.text(`• ${d}`, 18, y);
    y += 5;
  });
  y += 5;

  // Result
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Resultado: ${resultado.risco}% — ${resultado.faixa}`, 14, y);
  y += 10;

  // Recommendations
  doc.setFontSize(10);
  doc.text("Recomendações:", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  resultado.recomendacoes.forEach((r) => {
    const lines = doc.splitTextToSize(`• ${r}`, w - 32);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 2;
  });

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text("Este relatório é uma estimativa e não substitui avaliação médica presencial.", 14, y);
  y += 4;
  doc.text(`Modo: ${modo === "pro" ? "Profissional" : "Paciente"} • Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);

  doc.save(`risco-cv-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

/* ─── Component ─── */
export default function RiscoCardiovascular() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("pro");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setResultado(null);
    setErro("");
  };

  // Auto-calc IMC from height+weight
  const imcCalc = useMemo(() => {
    if (form.altura && form.peso) {
      const h = Number(form.altura) / 100;
      const w = Number(form.peso);
      if (h > 0 && w > 0) return (w / (h * h)).toFixed(1);
    }
    return form.imc || "";
  }, [form.altura, form.peso, form.imc]);

  const calcular = () => {
    if (!form.sexo || !form.idade || !form.pas || !form.colTotal || !form.hdl) {
      setErro("Preencha todos os campos obrigatórios (*).");
      return;
    }

    let risco: number;
    switch (form.modelo) {
      case "framingham":
        risco = calcFramingham(form);
        break;
      case "ascvd":
        risco = calcASCVD(form);
        break;
      case "score2":
        risco = calcSCORE2(form);
        break;
    }

    if (risco < 0) {
      setErro(
        form.modelo === "ascvd"
          ? "O modelo ASCVD é válido para idades entre 40-79 anos."
          : form.modelo === "score2"
          ? "O modelo SCORE2 é válido para idades entre 40-69 anos."
          : "Verifique os dados preenchidos."
      );
      return;
    }

    const res = classificar(risco, modo, form.histFamiliar === "1");
    setResultado(res);
    saveCalculation({
      calculatorName: "Risco Cardiovascular",
      calculatorSlug: "risco-cardiovascular",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${res.risco}% – ${res.faixa} (${form.modelo.toUpperCase()})`,
      details: { Modelo: form.modelo.toUpperCase(), Idade: form.idade, Sexo: form.sexo === "m" ? "Masculino" : "Feminino", PAS: `${form.pas} mmHg`, "Col. Total": `${form.colTotal} mg/dL`, HDL: `${form.hdl} mg/dL`, Risco: `${res.risco}%`, Classificação: res.faixa },
    });
  };

  const limpar = () => {
    setForm(INITIAL);
    setResultado(null);
    setErro("");
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
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Risco Cardiovascular Posologia</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Estima o risco de eventos cardiovasculares em 10 anos via Framingham, ASCVD ou SCORE2.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="risco-cardiovascular" toolName="Calculadora de Risco Cardiovascular" />
            <CalculationHistory calculatorSlug="risco-cardiovascular" />
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

      <HistoryConsentBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Inputs ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do Paciente</Label>
                <Input placeholder="Ex: João Silva" value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} className="bg-background" />
              </div>
            </div>
          </div>

          {/* Model + Demographics */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Modelo e Dados Demográficos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Modelo de Cálculo <span className="text-destructive">*</span></Label>
                <Select value={form.modelo} onValueChange={(v) => set("modelo", v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ascvd">ASCVD (ACC/AHA)</SelectItem>
                    <SelectItem value="score2">SCORE2 (ESC)</SelectItem>
                    <SelectItem value="framingham">Framingham</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Idade <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="Anos" value={form.idade} onChange={(e) => set("idade", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo <span className="text-destructive">*</span></Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Masculino</SelectItem>
                    <SelectItem value="f">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.modelo === "score2" && (
              <div className="mt-4 space-y-1.5">
                <Label>Região Geográfica (SCORE2)</Label>
                <Select value={form.regiao} onValueChange={(v) => set("regiao", v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo Risco (ex: França, Espanha)</SelectItem>
                    <SelectItem value="moderate">Risco Moderado (ex: Alemanha, Portugal)</SelectItem>
                    <SelectItem value="high">Alto Risco (ex: Leste Europeu)</SelectItem>
                    <SelectItem value="very_high">Muito Alto Risco (ex: Rússia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Clinical data */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Clínicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pressão Arterial Sistólica <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="mmHg" value={form.pas} onChange={(e) => set("pas", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Colesterol Total <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="mg/dL" value={form.colTotal} onChange={(e) => set("colTotal", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>HDL-Colesterol <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="mg/dL" value={form.hdl} onChange={(e) => set("hdl", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>LDL-Colesterol <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input type="number" placeholder="mg/dL" value={form.ldl} onChange={(e) => set("ldl", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Glicemia de Jejum <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input type="number" placeholder="mg/dL" value={form.glicemia} onChange={(e) => set("glicemia", e.target.value)} className="bg-background" />
              </div>
            </div>
          </div>

          {/* Anthropometrics */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Antropometria</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Altura <span className="text-muted-foreground text-xs">(cm)</span></Label>
                <Input type="number" placeholder="170" value={form.altura} onChange={(e) => set("altura", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Peso <span className="text-muted-foreground text-xs">(kg)</span></Label>
                <Input type="number" placeholder="75" value={form.peso} onChange={(e) => set("peso", e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>IMC <span className="text-muted-foreground text-xs">(auto)</span></Label>
                <Input
                  type="number"
                  placeholder="kg/m²"
                  value={imcCalc}
                  onChange={(e) => set("imc", e.target.value)}
                  className="bg-background"
                  readOnly={!!(form.altura && form.peso)}
                />
              </div>
            </div>
          </div>

          {/* Risk factors */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Fatores de Risco</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["tabagismo", "Tabagismo Atual"],
                ["diabetes", "Diabetes Mellitus"],
                ["tratHipertensao", "Uso de Anti-hipertensivo"],
                ["histFamiliar", "Hist. Familiar DCV Precoce"],
              ] as [keyof FormData, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <Label className="cursor-pointer">{label}</Label>
                  <Switch
                    checked={form[key] === "1"}
                    onCheckedChange={(v) => set(key, v ? "1" : "0")}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button size="lg" onClick={calcular} className="gap-2 flex-1 sm:flex-none">
              <Heart className="h-4 w-4" />
              Calcular Risco
            </Button>
            <Button size="lg" variant="outline" onClick={limpar}>
              Limpar
            </Button>
          </div>

          {erro && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {erro}
            </div>
          )}
        </div>

        {/* ─── Right: Result ─── */}
        <div className="space-y-6">
          {resultado ? (
            <>
              {/* Risk gauge */}
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <p className="text-sm text-muted-foreground mb-1">Risco em 10 anos</p>
                <p className="text-5xl font-bold" style={{ color: resultado.cor }}>
                  {resultado.risco}%
                </p>
                <p className="text-lg font-semibold mt-1" style={{ color: resultado.cor }}>
                  {resultado.faixa}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Modelo: {{ framingham: "Framingham", ascvd: "ASCVD", score2: "SCORE2" }[form.modelo]}
                </p>
              </div>

              {/* Recommendations */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">
                  {modo === "pro" ? "Condutas Sugeridas" : "Recomendações para Você"}
                </h3>
                <ul className="space-y-2.5">
                  {resultado.recomendacoes.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: resultado.cor }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* PDF */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => gerarPDF(form, resultado, modo)}
              >
                <FileText className="h-4 w-4" />
                Gerar Relatório PDF
              </Button>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Preencha os dados e clique em <strong>Calcular Risco</strong> para ver o resultado.
              </p>
            </div>
          )}

          {/* Risk scale legend */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Escala de Risco</h3>
            <div className="space-y-2">
              {[
                { label: "Baixo", range: "< 5%", color: "hsl(142 71% 45%)" },
                { label: "Moderado", range: "5 – 7,5%", color: "hsl(38 92% 50%)" },
                { label: "Alto", range: "7,5 – 20%", color: "hsl(20 90% 48%)" },
                { label: "Muito Alto", range: "> 20%", color: "hsl(0 72% 51%)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground ml-auto">{s.range}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Autor: Sérgio Araújo • Posologia Produções
          </p>
        </div>
      </div>
    </div>
  );
}
