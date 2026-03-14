import { useState, useMemo } from "react";
import { ArrowLeft, FileText, Pill, AlertTriangle } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import type { CalculationEntry } from "@/hooks/useCalculationHistory";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";

/* ─── ARMS ─── */
const ARMS_ITEMS = [
  "Você esquece de tomar seus medicamentos?",
  "Você decide não tomar seus medicamentos?",
  "Você esquece de buscar/reabastecer seus medicamentos na farmácia?",
  "Você fica sem medicamentos porque não reabasteceu a tempo?",
  "Você pula doses do seu medicamento?",
  "Você deixa de tomar seus medicamentos quando se sente melhor?",
  "Você toma menos medicamentos do que o prescrito?",
  "Você toma seus medicamentos de forma irregular?",
  "Você deixa de tomar seus medicamentos quando se sente doente?",
  "Você deixa de tomar seus medicamentos quando tem efeitos colaterais?",
  "Você toma os medicamentos de outra pessoa?",
  "Você toma mais medicamentos do que o prescrito?",
];

/* ─── MOATT ─── */
const MOATT_ITEMS = [
  "Conhece o nome do medicamento",
  "Sabe a indicação do medicamento",
  "Sabe a dose prescrita",
  "Conhece o horário de administração",
  "Sabe o que fazer se esquecer uma dose",
  "Conhece os efeitos colaterais esperados",
  "Sabe quando procurar atendimento de emergência",
  "Conhece as interações alimentares",
  "Conhece as interações medicamentosas",
  "Sabe como armazenar o medicamento",
  "Conhece a duração do tratamento",
  "Sabe como manusear o medicamento",
  "Conhece os exames de monitoramento",
  "Sabe como lidar com náuseas/vômitos",
  "Demonstra habilidade de autogestão",
  "Compreende a importância da adesão",
];

/* ─── AQT ─── */
const AQT_ITEMS = [
  "Tem dificuldade em lembrar de tomar o medicamento-alvo?",
  "Já parou de tomar por conta própria?",
  "Sente que o tratamento interfere na rotina diária?",
  "Tem preocupações sobre efeitos colaterais a longo prazo?",
  "Tem dificuldade financeira para manter o tratamento?",
  "Acha difícil seguir o horário exato de administração?",
  "Já reduziu a dose sem orientação médica?",
  "Sente-se desanimado com o tempo de tratamento?",
];

function sanitizePDF(text: string): string {
  return text
    .replace(/ã/g, "a").replace(/õ/g, "o").replace(/á/g, "a").replace(/é/g, "e")
    .replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ê/g, "e")
    .replace(/ô/g, "o").replace(/â/g, "a").replace(/ç/g, "c").replace(/ü/g, "u")
    .replace(/Ã/g, "A").replace(/Õ/g, "O").replace(/Á/g, "A").replace(/É/g, "E")
    .replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U").replace(/Ê/g, "E")
    .replace(/Ô/g, "O").replace(/Â/g, "A").replace(/Ç/g, "C")
    .replace(/[^\x00-\x7F]/g, "");
}

interface Resultado {
  score: number;
  maxScore: number;
  percentual: number;
  faixa: string;
  cor: string;
  condutas: string[];
}

export default function AdesaoOncologia() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const SLUG = "adesao-oncologia";
  const { hasConsent, saveCalculation, getByCalculator } = useCalculationHistory();

  const [instrumento, setInstrumento] = useState("arms");
  const [nomePaciente, setNomePaciente] = useState("");

  // ARMS state (1-4 per item)
  const [armsAnswers, setArmsAnswers] = useState<number[]>(Array(12).fill(0));
  // Morisky state
  const [moriskyType, setMoriskyType] = useState<"mmas4" | "mmas8">("mmas4");
  const [mmas4, setMmas4] = useState<number[]>(Array(4).fill(-1));
  const [mmas8, setMmas8] = useState<number[]>(Array(8).fill(-1));
  // MOATT state
  const [moattChecks, setMoattChecks] = useState<boolean[]>(Array(16).fill(false));
  // AQT state
  const [aqtAnswers, setAqtAnswers] = useState<number[]>(Array(8).fill(-1));

  const [resultado, setResultado] = useState<Resultado | null>(null);

  const MMAS4_ITEMS = [
    "Você às vezes esquece de tomar seus medicamentos?",
    "Você às vezes é descuidado em tomar seus medicamentos?",
    "Quando se sente melhor, você às vezes para de tomar?",
    "Quando se sente pior, você às vezes para de tomar?",
  ];

  const MMAS8_ITEMS = [
    ...MMAS4_ITEMS,
    "Você tomou seus medicamentos ontem?",
    "Quando sente que os sintomas estão controlados, você para de tomar?",
    "Você se sente incomodado por ter que seguir o plano de tratamento?",
    "Com que frequência tem dificuldade em lembrar de tomar os medicamentos?",
  ];

  function calcular() {
    let score = 0, maxScore = 0, percentual = 0, faixa = "", cor = "", condutas: string[] = [];

    if (instrumento === "arms") {
      score = armsAnswers.reduce((a, b) => a + b, 0);
      maxScore = 48;
      percentual = Math.round((score / maxScore) * 100);
      if (score <= 20) { faixa = "Alta Adesão"; cor = "hsl(142 71% 45%)"; }
      else if (score <= 30) { faixa = "Adesão Moderada"; cor = "hsl(38 92% 50%)"; }
      else { faixa = "Baixa Adesão"; cor = "hsl(0 72% 51%)"; }
      condutas = score > 20
        ? ["Investigar barreiras específicas à adesão", "Simplificar esquema posológico se possível", "Considerar uso de lembretes/alarmes", "Agendar retorno em 2-4 semanas para reavaliação"]
        : ["Manter acompanhamento regular", "Reforçar importância da adesão contínua"];
    } else if (instrumento === "morisky") {
      if (moriskyType === "mmas4") {
        score = mmas4.filter(v => v === 1).length;
        maxScore = 4;
        percentual = Math.round((score / maxScore) * 100);
        if (score === 0) { faixa = "Alta Adesão"; cor = "hsl(142 71% 45%)"; }
        else if (score <= 2) { faixa = "Adesão Moderada"; cor = "hsl(38 92% 50%)"; }
        else { faixa = "Baixa Adesão"; cor = "hsl(0 72% 51%)"; }
      } else {
        // MMAS-8: item 5 é invertido (sim=0), item 8 usa escala 0-4
        const items7 = mmas8.slice(0, 7);
        const item8 = mmas8[7];
        let s = items7.filter((v, i) => i === 4 ? v === 0 : v === 1).length;
        if (item8 >= 3) s += 1;
        score = s;
        maxScore = 8;
        percentual = Math.round((score / maxScore) * 100);
        if (score <= 1) { faixa = "Alta Adesão"; cor = "hsl(142 71% 45%)"; }
        else if (score <= 3) { faixa = "Adesão Moderada"; cor = "hsl(38 92% 50%)"; }
        else { faixa = "Baixa Adesão"; cor = "hsl(0 72% 51%)"; }
      }
      condutas = score >= 2
        ? ["Realizar entrevista motivacional", "Avaliar polifarmácia e simplificar regime", "Oferecer suporte de adesão (pillbox, apps)", "Considerar monitoramento farmacoterapêutico"]
        : ["Adesão satisfatória — manter acompanhamento"];
    } else if (instrumento === "moatt") {
      const competencias = moattChecks.filter(Boolean).length;
      score = competencias;
      maxScore = 16;
      percentual = Math.round((score / maxScore) * 100);
      if (percentual >= 80) { faixa = "Competência Adequada"; cor = "hsl(142 71% 45%)"; }
      else if (percentual >= 50) { faixa = "Competência Parcial"; cor = "hsl(38 92% 50%)"; }
      else { faixa = "Competência Insuficiente"; cor = "hsl(0 72% 51%)"; }
      const lacunas = MOATT_ITEMS.filter((_, i) => !moattChecks[i]);
      condutas = percentual < 80
        ? ["Reforçar educação nos itens não atingidos:", ...lacunas.map(l => `• ${l}`), "Agendar reavaliação em 2 semanas"]
        : ["Paciente demonstra boa compreensão do tratamento", "Manter reforço educativo periódico"];
    } else {
      score = aqtAnswers.filter(v => v === 1).length;
      maxScore = 8;
      percentual = Math.round((score / maxScore) * 100);
      if (score <= 1) { faixa = "Baixo Risco de Não Adesão"; cor = "hsl(142 71% 45%)"; }
      else if (score <= 4) { faixa = "Risco Moderado"; cor = "hsl(38 92% 50%)"; }
      else { faixa = "Alto Risco de Não Adesão"; cor = "hsl(0 72% 51%)"; }
      condutas = score >= 2
        ? ["Encaminhar para farmacêutico clínico oncológico", "Avaliar necessidade de suporte psicossocial", "Considerar programas de assistência farmacêutica", "Reavaliar tolerabilidade e ajustar dose se necessário"]
        : ["Adesão satisfatória ao tratamento-alvo"];
    }

    const res = { score, maxScore, percentual, faixa, cor, condutas };
    setResultado(res);

    if (consent) {
      saveEntry({
        calculator_name: "Risco de Não Adesão Oncológica",
        calculator_slug: SLUG,
        summary: `${instrumento.toUpperCase()}: ${score}/${maxScore} — ${faixa}`,
        details: { instrumento, score, maxScore, faixa, nomePaciente },
        patient_name: nomePaciente || undefined,
      });
    }
  }

  function gerarPDF() {
    if (!resultado) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(sanitizePDF("Predicao de Risco de Nao Adesao Oncologica"), 20, 20);
    doc.setFontSize(11);
    if (nomePaciente) doc.text(sanitizePDF(`Paciente: ${nomePaciente}`), 20, 30);
    doc.text(sanitizePDF(`Instrumento: ${instrumento.toUpperCase()}`), 20, nomePaciente ? 38 : 30);
    doc.text(sanitizePDF(`Score: ${resultado.score}/${resultado.maxScore}`), 20, nomePaciente ? 46 : 38);
    doc.text(sanitizePDF(`Classificacao: ${resultado.faixa}`), 20, nomePaciente ? 54 : 46);
    let y = nomePaciente ? 66 : 58;
    doc.setFontSize(12);
    doc.text("Condutas:", 20, y); y += 8;
    doc.setFontSize(10);
    resultado.condutas.forEach(c => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(sanitizePDF(`- ${c}`), 24, y); y += 6;
    });
    doc.setFontSize(8);
    doc.text(sanitizePDF("Gerado por Posologia Producoes"), 20, 285);
    doc.save("adesao-oncologia.pdf");
  }

  const gaugeValue = resultado ? (instrumento === "arms" ? resultado.percentual : resultado.percentual) : 0;
  // For ARMS higher = worse; for others higher = worse too (except MOATT where higher = better)
  const invertedGauge = instrumento === "moatt" ? gaugeValue : (resultado ? 100 - gaugeValue : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {!isEmbed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/calculadoras")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" />
              Predição de Risco de Não Adesão Oncológica
            </h1>
            <p className="text-sm text-muted-foreground">ARMS • MOATT • Morisky • AQT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareToolButton toolSlug={SLUG} toolName="Adesão Oncológica" />
          <AdminPromptViewer
            toolSlug={SLUG}
            systemPrompt={getNativePrompt(SLUG)}
          />
          <CalculationHistory
            history={history}
            calculatorName="Adesão Oncológica"
            onRestore={(entry) => {
              const d = entry.details as any;
              if (d.instrumento) setInstrumento(d.instrumento);
            }}
          />
        </div>
      </div>

      <HistoryConsentBanner consent={consent} setConsent={setConsent} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4">
              <Label>Nome do Paciente (opcional)</Label>
              <Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Ex: João Silva" className="mt-1" />
            </div>

            <Tabs value={instrumento} onValueChange={setInstrumento}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="arms">ARMS</TabsTrigger>
                <TabsTrigger value="moatt">MOATT</TabsTrigger>
                <TabsTrigger value="morisky">Morisky</TabsTrigger>
                <TabsTrigger value="aqt">AQT</TabsTrigger>
              </TabsList>

              {/* ARMS */}
              <TabsContent value="arms" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Escala ARMS — 12 itens. Responda de 1 (nunca) a 4 (sempre).
                </p>
                {ARMS_ITEMS.map((item, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <p className="text-sm mb-2">{i + 1}. {item}</p>
                    <RadioGroup
                      value={String(armsAnswers[i])}
                      onValueChange={v => {
                        const next = [...armsAnswers];
                        next[i] = Number(v);
                        setArmsAnswers(next);
                      }}
                      className="flex gap-4"
                    >
                      {[1, 2, 3, 4].map(v => (
                        <div key={v} className="flex items-center gap-1">
                          <RadioGroupItem value={String(v)} id={`arms-${i}-${v}`} />
                          <Label htmlFor={`arms-${i}-${v}`} className="text-xs">{v}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </TabsContent>

              {/* MOATT */}
              <TabsContent value="moatt" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  MASCC MOATT — Checklist de competências. Marque os itens que o paciente demonstra.
                </p>
                {MOATT_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Switch
                      checked={moattChecks[i]}
                      onCheckedChange={v => {
                        const next = [...moattChecks];
                        next[i] = v;
                        setMoattChecks(next);
                      }}
                    />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </TabsContent>

              {/* Morisky */}
              <TabsContent value="morisky" className="mt-4 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <Label className="text-sm font-medium">Versão:</Label>
                  <RadioGroup value={moriskyType} onValueChange={v => setMoriskyType(v as any)} className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="mmas4" id="mmas4" />
                      <Label htmlFor="mmas4" className="text-sm">MMAS-4</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="mmas8" id="mmas8" />
                      <Label htmlFor="mmas8" className="text-sm">MMAS-8</Label>
                    </div>
                  </RadioGroup>
                </div>
                {(moriskyType === "mmas4" ? MMAS4_ITEMS : MMAS8_ITEMS).map((item, i) => {
                  const answers = moriskyType === "mmas4" ? mmas4 : mmas8;
                  const setter = moriskyType === "mmas4" ? setMmas4 : setMmas8;
                  const isLast8 = moriskyType === "mmas8" && i === 7;
                  return (
                    <div key={i} className="p-3 rounded-lg border border-border">
                      <p className="text-sm mb-2">{i + 1}. {item}</p>
                      {isLast8 ? (
                        <RadioGroup
                          value={String(answers[i])}
                          onValueChange={v => { const n = [...answers]; n[i] = Number(v); setter(n); }}
                          className="flex flex-wrap gap-3"
                        >
                          {[
                            { v: 0, l: "Nunca" }, { v: 1, l: "Quase nunca" },
                            { v: 2, l: "Às vezes" }, { v: 3, l: "Frequentemente" }, { v: 4, l: "Sempre" }
                          ].map(opt => (
                            <div key={opt.v} className="flex items-center gap-1">
                              <RadioGroupItem value={String(opt.v)} id={`m8-${i}-${opt.v}`} />
                              <Label htmlFor={`m8-${i}-${opt.v}`} className="text-xs">{opt.l}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <RadioGroup
                          value={String(answers[i])}
                          onValueChange={v => { const n = [...answers]; n[i] = Number(v); setter(n); }}
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="1" id={`m-${i}-s`} />
                            <Label htmlFor={`m-${i}-s`} className="text-xs">Sim</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="0" id={`m-${i}-n`} />
                            <Label htmlFor={`m-${i}-n`} className="text-xs">Não</Label>
                          </div>
                        </RadioGroup>
                      )}
                    </div>
                  );
                })}
              </TabsContent>

              {/* AQT */}
              <TabsContent value="aqt" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  AQT — Questionário de Adesão à Terapia-Alvo. Responda Sim ou Não.
                </p>
                {AQT_ITEMS.map((item, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <p className="text-sm mb-2">{i + 1}. {item}</p>
                    <RadioGroup
                      value={String(aqtAnswers[i])}
                      onValueChange={v => { const n = [...aqtAnswers]; n[i] = Number(v); setAqtAnswers(n); }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="1" id={`aqt-${i}-s`} />
                        <Label htmlFor={`aqt-${i}-s`} className="text-xs">Sim</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="0" id={`aqt-${i}-n`} />
                        <Label htmlFor={`aqt-${i}-n`} className="text-xs">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <Button className="w-full mt-6" onClick={calcular}>
              Avaliar Adesão
            </Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {resultado ? (
            <>
              <RiskGauge
                value={instrumento === "moatt" ? gaugeValue : (100 - gaugeValue)}
                maxValue={100}
                label={resultado.faixa}
                sublabel={`${resultado.score}/${resultado.maxScore} pontos`}
                color={resultado.cor}
              />

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Condutas Farmacêuticas</h3>
                <ul className="space-y-2.5">
                  {resultado.condutas.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: resultado.cor }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={gerarPDF}>
                <FileText className="h-4 w-4" />
                Gerar Relatório PDF
              </Button>

              <ClinicalReferences references={CALCULATOR_REFERENCES[SLUG]} />
              <RelatedCalculators currentSlug={SLUG} />
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecione um instrumento, preencha os dados e clique em <strong>Avaliar Adesão</strong>.
              </p>
            </div>
          )}

          {/* Risk scale */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Escala de Risco</h3>
            <div className="space-y-2">
              {[
                { label: "Alta Adesão", color: "hsl(142 71% 45%)" },
                { label: "Adesão Moderada", color: "hsl(38 92% 50%)" },
                { label: "Baixa Adesão", color: "hsl(0 72% 51%)" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Autor: Sérgio Araújo • Posologia Produções
          </p>
        </div>
      </div>
    </div>
  );
}
