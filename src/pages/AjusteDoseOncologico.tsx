import { useState, useMemo } from "react";
import { ArrowLeft, FileText, Pill, AlertTriangle, Beaker, FlaskConical } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import jsPDF from "jspdf";

/* ─── RENAL DRUG TABLE ─── */
interface RenalDrug {
  name: string;
  adjustments: Record<string, string>;
}

const RENAL_DRUGS: RenalDrug[] = [
  { name: "Cisplatina", adjustments: { ">60": "100% da dose", "45-60": "75% da dose", "30-45": "50% da dose", "<30": "Contraindicada" } },
  { name: "Carboplatina", adjustments: { ">60": "Calvert (AUC)", "45-60": "Calvert (AUC)", "30-45": "Calvert (AUC)", "<30": "Calvert (AUC) — usar com cautela" } },
  { name: "Capecitabina", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "75% da dose", "<30": "Contraindicada" } },
  { name: "Metotrexato", adjustments: { ">60": "100% da dose", "45-60": "75% da dose", "30-45": "50% da dose", "<30": "Contraindicado" } },
  { name: "Pemetrexede", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "Evitar — dados limitados", "<30": "Contraindicado" } },
  { name: "Lenalidomida", adjustments: { ">60": "25 mg/dia", "45-60": "10 mg/dia", "30-45": "15 mg 48/48h", "<30": "5 mg/dia (diálise: pós-HD)" } },
  { name: "Etoposido", adjustments: { ">60": "100% da dose", "45-60": "75% da dose", "30-45": "75% da dose", "<30": "50% da dose" } },
  { name: "Bleomicina", adjustments: { ">60": "100% da dose", "45-60": "75% da dose", "30-45": "50% da dose", "<30": "Contraindicada" } },
  { name: "Topotecano", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "50% da dose (0.75 mg/m²)", "<30": "Dados insuficientes" } },
  { name: "Oxaliplatina", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "Reduzir — evidência limitada", "<30": "Evitar" } },
  { name: "Fludarabina", adjustments: { ">60": "100% da dose", "45-60": "80% da dose", "30-45": "50% da dose", "<30": "Contraindicada" } },
  { name: "Ifosfamida", adjustments: { ">60": "100% da dose", "45-60": "75% da dose", "30-45": "Evitar", "<30": "Contraindicada" } },
  { name: "Gemcitabina", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "100% (monitorar)", "<30": "Dados limitados" } },
  { name: "Citarabina", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "50% (altas doses)", "<30": "Evitar altas doses" } },
  { name: "Ciclofosfamida", adjustments: { ">60": "100% da dose", "45-60": "100% da dose", "30-45": "75% da dose", "<30": "50% — suplementar pós-HD" } },
];

/* ─── HEPATIC: NCI-ODWG drugs ─── */
interface HepaticDrug {
  name: string;
  adjustments: Record<string, string>;
}

const NCIODWG_DRUGS: HepaticDrug[] = [
  { name: "Docetaxel", adjustments: { "Normal": "100%", "A": "75%", "B": "Contraindicado", "C": "Contraindicado", "D": "Contraindicado" } },
  { name: "Paclitaxel", adjustments: { "Normal": "175 mg/m²", "A": "135 mg/m²", "B": "90 mg/m²", "C": "Evitar", "D": "Contraindicado" } },
  { name: "Doxorrubicina", adjustments: { "Normal": "100%", "A": "75%", "B": "50%", "C": "25%", "D": "Contraindicada" } },
  { name: "Vincristina", adjustments: { "Normal": "100%", "A": "100%", "B": "50%", "C": "Omitir", "D": "Contraindicada" } },
  { name: "Irinotecano", adjustments: { "Normal": "100%", "A": "Reduzir", "B": "Evitar", "C": "Contraindicado", "D": "Contraindicado" } },
  { name: "Etoposido IV", adjustments: { "Normal": "100%", "A": "50%", "B": "Evitar", "C": "Contraindicado", "D": "Contraindicado" } },
  { name: "Ciclofosfamida", adjustments: { "Normal": "100%", "A": "100%", "B": "75%", "C": "Individualizar", "D": "Evitar" } },
  { name: "Gemcitabina", adjustments: { "Normal": "100%", "A": "100%", "B": "Cautela", "C": "Evitar", "D": "Contraindicada" } },
];

const CHILDPUGH_TKIS: HepaticDrug[] = [
  { name: "Sorafenibe", adjustments: { "A": "400 mg 2x/dia", "B": "200 mg 2x/dia", "C": "Contraindicado" } },
  { name: "Sunitinibe", adjustments: { "A": "50 mg/dia", "B": "50 mg (monitorar)", "C": "Não recomendado" } },
  { name: "Erlotinibe", adjustments: { "A": "150 mg/dia", "B": "Reduzir (cautela)", "C": "Evitar" } },
  { name: "Imatinibe", adjustments: { "A": "400 mg/dia", "B": "300 mg/dia", "C": "200 mg/dia" } },
  { name: "Lapatinibe", adjustments: { "A": "1250 mg/dia", "B": "750 mg/dia", "C": "Contraindicado" } },
  { name: "Pazopanibe", adjustments: { "A": "800 mg/dia", "B": "200 mg/dia", "C": "Contraindicado" } },
  { name: "Regorafenibe", adjustments: { "A": "160 mg/dia", "B": "Contraindicado", "C": "Contraindicado" } },
  { name: "Lenvatinibe", adjustments: { "A": "Dose padrão", "B": "Reduzir 50%", "C": "Contraindicado" } },
  { name: "Cabozantinibe", adjustments: { "A": "60 mg/dia", "B": "40 mg/dia", "C": "Evitar" } },
];

function sanitizePDF(text: string): string {
  return text
    .replace(/ã/g, "a").replace(/õ/g, "o").replace(/á/g, "a").replace(/é/g, "e")
    .replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ê/g, "e")
    .replace(/ô/g, "o").replace(/â/g, "a").replace(/ç/g, "c").replace(/ü/g, "u")
    .replace(/Ã/g, "A").replace(/Õ/g, "O").replace(/Á/g, "A").replace(/É/g, "E")
    .replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U").replace(/Ê/g, "E")
    .replace(/Ô/g, "O").replace(/Â/g, "A").replace(/Ç/g, "C")
    .replace(/[^\x00-\x7F]/g, "");
}

function cockcroftGault(peso: number, idade: number, creatinina: number, sexo: "M" | "F"): number {
  const base = ((140 - idade) * peso) / (72 * creatinina);
  return sexo === "F" ? base * 0.85 : base;
}

function getClCrFaixa(clcr: number): string {
  if (clcr > 60) return ">60";
  if (clcr >= 45) return "45-60";
  if (clcr >= 30) return "30-45";
  return "<30";
}

function getNciOdwgGroup(bilirubina: number, ast: number, ulnBili: number, ulnAst: number): string {
  const biliRatio = bilirubina / ulnBili;
  const astRatio = ast / ulnAst;
  if (biliRatio <= 1 && astRatio <= 1) return "Normal";
  if (biliRatio <= 1 && astRatio > 1) return "A";
  if (biliRatio > 1 && biliRatio <= 1.5) return "B";
  if (biliRatio > 1.5 && biliRatio <= 3) return "C";
  return "D";
}

function getChildPughScore(bilirrubina: number, albumina: number, inr: number, ascite: number, encefalopatia: number): { score: number; classe: string } {
  let score = 0;
  // Bilirrubina
  if (bilirrubina < 2) score += 1; else if (bilirrubina <= 3) score += 2; else score += 3;
  // Albumina
  if (albumina > 3.5) score += 1; else if (albumina >= 2.8) score += 2; else score += 3;
  // INR
  if (inr < 1.7) score += 1; else if (inr <= 2.3) score += 2; else score += 3;
  // Ascite (1=ausente, 2=leve, 3=moderada-grave)
  score += ascite;
  // Encefalopatia (1=ausente, 2=grau I-II, 3=grau III-IV)
  score += encefalopatia;

  let classe = "A";
  if (score >= 10) classe = "C";
  else if (score >= 7) classe = "B";
  return { score, classe };
}

export default function AjusteDoseOncologico() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const SLUG = "ajuste-dose-oncologico";
  const { hasConsent, saveCalculation, getByCalculator } = useCalculationHistory();

  const [aba, setAba] = useState("carboplatina");
  const [nomePaciente, setNomePaciente] = useState("");

  // ─── Carboplatina state ───
  const [aucAlvo, setAucAlvo] = useState(5);
  const [tfgMode, setTfgMode] = useState<"direto" | "calcular">("direto");
  const [tfgDireto, setTfgDireto] = useState<number>(0);
  const [carboPeso, setCarboPeso] = useState<number>(0);
  const [carboIdade, setCarboIdade] = useState<number>(0);
  const [carboCreat, setCarboCreat] = useState<number>(0);
  const [carboSexo, setCarboSexo] = useState<"M" | "F">("M");

  // ─── Renal state ───
  const [renalPeso, setRenalPeso] = useState<number>(0);
  const [renalIdade, setRenalIdade] = useState<number>(0);
  const [renalCreat, setRenalCreat] = useState<number>(0);
  const [renalSexo, setRenalSexo] = useState<"M" | "F">("M");
  const [renalDrug, setRenalDrug] = useState("");

  // ─── Hepatic state ───
  const [hepaticMode, setHepaticMode] = useState<"nci" | "childpugh">("nci");
  const [nciBili, setNciBili] = useState<number>(0);
  const [nciAst, setNciAst] = useState<number>(0);
  const [nciUlnBili, setNciUlnBili] = useState<number>(1.2);
  const [nciUlnAst, setNciUlnAst] = useState<number>(40);
  const [nciDrug, setNciDrug] = useState("");
  const [cpBili, setCpBili] = useState<number>(0);
  const [cpAlb, setCpAlb] = useState<number>(0);
  const [cpInr, setCpInr] = useState<number>(0);
  const [cpAscite, setCpAscite] = useState(1);
  const [cpEncef, setCpEncef] = useState(1);
  const [cpDrug, setCpDrug] = useState("");

  // ─── CALVERT ───
  const carboTfg = useMemo(() => {
    if (tfgMode === "direto") return tfgDireto;
    if (carboPeso > 0 && carboIdade > 0 && carboCreat > 0) {
      return cockcroftGault(carboPeso, carboIdade, carboCreat, carboSexo);
    }
    return 0;
  }, [tfgMode, tfgDireto, carboPeso, carboIdade, carboCreat, carboSexo]);

  const carboDose = useMemo(() => {
    const tfgUsed = Math.min(carboTfg, 125);
    if (tfgUsed <= 0) return null;
    return aucAlvo * (tfgUsed + 25);
  }, [carboTfg, aucAlvo]);

  // ─── RENAL ───
  const renalClCr = useMemo(() => {
    if (renalPeso > 0 && renalIdade > 0 && renalCreat > 0) {
      return cockcroftGault(renalPeso, renalIdade, renalCreat, renalSexo);
    }
    return 0;
  }, [renalPeso, renalIdade, renalCreat, renalSexo]);

  const renalResult = useMemo(() => {
    if (renalClCr <= 0 || !renalDrug) return null;
    const drug = RENAL_DRUGS.find(d => d.name === renalDrug);
    if (!drug) return null;
    const faixa = getClCrFaixa(renalClCr);
    return { drug: drug.name, clcr: renalClCr, faixa, recomendacao: drug.adjustments[faixa] };
  }, [renalClCr, renalDrug]);

  // ─── HEPATIC ───
  const nciResult = useMemo(() => {
    if (nciBili <= 0 || nciAst <= 0 || !nciDrug) return null;
    const grupo = getNciOdwgGroup(nciBili, nciAst, nciUlnBili, nciUlnAst);
    const drug = NCIODWG_DRUGS.find(d => d.name === nciDrug);
    return { grupo, drug: drug?.name || "", recomendacao: drug?.adjustments[grupo] || "Sem dados" };
  }, [nciBili, nciAst, nciUlnBili, nciUlnAst, nciDrug]);

  const cpResult = useMemo(() => {
    if (cpBili <= 0 || cpAlb <= 0 || cpInr <= 0 || !cpDrug) return null;
    const { score, classe } = getChildPughScore(cpBili, cpAlb, cpInr, cpAscite, cpEncef);
    const drug = CHILDPUGH_TKIS.find(d => d.name === cpDrug);
    return { score, classe, drug: drug?.name || "", recomendacao: drug?.adjustments[classe] || "Sem dados" };
  }, [cpBili, cpAlb, cpInr, cpAscite, cpEncef, cpDrug]);

  // ─── Gauge values ───
  const gaugeValue = useMemo(() => {
    if (aba === "carboplatina") return carboTfg > 0 ? Math.min(carboTfg, 150) : 0;
    if (aba === "renal") return renalClCr > 0 ? Math.min(renalClCr, 150) : 0;
    if (aba === "hepatico") {
      if (hepaticMode === "childpugh" && cpResult) return cpResult.score;
      return 0;
    }
    return 0;
  }, [aba, carboTfg, renalClCr, hepaticMode, cpResult]);

  const gaugeMax = aba === "hepatico" && hepaticMode === "childpugh" ? 15 : 150;
  const gaugeLabel = useMemo(() => {
    if (aba === "carboplatina") {
      if (carboTfg <= 0) return "Aguardando dados";
      if (carboTfg > 125) return "TFG > 125 (cap aplicado)";
      if (carboTfg >= 60) return "Função renal normal";
      if (carboTfg >= 30) return "Insuficiência moderada";
      return "Insuficiência grave";
    }
    if (aba === "renal") {
      if (renalClCr <= 0) return "Aguardando dados";
      if (renalClCr > 60) return "ClCr > 60 mL/min";
      if (renalClCr >= 45) return "ClCr 45-60 mL/min";
      if (renalClCr >= 30) return "ClCr 30-45 mL/min";
      return "ClCr < 30 mL/min";
    }
    if (aba === "hepatico" && hepaticMode === "childpugh" && cpResult) return `Child-Pugh ${cpResult.classe} (${cpResult.score} pts)`;
    if (aba === "hepatico" && hepaticMode === "nci" && nciResult) return `NCI-ODWG Grupo ${nciResult.grupo}`;
    return "Aguardando dados";
  }, [aba, carboTfg, renalClCr, hepaticMode, cpResult, nciResult]);

  const RENAL_SEGMENTS = [
    { min: 0, max: 20, color: "hsl(0 72% 51%)", label: "<30" },
    { min: 20, max: 40, color: "hsl(38 92% 50%)", label: "30-45" },
    { min: 40, max: 60, color: "hsl(60 70% 45%)", label: "45-60" },
    { min: 60, max: 100, color: "hsl(142 71% 45%)", label: ">60" },
  ];

  const CP_SEGMENTS = [
    { min: 0, max: 40, color: "hsl(142 71% 45%)", label: "A (5-6)" },
    { min: 40, max: 67, color: "hsl(38 92% 50%)", label: "B (7-9)" },
    { min: 67, max: 100, color: "hsl(0 72% 51%)", label: "C (10-15)" },
  ];

  // ─── PDF ───
  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(sanitizePDF("Ajuste de Dose Oncologico"), 20, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 28);
    if (nomePaciente) doc.text(`Paciente: ${sanitizePDF(nomePaciente)}`, 20, 34);

    let y = 44;
    if (aba === "carboplatina" && carboDose !== null) {
      doc.setFontSize(12);
      doc.text("Carboplatina - Formula de Calvert", 20, y); y += 8;
      doc.setFontSize(10);
      doc.text(`AUC alvo: ${aucAlvo}`, 20, y); y += 6;
      doc.text(`TFG: ${carboTfg.toFixed(1)} mL/min`, 20, y); y += 6;
      doc.text(`Dose = ${aucAlvo} x (${Math.min(carboTfg, 125).toFixed(1)} + 25) = ${carboDose.toFixed(0)} mg`, 20, y);
    } else if (aba === "renal" && renalResult) {
      doc.setFontSize(12);
      doc.text("Ajuste Renal Geral", 20, y); y += 8;
      doc.setFontSize(10);
      doc.text(`ClCr: ${renalClCr.toFixed(1)} mL/min (faixa: ${renalResult.faixa})`, 20, y); y += 6;
      doc.text(`Farmaco: ${sanitizePDF(renalResult.drug)}`, 20, y); y += 6;
      doc.text(`Recomendacao: ${sanitizePDF(renalResult.recomendacao)}`, 20, y);
    } else if (aba === "hepatico") {
      doc.setFontSize(12);
      doc.text(sanitizePDF(hepaticMode === "nci" ? "Ajuste Hepatico — NCI-ODWG" : "Ajuste Hepatico — Child-Pugh"), 20, y); y += 8;
      doc.setFontSize(10);
      if (hepaticMode === "nci" && nciResult) {
        doc.text(`Grupo NCI-ODWG: ${nciResult.grupo}`, 20, y); y += 6;
        doc.text(`Farmaco: ${sanitizePDF(nciResult.drug)}`, 20, y); y += 6;
        doc.text(`Recomendacao: ${sanitizePDF(nciResult.recomendacao)}`, 20, y);
      } else if (hepaticMode === "childpugh" && cpResult) {
        doc.text(`Child-Pugh: Classe ${cpResult.classe} (${cpResult.score} pts)`, 20, y); y += 6;
        doc.text(`TKI: ${sanitizePDF(cpResult.drug)}`, 20, y); y += 6;
        doc.text(`Recomendacao: ${sanitizePDF(cpResult.recomendacao)}`, 20, y);
      }
    }
    doc.save("ajuste-dose-oncologico.pdf");
  }

  function handleSave() {
    let summary = "";
    let details: Record<string, string | number> = { aba };
    if (aba === "carboplatina" && carboDose !== null) {
      summary = `Carboplatina: AUC ${aucAlvo}, TFG ${carboTfg.toFixed(1)}, Dose ${carboDose.toFixed(0)} mg`;
      details = { ...details, aucAlvo, tfg: Number(carboTfg.toFixed(1)), dose: Number(carboDose.toFixed(0)) };
    } else if (aba === "renal" && renalResult) {
      summary = `${renalResult.drug}: ClCr ${renalClCr.toFixed(1)} → ${renalResult.recomendacao}`;
      details = { ...details, drug: renalResult.drug, clcr: Number(renalClCr.toFixed(1)), faixa: renalResult.faixa, recomendacao: renalResult.recomendacao };
    } else if (aba === "hepatico" && hepaticMode === "nci" && nciResult) {
      summary = `NCI-ODWG ${nciResult.grupo}: ${nciResult.drug} → ${nciResult.recomendacao}`;
      details = { ...details, grupo: nciResult.grupo, drug: nciResult.drug, recomendacao: nciResult.recomendacao };
    } else if (aba === "hepatico" && hepaticMode === "childpugh" && cpResult) {
      summary = `Child-Pugh ${cpResult.classe}: ${cpResult.drug} → ${cpResult.recomendacao}`;
      details = { ...details, score: cpResult.score, classe: cpResult.classe, drug: cpResult.drug, recomendacao: cpResult.recomendacao };
    } else return;

    saveCalculation({
      calculatorName: "Ajuste de Dose Oncológico",
      calculatorSlug: SLUG,
      date: new Date().toISOString(),
      summary,
      details,
      patientName: nomePaciente || undefined,
    });
  }

  const history = getByCalculator(SLUG);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isEmbed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/calculadoras")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Ajuste de Dose em Oncologia
            </h1>
            <p className="text-sm text-muted-foreground">Carboplatina (Calvert), Ajuste Renal e Hepático</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ShareToolButton toolSlug={SLUG} toolName="Ajuste de Dose Oncológico" />
          <AdminPromptViewer toolSlug={SLUG} toolName="Ajuste de Dose Oncológico" toolType="calculator" prompt={getNativePrompt(SLUG) || ""} />
          <CalculationHistory calculatorSlug={SLUG} />
        </div>
      </div>

      <HistoryConsentBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: Inputs ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient name */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <Label>Nome do Paciente (opcional)</Label>
            <Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Ex: João Silva" className="mt-1" />
          </div>

          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="carboplatina">Carboplatina</TabsTrigger>
              <TabsTrigger value="renal">Ajuste Renal</TabsTrigger>
              <TabsTrigger value="hepatico">Ajuste Hepático</TabsTrigger>
            </TabsList>

            {/* ═══ ABA 1: CARBOPLATINA ═══ */}
            <TabsContent value="carboplatina" className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-foreground">Fórmula de Calvert</h3>
                <p className="text-xs text-muted-foreground">Dose (mg) = AUC × (TFG + 25)</p>

                <div>
                  <Label>AUC alvo</Label>
                  <Select value={String(aucAlvo)} onValueChange={v => setAucAlvo(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6, 7].map(v => <SelectItem key={v} value={String(v)}>AUC {v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Método de TFG</Label>
                  <RadioGroup value={tfgMode} onValueChange={v => setTfgMode(v as any)} className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="direto" id="tfg-direto" /><Label htmlFor="tfg-direto" className="font-normal">Valor direto</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="calcular" id="tfg-calc" /><Label htmlFor="tfg-calc" className="font-normal">Cockcroft-Gault</Label></div>
                  </RadioGroup>
                </div>

                {tfgMode === "direto" ? (
                  <div>
                    <Label>TFG (mL/min)</Label>
                    <Input type="number" value={tfgDireto || ""} onChange={e => setTfgDireto(Number(e.target.value))} className="mt-1" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Peso (kg)</Label><Input type="number" value={carboPeso || ""} onChange={e => setCarboPeso(Number(e.target.value))} className="mt-1" /></div>
                    <div><Label>Idade (anos)</Label><Input type="number" value={carboIdade || ""} onChange={e => setCarboIdade(Number(e.target.value))} className="mt-1" /></div>
                    <div><Label>Creatinina (mg/dL)</Label><Input type="number" step="0.1" value={carboCreat || ""} onChange={e => setCarboCreat(Number(e.target.value))} className="mt-1" /></div>
                    <div>
                      <Label>Sexo</Label>
                      <Select value={carboSexo} onValueChange={v => setCarboSexo(v as "M" | "F")}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {carboTfg > 125 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    TFG &gt; 125 mL/min — valor capado em 125 para cálculo (recomendação FDA/GOG).
                  </div>
                )}

                {carboDose !== null && carboDose > 0 && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-lg font-bold text-primary">
                      Dose de Carboplatina: {carboDose.toFixed(0)} mg
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {aucAlvo} × ({Math.min(carboTfg, 125).toFixed(1)} + 25) = {carboDose.toFixed(0)} mg
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ ABA 2: AJUSTE RENAL ═══ */}
            <TabsContent value="renal" className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-foreground">Cockcroft-Gault + Ajuste por Fármaco</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Peso (kg)</Label><Input type="number" value={renalPeso || ""} onChange={e => setRenalPeso(Number(e.target.value))} className="mt-1" /></div>
                  <div><Label>Idade (anos)</Label><Input type="number" value={renalIdade || ""} onChange={e => setRenalIdade(Number(e.target.value))} className="mt-1" /></div>
                  <div><Label>Creatinina (mg/dL)</Label><Input type="number" step="0.1" value={renalCreat || ""} onChange={e => setRenalCreat(Number(e.target.value))} className="mt-1" /></div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={renalSexo} onValueChange={v => setRenalSexo(v as "M" | "F")}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {renalClCr > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">ClCr calculado:</span> {renalClCr.toFixed(1)} mL/min — Faixa: <span className="font-semibold">{getClCrFaixa(renalClCr)}</span>
                  </div>
                )}

                <div>
                  <Label>Antineoplásico</Label>
                  <Select value={renalDrug} onValueChange={setRenalDrug}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o fármaco" /></SelectTrigger>
                    <SelectContent>
                      {RENAL_DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {renalResult && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                    <p className="font-semibold text-foreground">{renalResult.drug}</p>
                    <p className="text-sm">ClCr {renalResult.faixa} mL/min → <span className="font-bold text-primary">{renalResult.recomendacao}</span></p>
                  </div>
                )}

                {/* Quick reference table */}
                {renalDrug && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left font-medium">Faixa ClCr</th>
                          <th className="p-2 text-left font-medium">Recomendação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {RENAL_DRUGS.find(d => d.name === renalDrug) && Object.entries(RENAL_DRUGS.find(d => d.name === renalDrug)!.adjustments).map(([faixa, rec]) => (
                          <tr key={faixa} className={`border-t border-border ${getClCrFaixa(renalClCr) === faixa ? "bg-primary/5 font-semibold" : ""}`}>
                            <td className="p-2">{faixa} mL/min</td>
                            <td className="p-2">{rec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ ABA 3: AJUSTE HEPÁTICO ═══ */}
            <TabsContent value="hepatico" className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div>
                  <Label>Tipo de Avaliação</Label>
                  <RadioGroup value={hepaticMode} onValueChange={v => setHepaticMode(v as any)} className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="nci" id="hep-nci" /><Label htmlFor="hep-nci" className="font-normal">NCI-ODWG (QT venosa)</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="childpugh" id="hep-cp" /><Label htmlFor="hep-cp" className="font-normal">Child-Pugh (TKIs orais)</Label></div>
                  </RadioGroup>
                </div>

                {hepaticMode === "nci" ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">NCI-ODWG — Classificação Hepática</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Bilirrubina total (mg/dL)</Label><Input type="number" step="0.1" value={nciBili || ""} onChange={e => setNciBili(Number(e.target.value))} className="mt-1" /></div>
                      <div><Label>AST (U/L)</Label><Input type="number" value={nciAst || ""} onChange={e => setNciAst(Number(e.target.value))} className="mt-1" /></div>
                      <div><Label>ULN Bilirrubina (mg/dL)</Label><Input type="number" step="0.1" value={nciUlnBili} onChange={e => setNciUlnBili(Number(e.target.value))} className="mt-1" /></div>
                      <div><Label>ULN AST (U/L)</Label><Input type="number" value={nciUlnAst} onChange={e => setNciUlnAst(Number(e.target.value))} className="mt-1" /></div>
                    </div>

                    {nciBili > 0 && nciAst > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        Classificação NCI-ODWG: <span className="font-bold">{getNciOdwgGroup(nciBili, nciAst, nciUlnBili, nciUlnAst) === "Normal" ? "Normal" : `Grupo ${getNciOdwgGroup(nciBili, nciAst, nciUlnBili, nciUlnAst)}`}</span>
                      </div>
                    )}

                    <div>
                      <Label>Antineoplásico IV</Label>
                      <Select value={nciDrug} onValueChange={setNciDrug}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o fármaco" /></SelectTrigger>
                        <SelectContent>
                          {NCIODWG_DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {nciResult && (
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                        <p className="font-semibold text-foreground">{nciResult.drug}</p>
                        <p className="text-sm">Grupo {nciResult.grupo} → <span className="font-bold text-primary">{nciResult.recomendacao}</span></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Child-Pugh — TKIs Orais</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Bilirrubina total (mg/dL)</Label><Input type="number" step="0.1" value={cpBili || ""} onChange={e => setCpBili(Number(e.target.value))} className="mt-1" /></div>
                      <div><Label>Albumina (g/dL)</Label><Input type="number" step="0.1" value={cpAlb || ""} onChange={e => setCpAlb(Number(e.target.value))} className="mt-1" /></div>
                      <div><Label>INR</Label><Input type="number" step="0.1" value={cpInr || ""} onChange={e => setCpInr(Number(e.target.value))} className="mt-1" /></div>
                      <div>
                        <Label>Ascite</Label>
                        <Select value={String(cpAscite)} onValueChange={v => setCpAscite(Number(v))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Ausente</SelectItem>
                            <SelectItem value="2">Leve</SelectItem>
                            <SelectItem value="3">Moderada a Grave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Encefalopatia</Label>
                        <Select value={String(cpEncef)} onValueChange={v => setCpEncef(Number(v))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Ausente</SelectItem>
                            <SelectItem value="2">Grau I-II</SelectItem>
                            <SelectItem value="3">Grau III-IV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {cpBili > 0 && cpAlb > 0 && cpInr > 0 && (() => {
                      const { score, classe } = getChildPughScore(cpBili, cpAlb, cpInr, cpAscite, cpEncef);
                      return (
                        <div className="p-3 rounded-lg bg-muted/50 text-sm">
                          Child-Pugh: <span className="font-bold">Classe {classe}</span> ({score} pontos)
                        </div>
                      );
                    })()}

                    <div>
                      <Label>TKI Oral</Label>
                      <Select value={cpDrug} onValueChange={setCpDrug}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o TKI" /></SelectTrigger>
                        <SelectContent>
                          {CHILDPUGH_TKIS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {cpResult && (
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                        <p className="font-semibold text-foreground">{cpResult.drug}</p>
                        <p className="text-sm">Child-Pugh {cpResult.classe} ({cpResult.score} pts) → <span className="font-bold text-primary">{cpResult.recomendacao}</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── RIGHT: Results ─── */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <RiskGauge
              value={gaugeValue}
              maxValue={gaugeMax}
              label={gaugeLabel}
              unit={aba === "hepatico" && hepaticMode === "childpugh" ? "pts" : "mL/min"}
              segments={aba === "hepatico" && hepaticMode === "childpugh" ? CP_SEGMENTS : RENAL_SEGMENTS}
            />
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Observações Clínicas
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              {aba === "carboplatina" && (
                <>
                  <li>• TFG ideal para Calvert: medida por depuração de 51Cr-EDTA ou estimada por CG.</li>
                  <li>• FDA/GOG recomendam capar TFG em 125 mL/min para evitar overdose.</li>
                  <li>• Em obesos, considerar peso ajustado ou ideal.</li>
                </>
              )}
              {aba === "renal" && (
                <>
                  <li>• Use Cockcroft-Gault (não CKD-EPI) para ajuste de dose de antineoplásicos.</li>
                  <li>• Monitorar creatinina seriada durante o ciclo.</li>
                  <li>• Hidratação pré/pós cisplatina é mandatória.</li>
                </>
              )}
              {aba === "hepatico" && hepaticMode === "nci" && (
                <>
                  <li>• NCI-ODWG é o padrão para ajuste de QT IV em disfunção hepática.</li>
                  <li>• Grupos C/D: dados muito limitados — considerar alternativas.</li>
                  <li>• Monitorar transaminases a cada ciclo.</li>
                </>
              )}
              {aba === "hepatico" && hepaticMode === "childpugh" && (
                <>
                  <li>• Child-Pugh C: a maioria dos TKIs é contraindicada.</li>
                  <li>• Monitorar função hepática semanalmente nas primeiras 8 semanas.</li>
                  <li>• Ajustar dose ao primeiro sinal de hepatotoxicidade.</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="flex-1 gap-2">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            {hasConsent && (
              <Button onClick={handleSave} variant="outline" className="flex-1 gap-2">
                <Pill className="h-4 w-4" /> Salvar
              </Button>
            )}
          </div>

          <ClinicalReferences references={CALCULATOR_REFERENCES[SLUG] || []} />
          <RelatedCalculators currentSlug={SLUG} />
        </div>
      </div>
    </div>
  );
}
