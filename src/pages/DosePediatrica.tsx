import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Baby, User, Stethoscope } from "lucide-react";
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

const MEDICAMENTOS = [
  { nome: "Amoxicilina", doseMin: 25, doseMax: 50, doseAltaMin: 80, doseAltaMax: 90, unidade: "mg/kg/dia", divisoes: "8/8h ou 12/12h", concentracao: "250 mg/5 mL ou 500 mg/5 mL", maxDia: 3000, indicacao: "Otite, sinusite, pneumonia, ITU" },
  { nome: "Amoxicilina + Clavulanato", doseMin: 25, doseMax: 45, doseAltaMin: 80, doseAltaMax: 90, unidade: "mg/kg/dia", divisoes: "8/8h ou 12/12h", concentracao: "250/62.5 mg/5 mL", maxDia: 3000, indicacao: "OMA recorrente, sinusite, pneumonia" },
  { nome: "Azitromicina", doseMin: 10, doseMax: 10, unidade: "mg/kg/dia", divisoes: "1x/dia (3-5 dias)", concentracao: "200 mg/5 mL", maxDia: 500, indicacao: "Pneumonia atipica, faringite (alternativa)" },
  { nome: "Cefalexina", doseMin: 25, doseMax: 50, unidade: "mg/kg/dia", divisoes: "6/6h ou 8/8h", concentracao: "250 mg/5 mL", maxDia: 4000, indicacao: "Pele, ITU, profilaxia" },
  { nome: "Ibuprofeno", doseMin: 5, doseMax: 10, unidade: "mg/kg/dose", divisoes: "6/6h ou 8/8h", concentracao: "100 mg/5 mL (gotas: 50 mg/mL)", maxDia: 40, indicacao: "Febre, dor, inflamacao" },
  { nome: "Paracetamol", doseMin: 10, doseMax: 15, unidade: "mg/kg/dose", divisoes: "4/4h ou 6/6h", concentracao: "200 mg/mL (gotas)", maxDia: 75, indicacao: "Febre, dor" },
  { nome: "Dipirona", doseMin: 10, doseMax: 25, unidade: "mg/kg/dose", divisoes: "6/6h", concentracao: "500 mg/mL (gotas)", maxDia: 4000, indicacao: "Febre, dor" },
  { nome: "Prednisolona", doseMin: 1, doseMax: 2, unidade: "mg/kg/dia", divisoes: "1x ou 2x/dia", concentracao: "3 mg/mL", maxDia: 60, indicacao: "Asma, crupe, alergia" },
  { nome: "Ondansetrona", doseMin: 0.15, doseMax: 0.15, unidade: "mg/kg/dose", divisoes: "8/8h", concentracao: "4 mg/5 mL", maxDia: 16, indicacao: "Nausea, vomito" },
  { nome: "Sulfametoxazol-Trimetoprima", doseMin: 40, doseMax: 40, unidade: "mg/kg/dia (SMX)", divisoes: "12/12h", concentracao: "200/40 mg/5 mL", maxDia: 1600, indicacao: "ITU, infeccoes de pele" },
];

interface FormData {
  nomePaciente: string;
  data: string;
  peso: string;
  medicamento: string;
  doseAlta: string;
}

const INITIAL: FormData = { nomePaciente: "", data: new Date().toISOString().slice(0, 10), peso: "", medicamento: "0", doseAlta: "nao" };

interface Resultado {
  medicamento: typeof MEDICAMENTOS[0];
  doseMinCalc: number;
  doseMaxCalc: number;
  recomendacoes: string[];
}

function calcular(form: FormData, modo: Modo): Resultado {
  const peso = Number(form.peso);
  const med = MEDICAMENTOS[Number(form.medicamento)];
  const isPro = modo === "clinico";
  const useAlta = form.doseAlta === "sim" && med.doseAltaMin;
  const dMin = useAlta ? med.doseAltaMin! : med.doseMin;
  const dMax = useAlta ? med.doseAltaMax! : med.doseMax;

  const doseMinCalc = Math.round(dMin * peso * 10) / 10;
  const doseMaxCalc = Math.min(Math.round(dMax * peso * 10) / 10, med.maxDia);

  const recomendacoes = isPro
    ? [
      `${med.nome}: ${dMin}-${dMax} ${med.unidade}.`,
      `Dose calculada: ${doseMinCalc}-${doseMaxCalc} mg/dia.`,
      `Posologia: ${med.divisoes}.`,
      `Apresentacao: ${med.concentracao}.`,
      `Dose maxima diaria: ${med.maxDia} mg.`,
      `Indicacoes comuns: ${med.indicacao}.`,
      useAlta ? "Dose alta selecionada (ex: OMA resistente, pneumonia grave)." : "",
    ].filter(Boolean)
    : [
      `Medicamento: ${med.nome}.`,
      `Dose sugerida: ${doseMinCalc} a ${doseMaxCalc} mg por dia, dividida em tomadas.`,
      "Siga sempre a orientacao do pediatra.",
    ];

  return { medicamento: med, doseMinCalc, doseMaxCalc, recomendacoes };
}

export default function DosePediatrica() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [modo, setModo] = useState<Modo>("clinico");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const set = (field: keyof FormData, value: string) => { setForm((p) => ({ ...p, [field]: value })); setResultado(null); setErro(""); };
  const med = MEDICAMENTOS[Number(form.medicamento)];

  const handleCalc = () => {
    if (!form.peso) { setErro("Preencha o peso."); return; }
    if (Number(form.peso) <= 0) { setErro("Peso invalido."); return; }
    const res = calcular(form, modo);
    setResultado(res);
    saveCalculation({
      calculatorName: "Dose Pediatrica",
      calculatorSlug: "dose-pediatrica",
      patientName: form.nomePaciente || undefined,
      date: form.data,
      summary: `${res.medicamento.nome}: ${res.doseMinCalc}-${res.doseMaxCalc} mg/dia`,
      details: { Medicamento: res.medicamento.nome, Peso: `${form.peso} kg`, Dose: `${res.doseMinCalc}-${res.doseMaxCalc} mg/dia` },
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
              <h1 className="text-2xl font-bold">Dose Pediatrica por Peso</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Calculo de dose por kg para medicamentos pediatricos comuns.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="dose-pediatrica" toolName="Dose Pediatrica" />
            <AdminPromptViewer toolSlug="dose-pediatrica" toolName="Dose Pediátrica" toolType="calculator" prompt={getNativePrompt("dose-pediatrica") || ""} />
            <CalculationHistory calculatorSlug="dose-pediatrica" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" step="0.1" value={form.peso} onChange={(e) => set("peso", e.target.value)} placeholder="Ex: 12" /></div>
              <div className="space-y-1.5">
                <Label>Medicamento *</Label>
                <Select value={form.medicamento} onValueChange={(v) => set("medicamento", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEDICAMENTOS.map((m, i) => <SelectItem key={i} value={String(i)}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {med.doseAltaMin && (
                <div className="space-y-1.5">
                  <Label>Dose alta?</Label>
                  <Select value={form.doseAlta} onValueChange={(v) => set("doseAlta", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="nao">Dose padrao</SelectItem><SelectItem value="sim">Dose alta (OMA, pneumonia grave)</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>{med.nome}:</strong> {med.doseMin}-{med.doseMax} {med.unidade} | {med.divisoes} | Max: {med.maxDia} mg/dia
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Dose</Button>
            <Button variant="outline" onClick={() => { setForm(INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-2">
                  <div className="text-lg font-semibold text-primary">{resultado.medicamento.nome}</div>
                  <div className="text-3xl font-bold mt-2">{resultado.doseMinCalc} - {resultado.doseMaxCalc}</div>
                  <div className="text-sm text-muted-foreground">mg/dia</div>
                  <div className="mt-2 text-sm text-muted-foreground">{resultado.medicamento.divisoes}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Detalhes</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["dose-pediatrica"]} />
              <RelatedCalculators currentSlug="dose-pediatrica" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione o medicamento e peso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
