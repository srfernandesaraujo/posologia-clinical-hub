import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Baby, User, Stethoscope } from "lucide-react";
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

type Modo = "clinico" | "educativo";

const COMPORTAMENTO = [
  { value: 0, label: "Brincando / Adequado" },
  { value: 1, label: "Sonolento" },
  { value: 2, label: "Irritavel" },
  { value: 3, label: "Letargico/confuso ou resposta reduzida a dor" },
];

const CARDIOVASCULAR = [
  { value: 0, label: "Cor rosada, TEC < 3s" },
  { value: 1, label: "Palidez OU TEC 3s" },
  { value: 2, label: "Palidez/cianose OU TEC 4s OU taquicardia" },
  { value: 3, label: "Palidez/cianose/marmoreo OU TEC ≥ 5s OU bradicardia" },
];

const RESPIRATORIO = [
  { value: 0, label: "FR normal, sem retracoes" },
  { value: 1, label: "FR elevada, uso de musculatura acessoria OU FiO2 > 30%" },
  { value: 2, label: "FR elevada, retracoes OU FiO2 > 40% OU uso de O2 > 6L" },
  { value: 3, label: "FR elevada com gemencia OU FiO2 > 50% ou com retracoes graves" },
];

function classifyPEWS(score: number): { label: string; color: string; conduta: string[] } {
  if (score <= 2) return {
    label: "Baixo Risco",
    color: "hsl(142 71% 45%)",
    conduta: ["Monitorar sinais vitais de rotina.", "Reavaliar em caso de mudanca clinica."],
  };
  if (score <= 4) return {
    label: "Risco Moderado",
    color: "hsl(38 92% 50%)",
    conduta: ["Aumentar frequencia de monitoramento.", "Comunicar enfermeiro responsavel e medico.", "Reavaliar em 30-60 minutos."],
  };
  return {
    label: "ALTO RISCO — Acionar Equipe de Emergencia",
    color: "hsl(0 72% 51%)",
    conduta: ["Acionar equipe de resposta rapida IMEDIATAMENTE.", "Iniciar avaliacao ABCDE.", "Monitoramento continuo.", "Preparar para possivel transferencia para UTI."],
  };
}

export default function Pews() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [comportamento, setComportamento] = useState(0);
  const [cardiovascular, setCardiovascular] = useState(0);
  const [respiratorio, setRespiratorio] = useState(0);
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [calculado, setCalculado] = useState(false);
  const { saveCalculation } = useCalculationHistory();

  const score = comportamento + cardiovascular + respiratorio;
  const classification = classifyPEWS(score);

  const handleCalc = () => {
    setCalculado(true);
    saveCalculation({
      calculatorName: "PEWS",
      calculatorSlug: "pews",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `PEWS: ${score} (${classification.label})`,
      details: { Comportamento: comportamento, Cardiovascular: cardiovascular, Respiratorio: respiratorio, Total: score },
    });
  };

  const scoreSegments = [
    { min: 0, max: 3, color: "hsl(142 71% 45%)", label: "Baixo" },
    { min: 3, max: 5, color: "hsl(38 92% 50%)", label: "Moderado" },
    { min: 5, max: 9, color: "hsl(0 72% 51%)", label: "Alto" },
  ];

  const RadioGroup = ({ options, value, onChange, name }: { options: typeof COMPORTAMENTO; value: number; onChange: (v: number) => void; name: string }) => (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${value === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
          <input type="radio" name={name} checked={value === opt.value} onChange={() => { onChange(opt.value); setCalculado(false); }} className="mt-0.5" />
          <div>
            <span className="font-medium text-sm">{opt.value} ponto{opt.value !== 1 ? "s" : ""}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.label}</p>
          </div>
        </label>
      ))}
    </div>
  );

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
              <h1 className="text-2xl font-bold">PEWS — Pediatric Early Warning Score</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Deteccao precoce de deterioracao clinica em criancas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="pews" toolName="PEWS" />
            <AdminPromptViewer toolSlug="pews" toolName="PEWS" toolType="calculator" prompt={getNativePrompt("pews") || ""} />
            <CalculationHistory calculatorSlug="pews" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Comportamento</h2>
            <RadioGroup options={COMPORTAMENTO} value={comportamento} onChange={setComportamento} name="comportamento" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Cardiovascular</h2>
            <RadioGroup options={CARDIOVASCULAR} value={cardiovascular} onChange={setCardiovascular} name="cardiovascular" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Respiratorio</h2>
            <RadioGroup options={RESPIRATORIO} value={respiratorio} onChange={setRespiratorio} name="respiratorio" />
          </div>

          <Button onClick={handleCalc} className="w-full">Calcular PEWS</Button>
        </div>

        <div className="space-y-6">
          {calculado ? (
            <>
              <div className="rounded-2xl border p-6" style={{ borderColor: `${classification.color}50`, backgroundColor: `${classification.color}10` }}>
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-2">
                  <div className="text-4xl font-bold" style={{ color: classification.color }}>{score}</div>
                  <div className="text-sm text-muted-foreground mt-1">pontos de 9</div>
                  <div className="text-lg font-semibold mt-3" style={{ color: classification.color }}>{classification.label}</div>
                </div>
                <div className="mt-4">
                  <ScoreBar value={score} minValue={0} maxValue={9} segments={scoreSegments} unit="pts" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {classification.conduta.map((c, i) => <li key={i}>• {c}</li>)}
                  {modo === "educativo" && (
                    <>
                      <li className="mt-3">• O PEWS ajuda a equipe a identificar criancas que estao piorando.</li>
                      <li>• Pontuacoes mais altas exigem atencao imediata.</li>
                    </>
                  )}
                </ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["pews"]} />
              <RelatedCalculators currentSlug="pews" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Avalie os 3 dominios e clique calcular.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
