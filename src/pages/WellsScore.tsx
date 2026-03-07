import { useState } from "react";
import { CalculationHistory } from "@/components/CalculationHistory";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { ArrowLeft, FileText, HeartPulse, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";
type Tipo = "tep" | "tvp";

const CRITERIOS_TEP = [
  { id: "sintomasTVP", label: "Sinais/sintomas clínicos de TVP", pontos: 3 },
  { id: "altDiagnostico", label: "Diagnóstico alternativo menos provável que TEP", pontos: 3 },
  { id: "fc100", label: "FC > 100 bpm", pontos: 1.5 },
  { id: "imobilizacao", label: "Imobilização (≥3 dias) ou cirurgia (últimas 4 sem)", pontos: 1.5 },
  { id: "tvpTepPrevio", label: "TVP ou TEP prévio", pontos: 1.5 },
  { id: "hemoptise", label: "Hemoptise", pontos: 1 },
  { id: "cancer", label: "Câncer ativo (tratamento nos últimos 6 meses)", pontos: 1 },
];

const CRITERIOS_TVP = [
  { id: "cancerAtivo", label: "Câncer ativo (últimos 6 meses)", pontos: 1 },
  { id: "paralisiaGesso", label: "Paralisia, paresia ou gesso recente em MMII", pontos: 1 },
  { id: "acamado", label: "Acamado ≥3 dias ou cirurgia maior (últimas 12 sem)", pontos: 1 },
  { id: "dolorLocalizado", label: "Dor localizada ao longo do trajeto venoso profundo", pontos: 1 },
  { id: "edemaMMII", label: "Edema de todo o membro inferior", pontos: 1 },
  { id: "edemaPanturrilha", label: "Edema de panturrilha >3 cm (vs. contralateral)", pontos: 1 },
  { id: "edemaDepressivel", label: "Edema depressível (cacifo) no membro sintomático", pontos: 1 },
  { id: "colaterais", label: "Veias colaterais superficiais (não varicosas)", pontos: 1 },
  { id: "tvpPrevia", label: "TVP prévia documentada", pontos: 1 },
  { id: "altDiag", label: "Diagnóstico alternativo tão ou mais provável (subtrai)", pontos: -2 },
];

interface Resultado {
  score: number;
  risco: string;
  probabilidade: string;
  cor: string;
  bgClass: string;
  recomendacoes: string[];
}

function classificarTEP(score: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (score <= 4) return {
    score, risco: "Baixo/Intermediário", probabilidade: "TEP improvável",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Wells ≤4: TEP improvável.", "Solicitar D-dímero. Se negativo: exclui TEP (VPN >95%).", "Se D-dímero positivo: angiotomografia de tórax (angioTC).", "Considerar PERC rule se Wells 0-1 e baixa suspeita clínica."]
      : ["O risco de embolia pulmonar é baixo.", "Um exame de sangue (D-dímero) pode ajudar a confirmar."],
  };
  return {
    score, risco: "Alto", probabilidade: "TEP provável",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Wells >4: TEP provável.", "Solicitar angiotomografia de tórax (angioTC) diretamente.", "D-dímero NÃO é recomendado (não exclui nesta faixa).", "Se angioTC indisponível: cintilografia V/Q ou USG de MMII.", "Iniciar anticoagulação empírica enquanto aguarda confirmação diagnóstica (se alta suspeita clínica)."]
      : ["O risco de embolia pulmonar é significativo.", "Exames de imagem são necessários com urgência."],
  };
}

function classificarTVP(score: number, modo: Modo): Resultado {
  const isPro = modo === "clinico";
  if (score <= 1) return {
    score, risco: "Baixo", probabilidade: "TVP improvável",
    cor: "hsl(142 71% 45%)", bgClass: "border-green-500/30 bg-green-500/10",
    recomendacoes: isPro
      ? ["Wells ≤1: TVP improvável (prevalência ~5%).", "Solicitar D-dímero. Se negativo: exclui TVP.", "Se D-dímero positivo: USG com Doppler de MMII.", "Se USG negativa + D-dímero positivo: repetir USG em 5-7 dias."]
      : ["O risco de trombose é baixo.", "Um exame de sangue simples pode ajudar a confirmar."],
  };
  return {
    score, risco: "Moderado/Alto", probabilidade: "TVP provável",
    cor: "hsl(0 72% 51%)", bgClass: "border-red-500/30 bg-red-500/10",
    recomendacoes: isPro
      ? ["Wells ≥2: TVP provável.", "Solicitar USG com Doppler de MMII diretamente.", "Se USG positiva: iniciar anticoagulação.", "Se USG negativa e alta suspeita: repetir em 5-7 dias ou solicitar D-dímero.", "Considerar anticoagulação empírica enquanto aguarda exame."]
      : ["O risco de trombose é significativo.", "Um ultrassom das pernas é necessário."],
  };
}

function gerarPDF(tipo: Tipo, form: { nomePaciente: string; data: string }, resultado: Resultado) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(`Wells Score (${tipo === "tep" ? "TEP" : "TVP"}) - Posologia`, w / 2, y, { align: "center" });
  y += 10;
  if (form.nomePaciente) { doc.text(`Paciente: ${form.nomePaciente}`, 14, y); y += 5; }
  doc.text(`Data: ${form.data}`, 14, y); y += 10;
  doc.setFontSize(14);
  doc.text(`Score: ${resultado.score} — ${resultado.probabilidade}`, 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  resultado.recomendacoes.forEach((r) => { const l = doc.splitTextToSize(`- ${r}`, w - 32); doc.text(l, 18, y); y += l.length * 4 + 2; });
  doc.save(`wells-${tipo}-${form.nomePaciente || "paciente"}-${form.data}.pdf`);
}

export default function WellsScore() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [tipo, setTipo] = useState<Tipo>("tep");
  const [modo, setModo] = useState<Modo>("clinico");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [checkedTEP, setCheckedTEP] = useState<Record<string, boolean>>({});
  const [checkedTVP, setCheckedTVP] = useState<Record<string, boolean>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  

  const scoreTEP = CRITERIOS_TEP.reduce((s, c) => s + (checkedTEP[c.id] ? c.pontos : 0), 0);
  const scoreTVP = CRITERIOS_TVP.reduce((s, c) => s + (checkedTVP[c.id] ? c.pontos : 0), 0);
  const currentScore = tipo === "tep" ? scoreTEP : scoreTVP;

  const calcular = () => {
    const res = tipo === "tep" ? classificarTEP(currentScore, modo) : classificarTVP(currentScore, modo);
    setResultado(res);
  };

  const limpar = () => {
    setCheckedTEP({}); setCheckedTVP({}); setResultado(null);
  };

  const criterios = tipo === "tep" ? CRITERIOS_TEP : CRITERIOS_TVP;
  const checked = tipo === "tep" ? checkedTEP : checkedTVP;
  const setChecked = tipo === "tep" ? setCheckedTEP : setCheckedTVP;

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar às Calculadoras
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><HeartPulse className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Escore de Wells (TEP / TVP)</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Estratificação de probabilidade pré-teste para tromboembolismo.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="wells-score" toolName="Wells Score" />
            <AdminPromptViewer toolSlug="wells-score" toolName="Wells Score" toolType="calculator" prompt={getNativePrompt("wells-score") || ""} />
            <CalculationHistory calculatorSlug="wells-score" />
            {resultado && (
              <SaveToHistoryButton
                calculatorName={`Wells ${tipo.toUpperCase()}`}
                calculatorSlug="wells-score"
                summary={`Wells ${tipo.toUpperCase()}: ${resultado.score} pts – ${resultado.probabilidade}`}
                details={{ Score: String(resultado.score), Risco: resultado.risco, Tipo: tipo.toUpperCase() }}
                date={data}
              />
            )}
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("clinico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "clinico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Clínico
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificação (opcional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={nomePaciente} onChange={(e) => { setNomePaciente(e.target.value); setResultado(null); }} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={(e) => { setData(e.target.value); setResultado(null); }} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <Tabs value={tipo} onValueChange={(v) => { setTipo(v as Tipo); setResultado(null); }}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="tep" className="flex-1">TEP (Embolia Pulmonar)</TabsTrigger>
                <TabsTrigger value="tvp" className="flex-1">TVP (Trombose Venosa)</TabsTrigger>
              </TabsList>

              <TabsContent value={tipo}>
                <div className="space-y-3">
                  {criterios.map((c) => (
                    <label key={c.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <Checkbox
                        checked={!!checked[c.id]}
                        onCheckedChange={(v) => { setChecked((p) => ({ ...p, [c.id]: !!v })); setResultado(null); }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm">{c.label}</span>
                      </div>
                      <span className={`text-xs font-mono font-semibold shrink-0 ${c.pontos < 0 ? "text-destructive" : "text-primary"}`}>
                        {c.pontos > 0 ? "+" : ""}{c.pontos}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-medium">Score atual:</span>
                  <span className="text-lg font-bold text-primary">{currentScore} pts</span>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre o Escore de Wells</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>O <strong>Escore de Wells</strong> é uma ferramenta de decisão clínica que estratifica a probabilidade pré-teste de TEP ou TVP.</p>
                <p><strong>TEP:</strong> ≤4 pts = improvável → D-dímero. &gt;4 pts = provável → angioTC diretamente.</p>
                <p><strong>TVP:</strong> ≤1 pt = improvável → D-dímero. ≥2 pts = provável → USG Doppler diretamente.</p>
                <p><strong>Validação:</strong> Wells PS et al. Thromb Haemost, 2000. Validado em múltiplos estudos multicêntricos (CHRISTOPHER, YEARS).</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={calcular} className="flex-1">Calcular Wells</Button>
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.bgClass}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado – {tipo.toUpperCase()}</h2>
                <RiskGauge
                  value={resultado.score}
                  maxValue={tipo === "tep" ? 12.5 : 9}
                  label={resultado.probabilidade}
                  unit="pts"
                  segments={tipo === "tep" ? [
                    { min: 0, max: 32, color: "hsl(142 71% 45%)", label: "Improvável" },
                    { min: 32, max: 100, color: "hsl(0 72% 51%)", label: "Provável" },
                  ] : [
                    { min: 0, max: 22, color: "hsl(142 71% 45%)", label: "Improvável" },
                    { min: 22, max: 100, color: "hsl(0 72% 51%)", label: "Provável" },
                  ]}
                />
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  {tipo === "tep" ? (
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>≤4 pts</span><span>TEP Improvável</span></div>
                      <div className="flex justify-between"><span>&gt;4 pts</span><span>TEP Provável</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>≤1 pt</span><span>TVP Improvável</span></div>
                      <div className="flex justify-between"><span>≥2 pts</span><span>TVP Provável</span></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conduta Sugerida</h2>
                <ul className="space-y-2">{resultado.recomendacoes.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}</ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(tipo, { nomePaciente, data }, resultado)}>
                <FileText className="h-4 w-4" /> Gerar Relatório PDF
              </Button>

              <ClinicalReferences references={CALCULATOR_REFERENCES["wells-score"]} />
              <RelatedCalculators currentSlug="wells-score" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Marque os critérios e clique em <strong>Calcular</strong> para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
