import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, HeartPulse, User, Stethoscope, AlertTriangle } from "lucide-react";
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

type Modo = "clinico" | "educativo";

const PROTOCOLOS = {
  zuspan: {
    label: "Zuspan (IV puro)",
    ataque: "4 g IV em 20 min (8 mL MgSO4 50% + 92 mL SF 0.9%, infundir em 20 min)",
    manutencao: "1-2 g/h IV continuo (até 24h após ultimo episodio convulsivo ou parto)",
    ataqueDose: 4,
    manutencaoDose: "1-2",
  },
  pritchard: {
    label: "Pritchard (IV + IM)",
    ataque: "4 g IV lento (20 min) + 10 g IM (5 g em cada gluteo, profundo)",
    manutencao: "5 g IM a cada 4h (alternar gluteos) por 24h",
    ataqueDose: 14,
    manutencaoDose: "5 a cada 4h",
  },
};

export default function SulfatoMagnesio() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [protocolo, setProtocolo] = useState<"zuspan" | "pritchard">("zuspan");
  const [peso, setPeso] = useState("");
  const [magnesemia, setMagnesemia] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const handleCalc = () => {
    const p = PROTOCOLOS[protocolo];
    const mg = magnesemia ? Number(magnesemia) : null;

    let alertaToxicidade = "";
    if (mg !== null) {
      if (mg > 9) alertaToxicidade = "RISCO DE PARADA RESPIRATORIA — suspender MgSO4, administrar gluconato de calcio 1g IV";
      else if (mg > 7) alertaToxicidade = "PERDA DE REFLEXOS PATELARES — reduzir ou suspender infusao";
      else if (mg > 5) alertaToxicidade = "Nivel terapeutico alto — monitorar reflexos a cada hora";
    }

    const diluicaoAtaque = protocolo === "zuspan"
      ? "Diluir 8 mL de MgSO4 50% em 92 mL de SF 0.9% (concentracao: 40 mg/mL). Infundir 100 mL em 20 min."
      : "IV: 8 mL de MgSO4 50% em 92 mL SF 0.9% em 20 min. IM: 10 mL de MgSO4 50% (5 mL cada gluteo).";

    const diluicaoManutencao = protocolo === "zuspan"
      ? "24 mL de MgSO4 50% em 476 mL SF 0.9% (concentracao: 24 mg/mL). Velocidade: 42-84 mL/h (1-2 g/h)."
      : "5 mL de MgSO4 50% IM profundo a cada 4h, alternando gluteos.";

    setResultado({ protocolo: p, alertaToxicidade, diluicaoAtaque, diluicaoManutencao, mg });
    setErro("");

    saveCalculation({
      calculatorName: "Dosagem de Sulfato de Magnesio",
      calculatorSlug: "sulfato-magnesio",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `Protocolo: ${p.label} | Ataque: ${p.ataqueDose}g | Manutencao: ${p.manutencaoDose} g/h`,
      details: { Protocolo: protocolo, Magnesemia: mg, Alerta: alertaToxicidade || "Nenhum" },
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
              <h1 className="text-2xl font-bold">Dosagem de Sulfato de Magnesio</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Protocolos Zuspan e Pritchard para eclampsia/pre-eclampsia grave.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="sulfato-magnesio" toolName="Sulfato Magnesio" />
            <AdminPromptViewer toolSlug="sulfato-magnesio" toolName="Sulfato Magnesio" toolType="calculator" prompt={getNativePrompt("sulfato-magnesio") || ""} />
            <CalculationHistory calculatorSlug="sulfato-magnesio" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Configuracao</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Protocolo *</Label>
                <Select value={protocolo} onValueChange={v => { setProtocolo(v as any); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zuspan">Zuspan (IV puro — mais comum)</SelectItem>
                    <SelectItem value="pritchard">Pritchard (IV + IM — locais sem bomba infusora)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Magnesemia (mEq/L) — opcional</Label>
                <Input type="number" step="0.1" value={magnesemia} onChange={e => { setMagnesemia(e.target.value); setResultado(null); }} placeholder="Ex: 4.5 (para avaliar toxicidade)" />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>Faixa terapeutica:</strong> 4-7 mEq/L | <strong>Perda reflexos:</strong> 7-10 mEq/L | <strong>Parada respiratoria:</strong> &gt; 10 mEq/L
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}
          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Protocolo</Button>
            <Button variant="outline" onClick={() => { setMagnesemia(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              {resultado.alertaToxicidade && (
                <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-red-600">Alerta de Toxicidade</h2>
                  </div>
                  <p className="text-sm font-medium text-red-600">{resultado.alertaToxicidade}</p>
                  <p className="text-xs text-muted-foreground mt-2">Antidoto: Gluconato de Calcio 10% — 10 mL IV lento (3-5 min).</p>
                </div>
              )}

              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Protocolo: {resultado.protocolo.label}</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Dose de Ataque</p>
                    <p className="text-muted-foreground">{resultado.protocolo.ataque}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Manutencao</p>
                    <p className="text-muted-foreground">{resultado.protocolo.manutencao}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Diluicao e Preparo</h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Ataque:</p>
                    <p>{resultado.diluicaoAtaque}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Manutencao:</p>
                    <p>{resultado.diluicaoManutencao}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Monitoramento</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Reflexo patelar a cada 1h (suspender se ausente).</li>
                  <li>• FR ≥ 16 irpm (suspender se &lt; 16).</li>
                  <li>• Diurese ≥ 25 mL/h (reduzir dose se &lt; 25).</li>
                  <li>• Magnesemia a cada 4-6h (se disponivel).</li>
                  <li>• Manter gluconato de calcio a beira-leito.</li>
                </ul>
              </div>

              {modo === "educativo" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conceitos</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• MgSO4 e o farmaco de escolha para prevencao/tratamento de convulsoes eclamptícas.</li>
                    <li>• Zuspan: mais utilizado em centros com bomba de infusao.</li>
                    <li>• Pritchard: alternativa em locais sem bomba (via IM).</li>
                    <li>• O Mg bloqueia receptores NMDA e reduz vasoespasmo cerebral.</li>
                  </ul>
                </div>
              )}

              <ClinicalReferences references={CALCULATOR_REFERENCES["sulfato-magnesio"]} />
              <RelatedCalculators currentSlug="sulfato-magnesio" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione o protocolo para ver as orientacoes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
