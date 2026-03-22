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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";

type Modo = "clinico" | "educativo";

// Bhutani nomogram zones (bilirubin thresholds by hour of life)
const BHUTANI_DATA = [
  { hour: 12, baixo: 4.0, intBaixo: 5.5, intAlto: 8.0, alto: 11.0 },
  { hour: 24, baixo: 5.0, intBaixo: 7.5, intAlto: 10.5, alto: 13.0 },
  { hour: 36, baixo: 6.5, intBaixo: 9.0, intAlto: 12.5, alto: 15.0 },
  { hour: 48, baixo: 7.5, intBaixo: 10.5, intAlto: 14.0, alto: 17.0 },
  { hour: 60, baixo: 8.5, intBaixo: 11.5, intAlto: 15.0, alto: 18.0 },
  { hour: 72, baixo: 9.5, intBaixo: 12.5, intAlto: 16.0, alto: 19.0 },
  { hour: 84, baixo: 10.0, intBaixo: 13.0, intAlto: 16.5, alto: 20.0 },
  { hour: 96, baixo: 10.5, intBaixo: 13.5, intAlto: 17.0, alto: 20.5 },
  { hour: 108, baixo: 11.0, intBaixo: 14.0, intAlto: 17.0, alto: 21.0 },
  { hour: 120, baixo: 11.5, intBaixo: 14.5, intAlto: 17.5, alto: 21.0 },
];

// AAP phototherapy thresholds by risk and gestational age
function getFotoThreshold(idadeHoras: number, igSemanas: number, fatoresRisco: boolean): number {
  const hourFactor = Math.min(idadeHoras / 72, 1);
  let base = 21; // ≥38 sem, sem fatores
  if (igSemanas < 35) base = 12;
  else if (igSemanas < 38) base = 15;
  if (fatoresRisco) base -= 2;
  return Math.round((base * hourFactor + 5) * 10) / 10;
}

function interpolateBhutani(idadeHoras: number, field: string): number {
  const below = BHUTANI_DATA.filter(d => d.hour <= idadeHoras).pop();
  const above = BHUTANI_DATA.find(d => d.hour > idadeHoras);
  if (!below) return (BHUTANI_DATA[0] as any)[field];
  if (!above) return (below as any)[field];
  const ratio = (idadeHoras - below.hour) / (above.hour - below.hour);
  return (below as any)[field] + ratio * ((above as any)[field] - (below as any)[field]);
}

function classifyBhutani(bilirrubina: number, idadeHoras: number): { zona: string; color: string } {
  const alto = interpolateBhutani(idadeHoras, "alto");
  const intAlto = interpolateBhutani(idadeHoras, "intAlto");
  const intBaixo = interpolateBhutani(idadeHoras, "intBaixo");
  if (bilirrubina >= alto) return { zona: "Alto Risco", color: "hsl(0 72% 51%)" };
  if (bilirrubina >= intAlto) return { zona: "Intermediario-Alto", color: "hsl(38 92% 50%)" };
  if (bilirrubina >= intBaixo) return { zona: "Intermediario-Baixo", color: "hsl(60 70% 45%)" };
  return { zona: "Baixo Risco", color: "hsl(142 71% 45%)" };
}

export default function BilirrubinanNeonatal() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [bilirrubina, setBilirrubina] = useState("");
  const [idadeHoras, setIdadeHoras] = useState("");
  const [igSemanas, setIgSemanas] = useState("38");
  const [fatoresRisco, setFatoresRisco] = useState("nao");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<{ zona: string; color: string; fotoThreshold: number; needsFoto: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const handleCalc = () => {
    if (!bilirrubina || !idadeHoras) { setErro("Preencha bilirrubina e idade em horas."); return; }
    const bili = Number(bilirrubina);
    const hours = Number(idadeHoras);
    if (hours < 12 || hours > 144) { setErro("Idade deve ser entre 12 e 144 horas."); return; }
    if (bili <= 0) { setErro("Bilirrubina invalida."); return; }
    const classification = classifyBhutani(bili, hours);
    const fotoThreshold = getFotoThreshold(hours, Number(igSemanas), fatoresRisco === "sim");
    const needsFoto = bili >= fotoThreshold;
    setResultado({ ...classification, fotoThreshold, needsFoto });
    setErro("");
    saveCalculation({
      calculatorName: "Bilirrubina Neonatal (Bhutani)",
      calculatorSlug: "bilirrubina-neonatal",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `${classification.zona} — BT ${bili} mg/dL, ${hours}h`,
      details: { "Bilirrubina (mg/dL)": bili, "Idade (h)": hours, "IG (sem)": Number(igSemanas), Zona: classification.zona, "Fototerapia": needsFoto ? "Indicada" : "Nao indicada" },
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
              <h1 className="text-2xl font-bold">Bilirrubina Neonatal (Bhutani/AAP)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Nomograma de risco e indicacao de fototerapia.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="bilirrubina-neonatal" toolName="Bilirrubina Neonatal" />
            <AdminPromptViewer toolSlug="bilirrubina-neonatal" toolName="Bilirrubina Neonatal" toolType="calculator" prompt={getNativePrompt("bilirrubina-neonatal") || ""} />
            <CalculationHistory calculatorSlug="bilirrubina-neonatal" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados do Recem-Nascido</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Bilirrubina Total (mg/dL) *</Label><Input type="number" step="0.1" value={bilirrubina} onChange={e => { setBilirrubina(e.target.value); setResultado(null); setErro(""); }} placeholder="Ex: 12.5" /></div>
              <div className="space-y-1.5"><Label>Idade do RN (horas) *</Label><Input type="number" value={idadeHoras} onChange={e => { setIdadeHoras(e.target.value); setResultado(null); setErro(""); }} placeholder="12-144" /></div>
              <div className="space-y-1.5">
                <Label>Idade Gestacional (semanas)</Label>
                <Select value={igSemanas} onValueChange={v => { setIgSemanas(v); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="35">&lt;35 semanas</SelectItem>
                    <SelectItem value="36">35-37 semanas</SelectItem>
                    <SelectItem value="38">≥38 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fatores de Risco</Label>
                <Select value={fatoresRisco} onValueChange={v => { setFatoresRisco(v); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Sem fatores</SelectItem>
                    <SelectItem value="sim">Com fatores (isoimunizacao, asfixia, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Classificar Risco</Button>
            <Button variant="outline" onClick={() => { setBilirrubina(""); setIdadeHoras(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>

          {resultado && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Nomograma de Bhutani</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={BHUTANI_DATA} margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="hour" label={{ value: "Idade (horas)", position: "insideBottom", offset: -10 }} />
                  <YAxis label={{ value: "Bilirrubina (mg/dL)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="alto" stackId="0" fill="hsl(0 72% 51% / 0.2)" stroke="hsl(0 72% 51%)" name="Alto Risco" />
                  <Area type="monotone" dataKey="intAlto" stackId="0" fill="hsl(38 92% 50% / 0.15)" stroke="hsl(38 92% 50%)" name="Interm.-Alto" />
                  <Area type="monotone" dataKey="intBaixo" stackId="0" fill="hsl(60 70% 45% / 0.1)" stroke="hsl(60 70% 45%)" name="Interm.-Baixo" />
                  <Area type="monotone" dataKey="baixo" stackId="0" fill="hsl(142 71% 45% / 0.1)" stroke="hsl(142 71% 45%)" name="Baixo" />
                  <ReferenceDot x={Number(idadeHoras)} y={Number(bilirrubina)} r={7} fill={resultado.color} stroke="white" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border p-6" style={{ borderColor: `${resultado.color}50`, backgroundColor: `${resultado.color}10` }}>
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-2">
                  <div className="text-lg font-semibold" style={{ color: resultado.color }}>{resultado.zona}</div>
                  <div className="text-3xl font-bold mt-2">{bilirrubina}</div>
                  <div className="text-sm text-muted-foreground">mg/dL as {idadeHoras}h de vida</div>
                </div>
              </div>

              <div className={`rounded-2xl border p-6 ${resultado.needsFoto ? "border-destructive/30 bg-destructive/10" : "border-green-500/30 bg-green-500/10"}`}>
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Fototerapia</h2>
                <div className="text-center">
                  <div className={`text-lg font-bold ${resultado.needsFoto ? "text-destructive" : "text-green-600"}`}>
                    {resultado.needsFoto ? "INDICADA" : "Nao indicada"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Limiar: {resultado.fotoThreshold} mg/dL (IG {igSemanas} sem{fatoresRisco === "sim" ? ", com fatores de risco" : ""})
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {modo === "clinico" ? (
                    <>
                      <li>• Reavaliar BT em 6-12h se zona intermediaria-alta.</li>
                      <li>• Fototerapia intensiva se BT acima do limiar AAP.</li>
                      <li>• Considerar exsanguineotransfusao se BT &gt; 25 mg/dL (termo).</li>
                      <li>• Investigar causas: incompatibilidade ABO/Rh, G6PD, sepse.</li>
                    </>
                  ) : (
                    <>
                      <li>• A ictericia neonatal e comum nos primeiros dias.</li>
                      <li>• Niveis muito altos de bilirrubina podem ser perigosos.</li>
                      <li>• A fototerapia (banho de luz) e o tratamento mais comum.</li>
                    </>
                  )}
                </ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["bilirrubina-neonatal"]} />
              <RelatedCalculators currentSlug="bilirrubina-neonatal" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha bilirrubina e idade.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
