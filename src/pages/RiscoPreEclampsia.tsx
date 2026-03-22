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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Modo = "clinico" | "educativo";

const FATORES_ALTO = [
  { id: "hxPE", label: "Historia de pre-eclampsia em gestacao anterior" },
  { id: "gestMultipla", label: "Gestacao multipla" },
  { id: "has", label: "Hipertensao arterial cronica" },
  { id: "dm", label: "Diabetes tipo 1 ou 2" },
  { id: "drcLupus", label: "Doenca renal cronica ou lupus" },
];

const FATORES_MODERADO = [
  { id: "nulipara", label: "Nulipara" },
  { id: "idade35", label: "Idade materna ≥ 35 anos" },
  { id: "imc30", label: "IMC ≥ 30 kg/m²" },
  { id: "hxFamiliar", label: "Historia familiar de pre-eclampsia (mae ou irma)" },
  { id: "intervalo", label: "Intervalo interpartal > 10 anos" },
  { id: "fiv", label: "Gestacao por FIV" },
  { id: "afroDesc", label: "Afrodescendente" },
  { id: "baixaRenda", label: "Baixo nivel socioeconomico" },
];

export default function RiscoPreEclampsia() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [altosChecked, setAltosChecked] = useState<Set<string>>(new Set());
  const [moderadosChecked, setModeradosChecked] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<any>(null);
  const { saveCalculation } = useCalculationHistory();

  const toggle = (set: Set<string>, setFn: any, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
    setResultado(null);
  };

  const handleCalc = () => {
    const nAlto = altosChecked.size;
    const nModerado = moderadosChecked.size;
    let risco: string;
    let indicaAAS: boolean;
    let color: string;

    if (nAlto >= 1) {
      risco = "Alto Risco";
      indicaAAS = true;
      color = "hsl(0 72% 51%)";
    } else if (nModerado >= 2) {
      risco = "Alto Risco (≥ 2 fatores moderados)";
      indicaAAS = true;
      color = "hsl(38 92% 50%)";
    } else if (nModerado === 1) {
      risco = "Risco Moderado";
      indicaAAS = false;
      color = "hsl(60 70% 45%)";
    } else {
      risco = "Baixo Risco";
      indicaAAS = false;
      color = "hsl(142 71% 45%)";
    }

    const score = nAlto * 2 + nModerado;
    setResultado({ risco, indicaAAS, color, nAlto, nModerado, score });

    saveCalculation({
      calculatorName: "Risco de Pre-Eclampsia (ACOG/NICE)",
      calculatorSlug: "risco-pre-eclampsia",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `${risco} | AAS: ${indicaAAS ? "Indicado" : "Nao indicado"} | ${nAlto} alto(s), ${nModerado} moderado(s)`,
      details: { Risco: risco, AAS: indicaAAS ? "Sim" : "Nao", FatoresAlto: Array.from(altosChecked).join(", "), FatoresModerado: Array.from(moderadosChecked).join(", ") },
    });
  };

  const scoreSegments = [
    { min: 0, max: 1, color: "hsl(142 71% 45%)", label: "Baixo" },
    { min: 1, max: 2, color: "hsl(60 70% 45%)", label: "Moderado" },
    { min: 2, max: 4, color: "hsl(38 92% 50%)", label: "Alto" },
    { min: 4, max: 10, color: "hsl(0 72% 51%)", label: "Muito alto" },
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
              <h1 className="text-2xl font-bold">Risco de Pre-Eclampsia</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Rastreio baseado em fatores ACOG/NICE — indicacao de AAS profilatico.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="risco-pre-eclampsia" toolName="Risco Pre-Eclampsia" />
            <AdminPromptViewer toolSlug="risco-pre-eclampsia" toolName="Risco Pre-Eclampsia" toolType="calculator" prompt={getNativePrompt("risco-pre-eclampsia") || ""} />
            <CalculationHistory calculatorSlug="risco-pre-eclampsia" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Fatores de Alto Risco (1 = indica AAS)</h2>
            <div className="space-y-3">
              {FATORES_ALTO.map(f => (
                <div key={f.id} className="flex items-center gap-3">
                  <Checkbox checked={altosChecked.has(f.id)} onCheckedChange={() => toggle(altosChecked, setAltosChecked, f.id)} />
                  <Label className="cursor-pointer font-normal">{f.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Fatores de Risco Moderado (≥ 2 = indica AAS)</h2>
            <div className="space-y-3">
              {FATORES_MODERADO.map(f => (
                <div key={f.id} className="flex items-center gap-3">
                  <Checkbox checked={moderadosChecked.has(f.id)} onCheckedChange={() => toggle(moderadosChecked, setModeradosChecked, f.id)} />
                  <Label className="cursor-pointer font-normal">{f.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Avaliar Risco</Button>
            <Button variant="outline" onClick={() => { setAltosChecked(new Set()); setModeradosChecked(new Set()); setResultado(null); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.indicaAAS ? "border-red-500/30 bg-red-500/10" : "border-green-500/30 bg-green-500/10"}`}>
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <p className="text-xl font-bold" style={{ color: resultado.color }}>{resultado.risco}</p>
                <ScoreBar value={resultado.score} minValue={0} maxValue={10} segments={scoreSegments} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {resultado.indicaAAS ? (
                    <>
                      <li className="text-red-600 font-medium">⚠ AAS 100-150 mg/dia indicado</li>
                      <li>• Iniciar entre 12-16 semanas de gestacao.</li>
                      <li>• Manter ate 36 semanas (ou ate o parto).</li>
                      <li>• Tomar a noite (maior eficacia).</li>
                      <li>• Monitorar PA a cada consulta pre-natal.</li>
                    </>
                  ) : (
                    <>
                      <li className="text-green-600 font-medium">✓ AAS profilatico nao indicado</li>
                      <li>• Manter acompanhamento pre-natal habitual.</li>
                      <li>• Reavaliar se surgir novo fator de risco.</li>
                    </>
                  )}
                  {modo === "clinico" && <li>• Considerar dosagem de PLGF/sFlt-1 se disponivel.</li>}
                </ul>
              </div>

              {modo === "educativo" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conceitos</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Pre-eclampsia: PA ≥ 140/90 + proteinuria apos 20 semanas.</li>
                    <li>• AAS em baixa dose inibe tromboxano A2 sem afetar prostaciclina.</li>
                    <li>• O rastreio ACOG/USPSTF e recomendado na 1ª consulta pre-natal.</li>
                    <li>• 1 fator alto OU ≥ 2 moderados = indicacao de AAS.</li>
                  </ul>
                </div>
              )}

              <ClinicalReferences references={CALCULATOR_REFERENCES["risco-pre-eclampsia"]} />
              <RelatedCalculators currentSlug="risco-pre-eclampsia" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione os fatores de risco para avaliar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
