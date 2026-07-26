import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Utensils, User, Stethoscope } from "lucide-react";
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
  altura: string;
  idade: string;
  sexo: string;
  estresse: string;
}

const INITIAL: FormData = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  peso: "", altura: "", idade: "", sexo: "m", estresse: "moderado",
};

interface Resultado {
  geb: number;
  get: number;
  proteina: { min: number; max: number };
  lipidio: { g: number; kcal: number };
  carboidrato: { g: number; kcal: number };
  volumeTotal: number;
  gir: number;
  recomendacoes: string[];
}

function calcular(form: FormData, modo: Modo): Resultado {
  const peso = Number(form.peso);
  const altura = Number(form.altura) / 100;
  const idade = Number(form.idade);
  const isPro = modo === "clinico";

  // Harris-Benedict
  let geb: number;
  if (form.sexo === "m") {
    geb = 66.5 + (13.75 * peso) + (5.003 * altura * 100) - (6.775 * idade);
  } else {
    geb = 655.1 + (9.563 * peso) + (1.85 * altura * 100) - (4.676 * idade);
  }
  geb = Math.round(geb);

  const fatorEstresse = form.estresse === "leve" ? 1.2 : form.estresse === "moderado" ? 1.4 : 1.6;
  const get = Math.round(geb * fatorEstresse);

  // Protein: 1.2-2.0 g/kg/day
  const protMin = Math.round(peso * 1.2 * 10) / 10;
  const protMax = Math.round(peso * 2.0 * 10) / 10;
  const protMedia = (protMin + protMax) / 2;
  const protKcal = protMedia * 4;

  // Lipids: 25-30% of total calories, max 1 g/kg
  const lipKcal = get * 0.3;
  const lipG = Math.min(Math.round(lipKcal / 9), Math.round(peso * 1));

  // Carbs: remaining calories
  const carbKcal = get - protKcal - (lipG * 9);
  const carbG = Math.round(carbKcal / 3.4); // dextrose = 3.4 kcal/g

  // GIR (glucose infusion rate) mg/kg/min
  const gir = Math.round(carbG * 1000 / (peso * 24 * 60) * 10) / 10;

  const volumeTotal = Math.round(peso * 30); // ~30 mL/kg

  const recomendacoes = isPro
    ? [
      `GEB (Harris-Benedict): ${geb} kcal/dia.`,
      `GET (fator ${fatorEstresse}): ${get} kcal/dia.`,
      `Proteina: ${protMin}-${protMax} g/dia (1,2-2,0 g/kg).`,
      `Lipidio: ${lipG} g/dia (~${Math.round(lipG * 9)} kcal, max 1 g/kg).`,
      `Glicose: ${carbG} g/dia (~${Math.round(carbKcal)} kcal). GIR: ${gir} mg/kg/min.`,
      gir > 5 ? "GIR >5 mg/kg/min: monitorar hiperglicemia. Insulina se necessario." : "GIR adequado.",
      `Volume estimado: ${volumeTotal} mL/dia (~30 mL/kg).`,
      "Acrescentar eletrolitos (Na, K, Ca, Mg, P), oligoelementos e vitaminas.",
      "Monitorar glicemia capilar 6/6h, triglicerideos, funcao hepatica.",
    ]
    : [
      `Calorias estimadas: ${get} kcal por dia.`,
      "A nutricao sera administrada por via intravenosa.",
      "A equipe medica ajustara conforme a evolucao clinica.",
    ];

  return { geb, get, proteina: { min: protMin, max: protMax }, lipidio: { g: lipG, kcal: Math.round(lipG * 9) }, carboidrato: { g: carbG, kcal: Math.round(carbKcal) }, volumeTotal, gir, recomendacoes };
}

function gerarPDF(form: FormData, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Nutricao Parenteral Total - Posologia", w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Peso: ${form.peso} kg | GET: ${resultado.get} kcal/dia`, 14, y); y += 6;
  doc.text(`Proteina: ${resultado.proteina.min}-${resultado.proteina.max} g | Lipidio: ${resultado.lipidio.g} g | Glicose: ${resultado.carboidrato.g} g`, 14, y); y += 6;
  doc.text(`GIR: ${resultado.gir} mg/kg/min | Volume: ${resultado.volumeTotal} mL/dia`, 14, y); y += 8;
  doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`npt-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function NutricaoParenteral() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };

  const handleCalc = () => {
    if (!form.peso || !form.altura || !form.idade) { setErro("Preencha peso, altura e idade."); return; }
    if (Number(form.peso) <= 0 || Number(form.altura) <= 0) { setErro("Valores invalidos."); return; }
    const res = calcular(form, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "Nutricao Parenteral",
      calculatorSlug: "nutricao-parenteral",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `GET: ${res.get} kcal | Prot: ${res.proteina.min}-${res.proteina.max}g | Lip: ${res.lipidio.g}g | Glic: ${res.carboidrato.g}g`,
      details: { GET: `${res.get} kcal`, Proteina: `${res.proteina.min}-${res.proteina.max}g`, Lipidio: `${res.lipidio.g}g`, Glicose: `${res.carboidrato.g}g`, GIR: `${res.gir}` },
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
            <div className="rounded-xl bg-primary/10 p-3"><Utensils className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Nutricao Parenteral Total (NPT)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Calculo de macronutrientes, GIR e volume para NPT.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="nutricao-parenteral" toolName="NPT" />
            <AdminPromptViewer toolSlug="nutricao-parenteral" toolName="Nutrição Parenteral" toolType="calculator" prompt={getNativePrompt("nutricao-parenteral") || ""} />
            <CalculationHistory calculatorSlug="nutricao-parenteral" />
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
              <div className="space-y-1.5"><Label>Altura (cm) *</Label><Input type="number" value={form.altura} onChange={(e) => set("altura", e.target.value)} placeholder="Ex: 170" /></div>
              <div className="space-y-1.5"><Label>Idade (anos) *</Label><Input type="number" value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 55" /></div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="m">Masculino</SelectItem><SelectItem value="f">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nivel de estresse metabolico</Label>
                <Select value={form.estresse} onValueChange={(v) => set("estresse", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve (fator 1,2)</SelectItem>
                    <SelectItem value="moderado">Moderado (fator 1,4)</SelectItem>
                    <SelectItem value="grave">Grave/critico (fator 1,6)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre NPT</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A <strong>Nutricao Parenteral Total</strong> e indicada quando o trato gastrointestinal nao pode ser utilizado por mais de 5-7 dias.</p>
                <p><strong>Harris-Benedict:</strong> Calcula o gasto energetico basal (GEB). Multiplicado pelo fator de estresse para o GET.</p>
                <p><strong>GIR:</strong> Taxa de infusao de glicose (mg/kg/min). Ideal: 3-5. Acima de 5: risco de hiperglicemia.</p>
                <p><strong>Monitoramento:</strong> Glicemia capilar, triglicerideos, funcao hepatica, eletrolitos diariamente no inicio.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular NPT</Button>
            <Button variant="outline" onClick={() => { setForm(INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Prescricao NPT</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">GET</span>
                    <span className="font-bold text-primary">{resultado.get} kcal</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">Proteina</span>
                    <span className="font-bold">{resultado.proteina.min}-{resultado.proteina.max} g</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">Lipidio</span>
                    <span className="font-bold">{resultado.lipidio.g} g ({resultado.lipidio.kcal} kcal)</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">Glicose</span>
                    <span className="font-bold">{resultado.carboidrato.g} g ({resultado.carboidrato.kcal} kcal)</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">GIR</span>
                    <span className={`font-bold ${resultado.gir > 5 ? "text-destructive" : "text-primary"}`}>{resultado.gir} mg/kg/min</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-card/80">
                    <span className="text-sm">Volume</span>
                    <span className="font-bold">{resultado.volumeTotal} mL/dia</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Orientacoes</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <PdfExportButton onExport={() => gerarPDF(form, resultado)} label="Gerar Relatorio PDF" />

              <ClinicalReferences references={CALCULATOR_REFERENCES["nutricao-parenteral"]} />
              <RelatedCalculators currentSlug="nutricao-parenteral" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Utensils className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
