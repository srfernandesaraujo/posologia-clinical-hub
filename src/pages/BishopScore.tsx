import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, HeartPulse, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { ScoreBar } from "@/components/calculators/ScoreBar";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Modo = "clinico" | "educativo";

const PARAMS = [
  {
    name: "Dilatacao cervical",
    options: [
      { label: "Fechado", value: 0 },
      { label: "1-2 cm", value: 1 },
      { label: "3-4 cm", value: 2 },
      { label: "≥ 5 cm", value: 3 },
    ],
  },
  {
    name: "Esvaecimento",
    options: [
      { label: "0-30%", value: 0 },
      { label: "40-50%", value: 1 },
      { label: "60-70%", value: 2 },
      { label: "≥ 80%", value: 3 },
    ],
  },
  {
    name: "Altura da apresentacao",
    options: [
      { label: "-3", value: 0 },
      { label: "-2", value: 1 },
      { label: "-1 / 0", value: 2 },
      { label: "+1 / +2", value: 3 },
    ],
  },
  {
    name: "Consistencia cervical",
    options: [
      { label: "Firme", value: 0 },
      { label: "Medio", value: 1 },
      { label: "Amolecido", value: 2 },
    ],
  },
  {
    name: "Posicao do colo",
    options: [
      { label: "Posterior", value: 0 },
      { label: "Medio", value: 1 },
      { label: "Anterior", value: 2 },
    ],
  },
];

export default function BishopScore() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<(number | null)[]>(PARAMS.map(() => null));
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const setParam = (idx: number, val: number) => {
    const next = [...values];
    next[idx] = val;
    setValues(next);
    setResultado(null);
  };

  const handleCalc = () => {
    if (values.some(v => v === null)) { setErro("Preencha todos os parametros."); return; }
    const score = values.reduce((a, b) => a! + b!, 0) as number;
    let conduta: string;
    let color: string;
    if (score >= 9) { conduta = "Colo muito favoravel — alta probabilidade de parto vaginal"; color = "hsl(142 71% 45%)"; }
    else if (score >= 6) { conduta = "Colo favoravel — induçao com ocitocina recomendada"; color = "hsl(60 70% 45%)"; }
    else { conduta = "Colo desfavoravel — considerar amadurecimento cervical (misoprostol/sonda Foley)"; color = "hsl(0 72% 51%)"; }

    setResultado({ score, conduta, color });
    setErro("");
    saveCalculation({
      calculatorName: "Bishop Score",
      calculatorSlug: "bishop-score",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `Bishop Score: ${score}/13 | ${score >= 6 ? "Colo favoravel" : "Colo desfavoravel"}`,
      details: { Score: score, Conduta: conduta, Parametros: PARAMS.map((p, i) => `${p.name}: ${values[i]}`).join("; ") },
    });
  };

  const scoreSegments = [
    { min: 0, max: 5, color: "hsl(0 72% 51%)", label: "Desfavoravel" },
    { min: 5, max: 8, color: "hsl(60 70% 45%)", label: "Favoravel" },
    { min: 8, max: 13, color: "hsl(142 71% 45%)", label: "Muito favoravel" },
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
            <div className="rounded-xl bg-primary/10 p-3"><HeartPulse className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Bishop Score</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Avaliacao do amadurecimento cervical para inducao do parto.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="bishop-score" toolName="Bishop Score" />
            <AdminPromptViewer toolSlug="bishop-score" toolName="Bishop Score" toolType="calculator" prompt={getNativePrompt("bishop-score") || ""} />
            <CalculationHistory calculatorSlug="bishop-score" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Parametros Cervicais</h2>
            <div className="space-y-4">
              {PARAMS.map((p, idx) => (
                <div key={p.name} className="space-y-1.5">
                  <Label>{p.name}</Label>
                  <Select value={values[idx] !== null ? String(values[idx]) : ""} onValueChange={v => setParam(idx, Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {p.options.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value} pt{o.value !== 1 ? "s" : ""})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}
          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Bishop</Button>
            <Button variant="outline" onClick={() => { setValues(PARAMS.map(() => null)); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <p className="text-3xl font-bold" style={{ color: resultado.color }}>{resultado.score}/13</p>
                <ScoreBar value={resultado.score} minValue={0} maxValue={13} segments={scoreSegments} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <p className="text-sm" style={{ color: resultado.color }}>{resultado.conduta}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {resultado.score < 6 ? (
                    <>
                      <li>• Misoprostol 25 mcg vaginal a cada 6h (max 4 doses).</li>
                      <li>• Alternativa: sonda Foley transcervical.</li>
                      <li>• Reavaliar Bishop apos amadurecimento.</li>
                    </>
                  ) : (
                    <>
                      <li>• Iniciar ocitocina conforme protocolo institucional.</li>
                      <li>• Amniotomia pode ser considerada.</li>
                    </>
                  )}
                </ul>
              </div>

              {modo === "educativo" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conceitos</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Bishop Score avalia 5 parametros cervicais (0-13 pontos).</li>
                    <li>• Score ≥ 6: colo favoravel — boa resposta a ocitocina.</li>
                    <li>• Score &lt; 6: colo desfavoravel — necessita amadurecimento.</li>
                    <li>• Bishop modificado pode incluir paridade e IG.</li>
                  </ul>
                </div>
              )}

              <ClinicalReferences references={CALCULATOR_REFERENCES["bishop-score"]} />
              <RelatedCalculators currentSlug="bishop-score" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os parametros cervicais.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
