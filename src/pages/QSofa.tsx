import { useState } from "react";
import { CalculationHistory } from "@/components/CalculationHistory";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { ArrowLeft, FileText, Thermometer, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";

const CRITERIOS_QSOFA = [
  { id: "pas", label: "PAS ≤ 100 mmHg", pontos: 1 },
  { id: "fr", label: "Frequência respiratória ≥ 22 irpm", pontos: 1 },
  { id: "glasgow", label: "Alteração do nível de consciência (Glasgow < 15)", pontos: 1 },
];

interface Resultado {
  score: number;
  risco: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function classificar(score: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (score <= 1) return {
    score, risco: "Baixo risco de desfecho adverso",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["qSOFA 0-1: baixo risco, mas NÃO exclui sepse.", "Se suspeita clínica: solicitar lactato, hemoculturas, procalcitonina.", "Monitorar sinais vitais. Reavaliar em 1-2h.", "Aplicar SOFA completo se disponível (requer exames laboratoriais)."]
      : ["Os sinais vitais atuais sugerem menor risco.", "Continue monitorando e informe ao médico qualquer mudança."],
  };
  return {
    score, risco: "Alto risco — investigar sepse/disfunção orgânica",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["qSOFA ≥2: alto risco de desfecho adverso (mortalidade hospitalar >10%).", "Hora 1 da sepse — iniciar Bundle SEP-1:", "• Hemoculturas (antes do ATB) + lactato sérico.", "• Antibiótico empírico de amplo espectro IV na 1ª hora.", "• SF 0,9% 30 mL/kg se hipotensão ou lactato ≥4 mmol/L.", "Se persistir hipotensão após volume: noradrenalina (PAM ≥65 mmHg).", "Considerar UTI. Calcular SOFA completo.", "Reavaliar lactato em 2-4h."]
      : ["Os sinais vitais indicam risco significativo.", "Atendimento médico urgente é necessário.", "Exames de sangue e tratamento imediato podem ser indicados."],
  };
}

function gerarPDF(form: { nomePaciente: string; data: string }, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("qSOFA (Quick SOFA) - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 10;
  doc.setFontSize(14);
  doc.text(`qSOFA: ${resultado.score}/3`, 14, y); y += 7;
  doc.setFontSize(11); doc.text(resultado.risco, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`qsofa-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function QSofa() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const score = CRITERIOS_QSOFA.reduce((s, c) => s + (checked[c.id] ? c.pontos : 0), 0);

  const calcular = () => {
    const res = classificar(score, modo);
    setResultado(res);
  };

  const limpar = () => { setChecked({}); setResultado(null); };

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
            <div className="rounded-xl bg-primary/10 p-3"><Thermometer className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">qSOFA (Quick SOFA)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Triagem rápida à beira-leito para risco de sepse — Sepsis-3.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="qsofa" toolName="qSOFA" />
            <CalculationHistory calculatorSlug="qsofa" />
            {resultado && (
              <SaveToHistoryButton
                calculatorName="qSOFA"
                calculatorSlug="qsofa"
                summary={`qSOFA: ${resultado.score}/3 – ${resultado.risco}`}
                details={{ Score: `${resultado.score}/3`, Risco: resultado.risco }}
                date={data}
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
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={nomePaciente} onChange={(e) => { setNomePaciente(e.target.value); setResultado(null); }} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={(e) => { setData(e.target.value); setResultado(null); }} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Critérios qSOFA</h2>
            <div className="space-y-3">
              {CRITERIOS_QSOFA.map((c) => (
                <label key={c.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <Checkbox
                    checked={!!checked[c.id]}
                    onCheckedChange={(v) => { setChecked((p) => ({ ...p, [c.id]: !!v })); setResultado(null); }}
                    className="mt-0.5"
                  />
                  <span className="text-sm flex-1">{c.label}</span>
                  <span className="text-xs font-mono font-semibold text-primary shrink-0">+{c.pontos}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">Score atual:</span>
              <span className="text-lg font-bold text-primary">{score}/3</span>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre o qSOFA</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O <strong>qSOFA</strong> (Quick Sequential Organ Failure Assessment) foi introduzido pelo Sepsis-3 (2016) como ferramenta de triagem à beira-leito.</p>
                <p><strong>3 critérios:</strong> PAS ≤100 mmHg, FR ≥22 irpm, Glasgow &lt;15. Cada um vale 1 ponto.</p>
                <p><strong>≥2 pontos:</strong> alto risco de desfecho adverso (mortalidade hospitalar &gt;10%). Deve iniciar investigação e tratamento para sepse.</p>
                <p><strong>Importante:</strong> qSOFA é ferramenta de TRIAGEM, não de diagnóstico. O SOFA completo (6 sistemas) é necessário para diagnóstico de sepse.</p>
                <p><strong>Sepsis-3:</strong> Sepse = infecção suspeitada + aumento ≥2 pontos no SOFA. Choque séptico = sepse + vasopressor + lactato &gt;2 mmol/L.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular qSOFA</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <RiskGauge
                  value={resultado.score}
                  maxValue={3}
                  label={resultado.risco}
                  unit="/3"
                  segments={[
                    { min: 0, max: 50, color: "hsl(142 71% 45%)", label: "Baixo" },
                    { min: 50, max: 100, color: "hsl(0 72% 51%)", label: "Alto" },
                  ]}
                />
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>0-1</span><span>Baixo risco</span></div>
                    <div className="flex justify-between"><span>≥2</span><span>Alto risco — investigar sepse</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta Sugerida</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF({ nomePaciente, data }, resultado)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>

              <ClinicalReferences references={CALCULATOR_REFERENCES["qsofa"]} />
              <RelatedCalculators currentSlug="qsofa" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Thermometer className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Marque os critérios e clique em <strong>Calcular</strong> para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
