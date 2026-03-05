import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Zap, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
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
  qt: string;
  rr: string;
  fc: string;
  usarFC: string;
  sexo: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  qt: "", rr: "", fc: "", usarFC: "fc", sexo: "m",
};

interface Resultado {
  bazett: number;
  fridericia: number;
  classificacao: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function classificar(qtcBazett: number, sexo: string, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  const limite = sexo === "f" ? 470 : 450;
  const limiteAlto = 500;
  // Dummy fridericia will be calculated outside
  if (qtcBazett > limiteAlto) return {
    bazett: qtcBazett, fridericia: 0,
    classificacao: "QTc marcadamente prolongado (>500 ms)",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["QTc >500 ms: risco significativo de Torsades de Pointes.", "Revisar TODOS os medicamentos que prolongam QT (CredibleMeds.org).", "Corrigir K >4.0, Mg >2.0 mEq/L.", "Considerar suspender agente causal. Monitorizar em telemetria.", "Se Torsades: sulfato de magnesio 2g IV + isoproterenol ou pacing."]
      : ["Seu intervalo QT esta muito prolongado.", "Alguns medicamentos podem ser a causa. Informe seu medico."],
  };
  if (qtcBazett > limite) return {
    bazett: qtcBazett, fridericia: 0,
    classificacao: `QTc prolongado (>${limite} ms)`,
    cor: "hsl(38 92% 50%)", bgClass: "border-yellow-500/30 bg-yellow-500/10",
    recomendacoes: isPro
      ? [`QTc acima do limite (${limite} ms para ${sexo === "f" ? "mulheres" : "homens"}).`, "Revisar farmacos: antiarritimicos (sotalol, amiodarona), antipsicoticos, fluoroquinolonas, macrolideos, antidepressivos.", "Monitorar eletrolitos (K, Mg, Ca).", "Considerar ECG seriado. Evitar associacao de >1 farmaco prolongador."]
      : ["Seu QT esta levemente prolongado.", "Converse com seu medico sobre seus medicamentos."],
  };
  return {
    bazett: qtcBazett, fridericia: 0,
    classificacao: "QTc normal",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? [`QTc dentro da normalidade (<${limite} ms para ${sexo === "f" ? "mulheres" : "homens"}).`, "Sem restricao farmacologica por intervalo QT.", "Monitorar se iniciar farmaco prolongador de QT."]
      : ["Seu intervalo QT esta normal."],
  };
}

export default function QTcCorrigido() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const handleCalc = () => {
    if (!form.qt || (!form.fc && !form.rr)) { setErro("Preencha QT e FC ou intervalo RR."); return; }
    const qt = Number(form.qt);
    let rr: number;
    if (form.usarFC === "fc") {
      const fc = Number(form.fc);
      if (fc <= 0) { setErro("FC invalida."); return; }
      rr = 60 / fc;
    } else {
      rr = Number(form.rr) / 1000; // ms to s
    }
    if (qt <= 0 || rr <= 0) { setErro("Valores invalidos."); return; }

    const bazett = Math.round(qt / Math.sqrt(rr));
    const fridericia = Math.round(qt / Math.cbrt(rr));

    const res = classificar(bazett, form.sexo, modo);
    res.fridericia = fridericia;
    setResultado(res);
    saveCalculation({
      calculatorName: "QTc Corrigido",
      calculatorSlug: "qtc-corrigido",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `QTc Bazett: ${bazett} ms | Fridericia: ${fridericia} ms – ${res.classificacao}`,
      details: { "QTc Bazett": `${bazett} ms`, "QTc Fridericia": `${fridericia} ms`, Classificacao: res.classificacao },
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
            <div className="rounded-xl bg-primary/10 p-3"><Zap className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">QTc Corrigido (Bazett / Fridericia)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Correcao do intervalo QT pela frequencia cardiaca.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="qtc-corrigido" toolName="QTc Corrigido" />
            <CalculationHistory calculatorSlug="qtc-corrigido" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do ECG</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Intervalo QT (ms) *</Label><Input type="number" value={form.qt} onChange={(e) => set("qt", e.target.value)} placeholder="Ex: 420" /></div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Usar FC ou RR?</Label>
                <Select value={form.usarFC} onValueChange={(v) => set("usarFC", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fc">Frequencia cardiaca (bpm)</SelectItem><SelectItem value="rr">Intervalo RR (ms)</SelectItem></SelectContent>
                </Select>
              </div>
              {form.usarFC === "fc" ? (
                <div className="space-y-1.5"><Label>FC (bpm) *</Label><Input type="number" value={form.fc} onChange={(e) => set("fc", e.target.value)} placeholder="Ex: 72" /></div>
              ) : (
                <div className="space-y-1.5"><Label>RR (ms) *</Label><Input type="number" value={form.rr} onChange={(e) => set("rr", e.target.value)} placeholder="Ex: 833" /></div>
              )}
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre o QTc</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O intervalo QT varia com a FC. A <strong>correcao</strong> permite comparar pacientes com diferentes FCs.</p>
                <p><strong>Bazett:</strong> QTc = QT / raiz(RR). Mais usado, mas superestima em taquicardia e subestima em bradicardia.</p>
                <p><strong>Fridericia:</strong> QTc = QT / raiz cubica(RR). Mais preciso em FC extremas. Preferido por agencias regulatorias (FDA).</p>
                <p><strong>Limites:</strong> Homens &gt;450 ms, Mulheres &gt;470 ms = prolongado. &gt;500 ms = alto risco de Torsades de Pointes.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular QTc</Button>
            <Button variant="outline" onClick={() => { setForm(INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold" style={{ color: resultado.cor }}>{resultado.bazett}</div>
                  <div className="text-sm text-muted-foreground mt-1">ms (Bazett)</div>
                  <div className="text-2xl font-semibold mt-2">{resultado.fridericia}</div>
                  <div className="text-xs text-muted-foreground">ms (Fridericia)</div>
                  <div className="mt-3 text-sm font-semibold" style={{ color: resultado.cor }}>{resultado.classificacao}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["qtc-corrigido"]} />
              <RelatedCalculators currentSlug="qtc-corrigido" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados do ECG e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
