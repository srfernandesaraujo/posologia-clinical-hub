import { useState } from "react";
import { CalculationHistory } from "@/components/CalculationHistory";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { ArrowLeft, FileText, Bone, User, Stethoscope } from "lucide-react";
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
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";

interface FormData {
  nomePaciente: string;
  data: string;
  calcioTotal: string;
  albumina: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  calcioTotal: "", albumina: "",
};

interface Resultado {
  calcioCorrigido: number;
  delta: number;
  classificacao: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function classificar(caCorr: number, delta: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (caCorr < 8.5) return {
    calcioCorrigido: caCorr, delta, classificacao: "Hipocalcemia",
    cor: "hsl(25 90% 50%)", bgClass: "border-orange-500/30 bg-orange-500/10",
    recomendacoes: isPro
      ? ["Hipocalcemia. Avaliar PTH, 25-OH vitamina D, magnésio, fósforo.", "Se sintomática (Chvostek/Trousseau+, QT longo): gluconato de cálcio 10% IV.", "Se crônica: suplementação oral de cálcio + calcitriol.", "Causas comuns: hipoparatireoidismo, deficiência de vitamina D, IRC, pancreatite."]
      : ["Seu cálcio está abaixo do normal.", "Converse com seu médico sobre suplementação."],
  };
  if (caCorr <= 10.5) return {
    calcioCorrigido: caCorr, delta, classificacao: "Normal",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Cálcio corrigido dentro da normalidade (8,5-10,5 mg/dL).", delta !== 0 ? `Correção de ${delta > 0 ? "+" : ""}${delta.toFixed(1)} mg/dL pela albumina.` : "Albumina normal, sem necessidade de correção."]
      : ["Seu cálcio está normal após correção pela albumina."],
  };
  if (caCorr <= 12.0) return {
    calcioCorrigido: caCorr, delta, classificacao: "Hipercalcemia Leve",
    cor: "hsl(38 92% 50%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? ["Hipercalcemia leve. Investigar PTH: se elevado → hiperparatireoidismo primário.", "Se PTH suprimido: investigar malignidade (PTHrp, mieloma, metástases ósseas).", "Revisar medicamentos: tiazídicos, lítio, vitamina D excessiva.", "Hidratação oral adequada."]
      : ["Seu cálcio está levemente acima do normal.", "Exames adicionais podem ser necessários."],
  };
  return {
    calcioCorrigido: caCorr, delta, classificacao: "Hipercalcemia Moderada/Grave",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Hipercalcemia significativa — potencial emergência.", "Hidratação agressiva: SF 0,9% 200-300 mL/h. Furosemida após euvolemia.", "Pamidronato 60-90 mg IV ou ácido zoledrônico 4 mg IV.", "Calcitonina 4 UI/kg SC/IM a cada 12h (efeito rápido, transitório).", "Se linfoma/granulomatosa: prednisona 40-60 mg/dia.", "Investigar: PTH, PTHrp, 1,25-(OH)₂D, eletroforese de proteínas."]
      : ["Seu cálcio está significativamente elevado.", "Procure atendimento médico com urgência."],
  };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Correcao de Calcio pela Albumina - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Ca total: ${form.calcioTotal} mg/dL | Albumina: ${form.albumina} g/dL`, 14, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(`Ca corrigido: ${resultado.calcioCorrigido.toFixed(1)} mg/dL`, 14, y); y += 7;
  doc.setFontSize(11); doc.text(resultado.classificacao, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`correcao-calcio-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function CorrecaoCalcio() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const calcular = () => {
    if (!form.calcioTotal || !form.albumina) { setErro("Preencha cálcio total e albumina."); return; }
    const ca = Number(form.calcioTotal);
    const alb = Number(form.albumina);
    if (ca <= 0 || alb <= 0) { setErro("Valores devem ser maiores que zero."); return; }
    const delta = 0.8 * (4.0 - alb);
    const caCorr = Math.round((ca + delta) * 10) / 10;
    const res = classificar(caCorr, delta, modo);
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
            <div className="rounded-xl bg-primary/10 p-3"><Bone className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Correção de Cálcio pela Albumina</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Ajusta o cálcio total pela albumina sérica (fórmula de Payne).</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="correcao-calcio" toolName="Correção de Cálcio" />
            <CalculationHistory calculatorSlug="correcao-calcio" />
            {resultado && (
              <SaveToHistoryButton
                calculatorName="Correção de Cálcio"
                calculatorSlug="correcao-calcio"
                summary={`Ca corrigido: ${resultado.calcioCorrigido.toFixed(1)} mg/dL – ${resultado.classificacao}`}
                details={{ "Ca total": `${form.calcioTotal} mg/dL`, Albumina: `${form.albumina} g/dL`, "Ca corrigido": resultado.calcioCorrigido.toFixed(1), Classificação: resultado.classificacao }}
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
              <div className="space-y-1.5"><Label>Cálcio total (mg/dL) *</Label><Input type="number" step="0.1" value={form.calcioTotal} onChange={(e) => set("calcioTotal", e.target.value)} placeholder="Ex: 8.2" /></div>
              <div className="space-y-1.5"><Label>Albumina sérica (g/dL) *</Label><Input type="number" step="0.1" value={form.albumina} onChange={(e) => set("albumina", e.target.value)} placeholder="Ex: 2.8" /></div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre a Correção de Cálcio</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Cerca de 40% do cálcio sérico circula ligado à <strong>albumina</strong>. Quando a albumina está baixa, o cálcio total cai sem que o cálcio ionizado (biologicamente ativo) se altere.</p>
                <p><strong>Fórmula de Payne:</strong> Ca corrigido = Ca total + 0,8 × (4,0 – Albumina)</p>
                <p><strong>Quando usar:</strong> Sempre que a albumina estiver fora de 4,0 g/dL (hipoalbuminemia é muito comum em internações, hepatopatas, nefróticos).</p>
                <p><strong>Alternativa:</strong> Cálcio iônico é o padrão-ouro, mas requer coleta com técnica adequada e análise imediata.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular Ca Corrigido</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold" style={{ color: resultado.cor }}>{resultado.calcioCorrigido.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground mt-1">mg/dL (corrigido)</div>
                  {resultado.delta !== 0 && (
                    <div className="text-xs text-muted-foreground mt-2">Δ {resultado.delta > 0 ? "+" : ""}{resultado.delta.toFixed(1)} mg/dL pela albumina</div>
                  )}
                  <div className="mt-3 text-sm font-semibold" style={{ color: resultado.cor }}>{resultado.classificacao}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>&lt;8,5</span><span>Hipocalcemia</span></div>
                    <div className="flex justify-between"><span>8,5-10,5</span><span>Normal</span></div>
                    <div className="flex justify-between"><span>10,6-12,0</span><span>Hipercalcemia Leve</span></div>
                    <div className="flex justify-between"><span>&gt;12,0</span><span>Hipercalcemia Mod/Grave</span></div>
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

              <ClinicalReferences references={CALCULATOR_REFERENCES["correcao-calcio"]} />
              <RelatedCalculators currentSlug="correcao-calcio" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Bone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong> para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
