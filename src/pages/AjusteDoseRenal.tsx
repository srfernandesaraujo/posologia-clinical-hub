import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Beaker, User, Stethoscope, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

type Sexo = "m" | "f";
type Modo = "clinico" | "educativo";

interface FormData {
  nomePaciente: string;
  data: string;
  idade: string;
  sexo: Sexo | "";
  peso: string;
  altura: string;
  creatinina: string;
  medicamento: string;
  doseAtual: string;
  frequencia: string;
  indicacao: string;
}

const INITIAL: FormData = {
  nomePaciente: "",
  data: new Date().toISOString().slice(0, 10),
  idade: "",
  sexo: "",
  peso: "",
  altura: "",
  creatinina: "",
  medicamento: "",
  doseAtual: "",
  frequencia: "",
  indicacao: "",
};

// Drug database with renal adjustments
const DRUG_DB: Record<string, { nome: string; ajustes: { min: number; max: number; dose: string; intervalo: string; obs: string }[]; dializavel: boolean; nefrotóxico: boolean; monitorar: boolean }> = {
  metformina: {
    nome: "Metformina",
    ajustes: [
      { min: 60, max: 999, dose: "Dose habitual", intervalo: "Manter", obs: "Sem necessidade de ajuste" },
      { min: 45, max: 59, dose: "Reduzir para 50%", intervalo: "Manter", obs: "Monitorar função renal a cada 3 meses" },
      { min: 30, max: 44, dose: "500mg/dia (máx)", intervalo: "1x/dia", obs: "Risco aumentado de acidose láctica. Avaliar risco-benefício" },
      { min: 0, max: 29, dose: "CONTRAINDICADA", intervalo: "N/A", obs: "Risco elevado de acidose láctica. Substituir por insulina ou outro hipoglicemiante" },
    ],
    dializavel: true, nefrotóxico: false, monitorar: false,
  },
  gentamicina: {
    nome: "Gentamicina",
    ajustes: [
      { min: 80, max: 999, dose: "Dose habitual", intervalo: "8/8h", obs: "Monitorar níveis séricos" },
      { min: 60, max: 79, dose: "Dose habitual", intervalo: "12/12h", obs: "Estender intervalo. Monitorar nível vale" },
      { min: 40, max: 59, dose: "Dose habitual", intervalo: "24/24h", obs: "Monitorar nível sérico e creatinina diariamente" },
      { min: 20, max: 39, dose: "50-70% da dose", intervalo: "24-48h", obs: "Monitoramento rigoroso. Considerar alternativa" },
      { min: 0, max: 19, dose: "Dose conforme nível sérico", intervalo: "48-72h", obs: "Apenas se sem alternativa. Dosagem por nível sérico obrigatória" },
    ],
    dializavel: true, nefrotóxico: true, monitorar: true,
  },
  vancomicina: {
    nome: "Vancomicina",
    ajustes: [
      { min: 90, max: 999, dose: "15-20mg/kg", intervalo: "8-12h", obs: "Monitorar nível vale (15-20 µg/mL para infecções graves)" },
      { min: 50, max: 89, dose: "15-20mg/kg", intervalo: "12-24h", obs: "Ajustar conforme nível sérico" },
      { min: 20, max: 49, dose: "15-20mg/kg", intervalo: "24-48h", obs: "Monitoramento obrigatório de nível sérico" },
      { min: 0, max: 19, dose: "15-20mg/kg dose única", intervalo: "Conforme nível", obs: "Guiar exclusivamente por nível sérico" },
    ],
    dializavel: false, nefrotóxico: true, monitorar: true,
  },
  amoxicilina: {
    nome: "Amoxicilina",
    ajustes: [
      { min: 30, max: 999, dose: "Dose habitual", intervalo: "Manter", obs: "Sem necessidade de ajuste" },
      { min: 10, max: 29, dose: "Dose habitual", intervalo: "12/12h", obs: "Estender intervalo" },
      { min: 0, max: 9, dose: "Dose habitual", intervalo: "24/24h", obs: "Estender intervalo. Risco de acúmulo" },
    ],
    dializavel: true, nefrotóxico: false, monitorar: false,
  },
  ciprofloxacino: {
    nome: "Ciprofloxacino",
    ajustes: [
      { min: 30, max: 999, dose: "Dose habitual", intervalo: "Manter", obs: "Sem ajuste necessário" },
      { min: 5, max: 29, dose: "50-75% da dose", intervalo: "Manter", obs: "Reduzir dose" },
      { min: 0, max: 4, dose: "50% da dose", intervalo: "24/24h", obs: "Ajuste significativo necessário" },
    ],
    dializavel: false, nefrotóxico: false, monitorar: false,
  },
  gabapentina: {
    nome: "Gabapentina",
    ajustes: [
      { min: 60, max: 999, dose: "300-1200mg", intervalo: "8/8h", obs: "Dose habitual" },
      { min: 30, max: 59, dose: "200-700mg", intervalo: "12/12h", obs: "Reduzir dose e estender intervalo" },
      { min: 15, max: 29, dose: "200-700mg", intervalo: "24/24h", obs: "Dose única diária" },
      { min: 0, max: 14, dose: "100-300mg", intervalo: "24/24h", obs: "Dose reduzida. Suplementar após diálise" },
    ],
    dializavel: true, nefrotóxico: false, monitorar: false,
  },
  enalapril: {
    nome: "Enalapril",
    ajustes: [
      { min: 30, max: 999, dose: "Dose habitual", intervalo: "Manter", obs: "Monitorar potássio e creatinina" },
      { min: 10, max: 29, dose: "50-75% da dose", intervalo: "Manter", obs: "Iniciar com dose baixa. Monitorar K+ e creatinina" },
      { min: 0, max: 9, dose: "25-50% da dose", intervalo: "Manter", obs: "Risco de hipercalemia. Considerar alternativa" },
    ],
    dializavel: true, nefrotóxico: false, monitorar: true,
  },
  alopurinol: {
    nome: "Alopurinol",
    ajustes: [
      { min: 60, max: 999, dose: "Dose habitual (até 800mg)", intervalo: "Manter", obs: "Sem ajuste" },
      { min: 30, max: 59, dose: "200mg/dia", intervalo: "24/24h", obs: "Reduzir dose" },
      { min: 10, max: 29, dose: "100mg/dia", intervalo: "24/24h", obs: "Dose reduzida" },
      { min: 0, max: 9, dose: "100mg em dias alternados", intervalo: "48/48h", obs: "Risco de acúmulo de oxipurinol" },
    ],
    dializavel: true, nefrotóxico: false, monitorar: false,
  },
  levofloxacino: {
    nome: "Levofloxacino",
    ajustes: [
      { min: 50, max: 999, dose: "Dose habitual", intervalo: "Manter", obs: "Sem ajuste" },
      { min: 20, max: 49, dose: "50% da dose ou intervalo estendido", intervalo: "24-48h", obs: "Ajustar conforme indicação" },
      { min: 0, max: 19, dose: "50% da dose", intervalo: "48/48h", obs: "Redução significativa necessária" },
    ],
    dializavel: false, nefrotóxico: false, monitorar: false,
  },
  digoxina: {
    nome: "Digoxina",
    ajustes: [
      { min: 60, max: 999, dose: "0.125-0.25mg", intervalo: "24/24h", obs: "Dose habitual. Monitorar nível sérico" },
      { min: 30, max: 59, dose: "0.0625-0.125mg", intervalo: "24/24h", obs: "Reduzir dose. Monitorar nível sérico (0.5-0.9 ng/mL)" },
      { min: 10, max: 29, dose: "0.0625mg", intervalo: "24-48h", obs: "Dose mínima. Monitoramento rigoroso" },
      { min: 0, max: 9, dose: "Evitar ou dose mínima guiada por nível", intervalo: "48h ou mais", obs: "Alto risco de toxicidade. Preferir alternativas" },
    ],
    dializavel: false, nefrotóxico: false, monitorar: true,
  },
};

const DRUG_LIST = Object.entries(DRUG_DB).map(([key, v]) => ({ value: key, label: v.nome }));

interface Resultado {
  crcl: number;
  egfr: number;
  estagio: string;
  estagioLabel: string;
  ajusteDose: { dose: string; intervalo: string; obs: string } | null;
  drugInfo: typeof DRUG_DB[string] | null;
  cor: string;
  bgClass: string;
}

function calcCockcroftGault(idade: number, peso: number, creatinina: number, sexo: Sexo): number {
  let crcl = ((140 - idade) * peso) / (72 * creatinina);
  if (sexo === "f") crcl *= 0.85;
  return Math.round(crcl * 10) / 10;
}

function calcCKDEPI(idade: number, creatinina: number, sexo: Sexo): number {
  const isFemale = sexo === "f";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const femFactor = isFemale ? 1.012 : 1;
  const scrKappa = creatinina / kappa;
  const egfr = 142 * Math.pow(Math.min(scrKappa, 1), alpha) * Math.pow(Math.max(scrKappa, 1), -1.2) * Math.pow(0.9938, idade) * femFactor;
  return Math.round(egfr * 10) / 10;
}

function classificarDRC(egfr: number): { estagio: string; label: string; cor: string; bgClass: string } {
  if (egfr >= 90) return { estagio: "G1", label: "Normal ou alta (≥90)", cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10" };
  if (egfr >= 60) return { estagio: "G2", label: "Levemente reduzida (60-89)", cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10" };
  if (egfr >= 45) return { estagio: "G3a", label: "Leve a moderadamente reduzida (45-59)", cor: "hsl(38 92% 50%)", bgClass: "border-orange-400/30 bg-orange-400/10" };
  if (egfr >= 30) return { estagio: "G3b", label: "Moderada a gravemente reduzida (30-44)", cor: "hsl(38 92% 50%)", bgClass: "border-orange-400/30 bg-orange-400/10" };
  if (egfr >= 15) return { estagio: "G4", label: "Gravemente reduzida (15-29)", cor: "hsl(20 90% 48%)", bgClass: "border-orange-600/30 bg-orange-600/10" };
  return { estagio: "G5", label: "Falência renal (<15)", cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10" };
}

function gerarPDF(form: FormData, resultado: Resultado, modo: Modo) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Ajuste de Dose Renal - Posologia", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatorio Clinico Individual", w / 2, y, { align: "center" });
  y += 5;
  doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 8;
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

  doc.setFont("helvetica", "bold");
  doc.text("Dados Clinicos:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const dados = [
    `Idade: ${form.idade} anos`,
    `Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}`,
    `Peso: ${form.peso} kg`,
    form.altura ? `Altura: ${form.altura} cm` : null,
    `Creatinina serica: ${form.creatinina} mg/dL`,
    form.medicamento ? `Medicamento: ${resultado.drugInfo?.nome || form.medicamento}` : null,
    form.doseAtual ? `Dose atual: ${form.doseAtual} ${form.frequencia}` : null,
    form.indicacao ? `Indicacao: ${form.indicacao}` : null,
  ].filter(Boolean) as string[];
  dados.forEach((d) => { doc.text(`  ${d}`, 18, y); y += 4.5; });
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Cockcroft-Gault (CrCl): ${resultado.crcl} mL/min`, 14, y);
  y += 5;
  doc.text(`CKD-EPI (eGFR): ${resultado.egfr} mL/min/1.73m2`, 14, y);
  y += 5;
  doc.text(`Estagio DRC (KDIGO): ${resultado.estagio} - ${resultado.estagioLabel}`, 14, y);
  y += 8;

  if (resultado.ajusteDose) {
    doc.setFontSize(10);
    doc.text("Ajuste de Dose Recomendado:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`  Dose: ${resultado.ajusteDose.dose}`, 18, y); y += 4.5;
    doc.text(`  Intervalo: ${resultado.ajusteDose.intervalo}`, 18, y); y += 4.5;
    const obsLines = doc.splitTextToSize(`  Obs: ${resultado.ajusteDose.obs}`, w - 32);
    doc.text(obsLines, 18, y); y += obsLines.length * 4.5;
    y += 4;
    if (resultado.drugInfo) {
      doc.text(`  Dializavel: ${resultado.drugInfo.dializavel ? "Sim" : "Nao"}`, 18, y); y += 4.5;
      doc.text(`  Nefrotóxico: ${resultado.drugInfo.nefrotóxico ? "Sim" : "Nao"}`, 18, y); y += 4.5;
      doc.text(`  Monitoramento de nivel serico: ${resultado.drugInfo.monitorar ? "Sim" : "Nao"}`, 18, y); y += 4.5;
    }
  }

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text("Este relatorio e uma estimativa e nao substitui avaliacao medica presencial.", 14, y);
  y += 3.5;
  doc.text(`Modo: ${modo === "clinico" ? "Clinico" : "Educativo"} | Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);
  doc.save(`ajuste-dose-renal-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function AjusteDoseRenal() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setResultado(null);
    setErro("");
  };

  const imc = useMemo(() => {
    if (form.altura && form.peso) {
      const h = Number(form.altura) / 100;
      const w = Number(form.peso);
      if (h > 0 && w > 0) return (w / (h * h)).toFixed(1);
    }
    return "";
  }, [form.altura, form.peso]);

  const calcular = () => {
    if (!form.sexo || !form.idade || !form.peso || !form.creatinina) {
      setErro("Preencha todos os campos obrigatórios (*).");
      return;
    }
    const idade = Number(form.idade);
    const peso = Number(form.peso);
    const cr = Number(form.creatinina);
    if (cr <= 0) { setErro("Creatinina deve ser > 0."); return; }

    const crcl = calcCockcroftGault(idade, peso, cr, form.sexo as Sexo);
    const egfr = calcCKDEPI(idade, cr, form.sexo as Sexo);
    const classif = classificarDRC(egfr);

    let ajusteDose: Resultado["ajusteDose"] = null;
    let drugInfo: Resultado["drugInfo"] = null;

    if (form.medicamento && DRUG_DB[form.medicamento]) {
      drugInfo = DRUG_DB[form.medicamento];
      const referencia = crcl; // Use CrCl for drug adjustments
      const ajuste = drugInfo.ajustes.find((a) => referencia >= a.min && referencia <= a.max);
      if (ajuste) ajusteDose = { dose: ajuste.dose, intervalo: ajuste.intervalo, obs: ajuste.obs };
    }

    const res: Resultado = {
      crcl, egfr,
      estagio: classif.estagio,
      estagioLabel: classif.label,
      ajusteDose, drugInfo,
      cor: classif.cor,
      bgClass: classif.bgClass,
    };
    setResultado(res);
    saveCalculation({
      calculatorName: "Ajuste de Dose Renal",
      calculatorSlug: "ajuste-dose-renal",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `CrCl: ${crcl} – eGFR: ${egfr} – ${classif.estagio}`,
      details: { CrCl: `${crcl} mL/min`, eGFR: `${egfr} mL/min/1.73m²`, Estágio: classif.estagio, Classificação: classif.label, ...(drugInfo ? { Medicamento: drugInfo.nome } : {}), ...(ajusteDose ? { Ajuste: ajusteDose.dose } : {}) },
    });
  };

  const limpar = () => { setForm(INITIAL); setResultado(null); setErro(""); };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar às Calculadoras
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Beaker className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Ajuste de Dose Renal</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Cockcroft-Gault, CKD-EPI e ajuste de dose para insuficiência renal.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalculationHistory calculatorSlug="ajuste-dose-renal" />
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("clinico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "clinico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Clínico
            </button>
            <button onClick={() => setModo("educativo")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "educativo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <User className="h-3.5 w-3.5" /> Educativo
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            </div>
          </div>

          {/* Clinical Data */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Clínicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Idade (anos) *</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" value={form.peso} onChange={(e) => set("peso", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Altura (cm)</Label><Input type="number" value={form.altura} onChange={(e) => set("altura", e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Creatinina Sérica (mg/dL) *</Label><Input type="number" step="0.01" value={form.creatinina} onChange={(e) => set("creatinina", e.target.value)} /></div>
              {imc && <div className="space-y-1.5"><Label>IMC calculado</Label><div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm">{imc} kg/m²</div></div>}
            </div>
          </div>

          {/* Drug */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Medicamento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Medicamento</Label>
                <Select value={form.medicamento} onValueChange={(v) => set("medicamento", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o medicamento" /></SelectTrigger>
                  <SelectContent>{DRUG_LIST.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Dose atual</Label><Input value={form.doseAtual} onChange={(e) => set("doseAtual", e.target.value)} placeholder="Ex: 500mg" /></div>
              <div className="space-y-1.5"><Label>Frequência</Label><Input value={form.frequencia} onChange={(e) => set("frequencia", e.target.value)} placeholder="Ex: 8/8h" /></div>
              <div className="space-y-1.5"><Label>Indicação</Label><Input value={form.indicacao} onChange={(e) => set("indicacao", e.target.value)} placeholder="Ex: Infecção urinária" /></div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Como funcionam os cálculos?</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Cockcroft-Gault:</strong> Estima a depuração de creatinina (CrCl) usando idade, peso, creatinina sérica e sexo. Fórmula: CrCl = [(140 - idade) × peso] / (72 × creatinina sérica). Para mulheres, multiplica-se por 0,85.</p>
                <p><strong>CKD-EPI (2021):</strong> Calcula a taxa de filtração glomerular estimada (eGFR) sem usar raça. É mais precisa que a MDRD para eGFR &gt; 60.</p>
                <p><strong>Estadiamento KDIGO:</strong> Classifica a doença renal crônica de G1 (normal) a G5 (falência renal), orientando condutas e ajustes de medicamentos.</p>
                <p><strong>Ajuste de dose:</strong> Medicamentos eliminados pelos rins precisam ter sua dose ou intervalo ajustados conforme a função renal, para evitar toxicidade.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Função Renal</h2>
                <div className="space-y-3">
                  <div><span className="text-xs text-muted-foreground">Cockcroft-Gault (CrCl)</span><p className="text-2xl font-bold" style={{ color: resultado.cor }}>{resultado.crcl} mL/min</p></div>
                  <div><span className="text-xs text-muted-foreground">CKD-EPI (eGFR)</span><p className="text-2xl font-bold" style={{ color: resultado.cor }}>{resultado.egfr} mL/min/1.73m²</p></div>
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Estágio DRC (KDIGO)</span>
                    <p className="font-bold text-lg" style={{ color: resultado.cor }}>{resultado.estagio}</p>
                    <p className="text-sm text-muted-foreground">{resultado.estagioLabel}</p>
                  </div>
                </div>
              </div>

              {resultado.ajusteDose && resultado.drugInfo && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Ajuste de Dose — {resultado.drugInfo.nome}</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Dose:</span><span className="font-medium">{resultado.ajusteDose.dose}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Intervalo:</span><span className="font-medium">{resultado.ajusteDose.intervalo}</span></div>
                    <p className="text-muted-foreground mt-2 text-xs">{resultado.ajusteDose.obs}</p>
                    <div className="pt-3 border-t border-border/50 mt-3 space-y-1">
                      <div className="flex justify-between text-xs"><span>Dialisável:</span><span>{resultado.drugInfo.dializavel ? "Sim" : "Não"}</span></div>
                      <div className="flex justify-between text-xs"><span>Nefrotóxico:</span><span className={resultado.drugInfo.nefrotóxico ? "text-destructive font-medium" : ""}>{resultado.drugInfo.nefrotóxico ? "⚠ Sim" : "Não"}</span></div>
                      <div className="flex justify-between text-xs"><span>Monitorar nível sérico:</span><span>{resultado.drugInfo.monitorar ? "Sim" : "Não"}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {resultado.drugInfo?.nefrotóxico && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">Este medicamento é potencialmente nefrotóxico. Monitorar creatinina regularmente e considerar alternativas menos nefrotóxicas.</p>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(form, resultado, modo)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Beaker className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong> para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
