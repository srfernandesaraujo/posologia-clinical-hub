import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Moon, User, Stethoscope } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Modo = "clinico" | "educativo";

const RASS_LEVELS = [
  { score: 4, label: "Combativo", desc: "Combativo, violento, perigo para equipe", cor: "hsl(0 72% 51%)", conduta: "Avaliar causas reversíveis (dor, delirium, hipóxia). Considerar haloperidol ou contenção se necessário." },
  { score: 3, label: "Muito agitado", desc: "Puxa ou remove tubos/cateteres, agressivo", cor: "hsl(0 72% 51%)", conduta: "Tratar causa base. Dexmedetomidina ou propofol se intubado. Haloperidol se delirium." },
  { score: 2, label: "Agitado", desc: "Movimentos sem propósito, dessincroniza VM", cor: "hsl(25 90% 50%)", conduta: "Avaliar dor (BPS/CPOT). Analgesia primeiro. Dexmedetomidina preferida." },
  { score: 1, label: "Inquieto", desc: "Ansioso, movimentos não agressivos", cor: "hsl(38 92% 50%)", conduta: "Reavaliar necessidade de sedação. Medidas não farmacológicas." },
  { score: 0, label: "Alerta e calmo", desc: "Alvo na maioria dos protocolos", cor: "hsl(142 71% 45%)", conduta: "ALVO IDEAL. Manter sem sedação ou dose mínima. Despertar diário." },
  { score: -1, label: "Sonolento", desc: "Sem alerta completo, desperta com voz (>10s)", cor: "hsl(142 71% 45%)", conduta: "Aceitável em muitos cenários. Alvo para pós-operatório." },
  { score: -2, label: "Sedação leve", desc: "Desperta brevemente com voz (<10s)", cor: "hsl(200 70% 50%)", conduta: "Considerar reduzir sedação. Protocolo de despertar diário." },
  { score: -3, label: "Sedação moderada", desc: "Movimento ou abertura ocular ao estímulo vocal (sem contato visual)", cor: "hsl(200 70% 50%)", conduta: "Reduzir sedação se não houver indicação (SDRA grave, status epilepticus)." },
  { score: -4, label: "Sedação profunda", desc: "Sem resposta à voz, responde a estímulo físico", cor: "hsl(260 50% 50%)", conduta: "Justificável em: SDRA com P/F<150, pressão intracraniana elevada, status epilepticus." },
  { score: -5, label: "Não despertável", desc: "Sem resposta a voz ou estímulo físico", cor: "hsl(260 50% 50%)", conduta: "Sedação excessiva na maioria dos cenários. Reduzir ou suspender imediatamente se possível." },
];

export default function RassSas() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRASS, setSelectedRASS] = useState<number | null>(null);
  const { saveCalculation } = useCalculationHistory();

  const selected = selectedRASS !== null ? RASS_LEVELS.find(l => l.score === selectedRASS) : null;

  const salvar = () => {
    if (selected) {
      saveCalculation({
        calculatorName: "RASS",
        calculatorSlug: "rass-sedacao",
        patientName: nomePaciente || undefined,
        date: data,
        summary: `RASS: ${selected.score} – ${selected.label}`,
        details: { Score: String(selected.score), Nivel: selected.label },
      });
    }
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
            <div className="rounded-xl bg-primary/10 p-3"><Moon className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Escala RASS (Sedacao em UTI)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Richmond Agitation-Sedation Scale — avaliacao e conduta.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="rass-sedacao" toolName="RASS" />
            <AdminPromptViewer toolSlug="rass-sas" toolName="RASS/SAS" toolType="calculator" prompt={getNativePrompt("rass-sas") || ""} />
            <CalculationHistory calculatorSlug="rass-sedacao" />
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
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Selecione o nivel RASS</h2>
            <div className="space-y-1">
              {RASS_LEVELS.map((level) => (
                <button
                  key={level.score}
                  onClick={() => { setSelectedRASS(level.score); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedRASS === level.score ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-lg font-bold w-10 text-center shrink-0" style={{ color: level.cor }}>
                    {level.score > 0 ? `+${level.score}` : level.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{level.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{level.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre a RASS</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>A <strong>RASS</strong> (Richmond Agitation-Sedation Scale) e a escala mais validada para monitoramento de sedacao em UTI.</p>
                <p><strong>Alvo:</strong> RASS 0 a -1 na maioria dos pacientes. Sedacao profunda (RASS -4/-5) associada a piores desfechos.</p>
                <p><strong>Protocolo PADIS 2018:</strong> Analgesia primeiro (A1), sedacao leve (C), despertar diario, avaliar delirium (CAM-ICU).</p>
              </div>
            </div>
          )}

          <Button onClick={salvar} disabled={selectedRASS === null} className="w-full">Registrar Avaliacao RASS</Button>
        </div>

        <div className="space-y-6">
          {selected ? (
            <>
              <div className="rounded-2xl border p-6" style={{ borderColor: `${selected.cor}30`, backgroundColor: `${selected.cor}10` }}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">RASS Selecionado</h2>
                <div className="text-center py-4">
                  <div className="text-5xl font-bold" style={{ color: selected.cor }}>
                    {selected.score > 0 ? `+${selected.score}` : selected.score}
                  </div>
                  <div className="text-lg font-semibold mt-2">{selected.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{selected.desc}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta Sugerida</h2>
                <p className="text-sm text-muted-foreground">{selected.conduta}</p>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["rass-sedacao"]} />
              <RelatedCalculators currentSlug="rass-sedacao" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Moon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione o nivel RASS do paciente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
