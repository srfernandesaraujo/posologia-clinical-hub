import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Baby, User, Stethoscope } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from "recharts";

type Modo = "clinico" | "educativo";

// Simplified WHO LMS data for Weight-for-age (0-60 months) - key percentiles
const WHO_WEIGHT_BOYS = [
  { month: 0, P3: 2.5, P15: 2.9, P50: 3.3, P85: 3.9, P97: 4.4 },
  { month: 3, P3: 4.4, P15: 5.1, P50: 6.4, P85: 7.2, P97: 7.8 },
  { month: 6, P3: 5.9, P15: 6.7, P50: 7.9, P85: 9.0, P97: 9.7 },
  { month: 9, P3: 7.0, P15: 7.9, P50: 8.9, P85: 10.1, P97: 10.9 },
  { month: 12, P3: 7.7, P15: 8.6, P50: 9.6, P85: 10.9, P97: 11.8 },
  { month: 18, P3: 8.6, P15: 9.7, P50: 10.9, P85: 12.3, P97: 13.4 },
  { month: 24, P3: 9.6, P15: 10.8, P50: 12.2, P85: 13.7, P97: 14.9 },
  { month: 30, P3: 10.5, P15: 11.8, P50: 13.3, P85: 15.0, P97: 16.4 },
  { month: 36, P3: 11.3, P15: 12.7, P50: 14.3, P85: 16.2, P97: 17.8 },
  { month: 48, P3: 12.7, P15: 14.4, P50: 16.3, P85: 18.6, P97: 20.5 },
  { month: 60, P3: 14.1, P15: 16.0, P50: 18.3, P85: 21.0, P97: 23.4 },
];

const WHO_WEIGHT_GIRLS = [
  { month: 0, P3: 2.4, P15: 2.8, P50: 3.2, P85: 3.7, P97: 4.2 },
  { month: 3, P3: 4.0, P15: 4.6, P50: 5.8, P85: 6.6, P97: 7.2 },
  { month: 6, P3: 5.5, P15: 6.1, P50: 7.3, P85: 8.3, P97: 9.0 },
  { month: 9, P3: 6.5, P15: 7.3, P50: 8.2, P85: 9.4, P97: 10.2 },
  { month: 12, P3: 7.0, P15: 7.9, P50: 8.9, P85: 10.2, P97: 11.0 },
  { month: 18, P3: 8.0, P15: 9.0, P50: 10.2, P85: 11.6, P97: 12.6 },
  { month: 24, P3: 9.0, P15: 10.1, P50: 11.5, P85: 13.1, P97: 14.3 },
  { month: 30, P3: 9.9, P15: 11.1, P50: 12.7, P85: 14.5, P97: 15.9 },
  { month: 36, P3: 10.6, P15: 12.0, P50: 13.9, P85: 15.9, P97: 17.4 },
  { month: 48, P3: 12.2, P15: 13.8, P50: 16.1, P85: 18.5, P97: 20.4 },
  { month: 60, P3: 13.7, P15: 15.6, P50: 18.2, P85: 21.2, P97: 23.5 },
];

function interpolate(data: typeof WHO_WEIGHT_BOYS, ageMonths: number, field: string): number {
  const below = data.filter(d => d.month <= ageMonths).pop();
  const above = data.find(d => d.month > ageMonths);
  if (!below) return (data[0] as any)[field];
  if (!above) return (below as any)[field];
  const ratio = (ageMonths - below.month) / (above.month - below.month);
  return (below as any)[field] + ratio * ((above as any)[field] - (below as any)[field]);
}

function calcZScore(peso: number, sexo: string, idadeMeses: number) {
  const data = sexo === "M" ? WHO_WEIGHT_BOYS : WHO_WEIGHT_GIRLS;
  const p50 = interpolate(data, idadeMeses, "P50");
  const p15 = interpolate(data, idadeMeses, "P15");
  const p85 = interpolate(data, idadeMeses, "P85");
  // Approximate SD using (P85-P50) ≈ 1.04 SD
  const sd = (p85 - p50) / 1.04;
  if (sd <= 0) return 0;
  const z = (peso - p50) / sd;
  return Math.round(z * 100) / 100;
}

function classifyZ(z: number): { label: string; color: string } {
  if (z < -3) return { label: "Magreza Severa", color: "hsl(0 72% 51%)" };
  if (z < -2) return { label: "Magreza", color: "hsl(38 92% 50%)" };
  if (z <= 1) return { label: "Eutrofico", color: "hsl(142 71% 45%)" };
  if (z <= 2) return { label: "Sobrepeso", color: "hsl(38 92% 50%)" };
  return { label: "Obesidade", color: "hsl(0 72% 51%)" };
}

export default function CurvasCrescimentoOMS() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [sexo, setSexo] = useState("M");
  const [idadeMeses, setIdadeMeses] = useState("");
  const [peso, setPeso] = useState("");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<{ z: number; classification: { label: string; color: string } } | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const curveData = sexo === "M" ? WHO_WEIGHT_BOYS : WHO_WEIGHT_GIRLS;

  const handleCalc = () => {
    if (!idadeMeses || !peso) { setErro("Preencha idade e peso."); return; }
    const age = Number(idadeMeses);
    const w = Number(peso);
    if (age < 0 || age > 60) { setErro("Idade deve ser entre 0 e 60 meses."); return; }
    if (w <= 0) { setErro("Peso invalido."); return; }
    const z = calcZScore(w, sexo, age);
    const classification = classifyZ(z);
    setResultado({ z, classification });
    setErro("");
    saveCalculation({
      calculatorName: "Curvas de Crescimento OMS",
      calculatorSlug: "curvas-crescimento-oms",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `Z-Score: ${z} (${classification.label})`,
      details: { Sexo: sexo === "M" ? "Masculino" : "Feminino", "Idade (meses)": age, "Peso (kg)": w, "Z-Score": z },
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
              <h1 className="text-2xl font-bold">Curvas de Crescimento OMS (Z-Score)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Peso-para-idade, 0-5 anos — WHO 2006.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="curvas-crescimento-oms" toolName="Curvas de Crescimento OMS" />
            <AdminPromptViewer toolSlug="curvas-crescimento-oms" toolName="Curvas OMS" toolType="calculator" prompt={getNativePrompt("curvas-crescimento-oms") || ""} />
            <CalculationHistory calculatorSlug="curvas-crescimento-oms" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados Antropometricos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={sexo} onValueChange={setSexo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Idade (meses) *</Label><Input type="number" min="0" max="60" value={idadeMeses} onChange={e => { setIdadeMeses(e.target.value); setResultado(null); setErro(""); }} placeholder="0-60" /></div>
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" step="0.1" value={peso} onChange={e => { setPeso(e.target.value); setResultado(null); setErro(""); }} placeholder="Ex: 8.5" /></div>
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Z-Score</Button>
            <Button variant="outline" onClick={() => { setIdadeMeses(""); setPeso(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>

          {resultado && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Curva Peso-para-Idade ({sexo === "M" ? "Meninos" : "Meninas"})</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={curveData} margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" label={{ value: "Idade (meses)", position: "insideBottom", offset: -10 }} />
                  <YAxis label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="P3" stroke="hsl(0 72% 51%)" strokeDasharray="5 5" dot={false} name="P3" />
                  <Line type="monotone" dataKey="P15" stroke="hsl(38 92% 50%)" strokeDasharray="3 3" dot={false} name="P15" />
                  <Line type="monotone" dataKey="P50" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} name="P50" />
                  <Line type="monotone" dataKey="P85" stroke="hsl(38 92% 50%)" strokeDasharray="3 3" dot={false} name="P85" />
                  <Line type="monotone" dataKey="P97" stroke="hsl(0 72% 51%)" strokeDasharray="5 5" dot={false} name="P97" />
                  <ReferenceDot x={Number(idadeMeses)} y={Number(peso)} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--primary))" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-2">
                  <div className="text-3xl font-bold" style={{ color: resultado.classification.color }}>{resultado.z > 0 ? "+" : ""}{resultado.z}</div>
                  <div className="text-sm text-muted-foreground mt-1">Z-Score</div>
                  <div className="text-lg font-semibold mt-3" style={{ color: resultado.classification.color }}>{resultado.classification.label}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Interpretacao</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {modo === "clinico" ? (
                    <>
                      <li>• Z &lt; -3: Magreza severa (desnutricao grave)</li>
                      <li>• Z -3 a -2: Magreza</li>
                      <li>• Z -2 a +1: Eutrofico (adequado)</li>
                      <li>• Z +1 a +2: Sobrepeso (risco)</li>
                      <li>• Z &gt; +2: Obesidade</li>
                      <li className="mt-3">• Referencia: WHO Child Growth Standards 2006</li>
                    </>
                  ) : (
                    <>
                      <li>• O Z-Score indica quantos desvios-padrao o peso esta da media.</li>
                      <li>• Valores entre -2 e +1 sao considerados normais.</li>
                      <li>• Acompanhe com o pediatra regularmente.</li>
                    </>
                  )}
                </ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["curvas-crescimento-oms"]} />
              <RelatedCalculators currentSlug="curvas-crescimento-oms" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha sexo, idade e peso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
