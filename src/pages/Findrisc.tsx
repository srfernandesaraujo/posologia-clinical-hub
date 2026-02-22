import { useState, useMemo } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, ShieldAlert, User, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

type Modo = "pro" | "educativo";
type Sexo = "m" | "f";

interface FormData {
  nomePaciente: string;
  data: string;
  idade: string;
  sexo: Sexo | "";
  peso: string;
  altura: string;
  imcDireto: string;
  circAbdominal: string;
  atividadeFisica: string; // "1"=sim, "0"=não
  alimentacao: string;
  antiHipertensivo: string;
  glicemiaAlterada: string;
  histFamiliar: string; // "0","2grau","1grau"
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  idade: "", sexo: "", peso: "", altura: "", imcDireto: "",
  circAbdominal: "", atividadeFisica: "", alimentacao: "",
  antiHipertensivo: "", glicemiaAlterada: "", histFamiliar: "",
};

interface Resultado {
  pontos: number;
  faixa: string;
  riscoPct: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function calcPontos(form: FormData, imc: number): number {
  let pts = 0;
  const idade = Number(form.idade);

  // Age
  if (idade >= 65) pts += 4;
  else if (idade >= 55) pts += 3;
  else if (idade >= 45) pts += 2;

  // BMI
  if (imc >= 30) pts += 3;
  else if (imc >= 25) pts += 1;

  // Waist
  const circ = Number(form.circAbdominal);
  if (form.sexo === "m") {
    if (circ > 102) pts += 4;
    else if (circ >= 94) pts += 3;
  } else {
    if (circ > 88) pts += 4;
    else if (circ >= 80) pts += 3;
  }

  // Physical activity
  if (form.atividadeFisica === "0") pts += 2;

  // Diet
  if (form.alimentacao === "0") pts += 1;

  // Anti-hypertensive
  if (form.antiHipertensivo === "1") pts += 2;

  // Previous high glucose
  if (form.glicemiaAlterada === "1") pts += 5;

  // Family history
  if (form.histFamiliar === "1grau") pts += 5;
  else if (form.histFamiliar === "2grau") pts += 3;

  return pts;
}

function classificar(pts: number, modo: Modo): Resultado {
  const isPro = modo === "pro";

  if (pts < 7) return {
    pontos: pts, faixa: "Risco Baixo", riscoPct: "~1%",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Risco baixo de DM2 em 10 anos (~1%).", "Manter orientações de estilo de vida saudável.", "Reavaliar em 3-5 anos."]
      : ["Seu risco de diabetes é baixo! Continue com hábitos saudáveis.", "Mantenha exercícios regulares e alimentação equilibrada."],
  };
  if (pts <= 11) return {
    pontos: pts, faixa: "Risco Ligeiramente Aumentado", riscoPct: "~4%",
    cor: "hsl(60 70% 45%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? ["Risco ligeiramente aumentado (~4% em 10 anos).", "Orientar mudanças no estilo de vida: dieta com baixo IG, atividade física regular.",
         "Solicitar glicemia de jejum para rastreamento.", "Reavaliar anualmente se fatores de risco persistirem."]
      : ["Seu risco está um pouco elevado. Pequenas mudanças ajudam muito!", "Tente fazer 30 minutos de exercício por dia.", "Coma mais verduras e frutas."],
  };
  if (pts <= 14) return {
    pontos: pts, faixa: "Risco Moderado", riscoPct: "~17%",
    cor: "hsl(38 92% 50%)", bgClass: "border-orange-400/30 bg-orange-400/10",
    recomendacoes: isPro
      ? ["Risco moderado de DM2 (~17% em 10 anos).", "Solicitar glicemia de jejum + HbA1c.", "Considerar TOTG (curva glicêmica) se glicemia de jejum entre 100-125 mg/dL.",
         "Encaminhar para programa de prevenção de diabetes (dieta + exercício).", "Avaliar outros componentes da síndrome metabólica."]
      : ["Seu risco de diabetes é moderado. Ação preventiva é importante!", "Consulte um médico para exames de sangue.", "Perder 5-7% do peso pode reduzir o risco em até 58%."],
  };
  if (pts <= 20) return {
    pontos: pts, faixa: "Risco Alto", riscoPct: "~33%",
    cor: "hsl(20 90% 48%)", bgClass: "border-orange-600/30 bg-orange-600/10",
    recomendacoes: isPro
      ? ["Risco alto de DM2 (~33% em 10 anos).", "Investigação laboratorial obrigatória: glicemia de jejum, HbA1c, TOTG.",
         "Encaminhar ao endocrinologista e nutricionista.", "Programa estruturado de mudança de estilo de vida.",
         "Considerar metformina para prevenção se pré-diabetes confirmado (ADA 2024).", "Monitoramento semestral."]
      : ["Seu risco de diabetes é alto. Procure um médico!", "Exames de sangue são necessários o quanto antes.", "Mudanças no estilo de vida podem reduzir muito o risco."],
  };
  return {
    pontos: pts, faixa: "Risco Muito Alto", riscoPct: "~50%",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Risco muito alto de DM2 (~50% em 10 anos).", "Investigação imediata: glicemia de jejum, HbA1c, TOTG. Descartar diabetes já instalado.",
         "Encaminhamento prioritário ao endocrinologista.", "Considerar fortemente metformina profilática (ADA).",
         "Programa intensivo de intervenção: dieta + exercício + monitoramento trimestral.", "Avaliar complicações metabólicas e cardiovasculares."]
      : ["Seu risco de diabetes é muito alto. Ação imediata é necessária!", "Procure um endocrinologista urgentemente.", "Exames de sangue são indispensáveis.", "Não adie: mudanças agora podem evitar o diabetes."],
  };
}

function gerarPDF(form: FormData, resultado: Resultado, modo: Modo, imc: string) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Calculadora de Risco de Diabetes Tipo 2 - Posologia", w / 2, y, { align: "center" });
  y += 6; doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Avaliacao Individual com Escore FINDRISC", w / 2, y, { align: "center" });
  y += 5; doc.text("Autor: Sergio Araujo - Posologia Producoes", w / 2, y, { align: "center" });
  y += 8; doc.line(14, y, w - 14, y); y += 6;

  if (form.nomePaciente) { doc.setFont("helvetica", "bold"); doc.text("Paciente:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.nomePaciente, 40, y); y += 5; }
  doc.setFont("helvetica", "bold"); doc.text("Data:", 14, y); doc.setFont("helvetica", "normal"); doc.text(form.data, 30, y); y += 8;

  doc.setFont("helvetica", "bold"); doc.text("Dados Inseridos:", 14, y); y += 5;
  doc.setFont("helvetica", "normal");
  [`Idade: ${form.idade} anos`, `Sexo: ${form.sexo === "m" ? "Masculino" : "Feminino"}`,
   `IMC: ${imc} kg/m2`, `Circunferencia abdominal: ${form.circAbdominal} cm`,
   `Atividade fisica regular: ${form.atividadeFisica === "1" ? "Sim" : "Nao"}`,
   `Alimentacao rica em vegetais/frutas: ${form.alimentacao === "1" ? "Sim" : "Nao"}`,
   `Uso de anti-hipertensivo: ${form.antiHipertensivo === "1" ? "Sim" : "Nao"}`,
   `Historico de glicemia alterada: ${form.glicemiaAlterada === "1" ? "Sim" : "Nao"}`,
   `Historico familiar de diabetes: ${form.histFamiliar === "1grau" ? "1o grau" : form.histFamiliar === "2grau" ? "2o grau" : "Nao"}`,
  ].forEach((d) => { doc.text(`  ${d}`, 18, y); y += 4.5; });
  y += 4;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`Pontuacao FINDRISC: ${resultado.pontos}/26`, 14, y); y += 6;
  doc.text(`Classificacao: ${resultado.faixa} (${resultado.riscoPct} em 10 anos)`, 14, y); y += 8;

  doc.setFontSize(10); doc.text("Recomendacoes:", 14, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 1; });

  y += 8; doc.setFontSize(7); doc.setTextColor(130);
  doc.text("Este relatorio e uma estimativa e nao substitui avaliacao medica presencial.", 14, y);
  doc.save(`findrisc-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function Findrisc() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("pro");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const imc = useMemo(() => {
    if (form.imcDireto) return form.imcDireto;
    if (form.altura && form.peso) { const h = Number(form.altura) / 100; const w = Number(form.peso); if (h > 0 && w > 0) return (w / (h * h)).toFixed(1); }
    return "";
  }, [form.altura, form.peso, form.imcDireto]);

  const calcular = () => {
    if (!form.idade || !form.sexo || !imc || !form.circAbdominal || !form.atividadeFisica || !form.alimentacao || !form.antiHipertensivo || !form.glicemiaAlterada || !form.histFamiliar) {
      setErro("Preencha todos os 8 campos do escore FINDRISC."); return;
    }
    const pts = calcPontos(form, Number(imc));
    const res = classificar(pts, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "FINDRISC",
      calculatorSlug: "findrisc",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${res.pontos}/26 – ${res.faixa} (${res.riscoPct})`,
      details: { Pontuação: `${res.pontos}/26`, Classificação: res.faixa, "Risco em 10 anos": res.riscoPct, IMC: imc, "Circ. Abdominal": `${form.circAbdominal} cm` },
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
            <div className="rounded-xl bg-primary/10 p-3"><ShieldAlert className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Risco de Diabetes Tipo 2 (FINDRISC)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Escore FINDRISC — risco de DM2 em 10 anos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalculationHistory calculatorSlug="findrisc" />
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("pro")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "pro" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Profissional
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Escore FINDRISC</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Age */}
              <div className="space-y-1.5"><Label>1. Idade (anos) *</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} /></div>
              {/* Sex */}
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
              {/* 2. BMI */}
              <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" value={form.peso} onChange={(e) => set("peso", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Altura (cm)</Label><Input type="number" value={form.altura} onChange={(e) => set("altura", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>2. IMC (kg/m²) *{imc && !form.imcDireto ? ` — calculado: ${imc}` : ""}</Label>
                <Input type="number" step="0.1" value={form.imcDireto} onChange={(e) => set("imcDireto", e.target.value)} placeholder={imc ? `Auto: ${imc}` : "Ou insira diretamente"} />
              </div>
              {/* 3. Waist */}
              <div className="space-y-1.5"><Label>3. Circunferência abdominal (cm) *</Label><Input type="number" value={form.circAbdominal} onChange={(e) => set("circAbdominal", e.target.value)} placeholder={form.sexo === "m" ? "♂ ref: <94 / 94-102 / >102" : form.sexo === "f" ? "♀ ref: <80 / 80-88 / >88" : ""} /></div>
              {/* 4. Physical activity */}
              <div className="space-y-1.5">
                <Label>4. Atividade física ≥30min/dia? *</Label>
                <Select value={form.atividadeFisica} onValueChange={(v) => set("atividadeFisica", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent>
                </Select>
              </div>
              {/* 5. Diet */}
              <div className="space-y-1.5">
                <Label>5. Consome vegetais/frutas diariamente? *</Label>
                <Select value={form.alimentacao} onValueChange={(v) => set("alimentacao", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent>
                </Select>
              </div>
              {/* 6. Anti-hypertensive */}
              <div className="space-y-1.5">
                <Label>6. Usa medicação anti-hipertensiva? *</Label>
                <Select value={form.antiHipertensivo} onValueChange={(v) => set("antiHipertensivo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="0">Não</SelectItem><SelectItem value="1">Sim</SelectItem></SelectContent>
                </Select>
              </div>
              {/* 7. Glucose history */}
              <div className="space-y-1.5">
                <Label>7. Já teve glicemia alterada? *</Label>
                <Select value={form.glicemiaAlterada} onValueChange={(v) => set("glicemiaAlterada", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="0">Não</SelectItem><SelectItem value="1">Sim</SelectItem></SelectContent>
                </Select>
              </div>
              {/* 8. Family history */}
              <div className="space-y-1.5">
                <Label>8. Histórico familiar de diabetes? *</Label>
                <Select value={form.histFamiliar} onValueChange={(v) => set("histFamiliar", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não</SelectItem>
                    <SelectItem value="2grau">Sim, parentes de 2º grau</SelectItem>
                    <SelectItem value="1grau">Sim, parentes de 1º grau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre o FINDRISC</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O <strong>FINDRISC</strong> (Finnish Diabetes Risk Score) é um questionário simples de 8 perguntas validado internacionalmente para estimar o risco de desenvolver diabetes tipo 2 nos próximos 10 anos.</p>
                <p>Foi desenvolvido na Finlândia e é recomendado pela OMS, IDF e diversas sociedades de endocrinologia como ferramenta de rastreamento populacional.</p>
                <p><strong>Importante:</strong> O FINDRISC não diagnostica diabetes — ele identifica quem deve ser investigado com exames laboratoriais.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular Risco</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Resultado FINDRISC</h2>
                <div className="text-center">
                  <p className="text-5xl font-bold" style={{ color: resultado.cor }}>{resultado.pontos}</p>
                  <p className="text-sm text-muted-foreground mt-1">de 26 pontos</p>
                  <p className="font-semibold text-lg mt-3" style={{ color: resultado.cor }}>{resultado.faixa}</p>
                  <p className="text-sm mt-1">Risco em 10 anos: <strong>{resultado.riscoPct}</strong></p>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>&lt;7 pts</span><span>Baixo (~1%)</span></div>
                    <div className="flex justify-between"><span>7-11 pts</span><span>Ligeiramente ↑ (~4%)</span></div>
                    <div className="flex justify-between"><span>12-14 pts</span><span>Moderado (~17%)</span></div>
                    <div className="flex justify-between"><span>15-20 pts</span><span>Alto (~33%)</span></div>
                    <div className="flex justify-between"><span>&gt;20 pts</span><span>Muito alto (~50%)</span></div>
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
              <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os 8 campos do FINDRISC e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
