import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Baby, User, Stethoscope } from "lucide-react";
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
import { PdfExportButton } from "@/components/PdfExportButton";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";

interface FormData {
  nomePaciente: string;
  data: string;
  peso: string;
}

const INITIAL: FormData = { nomePaciente: "", data: new Date().toISOString().slice(0, 10), peso: "" };

interface Resultado {
  manutencaoMlH: number;
  manutencaoMlDia: number;
  kcalDia: number;
  naReq: number;
  kReq: number;
  prescricao: string;
  recomendacoes: string[];
}

function calcular(peso: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  let mlDia: number;
  if (peso <= 10) {
    mlDia = peso * 100;
  } else if (peso <= 20) {
    mlDia = 1000 + (peso - 10) * 50;
  } else {
    mlDia = 1500 + (peso - 20) * 20;
  }
  const mlH = Math.round(mlDia / 24 * 10) / 10;
  const kcalDia = mlDia; // 1 mL/kg = 1 kcal/kg in Holliday-Segar
  const naReq = Math.round(mlDia * 3 / 100); // 3 mEq/100mL
  const kReq = Math.round(mlDia * 2 / 100); // 2 mEq/100mL

  let prescricao: string;
  if (peso <= 10) {
    prescricao = `SG 5% + NaCl 20% ${Math.round(naReq * 0.585)} mL + KCl 19,1% ${Math.round(kReq * 0.524)} mL em ${Math.round(mlDia)} mL, correr a ${mlH} mL/h`;
  } else {
    prescricao = `SF 0,45% + SG 5% a ${mlH} mL/h (${Math.round(mlDia)} mL/dia) + KCl conforme necessidade`;
  }

  const recomendacoes = isPro
    ? [
      `Volume de manutencao: ${Math.round(mlDia)} mL/dia (${mlH} mL/h).`,
      `Necessidade de Na: ~${naReq} mEq/dia (3 mEq/100mL).`,
      `Necessidade de K: ~${kReq} mEq/dia (2 mEq/100mL).`,
      `Calorias estimadas: ${kcalDia} kcal/dia.`,
      "Ajustar por perdas (febre: +12%/grau C, diarreia, drenos).",
      "Nao usar para reposicao de perdas ou desidratacao — usar protocolos especificos.",
      peso <= 10 ? "Neonatos: considerar GIR (taxa de infusao de glicose) e monitorizacao mais rigorosa." : "",
    ].filter(Boolean)
    : [
      `Seu filho precisa de aproximadamente ${Math.round(mlDia)} mL de liquido por dia.`,
      "Isso inclui o soro e a alimentacao.",
      "O medico ajustara conforme a situacao clinica.",
    ];

  return { manutencaoMlH: mlH, manutencaoMlDia: Math.round(mlDia), kcalDia, naReq, kReq, prescricao, recomendacoes };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Holliday-Segar - Hidratacao Pediatrica - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data} | Peso: ${form.peso} kg`, 14, y); y += 8;
  doc.setFontSize(14);
  doc.text(`${resultado.manutencaoMlDia} mL/dia (${resultado.manutencaoMlH} mL/h)`, 14, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Na: ${resultado.naReq} mEq/dia | K: ${resultado.kReq} mEq/dia | Cal: ${resultado.kcalDia} kcal/dia`, 14, y); y += 8;
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`holliday-segar-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function HollidaySegar() {
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
    const peso = Number(form.peso);
    if (peso <= 0) { setErro("Peso deve ser maior que zero."); return; }
    const res = calcular(peso, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "Holliday-Segar",
      calculatorSlug: "holliday-segar",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `Manutencao: ${res.manutencaoMlDia} mL/dia (${res.manutencaoMlH} mL/h)`,
      details: { Peso: `${form.peso} kg`, Volume: `${res.manutencaoMlDia} mL/dia`, Na: `${res.naReq} mEq/dia`, K: `${res.kReq} mEq/dia` },
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
            <div className="rounded-xl bg-primary/10 p-3"><Baby className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Holliday-Segar (Hidratacao Pediatrica)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Volume de manutencao IV com eletrolitos e calorias estimadas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="holliday-segar" toolName="Holliday-Segar" />
            <AdminPromptViewer toolSlug="holliday-segar" toolName="Holliday-Segar" toolType="calculator" prompt={getNativePrompt("holliday-segar") || ""} />
            <CalculationHistory calculatorSlug="holliday-segar" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Peso do Paciente</h2>
            <div className="space-y-1.5 max-w-xs"><Label>Peso (kg) *</Label><Input type="number" step="0.1" value={form.peso} onChange={(e) => set("peso", e.target.value)} placeholder="Ex: 12" /></div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>Regra 4-2-1:</strong> Ate 10 kg = 4 mL/kg/h | 10-20 kg = +2 mL/kg/h | &gt;20 kg = +1 mL/kg/h
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre Holliday-Segar</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A formula de <strong>Holliday-Segar (1957)</strong> e o padrao para calculo de fluidoterapia de manutencao em pediatria.</p>
                <p><strong>Regra:</strong> 100 mL/kg (primeiros 10 kg) + 50 mL/kg (10-20 kg) + 20 mL/kg (acima de 20 kg).</p>
                <p><strong>Eletrolitos:</strong> Na 3 mEq/100mL e K 2 mEq/100mL de volume calculado.</p>
                <p><strong>Limitacao:</strong> Nao se aplica a reposicao de perdas ou desidratacao. Usar protocolos especificos para esses cenarios.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Volume</Button>
            <Button variant="outline" onClick={() => { setForm(INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <div className="text-4xl font-bold text-primary">{resultado.manutencaoMlDia}</div>
                    <div className="text-sm text-muted-foreground">mL/dia</div>
                    <div className="text-lg font-semibold mt-1">{resultado.manutencaoMlH} mL/h</div>
                  </div>
                  <div className="space-y-1.5 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Na</span><span>{resultado.naReq} mEq/dia</span></div>
                    <div className="flex justify-between"><span>K</span><span>{resultado.kReq} mEq/dia</span></div>
                    <div className="flex justify-between"><span>Calorias</span><span>{resultado.kcalDia} kcal/dia</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Prescricao Sugerida</h2>
                <p className="text-sm text-muted-foreground">{resultado.prescricao}</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Orientacoes</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <PdfExportButton onExport={() => gerarPDF(form, resultado)} label="Gerar Relatorio PDF" />

              <ClinicalReferences references={CALCULATOR_REFERENCES["holliday-segar"]} />
              <RelatedCalculators currentSlug="holliday-segar" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha o peso e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
