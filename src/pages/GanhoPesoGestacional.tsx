import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, HeartPulse, User, Stethoscope } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Area, AreaChart } from "recharts";

type Modo = "clinico" | "educativo";

const IOM_RANGES: Record<string, { label: string; totalMin: number; totalMax: number; weeklyMin: number; weeklyMax: number }> = {
  "baixo": { label: "Baixo peso (IMC < 18.5)", totalMin: 12.5, totalMax: 18.0, weeklyMin: 0.44, weeklyMax: 0.58 },
  "normal": { label: "Peso normal (IMC 18.5-24.9)", totalMin: 11.5, totalMax: 16.0, weeklyMin: 0.35, weeklyMax: 0.50 },
  "sobrepeso": { label: "Sobrepeso (IMC 25-29.9)", totalMin: 7.0, totalMax: 11.5, weeklyMin: 0.23, weeklyMax: 0.33 },
  "obesidade": { label: "Obesidade (IMC ≥ 30)", totalMin: 5.0, totalMax: 9.0, weeklyMin: 0.17, weeklyMax: 0.27 },
};

function getIMCCategory(imc: number): string {
  if (imc < 18.5) return "baixo";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidade";
}

function buildCurveData(range: typeof IOM_RANGES["normal"]) {
  const data = [];
  for (let s = 0; s <= 40; s++) {
    const frac = s <= 13 ? s / 40 * 0.5 : (s - 13) / 27;
    const min = s <= 13 ? range.totalMin * frac * 0.3 : 0.5 + range.weeklyMin * (s - 13);
    const max = s <= 13 ? range.totalMax * frac * 0.3 : 0.8 + range.weeklyMax * (s - 13);
    data.push({ semana: s, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 });
  }
  return data;
}

export default function GanhoPesoGestacional() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [pesoPreGest, setPesoPreGest] = useState("");
  const [altura, setAltura] = useState("");
  const [pesoAtual, setPesoAtual] = useState("");
  const [igSemanas, setIgSemanas] = useState("");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const handleCalc = () => {
    if (!pesoPreGest || !altura || !pesoAtual || !igSemanas) { setErro("Preencha todos os campos."); return; }
    const peso = Number(pesoPreGest);
    const alt = Number(altura) / 100;
    const pAtual = Number(pesoAtual);
    const ig = Number(igSemanas);
    if (peso <= 0 || alt <= 0 || pAtual <= 0 || ig < 0 || ig > 42) { setErro("Valores invalidos."); return; }

    const imc = peso / (alt * alt);
    const cat = getIMCCategory(imc);
    const range = IOM_RANGES[cat];
    const ganho = pAtual - peso;
    const curveData = buildCurveData(range);

    const ganhoEsperadoMin = ig <= 13 ? range.totalMin * (ig / 40) * 0.3 : 0.5 + range.weeklyMin * (ig - 13);
    const ganhoEsperadoMax = ig <= 13 ? range.totalMax * (ig / 40) * 0.3 : 0.8 + range.weeklyMax * (ig - 13);

    let status: string;
    if (ganho < ganhoEsperadoMin) status = "Abaixo do recomendado";
    else if (ganho > ganhoEsperadoMax) status = "Acima do recomendado";
    else status = "Dentro da faixa ideal";

    setResultado({ imc: Math.round(imc * 10) / 10, cat, range, ganho: Math.round(ganho * 10) / 10, status, curveData, ig, ganhoEsperadoMin: Math.round(ganhoEsperadoMin * 10) / 10, ganhoEsperadoMax: Math.round(ganhoEsperadoMax * 10) / 10 });
    setErro("");
    saveCalculation({
      calculatorName: "Ganho de Peso Gestacional (IOM)",
      calculatorSlug: "ganho-peso-gestacional",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `IMC pre: ${Math.round(imc * 10) / 10} (${range.label}) | Ganho: ${Math.round(ganho * 10) / 10} kg | ${status}`,
      details: { IMC: Math.round(imc * 10) / 10, Categoria: cat, Ganho: Math.round(ganho * 10) / 10, Status: status, IG: ig },
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
            <div className="rounded-xl bg-primary/10 p-3"><HeartPulse className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Ganho de Peso Gestacional (IOM)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Avaliacao do ganho ponderal conforme IMC pre-gestacional.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="ganho-peso-gestacional" toolName="Ganho Peso Gestacional" />
            <AdminPromptViewer toolSlug="ganho-peso-gestacional" toolName="Ganho Peso Gestacional" toolType="calculator" prompt={getNativePrompt("ganho-peso-gestacional") || ""} />
            <CalculationHistory calculatorSlug="ganho-peso-gestacional" />
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
              <div className="space-y-1.5"><Label>Nome da Paciente</Label><Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Dados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peso pre-gestacional (kg) *</Label><Input type="number" step="0.1" value={pesoPreGest} onChange={e => { setPesoPreGest(e.target.value); setResultado(null); }} placeholder="Ex: 60" /></div>
              <div className="space-y-1.5"><Label>Altura (cm) *</Label><Input type="number" step="1" value={altura} onChange={e => { setAltura(e.target.value); setResultado(null); }} placeholder="Ex: 165" /></div>
              <div className="space-y-1.5"><Label>Peso atual (kg) *</Label><Input type="number" step="0.1" value={pesoAtual} onChange={e => { setPesoAtual(e.target.value); setResultado(null); }} placeholder="Ex: 68" /></div>
              <div className="space-y-1.5"><Label>IG atual (semanas) *</Label><Input type="number" min="0" max="42" value={igSemanas} onChange={e => { setIgSemanas(e.target.value); setResultado(null); }} placeholder="Ex: 28" /></div>
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}
          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular</Button>
            <Button variant="outline" onClick={() => { setPesoPreGest(""); setAltura(""); setPesoAtual(""); setIgSemanas(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.status === "Dentro da faixa ideal" ? "border-green-500/30 bg-green-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <p className="text-2xl font-bold">{resultado.ganho} kg</p>
                <p className={`text-sm font-medium mt-1 ${resultado.status === "Dentro da faixa ideal" ? "text-green-600" : "text-amber-600"}`}>{resultado.status}</p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p><strong>IMC pre-gestacional:</strong> {resultado.imc} ({resultado.range.label})</p>
                  <p><strong>Ganho esperado (IG {resultado.ig}s):</strong> {resultado.ganhoEsperadoMin} - {resultado.ganhoEsperadoMax} kg</p>
                  <p><strong>Ganho total recomendado:</strong> {resultado.range.totalMin} - {resultado.range.totalMax} kg</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Curva de Ganho de Peso</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={resultado.curveData} margin={{ left: 5, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" label={{ value: "Semanas de gestacao", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Ganho (kg)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="max" stroke="hsl(142 60% 45%)" fill="hsl(142 60% 45% / 0.15)" strokeDasharray="4 2" name="Limite superior" />
                    <Area type="monotone" dataKey="min" stroke="hsl(200 70% 50%)" fill="hsl(200 70% 50% / 0.15)" strokeDasharray="4 2" name="Limite inferior" />
                    <ReferenceDot x={resultado.ig} y={resultado.ganho} r={6} fill="hsl(0 72% 51%)" stroke="hsl(0 0% 100%)" strokeWidth={2} label={{ value: "Paciente", fill: "hsl(0 72% 51%)", fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {modo === "educativo" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conceitos</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• As recomendacoes IOM 2009 sao baseadas no IMC pre-gestacional.</li>
                    <li>• Ganho excessivo aumenta risco de DMG, macrossomia e cesarea.</li>
                    <li>• Ganho insuficiente associa-se a RCIU e prematuridade.</li>
                    <li>• O ganho e mais lento no 1º trimestre (~0.5-2 kg total).</li>
                  </ul>
                </div>
              )}

              <ClinicalReferences references={CALCULATOR_REFERENCES["ganho-peso-gestacional"]} />
              <RelatedCalculators currentSlug="ganho-peso-gestacional" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados para avaliar o ganho de peso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
