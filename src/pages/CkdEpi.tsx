import { useState } from "react";
import { CalculationHistory } from "@/components/CalculationHistory";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { ArrowLeft, FileText, Beaker, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { RiskGauge } from "@/components/calculators/RiskGauge";
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
  creatinina: string;
  idade: string;
  sexo: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  creatinina: "", idade: "", sexo: "",
};

interface Resultado {
  egfr: number;
  estagio: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

// CKD-EPI 2021 (race-free equation)
function calcCkdEpi2021(creatinina: number, idade: number, sexo: string): number {
  const isFemale = sexo === "f";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const multiplier = isFemale ? 1.012 : 1.0;

  const scrKappa = creatinina / kappa;
  const minVal = Math.min(scrKappa, 1);
  const maxVal = Math.max(scrKappa, 1);

  return 142 * Math.pow(minVal, alpha) * Math.pow(maxVal, -1.200) * Math.pow(0.9938, idade) * multiplier;
}

function classificar(egfr: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (egfr >= 90) return {
    egfr, estagio: "G1 – Normal ou Alto",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["TFG normal. Avaliar outros marcadores de lesão renal (albuminúria, sedimento urinário).", "Se albuminúria presente: monitorar e tratar causa de base."]
      : ["Sua função renal está normal.", "Continue com hábitos saudáveis e hidratação adequada."],
  };
  if (egfr >= 60) return {
    egfr, estagio: "G2 – Levemente Diminuída",
    cor: "hsl(80 60% 45%)", bgClass: "border-yellow-400/30 bg-yellow-400/10",
    recomendacoes: isPro
      ? ["TFG levemente reduzida. Avaliar albuminúria e fatores de risco.", "Monitorar creatinina e relação albumina/creatinina anualmente.", "Controlar PA (alvo < 130/80 mmHg se albuminúria presente)."]
      : ["Sua função renal está levemente reduzida.", "Mantenha acompanhamento médico regular."],
  };
  if (egfr >= 45) return {
    egfr, estagio: "G3a – Leve a Moderadamente Diminuída",
    cor: "hsl(38 92% 50%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? ["DRC estágio 3a. Ajustar doses de medicamentos nefrotóxicos.", "Solicitar: cálcio, fósforo, PTH, bicarbonato, hemograma.", "Considerar encaminhamento ao nefrologista.", "IECA/BRA se albuminúria > 30 mg/g. Considerar iSGLT2 (finerenona se indicado)."]
      : ["Sua função renal está moderadamente reduzida.", "É importante consultar um nefrologista.", "Alguns medicamentos podem precisar de ajuste de dose."],
  };
  if (egfr >= 30) return {
    egfr, estagio: "G3b – Moderada a Gravemente Diminuída",
    cor: "hsl(25 90% 50%)", bgClass: "border-orange-500/30 bg-orange-500/10",
    recomendacoes: isPro
      ? ["DRC estágio 3b. Encaminhar ao nefrologista.", "Avaliar distúrbios minerais e ósseos (DMO-DRC).", "Ajuste mandatório de doses. Evitar nefrotóxicos (AINEs, contrastes iodados sem hidratação).", "Considerar preparo para terapia renal substitutiva se progressão."]
      : ["Sua função renal está significativamente reduzida.", "Acompanhamento com nefrologista é essencial."],
  };
  if (egfr >= 15) return {
    egfr, estagio: "G4 – Gravemente Diminuída",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["DRC estágio 4. Acompanhamento nefrológico obrigatório.", "Planejar acesso vascular/peritoneal. Discutir modalidades de diálise e transplante.", "Vacinação para hepatite B. Avaliar estado nutricional.", "Evitar cateter venoso central em subclávia (preservar veias para fístula)."]
      : ["Sua função renal está muito reduzida.", "Seu médico discutirá opções de tratamento como diálise ou transplante."],
  };
  return {
    egfr, estagio: "G5 – Falência Renal",
    cor: "hsl(0 72% 40%)", bgClass: "border-red-700/30 bg-red-700/10",
    recomendacoes: isPro
      ? ["DRC estágio 5. Iniciar terapia renal substitutiva quando sintomático.", "Diálise (hemodiálise ou peritoneal) ou transplante renal.", "Manejo de hipercalemia, acidose, sobrecarga volêmica.", "Controle rigoroso de dieta (proteínas, potássio, fósforo, sódio)."]
      : ["Sua função renal está criticamente reduzida.", "Tratamento urgente com nefrologista é necessário."],
  };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Calculadora CKD-EPI 2021 - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.setFont("helvetica", "bold"); doc.text("Paciente:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.nomePaciente, 40, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.text(`Creatinina: ${form.creatinina} mg/dL | Idade: ${form.idade} | Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}`, 14, y); y += 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(`TFGe: ${resultado.egfr.toFixed(1)} mL/min/1.73m²`, 14, y); y += 7;
  doc.setFontSize(11); doc.text(resultado.estagio, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`ckd-epi-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function CkdEpi() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const calcular = () => {
    if (!form.creatinina || !form.idade || !form.sexo) { setErro("Preencha creatinina, idade e sexo."); return; }
    const cr = Number(form.creatinina);
    const age = Number(form.idade);
    if (cr <= 0 || age <= 0) { setErro("Valores devem ser maiores que zero."); return; }
    const egfr = calcCkdEpi2021(cr, age, form.sexo);
    const res = classificar(Math.round(egfr * 10) / 10, modo);
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
            <div className="rounded-xl bg-primary/10 p-3"><Beaker className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">CKD-EPI 2021 (TFG estimada)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Equação 2021 sem correção racial — KDIGO recomendada.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="ckd-epi" toolName="CKD-EPI 2021" />
            <AdminPromptViewer toolSlug="ckd-epi" toolName="CKD-EPI 2021" toolType="calculator" prompt={getNativePrompt("ckd-epi") || ""} />
            <CalculationHistory calculatorSlug="ckd-epi" />
            {resultado && (
              <SaveToHistoryButton
                calculatorName="CKD-EPI 2021"
                calculatorSlug="ckd-epi"
                summary={`TFGe: ${resultado.egfr.toFixed(1)} mL/min/1.73m² – ${resultado.estagio}`}
                details={{ Creatinina: `${form.creatinina} mg/dL`, Idade: form.idade, Sexo: form.sexo === "m" ? "Masculino" : "Feminino", TFGe: resultado.egfr.toFixed(1), Estágio: resultado.estagio }}
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do Paciente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Creatinina sérica (mg/dL) *</Label><Input type="number" step="0.01" value={form.creatinina} onChange={(e) => set("creatinina", e.target.value)} placeholder="Ex: 1.2" /></div>
              <div className="space-y-1.5"><Label>Idade (anos) *</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 55" /></div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre a CKD-EPI 2021</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A equação <strong>CKD-EPI 2021</strong> estima a taxa de filtração glomerular (TFGe) a partir da creatinina sérica, idade e sexo, sem uso de coeficiente racial.</p>
                <p><strong>Por que 2021?</strong> A versão anterior (2009) incluía um fator racial que foi removido pelo NEJM/KDIGO por evidências de que perpetuava disparidades.</p>
                <p><strong>Estágios da DRC:</strong> G1 (≥90), G2 (60-89), G3a (45-59), G3b (30-44), G4 (15-29), G5 (&lt;15).</p>
                <p><strong>Limitações:</strong> Menos precisa em extremos de peso, amputados, gestantes e uso de creatina. Cistatina C pode ser alternativa.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular TFGe</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <RiskGauge
                  value={resultado.egfr}
                  maxValue={120}
                  label={resultado.estagio}
                  unit="mL/min/1.73m²"
                  segments={[
                    { min: 0, max: 12, color: "hsl(0 72% 40%)", label: "G5" },
                    { min: 12, max: 25, color: "hsl(0 72% 51%)", label: "G4" },
                    { min: 25, max: 37, color: "hsl(25 90% 50%)", label: "G3b" },
                    { min: 37, max: 50, color: "hsl(38 92% 50%)", label: "G3a" },
                    { min: 50, max: 75, color: "hsl(80 60% 45%)", label: "G2" },
                    { min: 75, max: 100, color: "hsl(142 71% 45%)", label: "G1" },
                  ]}
                />
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>≥90</span><span>G1 – Normal</span></div>
                    <div className="flex justify-between"><span>60-89</span><span>G2 – Leve ↓</span></div>
                    <div className="flex justify-between"><span>45-59</span><span>G3a</span></div>
                    <div className="flex justify-between"><span>30-44</span><span>G3b</span></div>
                    <div className="flex justify-between"><span>15-29</span><span>G4 – Grave ↓</span></div>
                    <div className="flex justify-between"><span>&lt;15</span><span>G5 – Falência</span></div>
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

              <ClinicalReferences references={CALCULATOR_REFERENCES["ckd-epi"]} />
              <RelatedCalculators currentSlug="ckd-epi" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Beaker className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular TFGe</strong> para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
