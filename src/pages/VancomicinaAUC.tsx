import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, FlaskConical, User, Stethoscope } from "lucide-react";
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
  peso: string;
  creatinina: string;
  idade: string;
  sexo: string;
  nivelVale: string;
  nivelPico: string;
  intervalo: string;
  tempoInfusao: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  peso: "", creatinina: "", idade: "", sexo: "m",
  nivelVale: "", nivelPico: "", intervalo: "12", tempoInfusao: "1",
};

interface Resultado {
  clearance: number;
  ke: number;
  vd: number;
  halfLife: number;
  auc24: number;
  aucMic: number;
  doseRecomendada: string;
  classificacao: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function calcCockcroftGault(idade: number, peso: number, creatinina: number, sexo: string): number {
  const base = ((140 - idade) * peso) / (72 * creatinina);
  return sexo === "f" ? base * 0.85 : base;
}

function calcular(form: FormData, modo: Modo): Resultado {
  const peso = Number(form.peso);
  const cr = Number(form.creatinina);
  const idade = Number(form.idade);
  const vale = Number(form.nivelVale);
  const pico = Number(form.nivelPico);
  const tau = Number(form.intervalo);
  const tinf = Number(form.tempoInfusao);

  const clCr = calcCockcroftGault(idade, peso, cr, form.sexo);
  // Vancomycin pharmacokinetic estimates
  const clVanco = 0.695 * (clCr / 60) + 0.05; // L/h/kg
  const vd = 0.7 * peso; // L
  const ke = (clVanco * peso) / vd;
  const halfLife = 0.693 / ke;

  let auc24: number;
  if (vale > 0 && pico > 0) {
    // Two-level method (Sawchuk-Zaske)
    const keCalc = Math.log(pico / vale) / (tau - tinf);
    const actualHalfLife = 0.693 / keCalc;
    const aucInf = ((pico - vale) / keCalc) * (1 - Math.exp(-keCalc * tinf)) / tinf;
    const aucElim = (pico - vale * Math.exp(-keCalc * (tau - tinf))) / keCalc;
    auc24 = (aucInf + aucElim) * (24 / tau);
  } else if (vale > 0) {
    // Single trough — Bayesian approximation
    auc24 = vale * 24 / (vd * ke) * 1.2;
  } else {
    // Population estimate
    auc24 = (1000 * (24 / tau)) / (clVanco * peso * 24) * 1000;
  }

  const aucMic = auc24; // Assuming MIC = 1 mg/L for MRSA
  const isPro = modo === "clinico";

  let classificacao: string, cor: string, bgClass: string, recomendacoes: string[];

  if (aucMic >= 400 && aucMic <= 600) {
    classificacao = "AUC/MIC Alvo Atingido (400-600)";
    cor = "hsl(142 71% 45%)";
    bgClass = "border-green-500/30 bg-green-500/10";
    recomendacoes = isPro
      ? ["AUC/MIC dentro do alvo terapeutico (400-600 mg·h/L).", "Manter dose atual. Monitorar niveis sericos a cada 3-5 dias.", "Se funcao renal estavel: reavaliar semanalmente."]
      : ["O nivel do antibiotico esta na faixa ideal.", "Continue o tratamento conforme prescrito."];
  } else if (aucMic < 400) {
    classificacao = "AUC/MIC Subterapeutico (<400)";
    cor = "hsl(38 92% 50%)";
    bgClass = "border-yellow-500/30 bg-yellow-500/10";
    recomendacoes = isPro
      ? ["AUC/MIC abaixo do alvo. Risco de falha terapeutica.", "Aumentar dose ou reduzir intervalo.", "Se MIC >= 2: considerar troca para daptomicina, linezolida ou ceftarolina.", "Repetir niveis apos 2-3 doses da nova posologia."]
      : ["O nivel do antibiotico esta abaixo do ideal.", "Seu medico pode precisar ajustar a dose."];
  } else {
    classificacao = "AUC/MIC Supraterapeutico (>600)";
    cor = "hsl(0 72% 51%)";
    bgClass = "border-red-500/30 bg-red-500/10";
    recomendacoes = isPro
      ? ["AUC/MIC acima do alvo. Risco aumentado de nefrotoxicidade.", "Reduzir dose ou aumentar intervalo.", "Monitorar creatinina diariamente.", "Considerar infusao continua ou troca de antimicrobiano.", "Referencia: IDSA/ASHP/SIDP Guidelines 2020."]
      : ["O nivel do antibiotico esta acima do desejavel.", "Ajustes na dose serao necessarios para proteger seus rins."];
  }

  return {
    clearance: Math.round(clCr * 10) / 10,
    ke: Math.round(ke * 1000) / 1000,
    vd: Math.round(vd * 10) / 10,
    halfLife: Math.round(halfLife * 10) / 10,
    auc24: Math.round(auc24),
    aucMic: Math.round(aucMic),
    doseRecomendada: aucMic < 400 ? "Considerar 15-20 mg/kg a cada 8-12h" : aucMic > 600 ? "Reduzir para 10-15 mg/kg a cada 12-24h" : "Manter posologia atual",
    classificacao, cor, bgClass, recomendacoes,
  };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Vancomicina AUC/MIC - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`ClCr: ${resultado.clearance} mL/min | Vd: ${resultado.vd} L | t1/2: ${resultado.halfLife}h`, 14, y); y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(`AUC/MIC: ${resultado.aucMic} mg.h/L`, 14, y); y += 7;
  doc.setFontSize(11); doc.text(resultado.classificacao, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`vancomicina-auc-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function VancomicinaAUC() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const handleCalc = () => {
    if (!form.peso || !form.creatinina || !form.idade) { setErro("Preencha peso, creatinina e idade."); return; }
    if (Number(form.peso) <= 0 || Number(form.creatinina) <= 0 || Number(form.idade) <= 0) { setErro("Valores devem ser maiores que zero."); return; }
    const res = calcular(form, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "Vancomicina AUC/MIC",
      calculatorSlug: "vancomicina-auc",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `AUC/MIC: ${res.aucMic} – ${res.classificacao}`,
      details: { ClCr: `${res.clearance} mL/min`, "AUC/MIC": String(res.aucMic), "t1/2": `${res.halfLife}h`, Classificacao: res.classificacao },
    });
  };

  const limpar = () => { setForm(INITIAL); setResultado(null); setErro(""); };

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
            <div className="rounded-xl bg-primary/10 p-3"><FlaskConical className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Vancomicina AUC/MIC</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Monitoramento farmacocinetico baseado em AUC — IDSA/ASHP 2020.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="vancomicina-auc" toolName="Vancomicina AUC/MIC" />
            <CalculationHistory calculatorSlug="vancomicina-auc" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do Paciente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" value={form.peso} onChange={(e) => set("peso", e.target.value)} placeholder="Ex: 70" /></div>
              <div className="space-y-1.5"><Label>Creatinina serica (mg/dL) *</Label><Input type="number" step="0.01" value={form.creatinina} onChange={(e) => set("creatinina", e.target.value)} placeholder="Ex: 1.0" /></div>
              <div className="space-y-1.5"><Label>Idade (anos) *</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 55" /></div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Niveis Sericos (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nivel vale (mcg/mL)</Label><Input type="number" step="0.1" value={form.nivelVale} onChange={(e) => set("nivelVale", e.target.value)} placeholder="Ex: 15" /></div>
              <div className="space-y-1.5"><Label>Nivel pico (mcg/mL)</Label><Input type="number" step="0.1" value={form.nivelPico} onChange={(e) => set("nivelPico", e.target.value)} placeholder="Ex: 35" /></div>
              <div className="space-y-1.5">
                <Label>Intervalo posologico (h)</Label>
                <Select value={form.intervalo} onValueChange={(v) => set("intervalo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="8">8h</SelectItem><SelectItem value="12">12h</SelectItem><SelectItem value="24">24h</SelectItem><SelectItem value="48">48h</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Tempo de infusao (h)</Label><Input type="number" step="0.5" value={form.tempoInfusao} onChange={(e) => set("tempoInfusao", e.target.value)} placeholder="1" /></div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre AUC/MIC da Vancomicina</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Desde 2020, as diretrizes IDSA/ASHP/SIDP recomendam <strong>AUC/MIC 400-600</strong> como alvo primario, substituindo o monitoramento por vale isolado.</p>
                <p><strong>Por que AUC?</strong> O vale isolado (15-20 mcg/mL) superestimava a exposicao e aumentava nefrotoxicidade sem beneficio clinico.</p>
                <p><strong>Metodos:</strong> Bayesiano (preferido), dois niveis (Sawchuk-Zaske), ou estimativa populacional.</p>
                <p><strong>MIC:</strong> Para MRSA com MIC = 1 mg/L, AUC alvo = 400-600. Se MIC &ge; 2: considerar antimicrobiano alternativo.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular AUC/MIC</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <RiskGauge value={resultado.aucMic} maxValue={800} label={resultado.classificacao} unit="mg.h/L" segments={[
                  { min: 0, max: 50, color: "hsl(38 92% 50%)", label: "Sub" },
                  { min: 50, max: 75, color: "hsl(142 71% 45%)", label: "Alvo" },
                  { min: 75, max: 100, color: "hsl(0 72% 51%)", label: "Supra" },
                ]} />
                <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>ClCr</span><span>{resultado.clearance} mL/min</span></div>
                  <div className="flex justify-between"><span>Vd</span><span>{resultado.vd} L</span></div>
                  <div className="flex justify-between"><span>t1/2</span><span>{resultado.halfLife} h</span></div>
                  <div className="flex justify-between"><span>Ke</span><span>{resultado.ke} h⁻¹</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm"><strong>Sugestao:</strong> {resultado.doseRecomendada}</div>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(form, resultado)}>
                <FileText className="h-4 w-4" /> Gerar Relatorio PDF
              </Button>

              <ClinicalReferences references={CALCULATOR_REFERENCES["vancomicina-auc"]} />
              <RelatedCalculators currentSlug="vancomicina-auc" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <FlaskConical className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
