import { useState } from "react";
import { ArrowLeft, FileText, Activity, AlertTriangle } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory, HistoryConsentBanner } from "@/components/CalculationHistory";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";

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
  percentual: number;
  faixa: string;
  cor: string;
  recomendacoes: string[];
}

/* ─── CARG Toxicity Score ─── */
function calcCARG(data: Record<string, string>): Resultado {
  let score = 0;
  // Age ≥ 72
  if (Number(data.idade) >= 72) score += 2;
  // Cancer type: GI/GU
  if (data.tipoTumor === "gi_gu") score += 2;
  // Planned treatment ≥ 1 drug
  if (Number(data.numDrogas) >= 2) score += 1;
  // Hemoglobin < 11 (men) or < 10 (women)
  if (data.hemoglobina && Number(data.hemoglobina) < 11) score += 3;
  // CrCl < 34
  if (data.clcr && Number(data.clcr) < 34) score += 3;
  // Hearing: fair or worse
  if (data.audicao === "ruim") score += 2;
  // ≥ 1 fall in last 6 months
  if (data.quedas === "1") score += 3;
  // Limited walking (1 block or less)
  if (data.caminhadaLimitada === "1") score += 2;
  // Decreased social activities
  if (data.atividadeSocial === "1") score += 1;
  // Assistance needed with medications
  if (data.assistenciaMed === "1") score += 1;

  const maxScore = 23;
  let percentual = 0, faixa = "", cor = "";
  if (score <= 5) { percentual = 30; faixa = "Baixo Risco (30% toxicidade G3-5)"; cor = "hsl(142 71% 45%)"; }
  else if (score <= 9) { percentual = 52; faixa = "Risco Intermediário (52% toxicidade G3-5)"; cor = "hsl(38 92% 50%)"; }
  else { percentual = 83; faixa = "Alto Risco (83% toxicidade G3-5)"; cor = "hsl(0 72% 51%)"; }

  const recomendacoes = score > 5
    ? [
        "Considerar redução de dose inicial (75-80%)",
        "Monitoramento semanal durante primeiro ciclo",
        "Avaliação geriátrica abrangente (AGA) recomendada",
        "Profilaxia com G-CSF se alto risco hematológico",
        "Revisar polifarmácia e interações",
      ]
    : ["Seguir protocolo padrão com monitoramento habitual", "Reavaliação a cada ciclo"];

  return { score, percentual, faixa, cor, recomendacoes };
}

/* ─── CRASH Score ─── */
function calcCRASH(data: Record<string, string>): Resultado {
  let hemaScore = 0, nonHemaScore = 0;

  // Hematologic: chemo toxicity + LDH + albumin + ECOG
  const chemoTox = Number(data.chemoToxHema || 0);
  hemaScore += chemoTox;
  if (data.ldh && Number(data.ldh) > 460) hemaScore += 1;
  if (data.albumina && Number(data.albumina) < 3.5) hemaScore += 1;
  if (Number(data.ecog) >= 2) hemaScore += 1;

  // Non-hematologic: chemo toxicity + ECOG + IADL + MMS + albumin + diastolic BP
  const chemoToxNH = Number(data.chemoToxNonHema || 0);
  nonHemaScore += chemoToxNH;
  if (Number(data.ecog) >= 2) nonHemaScore += 1;
  if (data.iadl && Number(data.iadl) < 26) nonHemaScore += 1;
  if (data.miniMental && Number(data.miniMental) < 30) nonHemaScore += 1;
  if (data.albumina && Number(data.albumina) < 3.5) nonHemaScore += 1;
  if (data.padiastolica && Number(data.padiastolica) > 72) nonHemaScore += 1;

  const score = hemaScore + nonHemaScore;
  let percentual = 0, faixa = "", cor = "";
  if (score <= 3) { percentual = 20; faixa = "Baixo Risco"; cor = "hsl(142 71% 45%)"; }
  else if (score <= 6) { percentual = 50; faixa = "Risco Intermediário-Baixo"; cor = "hsl(50 90% 50%)"; }
  else if (score <= 9) { percentual = 65; faixa = "Risco Intermediário-Alto"; cor = "hsl(38 92% 50%)"; }
  else { percentual = 80; faixa = "Alto Risco"; cor = "hsl(0 72% 51%)"; }

  return {
    score, percentual, faixa, cor,
    recomendacoes: [
      `Sub-score Hematológico: ${hemaScore}`,
      `Sub-score Não-Hematológico: ${nonHemaScore}`,
      ...(score > 6
        ? ["Considerar esquema menos tóxico", "Monitoramento intensivo", "Suporte profilático (G-CSF, antieméticos)", "Avaliação geriátrica recomendada"]
        : ["Seguir protocolo padrão", "Monitoramento habitual"]),
    ],
  };
}

/* ─── HFA-ICOS (ESC Cardio-Oncology) ─── */
function calcHFAICOS(data: Record<string, string>): Resultado {
  let score = 0;

  // Baseline CV risk factors
  if (Number(data.idade) >= 65) score += 1;
  if (data.hipertensao === "1") score += 1;
  if (data.diabetes === "1") score += 1;
  if (data.tabagismo === "1") score += 1;
  if (data.dislipidemia === "1") score += 1;
  if (data.obesidade === "1") score += 1;
  // Previous CV disease
  if (data.doencaCV === "1") score += 2;
  // Previous cardiotoxic treatment
  if (data.txCardiotoxPrevia === "1") score += 2;
  // Biomarkers
  if (data.troponinaBNP === "1") score += 1;
  // FEVE
  if (data.feve && Number(data.feve) < 50) score += 2;

  // Drug risk category
  const drugRisk = data.riscoFarmaco || "baixo";
  if (drugRisk === "alto") score += 3;
  else if (drugRisk === "moderado") score += 2;
  else score += 1;

  let faixa = "", cor = "", percentual = 0;
  if (score <= 3) { faixa = "Baixo Risco de Cardiotoxicidade"; cor = "hsl(142 71% 45%)"; percentual = 15; }
  else if (score <= 6) { faixa = "Risco Moderado"; cor = "hsl(38 92% 50%)"; percentual = 40; }
  else if (score <= 9) { faixa = "Alto Risco"; cor = "hsl(20 90% 48%)"; percentual = 65; }
  else { faixa = "Muito Alto Risco"; cor = "hsl(0 72% 51%)"; percentual = 85; }

  const recomendacoes = score <= 3
    ? ["Ecocardiograma basal e a cada 4 ciclos", "Monitorar PA e biomarcadores", "Seguir protocolo padrão"]
    : score <= 6
    ? ["Ecocardiograma basal, 3 e 6 meses", "NT-proBNP e troponina a cada ciclo", "IECA/BRA profilático se FEVE limítrofe", "Otimizar fatores de risco CV"]
    : ["Avaliação cardio-oncológica antes do início", "Ecocardiograma com strain (GLS) basal e mensal", "Troponina e NT-proBNP a cada ciclo", "Cardioproteção com IECA/BRA + betabloqueador", "Considerar dexrazoxano se antraciclina", "Monitoramento eletrocardiográfico seriado"];

  return { score, percentual, faixa, cor, recomendacoes };
}

export default function ToxicidadeAntineoplasicos() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const SLUG = "toxicidade-antineoplasicos";
  const { hasConsent, saveCalculation } = useCalculationHistory();

  const [instrumento, setInstrumento] = useState("carg");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const updateField = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }));

  function calcular() {
    let res: Resultado;
    if (instrumento === "carg") res = calcCARG(data);
    else if (instrumento === "crash") res = calcCRASH(data);
    else res = calcHFAICOS(data);

    setResultado(res);

    if (hasConsent) {
      saveCalculation({
        calculatorName: "Toxicidade Antineoplásicos",
        calculatorSlug: SLUG,
        summary: `${instrumento.toUpperCase()}: ${res.score} — ${res.faixa}`,
        details: { instrumento, score: String(res.score), faixa: res.faixa },
        patientName: nomePaciente || undefined,
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  function gerarPDF() {
    if (!resultado) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(sanitizePDF("Predicao de Reacoes Adversas a Antineoplasicos"), 20, 20);
    doc.setFontSize(11);
    if (nomePaciente) doc.text(sanitizePDF(`Paciente: ${nomePaciente}`), 20, 30);
    doc.text(sanitizePDF(`Instrumento: ${instrumento.toUpperCase()}`), 20, nomePaciente ? 38 : 30);
    doc.text(sanitizePDF(`Score: ${resultado.score}`), 20, nomePaciente ? 46 : 38);
    doc.text(sanitizePDF(`Classificacao: ${resultado.faixa}`), 20, nomePaciente ? 54 : 46);
    let y = nomePaciente ? 66 : 58;
    doc.setFontSize(12);
    doc.text("Recomendacoes:", 20, y); y += 8;
    doc.setFontSize(10);
    resultado.recomendacoes.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(sanitizePDF(`- ${r}`), 24, y); y += 6;
    });
    doc.setFontSize(8);
    doc.text(sanitizePDF("Gerado por Posologia Producoes"), 20, 285);
    doc.save("toxicidade-antineoplasicos.pdf");
  }

  const YesNoField = ({ label, field }: { label: string; field: string }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <span className="text-sm">{label}</span>
      <RadioGroup value={data[field] || ""} onValueChange={v => updateField(field, v)} className="flex gap-3">
        <div className="flex items-center gap-1">
          <RadioGroupItem value="1" id={`${field}-s`} />
          <Label htmlFor={`${field}-s`} className="text-xs">Sim</Label>
        </div>
        <div className="flex items-center gap-1">
          <RadioGroupItem value="0" id={`${field}-n`} />
          <Label htmlFor={`${field}-n`} className="text-xs">Não</Label>
        </div>
      </RadioGroup>
    </div>
  );

  const NumberField = ({ label, field, placeholder, unit }: { label: string; field: string; placeholder?: string; unit?: string }) => (
    <div>
      <Label className="text-sm">{label}{unit ? ` (${unit})` : ""}</Label>
      <Input
        type="number"
        value={data[field] || ""}
        onChange={e => updateField(field, e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );

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
              <Activity className="h-6 w-6 text-primary" />
              Predição de Reações Adversas a Antineoplásicos
            </h1>
            <p className="text-sm text-muted-foreground">CARG • CRASH • HFA-ICOS (ESC)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareToolButton toolSlug={SLUG} toolName="Toxicidade Antineoplásicos" />
          <AdminPromptViewer toolSlug={SLUG} systemPrompt={getNativePrompt(SLUG)} />
          <CalculationHistory
            history={history}
            calculatorName="Toxicidade Antineoplásicos"
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
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4">
              <Label>Nome do Paciente (opcional)</Label>
              <Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Ex: Maria Santos" className="mt-1" />
            </div>

            <Tabs value={instrumento} onValueChange={v => { setInstrumento(v); setResultado(null); }}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="carg">CARG</TabsTrigger>
                <TabsTrigger value="crash">CRASH</TabsTrigger>
                <TabsTrigger value="hfa-icos">HFA-ICOS</TabsTrigger>
              </TabsList>

              {/* CARG */}
              <TabsContent value="carg" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Escore CARG — Predição de toxicidade grau 3-5 em idosos oncológicos (Hurria et al., 2011).
                </p>
                <NumberField label="Idade" field="idade" placeholder="Ex: 75" unit="anos" />
                <div>
                  <Label className="text-sm">Tipo de tumor</Label>
                  <Select value={data.tipoTumor || ""} onValueChange={v => updateField("tipoTumor", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gi_gu">Gastrointestinal / Geniturinário</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumberField label="Número de drogas no esquema" field="numDrogas" placeholder="Ex: 2" />
                <NumberField label="Hemoglobina" field="hemoglobina" placeholder="Ex: 10.5" unit="g/dL" />
                <NumberField label="Clearance de creatinina" field="clcr" placeholder="Ex: 45" unit="mL/min" />
                <div>
                  <Label className="text-sm">Audição</Label>
                  <Select value={data.audicao || ""} onValueChange={v => updateField("audicao", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boa">Boa / Normal</SelectItem>
                      <SelectItem value="ruim">Regular / Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <YesNoField label="≥ 1 queda nos últimos 6 meses?" field="quedas" />
                <YesNoField label="Caminhada limitada (≤ 1 quarteirão)?" field="caminhadaLimitada" />
                <YesNoField label="Diminuição de atividades sociais?" field="atividadeSocial" />
                <YesNoField label="Precisa de ajuda para tomar medicamentos?" field="assistenciaMed" />
              </TabsContent>

              {/* CRASH */}
              <TabsContent value="crash" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Escore CRASH — Avaliação de risco quimioterápico em idosos (Extermann et al., 2012).
                </p>
                <div>
                  <Label className="text-sm">Toxicidade hematológica do esquema (MAX2 index)</Label>
                  <Select value={data.chemoToxHema || ""} onValueChange={v => updateField("chemoToxHema", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Baixa (0)</SelectItem>
                      <SelectItem value="1">Moderada (1)</SelectItem>
                      <SelectItem value="2">Alta (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Toxicidade não-hematológica do esquema (MAX2)</Label>
                  <Select value={data.chemoToxNonHema || ""} onValueChange={v => updateField("chemoToxNonHema", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Baixa (0)</SelectItem>
                      <SelectItem value="1">Moderada (1)</SelectItem>
                      <SelectItem value="2">Alta (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumberField label="LDH" field="ldh" placeholder="Ex: 500" unit="U/L" />
                <NumberField label="Albumina" field="albumina" placeholder="Ex: 3.2" unit="g/dL" />
                <div>
                  <Label className="text-sm">ECOG Performance Status</Label>
                  <Select value={data.ecog || ""} onValueChange={v => updateField("ecog", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Atividade normal</SelectItem>
                      <SelectItem value="1">1 - Sintomas leves</SelectItem>
                      <SelectItem value="2">2 - Acamado &lt; 50% do dia</SelectItem>
                      <SelectItem value="3">3 - Acamado &gt; 50% do dia</SelectItem>
                      <SelectItem value="4">4 - Acamado 100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumberField label="IADL (Lawton)" field="iadl" placeholder="Ex: 24" unit="pontos" />
                <NumberField label="Mini-Mental (MEEM)" field="miniMental" placeholder="Ex: 28" unit="pontos" />
                <NumberField label="PA Diastólica" field="padiastolica" placeholder="Ex: 80" unit="mmHg" />
              </TabsContent>

              {/* HFA-ICOS */}
              <TabsContent value="hfa-icos" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  HFA-ICOS (ESC 2022) — Estratificação de risco de cardiotoxicidade por antineoplásicos.
                </p>
                <NumberField label="Idade" field="idade" placeholder="Ex: 68" unit="anos" />
                <YesNoField label="Hipertensão arterial?" field="hipertensao" />
                <YesNoField label="Diabetes mellitus?" field="diabetes" />
                <YesNoField label="Tabagismo ativo?" field="tabagismo" />
                <YesNoField label="Dislipidemia?" field="dislipidemia" />
                <YesNoField label="Obesidade (IMC ≥ 30)?" field="obesidade" />
                <YesNoField label="Doença cardiovascular prévia?" field="doencaCV" />
                <YesNoField label="Tratamento cardiotóxico prévio?" field="txCardiotoxPrevia" />
                <YesNoField label="Troponina ou BNP elevados?" field="troponinaBNP" />
                <NumberField label="FEVE basal" field="feve" placeholder="Ex: 55" unit="%" />
                <div>
                  <Label className="text-sm">Risco do fármaco antineoplásico</Label>
                  <Select value={data.riscoFarmaco || ""} onValueChange={v => updateField("riscoFarmaco", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alto">Alto (antraciclinas, trastuzumabe)</SelectItem>
                      <SelectItem value="moderado">Moderado (TKI, fluoropirimidinas)</SelectItem>
                      <SelectItem value="baixo">Baixo (anti-PD1, taxanos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <Button className="w-full mt-6" onClick={calcular}>
              Calcular Risco de Toxicidade
            </Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {resultado ? (
            <>
              <RiskGauge
                value={resultado.percentual}
                maxValue={100}
                label={resultado.faixa}
                sublabel={`Score: ${resultado.score}`}
                color={resultado.cor}
              />

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Recomendações de Monitoramento</h3>
                <ul className="space-y-2.5">
                  {resultado.recomendacoes.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: resultado.cor }} />
                      {r}
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
                Selecione um instrumento, preencha os dados e clique em <strong>Calcular Risco</strong>.
              </p>
            </div>
          )}

          {/* Risk scale */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Escala de Risco</h3>
            <div className="space-y-2">
              {[
                { label: "Baixo", color: "hsl(142 71% 45%)" },
                { label: "Moderado", color: "hsl(38 92% 50%)" },
                { label: "Alto", color: "hsl(20 90% 48%)" },
                { label: "Muito Alto", color: "hsl(0 72% 51%)" },
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
