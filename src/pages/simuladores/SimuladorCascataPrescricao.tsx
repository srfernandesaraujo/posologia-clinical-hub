import { useState, useEffect } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, User, ArrowRight, CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

interface MedEntry {
  drug: string; dose: string; startDate: string; reason: string;
  isCascade: boolean;
  causedBy?: string; // drug name that caused the side effect
  sideEffect?: string; // the side effect that led to this prescription
}

interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; sex: string; diseases: string[] };
  medications: MedEntry[];
}

interface UserAnswer {
  isCascade: boolean | null;
  causedBy: string;
}

const BUILT_IN_CASES: CaseData[] = [
  {
    title: "Caso 1: Cascata Clássica – AINE", difficulty: "Fácil",
    patient: { name: "Dona Tereza", age: 72, sex: "Feminino", diseases: ["Osteoartrite", "HAS"] },
    medications: [
      { drug: "Anlodipino", dose: "5mg", startDate: "Jan/2024", reason: "HAS diagnosticada", isCascade: false },
      { drug: "Diclofenaco", dose: "50mg 8/8h", startDate: "Mar/2024", reason: "Dor articular intensa", isCascade: false },
      { drug: "Omeprazol", dose: "20mg/dia", startDate: "Abr/2024", reason: "Epigastralgia", isCascade: true, causedBy: "Diclofenaco", sideEffect: "Gastrite / epigastralgia por AINE" },
      { drug: "Furosemida", dose: "40mg/dia", startDate: "Mai/2024", reason: "Edema em MMII", isCascade: true, causedBy: "Diclofenaco", sideEffect: "Retenção hídrica por AINE (inibição de prostaglandinas renais)" },
      { drug: "KCl", dose: "600mg 12/12h", startDate: "Jun/2024", reason: "K+ 3.1 mEq/L", isCascade: true, causedBy: "Furosemida", sideEffect: "Hipocalemia por diurético de alça" },
    ],
  },
  {
    title: "Caso 2: Cascata Neuropsiquiátrica", difficulty: "Médio",
    patient: { name: "Sr. Antônio", age: 78, sex: "Masculino", diseases: ["Doença de Parkinson", "Depressão", "Insônia"] },
    medications: [
      { drug: "Levodopa/Carbidopa", dose: "250/25mg 8/8h", startDate: "Jan/2023", reason: "Doença de Parkinson", isCascade: false },
      { drug: "Sertralina", dose: "50mg/dia", startDate: "Mar/2023", reason: "Depressão", isCascade: false },
      { drug: "Metoclopramida", dose: "10mg 8/8h", startDate: "Jun/2023", reason: "Náuseas persistentes", isCascade: true, causedBy: "Sertralina", sideEffect: "Náuseas por ISRS" },
      { drug: "Biperideno", dose: "2mg 12/12h", startDate: "Ago/2023", reason: "Rigidez e tremor piorados", isCascade: true, causedBy: "Metoclopramida", sideEffect: "Piora dos sintomas parkinsonianos por antagonismo dopaminérgico" },
      { drug: "Zolpidem", dose: "10mg à noite", startDate: "Out/2023", reason: "Insônia", isCascade: false },
      { drug: "Donepezila", dose: "5mg/dia", startDate: "Jan/2024", reason: "Queixas de memória / confusão", isCascade: true, causedBy: "Biperideno", sideEffect: "Déficit cognitivo por anticolinérgico em idoso" },
    ],
  },
  {
    title: "Caso 3: Cascata Metabólica Complexa", difficulty: "Difícil",
    patient: { name: "Maria Helena", age: 65, sex: "Feminino", diseases: ["HAS", "DM2", "Dislipidemia", "Gota", "Osteoporose"] },
    medications: [
      { drug: "Losartana", dose: "50mg 12/12h", startDate: "2020", reason: "HAS", isCascade: false },
      { drug: "Metformina", dose: "850mg 12/12h", startDate: "2020", reason: "DM2", isCascade: false },
      { drug: "Hidroclorotiazida", dose: "25mg/dia", startDate: "Mar/2022", reason: "PA não controlada", isCascade: false },
      { drug: "Alopurinol", dose: "300mg/dia", startDate: "Jul/2022", reason: "Ácido úrico elevado (9.5 mg/dL)", isCascade: true, causedBy: "Hidroclorotiazida", sideEffect: "Hiperuricemia por tiazídico" },
      { drug: "Glibenclamida", dose: "5mg 12/12h", startDate: "Set/2022", reason: "Glicemia de jejum 160 mg/dL", isCascade: true, causedBy: "Hidroclorotiazida", sideEffect: "Hiperglicemia por tiazídico" },
      { drug: "Insulina NPH", dose: "10UI à noite", startDate: "Mar/2023", reason: "HbA1c 9% apesar de Glibenclamida", isCascade: true, causedBy: "Glibenclamida", sideEffect: "Falha terapêutica — sulfonilureia insuficiente; agravada pela resistência insulínica induzida pelo tiazídico" },
      { drug: "Carbonato de Cálcio + Vit D", dose: "500mg + 400UI 12/12h", startDate: "2021", reason: "Prevenção de osteoporose", isCascade: false },
      { drug: "Omeprazol", dose: "20mg/dia", startDate: "Jun/2023", reason: "Desconforto gástrico", isCascade: true, causedBy: "Carbonato de Cálcio + Vit D", sideEffect: "Dispepsia por cálcio oral (constipação e desconforto gástrico)" },
    ],
  },
];

export default function SimuladorCascataPrescricao() {
  const SLUG = "cascata-prescricao";
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
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(new Set());
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  if (isVirtualRoom && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    setScreen("sim");
  }

  const currentCase = isVirtualRoom && virtualRoomCase ? virtualRoomCase as CaseData : (allCases[caseIdx] as CaseData | undefined);

  const startCase = (i: number) => {
    setCaseIdx(i);
    setUserAnswers({});
    setExpandedFeedback(new Set());
    setScreen("sim");
  };

  const allAnswered = currentCase ? currentCase.medications.every((_, i) => {
    const ua = userAnswers[i];
    if (!ua || ua.isCascade === null) return false;
    if (ua.isCascade && !ua.causedBy) return false;
    return true;
  }) : false;

  const getScore = () => {
    if (!currentCase) return { correct: 0, total: 0, details: [] as any[] };
    let correct = 0;
    const details = currentCase.medications.map((med, i) => {
      const ua = userAnswers[i];
      const cascadeCorrect = ua?.isCascade === med.isCascade;
      const causeCorrect = !med.isCascade || (ua?.causedBy === med.causedBy);
      const isCorrect = cascadeCorrect && causeCorrect;
      if (isCorrect) correct++;
      return { ...med, idx: i, userAnswer: ua, isCorrect, cascadeCorrect, causeCorrect };
    });
    return { correct, total: currentCase.medications.length, details };
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
            <h1 className="text-3xl font-bold mb-2">Simulador de Cascata de Prescrição</h1>
            <p className="text-muted-foreground">Identifique medicamentos prescritos para tratar efeitos adversos de outros medicamentos</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Simulador Cascata de Prescrição" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
    const { correct, total, details } = getScore();
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    // Build cascade chain visualization
    const cascades = details.filter(d => d.isCascade);

    return (
      <div className="max-w-4xl mx-auto">
        {isVirtualRoom ? (
          <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
        ) : (
          <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        )}
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório — Cascata de Prescrição</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{correct}/{total}</div>
              <p className="text-muted-foreground">Classificações corretas ({score}%)</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${score}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cascade chain visualization */}
        {cascades.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" />Cadeia de Cascata Identificada</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {cascades.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{c.causedBy}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground italic">{c.sideEffect}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="destructive" className="text-xs">{c.drug}</Badge>
                    {i < cascades.length - 1 && <Separator orientation="vertical" className="h-4 mx-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {details.map((d, i) => {
            const expanded = expandedFeedback.has(i);
            return (
              <Card key={i} className={`border-l-4 ${d.isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedFeedback(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {d.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                      <span className="font-semibold">{d.drug} {d.dose}</span>
                      <Badge variant={d.isCascade ? "destructive" : "secondary"} className="text-xs">
                        {d.isCascade ? "Cascata" : "Original"}
                      </Badge>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Início:</strong> {d.startDate} | <strong>Motivo:</strong> {d.reason}</p>
                    {d.isCascade && (
                      <div className="bg-muted p-3 rounded">
                        <p><strong>Causado por:</strong> {d.causedBy}</p>
                        <p><strong>Efeito adverso:</strong> {d.sideEffect}</p>
                      </div>
                    )}
                    <Separator />
                    <p className="text-muted-foreground">
                      <strong>Sua resposta:</strong> {d.userAnswer?.isCascade ? `Cascata (causado por: ${d.userAnswer.causedBy || "não informado"})` : "Original"}
                    </p>
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
    <div className="max-w-5xl mx-auto">
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
        {/* Patient */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Paciente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{currentCase.patient.name}</strong></p>
            <p>{currentCase.patient.age} anos | {currentCase.patient.sex}</p>
            <Separator />
            <p className="font-medium">Doenças:</p>
            <ul className="list-disc list-inside">{currentCase.patient.diseases.map((d, i) => <li key={i} className="text-xs">{d}</li>)}</ul>
          </CardContent>
        </Card>

        {/* Medication timeline & analysis */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm text-muted-foreground">Para cada medicamento, classifique como <strong>Original</strong> (início de tratamento) ou <strong>Cascata</strong> (prescrito para tratar efeito adverso de outro):</p>
          {currentCase.medications.map((med, i) => {
            const ua = userAnswers[i] || { isCascade: null, causedBy: "" };
            const answered = ua.isCascade !== null && (!ua.isCascade || ua.causedBy);
            return (
              <Card key={i} className={`transition-all ${answered ? "border-green-300 dark:border-green-700" : ""}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{med.drug} {med.dose}</p>
                      <p className="text-xs text-muted-foreground">Início: {med.startDate} | Motivo: {med.reason}</p>
                    </div>
                    {answered && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                  <RadioGroup
                    value={ua.isCascade === true ? "cascata" : ua.isCascade === false ? "original" : ""}
                    onValueChange={(v) => setUserAnswers(p => ({
                      ...p,
                      [i]: { isCascade: v === "cascata", causedBy: v === "original" ? "" : p[i]?.causedBy || "" }
                    }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="original" id={`orig-${i}`} />
                      <Label htmlFor={`orig-${i}`} className="text-sm">Original</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cascata" id={`casc-${i}`} />
                      <Label htmlFor={`casc-${i}`} className="text-sm text-destructive">Cascata</Label>
                    </div>
                  </RadioGroup>
                  {ua.isCascade && (
                    <div>
                      <Label className="text-xs">Causado por qual medicamento?</Label>
                      <Select value={ua.causedBy} onValueChange={(v) => setUserAnswers(p => ({ ...p, [i]: { ...p[i], causedBy: v } }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {currentCase.medications.filter((_, mi) => mi !== i).map((m, mi) => (
                            <SelectItem key={mi} value={m.drug}>{m.drug}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!allAnswered} onClick={() => {
          if (isVirtualRoom && currentCase) {
            const { correct, total, details } = getScore();
            const score = total > 0 ? Math.round((correct / total) * 100) : 0;
            const decs: SimDecision[] = details.map((d: any) => ({
              label: `${d.drug} — Cascata?`,
              userChoice: d.userAnswer?.isCascade ? `Sim (causado por ${d.userAnswer?.causedBy || "?"})` : "Não",
              idealChoice: d.isCascade ? `Sim (causado por ${d.causedBy})` : "Não",
              correct: d.isCorrect,
              category: "Identificação de cascata",
              explanation: d.isCascade ? d.sideEffect : undefined,
            }));
            submitResults({ score, actions: buildSimulatorDecisions("cascata-prescricao", decs) });
          }
          setScreen("report");
        }}>
          <ClipboardCheck className="h-4 w-4 mr-2" />Finalizar Análise
        </Button>
      </div>
    </div>
  );
}
