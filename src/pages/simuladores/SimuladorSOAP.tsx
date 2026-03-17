import { useState, useEffect } from "react";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, User, ClipboardList, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

interface SOAPKeywords {
  subjetivo: string[];
  objetivo: string[];
  avaliacao: string[];
  plano: string[];
}

interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; diseases: string[] };
  scenario: string;
  prescription: { drug: string; dose: string; route: string; frequency: string }[];
  labs?: Record<string, string>;
  vitalSigns?: Record<string, string>;
  keywords: SOAPKeywords;
  modelAnswer: { subjetivo: string; objetivo: string; avaliacao: string; plano: string };
}

interface UserSOAP {
  subjetivo: string; objetivo: string; avaliacao: string; plano: string;
}

const BUILT_IN_CASES: CaseData[] = [
  {
    title: "Caso 1: Hipertensa com Tontura", difficulty: "Fácil",
    patient: { name: "Dona Antônia", age: 68, weight: 72, sex: "Feminino", diseases: ["HAS", "DM2"] },
    scenario: "Paciente relata tonturas ao levantar e cefaleia vespertina há 2 semanas. Em uso de Anlodipino 10mg 1x/dia, Metformina 850mg 2x/dia e Losartana 50mg 2x/dia. PA: 100/60 mmHg (sentada), 85/55 mmHg (em pé). FC: 78 bpm. Glicemia de jejum: 110 mg/dL. HbA1c: 7.2%. Cr: 0.9 mg/dL.",
    prescription: [
      { drug: "Anlodipino", dose: "10mg", route: "VO", frequency: "1x/dia" },
      { drug: "Metformina", dose: "850mg", route: "VO", frequency: "12/12h" },
      { drug: "Losartana", dose: "50mg", route: "VO", frequency: "12/12h" },
    ],
    labs: { "Glicemia jejum": "110 mg/dL", "HbA1c": "7.2%", "Creatinina": "0.9 mg/dL" },
    vitalSigns: { "PA sentada": "100/60 mmHg", "PA em pé": "85/55 mmHg", "FC": "78 bpm" },
    keywords: {
      subjetivo: ["tontura", "levantar", "cefaleia", "2 semanas", "vespertina"],
      objetivo: ["100/60", "85/55", "hipotensão ortostática", "110", "7.2", "0.9", "78 bpm"],
      avaliacao: ["hipotensão ortostática", "anti-hipertensivo", "anlodipino", "excesso", "dose", "queda", "risco"],
      plano: ["reduzir", "anlodipino", "5mg", "monitorar", "PA", "orientar", "levantar devagar", "retorno"],
    },
    modelAnswer: {
      subjetivo: "Paciente de 68 anos, feminino, com HAS e DM2, relata tonturas ao levantar-se e cefaleia vespertina há 2 semanas. Nega outros sintomas. Em uso regular de Anlodipino 10mg, Metformina 850mg 12/12h e Losartana 50mg 12/12h.",
      objetivo: "PA sentada: 100/60 mmHg. PA em pé: 85/55 mmHg (queda > 20/10 mmHg = hipotensão ortostática). FC: 78 bpm. Glicemia jejum: 110 mg/dL. HbA1c: 7.2%. Creatinina: 0.9 mg/dL.",
      avaliacao: "Hipotensão ortostática sintomática provavelmente induzida por anti-hipertensivos. O Anlodipino 10mg pode estar contribuindo para a hipotensão excessiva. DM2 com controle aceitável. Função renal preservada. Risco de quedas em idosa.",
      plano: "1) Reduzir Anlodipino de 10mg para 5mg. 2) Manter Losartana e Metformina nas doses atuais. 3) Orientar a levantar-se devagar e hidratar-se adequadamente. 4) Monitorar PA em domicílio por 7 dias. 5) Retorno em 2 semanas para reavaliação.",
    },
  },
  {
    title: "Caso 2: Idoso com Polifarmácia", difficulty: "Médio",
    patient: { name: "Sr. José Carlos", age: 82, weight: 68, sex: "Masculino", diseases: ["ICC classe II", "FA crônica", "DPOC", "Osteoartrite"] },
    scenario: "Paciente queixa-se de inchaço nos tornozelos e falta de ar ao subir escadas, piorando há 1 mês. Relata também azia frequente e constipação. Medicações: Carvedilol 25mg 12/12h, Furosemida 40mg/dia, Varfarina 5mg/dia, Salbutamol spray SOS, Ibuprofeno 400mg 8/8h (automedicação para dor no joelho), Omeprazol 20mg/dia. PA: 130/80 mmHg. FC: 62 bpm irregular. SpO2: 93%. Edema +2/+4 MMII. INR: 4.8. K+: 3.2 mEq/L. Cr: 1.4 mg/dL.",
    prescription: [
      { drug: "Carvedilol", dose: "25mg", route: "VO", frequency: "12/12h" },
      { drug: "Furosemida", dose: "40mg", route: "VO", frequency: "1x/dia" },
      { drug: "Varfarina", dose: "5mg", route: "VO", frequency: "1x/dia" },
      { drug: "Salbutamol spray", dose: "200mcg", route: "Inalatória", frequency: "SOS" },
      { drug: "Ibuprofeno", dose: "400mg", route: "VO", frequency: "8/8h" },
      { drug: "Omeprazol", dose: "20mg", route: "VO", frequency: "1x/dia" },
    ],
    labs: { "INR": "4.8", "K+": "3.2 mEq/L", "Cr": "1.4 mg/dL" },
    vitalSigns: { "PA": "130/80 mmHg", "FC": "62 bpm (irregular)", "SpO2": "93%", "Edema": "+2/+4 MMII" },
    keywords: {
      subjetivo: ["inchaço", "tornozelos", "falta de ar", "escadas", "1 mês", "azia", "constipação", "automedicação", "ibuprofeno", "dor joelho"],
      objetivo: ["130/80", "62 bpm", "irregular", "93%", "edema", "INR", "4.8", "3.2", "1.4", "hipocalemia"],
      avaliacao: ["INR elevado", "sangramento", "ibuprofeno", "interação", "varfarina", "nefrotoxicidade", "ICC", "descompensação", "hipocalemia", "furosemida", "DPOC", "beta-bloqueador"],
      plano: ["suspender ibuprofeno", "paracetamol", "reduzir varfarina", "INR", "repor potássio", "KCl", "reavaliar furosemida", "espironolactona", "monitorar", "retorno"],
    },
    modelAnswer: {
      subjetivo: "Paciente de 82 anos, masculino, com ICC classe II, FA crônica, DPOC e osteoartrite. Queixa-se de inchaço nos tornozelos e dispneia aos esforços (subir escadas) há 1 mês, com piora progressiva. Relata azia frequente e constipação. Refere automedicação com Ibuprofeno 400mg 8/8h para dor no joelho.",
      objetivo: "PA: 130/80 mmHg. FC: 62 bpm, ritmo irregular. SpO2: 93%. Edema +2/+4 em MMII. INR: 4.8 (acima da faixa terapêutica 2-3). K+: 3.2 mEq/L (hipocalemia). Cr: 1.4 mg/dL.",
      avaliacao: "1) INR supratherapêutico (4.8) — provável interação Ibuprofeno × Varfarina (inibição de CYP2C9 e deslocamento de ligação proteica) com risco de sangramento. 2) Descompensação de ICC — edema e dispneia podem estar sendo agravados pelo Ibuprofeno (retenção de sódio e água, nefrotoxicidade). 3) Hipocalemia (K+ 3.2) — provavelmente por Furosemida sem suplementação ou poupador de potássio. 4) DPOC: Carvedilol (beta-bloqueador não seletivo) pode agravar broncoespasmo, porém na ICC é indicado com cautela.",
      plano: "1) Suspender Ibuprofeno imediatamente. Substituir por Paracetamol 500mg 6/6h para dor. 2) Suspender Varfarina temporariamente até INR < 3; reiniciar com dose reduzida (ex: 2.5mg). 3) Repor K+ com KCl 600mg 12/12h; considerar adicionar Espironolactona 25mg/dia (benefício na ICC + poupador de K+). 4) Monitorar INR em 48-72h e Cr em 7 dias. 5) Retorno em 1 semana.",
    },
  },
  {
    title: "Caso 3: Gestante com ITU", difficulty: "Difícil",
    patient: { name: "Ana Beatriz", age: 28, weight: 65, sex: "Feminino", diseases: ["Gestação 24 semanas", "ITU de repetição", "Asma leve intermitente"] },
    scenario: "Gestante de 24 semanas, G2P1, com queixa de disúria, polaciúria e dor lombar há 3 dias. Tem histórico de ITU tratada no 1º trimestre com Nitrofurantoína. Apresenta febre (38.2°C). Urocultura prévia: E. coli sensível a Cefalosporinas, Nitrofurantoína e resistente a Sulfametoxazol+Trimetoprima. Prescrição atual: Ciprofloxacino 500mg 12/12h por 7 dias, Dipirona 1g 6/6h se febre, Buscopan composto (escopolamina + dipirona) SOS. Cr: 0.7 mg/dL. Hemograma: leucocitose com desvio à esquerda. EAS: piúria, bacteriúria.",
    prescription: [
      { drug: "Ciprofloxacino", dose: "500mg", route: "VO", frequency: "12/12h (7 dias)" },
      { drug: "Dipirona", dose: "1g", route: "VO", frequency: "6/6h (se febre)" },
      { drug: "Buscopan Composto", dose: "1cp", route: "VO", frequency: "SOS" },
    ],
    labs: { "Cr": "0.7 mg/dL", "Leucócitos": "14.000 (desvio E)", "EAS": "Piúria, bacteriúria +++", "Urocultura": "E. coli (R: SMX-TMP; S: Cefalosporinas, Nitrofurantoína)" },
    vitalSigns: { "Temp": "38.2°C", "PA": "110/70 mmHg", "FC": "92 bpm" },
    keywords: {
      subjetivo: ["disúria", "polaciúria", "dor lombar", "3 dias", "gestante", "24 semanas", "ITU prévia", "febre"],
      objetivo: ["38.2", "leucocitose", "desvio", "piúria", "bacteriúria", "E. coli", "sensível cefalosporina", "resistente SMX-TMP", "0.7"],
      avaliacao: ["ciprofloxacino", "contraindicado", "gestação", "fluoroquinolona", "teratogenicidade", "artropatia fetal", "pielonefrite", "febre", "dor lombar", "nitrofurantoína", "3º trimestre", "contraindicada", "cefalosporina"],
      plano: ["suspender ciprofloxacino", "cefalexina", "500mg", "6/6h", "7 dias", "ceftriaxona", "paracetamol", "hidratação", "urocultura controle", "pré-natal", "monitorar"],
    },
    modelAnswer: {
      subjetivo: "Gestante de 28 anos, 24 semanas (G2P1), com histórico de ITU no 1º trimestre tratada com Nitrofurantoína. Queixa-se de disúria, polaciúria e dor lombar há 3 dias, com febre. Relata uso de Buscopan Composto por conta própria para cólicas.",
      objetivo: "Temp: 38.2°C. PA: 110/70 mmHg. FC: 92 bpm. Leucócitos: 14.000 com desvio à esquerda. EAS: piúria e bacteriúria +++. Urocultura: E. coli sensível a Cefalosporinas e Nitrofurantoína, resistente a SMX-TMP. Cr: 0.7 mg/dL.",
      avaliacao: "1) Pielonefrite aguda na gestação (febre + dor lombar + piúria) — risco de complicações obstétricas. 2) Ciprofloxacino é CONTRAINDICADO na gestação (Categoria C/D — risco de artropatia fetal e dano à cartilagem). 3) Nitrofurantoína contraindicada no 3º trimestre (risco de anemia hemolítica neonatal), mas segura no 2º trimestre — porém, na pielonefrite (infecção alta), não é adequada (baixa concentração sérica). 4) Dipirona: uso controverso na gestação; Paracetamol é preferido como antipirético de primeira linha.",
      plano: "1) Suspender Ciprofloxacino imediatamente. 2) Iniciar Cefalexina 500mg VO 6/6h por 7-10 dias (se quadro leve) OU Ceftriaxona 1g IV 1x/dia (se sinais de sepse/pielonefrite complicada — considerar internação). 3) Substituir Dipirona por Paracetamol 750mg 6/6h se febre/dor. 4) Hidratação oral vigorosa. 5) Urocultura de controle em 7 dias após término do antibiótico. 6) Acompanhamento pré-natal de alto risco com vigilância fetal.",
    },
  },
];

const SECTION_LABELS: Record<keyof SOAPKeywords, { label: string; hint: string; icon: string }> = {
  subjetivo: { label: "S — Subjetivo", hint: "Queixas do paciente, história da doença atual, sintomas relatados, medicamentos em uso", icon: "🗣️" },
  objetivo: { label: "O — Objetivo", hint: "Dados clínicos mensuráveis: sinais vitais, exames laboratoriais, exame físico", icon: "📋" },
  avaliacao: { label: "A — Avaliação", hint: "Análise farmacoterapêutica: PRMs identificados, interações, adequação de doses, diagnóstico diferencial", icon: "🧠" },
  plano: { label: "P — Plano", hint: "Intervenções propostas: ajustes de medicação, monitoramento, orientações ao paciente, encaminhamentos", icon: "📝" },
};

function scoreSection(userText: string, keywords: string[]): { score: number; found: string[]; missed: string[] } {
  const normalizedUser = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found: string[] = [];
  const missed: string[] = [];
  keywords.forEach(kw => {
    const normalizedKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedUser.includes(normalizedKw)) found.push(kw);
    else missed.push(kw);
  });
  return { score: keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 0, found, missed };
}

export default function SimuladorSOAP() {
  const SLUG = "metodo-soap";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, BUILT_IN_CASES);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVRCase, goBack, submitResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);
  const [screen, setScreen] = useState<"dashboard" | "sim" | "report">("dashboard");

  useEffect(() => {
    if (isVirtualRoom && screen === "report") {
      const t = setTimeout(() => goBack(), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, screen, goBack]);
  const [caseIdx, setCaseIdx] = useState(0);
  const [userSOAP, setUserSOAP] = useState<UserSOAP>({ subjetivo: "", objetivo: "", avaliacao: "", plano: "" });
  const [activeTab, setActiveTab] = useState<string>("subjetivo");
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  if (isVirtualRoom && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    setScreen("sim");
  }

  const currentCase = isVirtualRoom && virtualRoomCase ? virtualRoomCase as CaseData : (allCases[caseIdx] as CaseData | undefined);

  const startCase = (i: number) => {
    setCaseIdx(i);
    setUserSOAP({ subjetivo: "", objetivo: "", avaliacao: "", plano: "" });
    setActiveTab("subjetivo");
    setExpandedFeedback(new Set());
    setScreen("sim");
  };

  const allFilled = Object.values(userSOAP).every(v => v.trim().length > 10);

  const getScores = () => {
    if (!currentCase) return { sections: [], totalScore: 0 };
    const sections = (Object.keys(SECTION_LABELS) as (keyof SOAPKeywords)[]).map(key => {
      const result = scoreSection(userSOAP[key], currentCase.keywords[key]);
      return { key, ...result, modelAnswer: currentCase.modelAnswer[key] };
    });
    const totalScore = Math.round(sections.reduce((a, s) => a + s.score, 0) / 4);
    return { sections, totalScore };
  };

  if (loadingVRCase) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isVirtualRoom && screen === "dashboard") return null;

  // Dashboard
  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Simulador do Método SOAP</h1>
            <p className="text-muted-foreground">Treine a documentação clínica estruturada: Subjetivo, Objetivo, Avaliação e Plano</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Simulador SOAP" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any, i: number) => (
            c.isAI ? (
              <AICaseCard key={c.id || i} caseItem={c} onClick={() => startCase(i)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ) : (
              <NativeCaseCard key={c.id || i} caseItem={c} onClick={() => startCase(i)} />
            )
          ))}
          <Card className="border-dashed hover:shadow-lg transition-shadow cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="font-medium">{isGenerating ? "Gerando caso..." : "Gerar com IA"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentCase) return null;

  // Report
  if (screen === "report") {
    const { sections, totalScore } = getScores();
    return (
      <div className="max-w-4xl mx-auto">
        {isVirtualRoom ? (
          <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
        ) : (
          <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        )}
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório SOAP</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{totalScore}%</div>
              <p className="text-muted-foreground">Pontuação geral por cobertura de conceitos-chave</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${totalScore}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {sections.map(s => {
            const info = SECTION_LABELS[s.key];
            const expanded = expandedFeedback.has(s.key);
            return (
              <Card key={s.key} className={`border-l-4 ${s.score >= 70 ? "border-l-green-500" : s.score >= 40 ? "border-l-yellow-500" : "border-l-red-500"}`}>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedFeedback(p => { const n = new Set(p); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n; })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-semibold">{info.label}</span>
                      <Badge variant={s.score >= 70 ? "default" : s.score >= 40 ? "secondary" : "destructive"}>{s.score}%</Badge>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="text-sm space-y-3">
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400 mb-1">✅ Conceitos identificados ({s.found.length}):</p>
                      {s.found.length > 0 ? <p className="text-muted-foreground">{s.found.join(", ")}</p> : <p className="text-muted-foreground italic">Nenhum</p>}
                    </div>
                    {s.missed.length > 0 && (
                      <div>
                        <p className="font-medium text-red-600 dark:text-red-400 mb-1">❌ Conceitos ausentes ({s.missed.length}):</p>
                        <p className="text-muted-foreground">{s.missed.join(", ")}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <p className="font-medium mb-1">Sua resposta:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">{userSOAP[s.key] || "(vazio)"}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Resposta modelo:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap bg-primary/5 p-3 rounded border border-primary/20">{s.modelAnswer}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => startCase(caseIdx)}>Tentar Novamente</Button>
          {isVirtualRoom ? (
            <Button variant="outline" onClick={goBack}>Voltar à Home</Button>
          ) : (
            <Button variant="outline" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button>
          )}
        </div>
      </div>
    );
  }

  // Simulation
  return (
    <div className="max-w-7xl mx-auto">
      {examFeedback && examProgress && (
        <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={examFeedback.simulatorSlug} caseTitle={examFeedback.caseTitle} examProgress={examProgress} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />
      )}
      {isVirtualRoom ? (
        <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
      ) : (
        <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      )}
      <ExamBanner simulatorSlug={SLUG} caseTitle={currentCase?.title} examProgress={examProgress} />
      <h2 className="text-xl font-bold mb-4">{currentCase.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient & Scenario */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Caso Clínico</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{currentCase.patient.name}</strong></p>
            <p>{currentCase.patient.age} anos | {currentCase.patient.sex} | {currentCase.patient.weight}kg</p>
            <p className="font-medium">Doenças:</p>
            <ul className="list-disc list-inside">{currentCase.patient.diseases.map((d, i) => <li key={i}>{d}</li>)}</ul>
            <Separator />
            <p className="font-medium">Cenário:</p>
            <p className="text-muted-foreground">{currentCase.scenario}</p>
            {currentCase.prescription.length > 0 && (
              <>
                <Separator />
                <p className="font-medium">Prescrição:</p>
                {currentCase.prescription.map((p, i) => (
                  <p key={i} className="text-xs">• {p.drug} {p.dose} — {p.route} {p.frequency}</p>
                ))}
              </>
            )}
            {currentCase.vitalSigns && (
              <>
                <Separator />
                <p className="font-medium">Sinais Vitais:</p>
                {Object.entries(currentCase.vitalSigns).map(([k, v]) => <p key={k} className="text-xs">{k}: {v}</p>)}
              </>
            )}
            {currentCase.labs && (
              <>
                <Separator />
                <p className="font-medium">Exames:</p>
                {Object.entries(currentCase.labs).map(([k, v]) => <p key={k} className="text-xs">{k}: {v}</p>)}
              </>
            )}
          </CardContent>
        </Card>

        {/* SOAP Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" />Prontuário SOAP</CardTitle></CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  {(Object.keys(SECTION_LABELS) as (keyof SOAPKeywords)[]).map(key => (
                    <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                      {SECTION_LABELS[key].icon} {key.charAt(0).toUpperCase()}
                      {userSOAP[key].trim().length > 10 && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {(Object.keys(SECTION_LABELS) as (keyof SOAPKeywords)[]).map(key => (
                  <TabsContent key={key} value={key} className="mt-4">
                    <p className="text-sm font-medium mb-1">{SECTION_LABELS[key].label}</p>
                    <p className="text-xs text-muted-foreground mb-3">💡 {SECTION_LABELS[key].hint}</p>
                    <Textarea
                      value={userSOAP[key]}
                      onChange={e => setUserSOAP(p => ({ ...p, [key]: e.target.value }))}
                      rows={8}
                      placeholder={`Escreva aqui a seção "${key.charAt(0).toUpperCase() + key.slice(1)}" do prontuário...`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{userSOAP[key].length} caracteres</p>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!allFilled} onClick={() => {
          if (isVirtualRoom) {
            const { totalScore } = getScores();
            submitResults({ score: totalScore, actions: { userSOAP } });
          }
          setScreen("report");
        }}>
          <ClipboardList className="h-4 w-4 mr-2" />Finalizar SOAP
        </Button>
      </div>
    </div>
  );
}
