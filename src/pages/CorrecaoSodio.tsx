import { useState } from "react";
import { CalculationHistory } from "@/components/CalculationHistory";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { ArrowLeft, FileText, Droplets, User, Stethoscope } from "lucide-react";
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
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";

interface FormData {
  nomePaciente: string;
  data: string;
  sodioMedido: string;
  glicemia: string;
  unidadeGlicemia: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  sodioMedido: "", glicemia: "", unidadeGlicemia: "mgdl",
};

interface Resultado {
  sodioCorrigido: number;
  delta: number;
  classificacao: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function calcCorrecao(sodio: number, glicemia: number, unidade: string): { corrigido: number; delta: number } {
  // Katz formula: Na corrigido = Na medido + 1.6 × [(glicemia - 100) / 100]
  const glicMgDl = unidade === "mmol" ? glicemia * 18 : glicemia;
  const delta = glicMgDl > 100 ? 1.6 * ((glicMgDl - 100) / 100) : 0;
  return { corrigido: sodio + delta, delta };
}

function classificar(sodioCorr: number, delta: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (sodioCorr < 120) return {
    sodioCorrigido: sodioCorr, delta, classificacao: "Hiponatremia Grave",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Hiponatremia grave — risco de edema cerebral e convulsões.", "NaCl 3% em bolus (100-150 mL IV em 10-20 min). Repetir até 3× se convulsão.", "Alvo: elevar Na 4-6 mEq/L nas primeiras 6h. Máximo 10 mEq/L/24h.", "Dosar sódio a cada 2-4h. UTI recomendada.", "Investigar causa: SIADH, hipovolemia, ICC, cirrose, hipotireoidismo."]
      : ["Seu sódio está muito baixo — isso pode ser grave.", "Procure atendimento médico urgente."],
  };
  if (sodioCorr < 130) return {
    sodioCorrigido: sodioCorr, delta, classificacao: "Hiponatremia Moderada",
    cor: "hsl(25 90% 50%)", bgClass: "border-orange-500/30 bg-orange-500/10",
    recomendacoes: isPro
      ? ["Hiponatremia moderada. Avaliar sintomas neurológicos.", "Investigar volemia (hipovolêmica vs euvolêmica vs hipervolêmica).", "Se SIADH: restrição hídrica (800-1000 mL/dia). Considerar uréia oral ou tolvaptano.", "Correção máxima: 8-10 mEq/L/24h para evitar desmielinização osmótica.", "Dosar osmolaridade sérica e urinária, Na urinário."]
      : ["Seu sódio está abaixo do normal.", "Converse com seu médico sobre hidratação e exames."],
  };
  if (sodioCorr < 135) return {
    sodioCorrigido: sodioCorr, delta, classificacao: "Hiponatremia Leve",
    cor: "hsl(38 92% 50%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? ["Hiponatremia leve. Geralmente assintomática.", "Investigar causa subjacente. Revisar medicamentos (diuréticos tiazídicos, ISRS, carbamazepina).", "Se crônica e assintomática: restrição hídrica moderada e monitoramento."]
      : ["Seu sódio está levemente abaixo do normal.", "Na maioria dos casos, ajustes simples resolvem."],
  };
  if (sodioCorr <= 145) return {
    sodioCorrigido: sodioCorr, delta, classificacao: "Normal",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Sódio corrigido dentro da normalidade (135-145 mEq/L).", delta > 0 ? `Correção de +${delta.toFixed(1)} mEq/L pela hiperglicemia.` : "Sem necessidade de correção pela glicemia."]
      : ["Seu sódio está normal após correção."],
  };
  return {
    sodioCorrigido: sodioCorr, delta, classificacao: "Hipernatremia",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Hipernatremia. Avaliar estado de hidratação e acesso à água.", "Reposição com soro hipotônico (NaCl 0,45% ou SG5%).", "Correção lenta: máximo 10 mEq/L/24h para evitar edema cerebral.", "Calcular déficit de água livre: 0.6 × peso × [(Na/140) – 1]."]
      : ["Seu sódio está acima do normal.", "Hidratação adequada é fundamental. Consulte seu médico."],
  };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Correcao de Sodio por Hiperglicemia - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Na medido: ${form.sodioMedido} mEq/L | Glicemia: ${form.glicemia} ${form.unidadeGlicemia === "mgdl" ? "mg/dL" : "mmol/L"}`, 14, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(`Na corrigido: ${resultado.sodioCorrigido.toFixed(1)} mEq/L (Δ ${resultado.delta.toFixed(1)})`, 14, y); y += 7;
  doc.setFontSize(11); doc.text(resultado.classificacao, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`correcao-sodio-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function CorrecaoSodio() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");

    const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const calcular = () => {
    if (!form.sodioMedido || !form.glicemia) { setErro("Preencha sódio medido e glicemia."); return; }
    const na = Number(form.sodioMedido);
    const glic = Number(form.glicemia);
    if (na <= 0 || glic <= 0) { setErro("Valores devem ser maiores que zero."); return; }
    const { corrigido, delta } = calcCorrecao(na, glic, form.unidadeGlicemia);
    const res = classificar(Math.round(corrigido * 10) / 10, delta, modo);
    setResultado(res);
  };

  const limpar = () => { setForm(INITIAL); setResultado(null); setErro(""); };

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar às Calculadoras
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Droplets className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Correção de Sódio por Hiperglicemia</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Fórmula de Katz — corrige o sódio pela glicemia elevada.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="correcao-sodio" toolName="Correção de Sódio" />
            <CalculationHistory calculatorSlug="correcao-sodio" />
            {resultado && (
              <SaveToHistoryButton
                calculatorName="Correção de Sódio"
                calculatorSlug="correcao-sodio"
                summary={`Na corrigido: ${resultado.sodioCorrigido.toFixed(1)} mEq/L – ${resultado.classificacao}`}
                details={{ "Na medido": `${form.sodioMedido} mEq/L`, Glicemia: `${form.glicemia}`, "Na corrigido": resultado.sodioCorrigido.toFixed(1), Classificação: resultado.classificacao }}
                date={form.data}
              />
            )}
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
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={(e) => set("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Laboratoriais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Sódio medido (mEq/L) *</Label><Input type="number" step="0.1" value={form.sodioMedido} onChange={(e) => set("sodioMedido", e.target.value)} placeholder="Ex: 128" /></div>
              <div className="space-y-1.5"><Label>Glicemia *</Label><Input type="number" step="0.1" value={form.glicemia} onChange={(e) => set("glicemia", e.target.value)} placeholder={form.unidadeGlicemia === "mgdl" ? "Ex: 450" : "Ex: 25"} /></div>
              <div className="space-y-1.5">
                <Label>Unidade da glicemia</Label>
                <Select value={form.unidadeGlicemia} onValueChange={(v) => set("unidadeGlicemia", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mgdl">mg/dL</SelectItem><SelectItem value="mmol">mmol/L</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre a Correção de Sódio</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A <strong>hiperglicemia</strong> causa deslocamento osmótico de água do intracelular para o extracelular, diluindo o sódio plasmático (pseudo-hiponatremia dilucional).</p>
                <p><strong>Fórmula de Katz:</strong> Na corrigido = Na medido + 1,6 × [(Glicemia – 100) ÷ 100]</p>
                <p><strong>Quando usar:</strong> Sempre que o sódio medido for interpretado na presença de hiperglicemia (&gt;100 mg/dL). Essencial em cetoacidose diabética (CAD) e estado hiperosmolar.</p>
                <p><strong>Atenção:</strong> A fórmula clássica usa 1,6 mEq/L para cada 100 mg/dL acima de 100. Estudos recentes sugerem 2,4 mEq/L para glicemias &gt; 400 mg/dL (Hillier, 1999).</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular Na Corrigido</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold" style={{ color: resultado.cor }}>{resultado.sodioCorrigido.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground mt-1">mEq/L (corrigido)</div>
                  {resultado.delta > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">Δ +{resultado.delta.toFixed(1)} mEq/L pela hiperglicemia</div>
                  )}
                  <div className="mt-3 text-sm font-semibold" style={{ color: resultado.cor }}>{resultado.classificacao}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>&lt;120</span><span>Hiponatremia Grave</span></div>
                    <div className="flex justify-between"><span>120-129</span><span>Hiponatremia Moderada</span></div>
                    <div className="flex justify-between"><span>130-134</span><span>Hiponatremia Leve</span></div>
                    <div className="flex justify-between"><span>135-145</span><span>Normal</span></div>
                    <div className="flex justify-between"><span>&gt;145</span><span>Hipernatremia</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Recomendações</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(form, resultado)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>

              <ClinicalReferences references={CALCULATOR_REFERENCES["correcao-sodio"]} />
              <RelatedCalculators currentSlug="correcao-sodio" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Droplets className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong> para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
