import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Syringe, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfExportButton } from "@/components/PdfExportButton";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";

interface FormData {
  nomePaciente: string;
  data: string;
  peso: string;
  tipoInternacao: string;
  corticoide: string;
  doseTotal: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  peso: "", tipoInternacao: "geral", corticoide: "nao", doseTotal: "",
};

interface Resultado {
  doseTotalDiaria: number;
  basal: number;
  bolusRefeicao: number;
  correcao: { faixa: string; dose: number }[];
  recomendacoes: string[];
}

function calcular(form: FormData, modo: Modo): Resultado {
  const peso = Number(form.peso);
  const isPro = modo === "clinico";

  // TDD based on context
  let tddPerKg = 0.5; // default
  if (form.tipoInternacao === "uti") tddPerKg = 0.6;
  if (form.tipoInternacao === "cirurgico") tddPerKg = 0.4;
  if (form.corticoide === "sim") tddPerKg += 0.1;

  let doseTotalDiaria = form.doseTotal ? Number(form.doseTotal) : Math.round(peso * tddPerKg);

  const basal = Math.round(doseTotalDiaria * 0.5);
  const bolusTotal = doseTotalDiaria - basal;
  const bolusRefeicao = Math.round(bolusTotal / 3);

  // Correction scale (per 50 mg/dL above 150)
  const fatorCorrecao = Math.round(1700 / doseTotalDiaria);
  const correcao = [
    { faixa: "150-199 mg/dL", dose: Math.round(1 * (50 / fatorCorrecao)) || 1 },
    { faixa: "200-249 mg/dL", dose: Math.round(2 * (50 / fatorCorrecao)) || 2 },
    { faixa: "250-299 mg/dL", dose: Math.round(3 * (50 / fatorCorrecao)) || 3 },
    { faixa: "300-349 mg/dL", dose: Math.round(4 * (50 / fatorCorrecao)) || 4 },
    { faixa: ">350 mg/dL", dose: Math.round(5 * (50 / fatorCorrecao)) || 5 },
  ];

  const recomendacoes = isPro
    ? [
      `Dose total diaria (DTD): ${doseTotalDiaria} UI/dia (${(doseTotalDiaria / peso).toFixed(2)} UI/kg).`,
      `Basal: ${basal} UI (Glargina/Degludeca 1x/dia ou NPH 2x/dia).`,
      `Bolus prandial: ${bolusRefeicao} UI antes de cada refeicao (Regular ou Ultrarapida).`,
      `Fator de correcao: ~${fatorCorrecao} mg/dL por 1 UI (regra 1700).`,
      "Ajustar basal se glicemia de jejum fora do alvo (80-140 mg/dL).",
      "Ajustar bolus se glicemia pos-prandial >180 mg/dL.",
      form.corticoide === "sim" ? "Corticoide em uso: considerar aumento de 20-40% na dose, especialmente NPH associada ao horario do corticoide." : "",
    ].filter(Boolean)
    : [
      `Dose total estimada: ${doseTotalDiaria} UI por dia.`,
      `Metade como insulina basal (longa duracao) e metade dividida nas refeicoes.`,
      "Seu medico ajustara as doses conforme as glicemias medidas.",
    ];

  return { doseTotalDiaria, basal, bolusRefeicao, correcao, recomendacoes };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Prescricao de Insulina Basal-Bolus - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Peso: ${form.peso} kg | DTD: ${resultado.doseTotalDiaria} UI`, 14, y); y += 6;
  doc.text(`Basal: ${resultado.basal} UI | Bolus/refeicao: ${resultado.bolusRefeicao} UI`, 14, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.text("Escala de Correcao:", 14, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.correcao.forEach((c) => { doc.text(`${c.faixa}: +${c.dose} UI`, 18, y); y += 4; });
  y += 4;
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`insulina-basal-bolus-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function InsulinaBasalBolus() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const handleCalc = () => {
    if (!form.peso) { setErro("Preencha o peso."); return; }
    if (Number(form.peso) <= 0) { setErro("Peso deve ser maior que zero."); return; }
    const res = calcular(form, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "Insulina Basal-Bolus",
      calculatorSlug: "insulina-basal-bolus",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `DTD: ${res.doseTotalDiaria} UI | Basal: ${res.basal} | Bolus: ${res.bolusRefeicao}/refeicao`,
      details: { DTD: `${res.doseTotalDiaria} UI`, Basal: `${res.basal} UI`, Bolus: `${res.bolusRefeicao} UI` },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar as Calculadoras
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Syringe className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Insulina Basal-Bolus + Correcao</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Calculo de dose basal, prandial e escala de correcao hospitalar.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="insulina-basal-bolus" toolName="Insulina Basal-Bolus" />
            <AdminPromptViewer toolSlug="insulina-basal-bolus" toolName="Insulina Basal-Bolus" toolType="calculator" prompt={getNativePrompt("insulina-basal-bolus") || ""} />
            <CalculationHistory calculatorSlug="insulina-basal-bolus" />
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("clinico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "clinico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Clinico
            </button>
            <button onClick={() => setModo("educativo")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "educativo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <User className="h-3.5 w-3.5" /> Educativo
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificacao</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Clinicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" value={form.peso} onChange={(e) => set("peso", e.target.value)} placeholder="Ex: 70" /></div>
              <div className="space-y-1.5">
                <Label>Contexto</Label>
                <Select value={form.tipoInternacao} onValueChange={(v) => set("tipoInternacao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Enfermaria geral</SelectItem>
                    <SelectItem value="uti">UTI</SelectItem>
                    <SelectItem value="cirurgico">Pos-operatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Uso de corticoide?</Label>
                <Select value={form.corticoide} onValueChange={(v) => set("corticoide", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="nao">Nao</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>DTD conhecida (UI) (opcional)</Label><Input type="number" value={form.doseTotal} onChange={(e) => set("doseTotal", e.target.value)} placeholder="Se ja em uso" /></div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre Insulina Basal-Bolus</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O esquema <strong>basal-bolus</strong> mimetiza a secrecao fisiologica de insulina: basal (50%) cobre o jejum e bolus (50%) cobre as refeicoes.</p>
                <p><strong>Dose total diaria (DTD):</strong> 0,4-0,6 UI/kg/dia. Ajustar por contexto clinico.</p>
                <p><strong>Regra 1700:</strong> Fator de correcao = 1700 / DTD (mg/dL por 1 UI de insulina rapida).</p>
                <p><strong>Insulina de correcao:</strong> Complementar ao bolus prandial para glicemias acima do alvo.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Doses</Button>
            <Button variant="outline" onClick={() => { setForm(INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Prescricao Sugerida</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/80">
                    <span className="text-sm font-medium">DTD</span>
                    <span className="text-lg font-bold text-primary">{resultado.doseTotalDiaria} UI</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/80">
                    <span className="text-sm font-medium">Basal (50%)</span>
                    <span className="text-lg font-bold">{resultado.basal} UI</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/80">
                    <span className="text-sm font-medium">Bolus/refeicao</span>
                    <span className="text-lg font-bold">{resultado.bolusRefeicao} UI</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Escala de Correcao</h2>
                <div className="space-y-1.5">
                  {resultado.correcao.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">{c.faixa}</span>
                      <span className="font-semibold text-primary">+{c.dose} UI</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Orientacoes</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <PdfExportButton onExport={() => gerarPDF(form, resultado)} label="Gerar Relatorio PDF" />

              <ClinicalReferences references={CALCULATOR_REFERENCES["insulina-basal-bolus"]} />
              <RelatedCalculators currentSlug="insulina-basal-bolus" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Syringe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
