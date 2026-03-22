import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Baby, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Modo = "clinico" | "educativo";

const FAIXAS = [
  { label: "RN prematuro", k: 0.33, kBedside: 0.33 },
  { label: "RN a termo (0-1 ano)", k: 0.45, kBedside: 0.413 },
  { label: "Crianca 1-12 anos", k: 0.55, kBedside: 0.413 },
  { label: "Adolescente feminino", k: 0.55, kBedside: 0.413 },
  { label: "Adolescente masculino", k: 0.70, kBedside: 0.413 },
];

function classifyTFG(tfg: number): { estagio: string; label: string; color: string } {
  if (tfg >= 90) return { estagio: "G1", label: "Normal ou alto", color: "hsl(142 71% 45%)" };
  if (tfg >= 60) return { estagio: "G2", label: "Reducao leve", color: "hsl(60 70% 45%)" };
  if (tfg >= 45) return { estagio: "G3a", label: "Reducao leve a moderada", color: "hsl(38 92% 50%)" };
  if (tfg >= 30) return { estagio: "G3b", label: "Reducao moderada a grave", color: "hsl(25 90% 50%)" };
  if (tfg >= 15) return { estagio: "G4", label: "Reducao grave", color: "hsl(0 72% 51%)" };
  return { estagio: "G5", label: "Falencia renal", color: "hsl(0 72% 40%)" };
}

export default function SchwartzPediatrico() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [creatinina, setCreatinina] = useState("");
  const [altura, setAltura] = useState("");
  const [faixa, setFaixa] = useState("2");
  const [formula, setFormula] = useState<"classica" | "bedside">("bedside");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<{ tfg: number; classification: ReturnType<typeof classifyTFG>; kUsed: number } | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const handleCalc = () => {
    if (!creatinina || !altura) { setErro("Preencha creatinina e altura."); return; }
    const cr = Number(creatinina);
    const h = Number(altura);
    if (cr <= 0 || h <= 0) { setErro("Valores invalidos."); return; }
    const f = FAIXAS[Number(faixa)];
    const k = formula === "bedside" ? f.kBedside : f.k;
    const tfg = Math.round((k * h / cr) * 10) / 10;
    const classification = classifyTFG(tfg);
    setResultado({ tfg, classification, kUsed: k });
    setErro("");
    saveCalculation({
      calculatorName: "TFG Pediatrica (Schwartz)",
      calculatorSlug: "schwartz-pediatrico",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `TFG: ${tfg} mL/min/1.73m2 (${classification.estagio})`,
      details: { Creatinina: `${cr} mg/dL`, Altura: `${h} cm`, "Faixa": f.label, Formula: formula, TFG: tfg, Estagio: classification.estagio },
    });
  };

  const gaugeSegments = [
    { min: 0, max: 15, color: "hsl(0 72% 40%)", label: "G5" },
    { min: 15, max: 30, color: "hsl(0 72% 51%)", label: "G4" },
    { min: 30, max: 45, color: "hsl(25 90% 50%)", label: "G3b" },
    { min: 45, max: 60, color: "hsl(38 92% 50%)", label: "G3a" },
    { min: 60, max: 90, color: "hsl(60 70% 45%)", label: "G2" },
    { min: 90, max: 100, color: "hsl(142 71% 45%)", label: "G1" },
  ];

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
              <h1 className="text-2xl font-bold">TFG Pediatrica (Schwartz)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Estimativa da taxa de filtracao glomerular em criancas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="schwartz-pediatrico" toolName="Schwartz Pediatrico" />
            <AdminPromptViewer toolSlug="schwartz-pediatrico" toolName="Schwartz Pediatrico" toolType="calculator" prompt={getNativePrompt("schwartz-pediatrico") || ""} />
            <CalculationHistory calculatorSlug="schwartz-pediatrico" />
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
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Creatinina Serica (mg/dL) *</Label><Input type="number" step="0.01" value={creatinina} onChange={e => { setCreatinina(e.target.value); setResultado(null); setErro(""); }} placeholder="Ex: 0.5" /></div>
              <div className="space-y-1.5"><Label>Altura (cm) *</Label><Input type="number" step="0.1" value={altura} onChange={e => { setAltura(e.target.value); setResultado(null); setErro(""); }} placeholder="Ex: 110" /></div>
              <div className="space-y-1.5">
                <Label>Faixa Etaria</Label>
                <Select value={faixa} onValueChange={v => { setFaixa(v); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FAIXAS.map((f, i) => <SelectItem key={i} value={String(i)}>{f.label} (k={f.k})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Formula</Label>
                <Select value={formula} onValueChange={v => { setFormula(v as any); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bedside">Bedside Schwartz 2009 (k=0.413)</SelectItem>
                    <SelectItem value="classica">Schwartz Classica (k variavel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>Formula:</strong> TFG = k × Altura(cm) / Creatinina(mg/dL)
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular TFG</Button>
            <Button variant="outline" onClick={() => { setCreatinina(""); setAltura(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <RiskGauge
                  value={Math.min(resultado.tfg, 150)}
                  maxValue={150}
                  label={`${resultado.classification.estagio} — ${resultado.classification.label}`}
                  unit="mL/min/1.73m²"
                  segments={gaugeSegments}
                />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Detalhes</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>TFG:</strong> {resultado.tfg} mL/min/1.73m2</li>
                  <li>• <strong>Estagio KDIGO:</strong> {resultado.classification.estagio}</li>
                  <li>• <strong>k utilizado:</strong> {resultado.kUsed}</li>
                  {modo === "clinico" ? (
                    <>
                      <li>• Bedside Schwartz (2009): recomendado para pratica clinica.</li>
                      <li>• Schwartz classica pode superestimar TFG em criancas maiores.</li>
                      <li>• Confirmar com cistatina C se resultado inesperado.</li>
                    </>
                  ) : (
                    <>
                      <li>• A TFG estima o quao bem os rins estao filtrando o sangue.</li>
                      <li>• Valores normais em criancas variam com a idade.</li>
                    </>
                  )}
                </ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["schwartz-pediatrico"]} />
              <RelatedCalculators currentSlug="schwartz-pediatrico" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha creatinina e altura.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
