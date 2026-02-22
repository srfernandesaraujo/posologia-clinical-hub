import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Activity, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";
type Unidade = "mgdl" | "mmol";

interface FormData {
  nomePaciente: string;
  data: string;
  glicemia: string;
  unidadeGlicemia: Unidade;
  insulina: string;
  idade: string;
  sexo: string;
  peso: string;
  altura: string;
  diagnostico: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  glicemia: "", unidadeGlicemia: "mgdl", insulina: "",
  idade: "", sexo: "", peso: "", altura: "", diagnostico: "",
};

interface Resultado {
  homaIR: number;
  faixa: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function calcHomaIR(glicemia: number, unidade: Unidade, insulina: number): number {
  if (unidade === "mgdl") return (insulina * glicemia) / 405;
  return (insulina * glicemia) / 22.5; // mmol/L
}

function classificar(homa: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (homa < 1.0) return {
    homaIR: homa, faixa: "Sensibilidade aumentada à insulina",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Sensibilidade insulínica normal/aumentada. Sem intervenção necessária.", "Manter estilo de vida saudável."]
      : ["Seu corpo responde bem à insulina. Continue com hábitos saudáveis!"],
  };
  if (homa < 2.5) return {
    homaIR: homa, faixa: "Normal",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["HOMA-IR dentro da faixa de normalidade.", "Reavaliar periodicamente se fatores de risco presentes."]
      : ["Seu resultado está normal. Mantenha uma alimentação equilibrada e exercícios regulares."],
  };
  if (homa < 3.0) return {
    homaIR: homa, faixa: "Resistência insulínica provável",
    cor: "hsl(38 92% 50%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? ["HOMA-IR elevado — resistência insulínica provável.", "Investigar síndrome metabólica: circunferência abdominal, perfil lipídico, PA.",
         "Orientar mudança de estilo de vida: dieta com baixo índice glicêmico + atividade física 150min/sem.",
         "Avaliar risco cardiovascular global."]
      : ["Seu corpo está tendo dificuldade para usar a insulina.", "Mudanças na alimentação e exercícios físicos são muito importantes.",
         "Converse com seu médico sobre os próximos passos."],
  };
  return {
    homaIR: homa, faixa: "Resistência insulínica significativa",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["HOMA-IR significativamente elevado.", "Forte indicativo de resistência insulínica. Considerar metformina se clinicamente indicado (SOP, pré-diabetes, SM).",
         "Solicitar HbA1c, perfil lipídico completo, OGTT se não realizado.", "Avaliar para síndrome metabólica, SOP, esteatose hepática.",
         "Encaminhar ao endocrinologista se necessário.", "Referências: ADA Standards of Care 2024, Endocrine Society Guidelines."]
      : ["Seu corpo tem resistência significativa à insulina.", "É importante consultar um endocrinologista.",
         "Medicamentos podem ser necessários além de dieta e exercícios.", "Seu médico pedirá exames complementares."],
  };
}

function gerarPDF(form: FormData, resultado: Resultado, modo: Modo, imc: string) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Resistencia Insulinica (HOMA-IR) - Posologia", w / 2, y, { align: "center" });
  y += 6; doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Relatorio de Avaliacao Metabolica", w / 2, y, { align: "center" });
  y += 5; doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 8; doc.line(14, y, w - 14, y); y += 6;

  if (form.nomePaciente) { doc.setFont("helvetica", "bold"); doc.text("Paciente:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.nomePaciente, 40, y); y += 5; }
  doc.setFont("helvetica", "bold"); doc.text("Data:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.data, 30, y); y += 8;

  doc.setFont("helvetica", "bold"); doc.text("Dados Inseridos:", 14, y); y += 5;
  doc.setFont("helvetica", "normal");
  const unidLabel = form.unidadeGlicemia === "mgdl" ? "mg/dL" : "mmol/L";
  [`Glicemia de jejum: ${form.glicemia} ${unidLabel}`, `Insulina de jejum: ${form.insulina} µU/mL`,
   form.idade ? `Idade: ${form.idade} anos` : null, form.sexo ? `Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}` : null,
   imc ? `IMC: ${imc} kg/m2` : null, form.diagnostico ? `Diagnostico: ${form.diagnostico}` : null,
  ].filter(Boolean).forEach((d) => { doc.text(`  ${d}`, 18, y); y += 4.5; });
  y += 4;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`HOMA-IR: ${resultado.homaIR.toFixed(2)}`, 14, y); y += 6;
  doc.setFontSize(10);
  doc.text(`Interpretacao: ${resultado.faixa}`, 14, y); y += 8;

  doc.text("Recomendacoes:", 14, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 1; });

  y += 8; doc.setFontSize(7); doc.setTextColor(130);
  doc.text("Este relatorio e uma estimativa e nao substitui avaliacao medica presencial.", 14, y);
  doc.save(`homa-ir-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function HomaIR() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const imc = useMemo(() => {
    if (form.altura && form.peso) { const h = Number(form.altura) / 100; const w = Number(form.peso); if (h > 0 && w > 0) return (w / (h * h)).toFixed(1); }
    return "";
  }, [form.altura, form.peso]);

  const calcular = () => {
    if (!form.glicemia || !form.insulina) { setErro("Preencha glicemia e insulina de jejum."); return; }
    const glic = Number(form.glicemia);
    const ins = Number(form.insulina);
    if (glic <= 0 || ins <= 0) { setErro("Valores devem ser maiores que zero."); return; }
    const homa = calcHomaIR(glic, form.unidadeGlicemia, ins);
    const res = classificar(Math.round(homa * 100) / 100, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "HOMA-IR",
      calculatorSlug: "homa-ir",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `HOMA-IR: ${res.homaIR.toFixed(2)} – ${res.faixa}`,
      details: { Glicemia: `${form.glicemia} ${form.unidadeGlicemia === "mgdl" ? "mg/dL" : "mmol/L"}`, Insulina: `${form.insulina} µU/mL`, "HOMA-IR": res.homaIR.toFixed(2), Classificação: res.faixa },
    });
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
            <div className="rounded-xl bg-primary/10 p-3"><Activity className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Resistência Insulínica (HOMA-IR)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Cálculo e interpretação do índice HOMA-IR.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="homa-ir" toolName="Calculadora HOMA-IR" />
            <CalculationHistory calculatorSlug="homa-ir" />
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
              <div className="space-y-1.5"><Label>Glicemia de jejum *</Label><Input type="number" step="0.1" value={form.glicemia} onChange={(e) => set("glicemia", e.target.value)} placeholder={form.unidadeGlicemia === "mgdl" ? "Ex: 95" : "Ex: 5.3"} /></div>
              <div className="space-y-1.5">
                <Label>Unidade da glicemia</Label>
                <Select value={form.unidadeGlicemia} onValueChange={(v) => set("unidadeGlicemia", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mgdl">mg/dL</SelectItem><SelectItem value="mmol">mmol/L</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Insulina de jejum (µU/mL) *</Label><Input type="number" step="0.1" value={form.insulina} onChange={(e) => set("insulina", e.target.value)} placeholder="Ex: 12" /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Adicionais (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Idade</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" value={form.peso} onChange={(e) => set("peso", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Altura (cm)</Label><Input type="number" value={form.altura} onChange={(e) => set("altura", e.target.value)} /></div>
              {imc && <div className="space-y-1.5"><Label>IMC calculado</Label><div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm">{imc} kg/m²</div></div>}
              <div className="space-y-1.5">
                <Label>Diagnóstico associado</Label>
                <Select value={form.diagnostico} onValueChange={(v) => set("diagnostico", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    <SelectItem value="dm2">Diabetes Tipo 2</SelectItem>
                    <SelectItem value="pre-diabetes">Pré-diabetes</SelectItem>
                    <SelectItem value="sm">Síndrome Metabólica</SelectItem>
                    <SelectItem value="sop">SOP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">O que é o HOMA-IR?</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O <strong>HOMA-IR</strong> (Homeostasis Model Assessment of Insulin Resistance) é um índice calculado a partir da glicemia e insulina de jejum que estima o grau de resistência à insulina.</p>
                <p><strong>Fórmula:</strong> HOMA-IR = (Insulina µU/mL × Glicemia mg/dL) ÷ 405</p>
                <p><strong>Interpretação:</strong> Valores acima de 2,5 sugerem resistência insulínica. Quanto maior o valor, maior a resistência.</p>
                <p><strong>Limitações:</strong> O HOMA-IR é uma estimativa e pode ser influenciado por estresse, uso de medicamentos e variabilidade laboratorial. O padrão-ouro é o clamp hiperinsulinêmico-euglicêmico, mas é impraticável na rotina clínica.</p>
                <p><strong>QUICKI:</strong> Alternativa ao HOMA-IR: QUICKI = 1 / [log(insulina) + log(glicemia)]. Valores &lt; 0,339 indicam resistência.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular HOMA-IR</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: resultado.cor }}>{resultado.homaIR.toFixed(2)}</p>
                  <p className="font-medium mt-2" style={{ color: resultado.cor }}>{resultado.faixa}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>&lt;1,0</span><span>Sensibilidade aumentada</span></div>
                    <div className="flex justify-between"><span>1,0-2,4</span><span>Normal</span></div>
                    <div className="flex justify-between"><span>≥2,5</span><span>Resistência provável</span></div>
                    <div className="flex justify-between"><span>≥3,0</span><span>Resistência significativa</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Recomendações</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(form, resultado, modo, imc)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha glicemia e insulina de jejum para calcular o HOMA-IR.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
