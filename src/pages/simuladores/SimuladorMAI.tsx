import { useState, useEffect } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, User, Pill, CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

const MAI_CRITERIA = [
  "Indicação", "Efetividade", "Dose", "Direções corretas", "Praticidade",
  "Interações medicamentosas", "Interações droga-doença", "Duplicidade", "Duração", "Custo-benefício",
] as const;

type MAIRating = "A" | "B" | "C" | null;

interface DrugMAI {
  drug: string; dose: string; route: string; frequency: string; indication: string;
  correctRatings: Record<string, MAIRating>;
  justifications: Record<string, string>;
}

interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; diseases: string[]; allergies?: string[] };
  labs?: Record<string, string>;
  drugs: DrugMAI[];
}

type UserRatings = Record<number, Record<string, MAIRating>>;

const BUILT_IN_CASES: CaseData[] = [
  {
    title: "Caso 1: Idoso com Insônia", difficulty: "Fácil",
    patient: { name: "Sr. Raimundo", age: 75, weight: 70, sex: "Masculino", diseases: ["Insônia crônica", "HAS", "DRC estágio 3 (ClCr 40 mL/min)"] },
    labs: { "Cr": "1.8 mg/dL", "ClCr": "40 mL/min", "K+": "4.5 mEq/L" },
    drugs: [
      {
        drug: "Diazepam", dose: "10mg", route: "VO", frequency: "à noite", indication: "Insônia",
        correctRatings: { "Indicação": "B", "Efetividade": "B", "Dose": "C", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "C", "Duplicidade": "A", "Duração": "C", "Custo-benefício": "C" },
        justifications: { "Dose": "Dose elevada para idoso; máximo recomendado: 5mg (Critérios de Beers).", "Interações droga-doença": "BZD de longa ação são potencialmente inapropriados em idosos — risco de quedas, sedação excessiva e acúmulo em DRC.", "Duração": "Uso crônico de BZD não é recomendado. Preferir terapia cognitivo-comportamental para insônia (TCC-I).", "Custo-benefício": "Risco de dependência e eventos adversos superam benefícios em uso crônico no idoso." },
      },
      {
        drug: "Enalapril", dose: "10mg", route: "VO", frequency: "12/12h", indication: "HAS",
        correctRatings: { "Indicação": "A", "Efetividade": "A", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "A", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "A" },
        justifications: {},
      },
    ],
  },
  {
    title: "Caso 2: Polifarmácia na ICC", difficulty: "Médio",
    patient: { name: "Dona Marlene", age: 71, weight: 58, sex: "Feminino", diseases: ["ICC classe III (FE 30%)", "FA crônica", "DM2", "Gota"] },
    labs: { "Cr": "1.5 mg/dL", "K+": "5.3 mEq/L", "HbA1c": "8.5%", "Ácido úrico": "9.2 mg/dL", "INR": "2.4" },
    drugs: [
      {
        drug: "Carvedilol", dose: "25mg", route: "VO", frequency: "12/12h", indication: "ICC + controle FC na FA",
        correctRatings: { "Indicação": "A", "Efetividade": "A", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "A", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "A" },
        justifications: {},
      },
      {
        drug: "Hidroclorotiazida", dose: "25mg", route: "VO", frequency: "1x/dia", indication: "Edema / HAS",
        correctRatings: { "Indicação": "B", "Efetividade": "C", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "B", "Interações droga-doença": "C", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "B" },
        justifications: { "Efetividade": "Na ICC classe III, tiazídicos são menos eficazes que diuréticos de alça. Furosemida é preferida.", "Interações droga-doença": "Tiazídicos elevam ácido úrico e podem precipitar crises de gota. Também podem piorar o controle glicêmico no DM2.", "Interações medicamentosas": "Pode potencializar hipercalemia com espironolactona se adicionada (K+ já 5.3)." },
      },
      {
        drug: "Glibenclamida", dose: "5mg", route: "VO", frequency: "2x/dia", indication: "DM2",
        correctRatings: { "Indicação": "A", "Efetividade": "B", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "C", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "B" },
        justifications: { "Efetividade": "Com HbA1c 8.5%, o controle é insuficiente. Considerar associação ou troca.", "Interações droga-doença": "Glibenclamida é inapropriada em idosos (Critérios de Beers) e na DRC (Cr 1.5) — risco de hipoglicemia prolongada. Preferir inibidor DPP-4 ou gliclazida MR." },
      },
      {
        drug: "Varfarina", dose: "5mg", route: "VO", frequency: "1x/dia", indication: "Anticoagulação na FA",
        correctRatings: { "Indicação": "A", "Efetividade": "A", "Dose": "A", "Direções corretas": "A", "Praticidade": "B", "Interações medicamentosas": "B", "Interações droga-doença": "A", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "A" },
        justifications: { "Praticidade": "Exige monitoramento regular de INR e ajustes frequentes. DOACs poderiam ser alternativa.", "Interações medicamentosas": "Múltiplas interações potenciais com medicamentos e alimentos." },
      },
    ],
  },
  {
    title: "Caso 3: Paciente Psiquiátrico", difficulty: "Difícil",
    patient: { name: "Carlos Eduardo", age: 45, weight: 95, sex: "Masculino", diseases: ["Esquizofrenia paranóide", "DM2", "Dislipidemia", "Obesidade (IMC 33)"], allergies: ["Sulfa"] },
    labs: { "Glicemia jejum": "185 mg/dL", "HbA1c": "9.1%", "CT": "280 mg/dL", "LDL": "190 mg/dL", "TG": "350 mg/dL", "Cr": "0.9 mg/dL", "TGO/TGP": "45/52 U/L" },
    drugs: [
      {
        drug: "Olanzapina", dose: "20mg", route: "VO", frequency: "à noite", indication: "Esquizofrenia",
        correctRatings: { "Indicação": "A", "Efetividade": "A", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "C", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "C" },
        justifications: { "Interações droga-doença": "Olanzapina causa ganho de peso significativo, resistência insulínica e dislipidemia — piora DM2, obesidade e perfil lipídico. Considerar troca para Aripiprazol (menor impacto metabólico).", "Custo-benefício": "O risco metabólico em paciente já obeso, diabético e dislipidêmico é desfavorável." },
      },
      {
        drug: "Metformina", dose: "850mg", route: "VO", frequency: "12/12h", indication: "DM2",
        correctRatings: { "Indicação": "A", "Efetividade": "B", "Dose": "B", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "A", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "A" },
        justifications: { "Efetividade": "HbA1c 9.1% — controle inadequado. Precisa de intensificação (considerar iSGLT2 ou GLP-1RA que auxiliam no peso).", "Dose": "Poderia ser aumentada para 1000mg 12/12h se tolerada." },
      },
      {
        drug: "Sinvastatina", dose: "40mg", route: "VO", frequency: "à noite", indication: "Dislipidemia",
        correctRatings: { "Indicação": "A", "Efetividade": "B", "Dose": "A", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "A", "Interações droga-doença": "B", "Duplicidade": "A", "Duração": "A", "Custo-benefício": "A" },
        justifications: { "Efetividade": "LDL 190 mg/dL — pode ser insuficiente. Considerar Rosuvastatina ou Atorvastatina de alta potência.", "Interações droga-doença": "TGO/TGP levemente elevadas — monitorar hepatotoxicidade." },
      },
      {
        drug: "Clonazepam", dose: "2mg", route: "VO", frequency: "à noite", indication: "Insônia / ansiedade",
        correctRatings: { "Indicação": "B", "Efetividade": "B", "Dose": "B", "Direções corretas": "A", "Praticidade": "A", "Interações medicamentosas": "B", "Interações droga-doença": "B", "Duplicidade": "A", "Duração": "C", "Custo-benefício": "C" },
        justifications: { "Indicação": "BZD para insônia em paciente psiquiátrico crônico é questionável.", "Interações medicamentosas": "Pode potencializar sedação da Olanzapina.", "Duração": "Uso crônico de BZD não é recomendado — risco de dependência.", "Custo-benefício": "Risco de dependência e tolerância em uso crônico." },
      },
    ],
  },
];

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: "Apropriado", color: "text-green-600 dark:text-green-400" },
  B: { label: "Marginalmente", color: "text-yellow-600 dark:text-yellow-400" },
  C: { label: "Inapropriado", color: "text-red-600 dark:text-red-400" },
};

export default function SimuladorMAI() {
  const SLUG = "mai";
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
  const [userRatings, setUserRatings] = useState<UserRatings>({});
  const [selectedDrug, setSelectedDrug] = useState<number>(0);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  if (isVirtualRoom && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    setScreen("sim");
  }

  const rawCase = isVirtualRoom && virtualRoomCase ? virtualRoomCase as any : (allCases[caseIdx] as any | undefined);

  // Normalize AI-generated cases: map "medications" with "expectedMAI" to "drugs" with "correctRatings"/"justifications"
  const currentCase: CaseData | undefined = rawCase ? (() => {
    if (rawCase.drugs) return rawCase as CaseData;
    if (rawCase.medications) {
      const MAI_KEYS = ["indication", "effectiveness", "dose", "directions", "practicality", "drugInteractions", "diseaseInteractions", "duplication", "duration", "costBenefit"];
      const MAI_KEY_TO_LABEL: Record<string, string> = {
        indication: "Indicação", effectiveness: "Efetividade", dose: "Dose", directions: "Direções corretas",
        practicality: "Praticidade", drugInteractions: "Interações medicamentosas", diseaseInteractions: "Interações droga-doença",
        duplication: "Duplicidade", duration: "Duração", costBenefit: "Custo-benefício",
      };
      return {
        ...rawCase,
        drugs: rawCase.medications.map((m: any) => {
          const correctRatings: Record<string, MAIRating> = {};
          const justifications: Record<string, string> = {};
          if (m.expectedMAI) {
            MAI_KEYS.forEach(k => {
              const label = MAI_KEY_TO_LABEL[k];
              if (label && m.expectedMAI[k]) {
                correctRatings[label] = m.expectedMAI[k].score || "A";
                if (m.expectedMAI[k].justification) justifications[label] = m.expectedMAI[k].justification;
              }
            });
          }
          return { drug: m.drug, dose: m.dose, route: m.route, frequency: m.frequency, indication: m.indication, correctRatings, justifications };
        }),
      } as CaseData;
    }
    return rawCase as CaseData;
  })() : undefined;

  const startCase = (i: number) => {
    setCaseIdx(i);
    setUserRatings({});
    setSelectedDrug(0);
    setExpandedFeedback(new Set());
    setScreen("sim");
  };

  const allRated = currentCase ? currentCase.drugs.every((_, di) =>
    MAI_CRITERIA.every(c => userRatings[di]?.[c] != null)
  ) : false;

  const getScore = () => {
    if (!currentCase) return { drugScores: [], totalScore: 0, totalCorrect: 0, totalCriteria: 0 };
    let totalCorrect = 0;
    let totalCriteria = 0;
    const drugScores = currentCase.drugs.map((drug, di) => {
      let correct = 0;
      const criteriaResults = MAI_CRITERIA.map(c => {
        totalCriteria++;
        const userR = userRatings[di]?.[c];
        const correctR = drug.correctRatings[c];
        const isCorrect = userR === correctR;
        if (isCorrect) { correct++; totalCorrect++; }
        return { criterion: c, userRating: userR, correctRating: correctR, isCorrect, justification: drug.justifications[c] };
      });
      return { drug: drug.drug, dose: drug.dose, correct, total: MAI_CRITERIA.length, criteriaResults };
    });
    const totalScore = totalCriteria > 0 ? Math.round((totalCorrect / totalCriteria) * 100) : 0;
    return { drugScores, totalScore, totalCorrect, totalCriteria };
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
            <h1 className="text-3xl font-bold mb-2">Simulador MAI</h1>
            <p className="text-muted-foreground">Medication Appropriateness Index – Avalie a adequação de cada medicamento em 10 critérios</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Simulador MAI" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
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
    const { drugScores, totalScore } = getScore();
    return (
      <div className="max-w-4xl mx-auto">
        {isVirtualRoom ? (
          <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button>
        ) : (
          <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        )}
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório MAI</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{totalScore}%</div>
              <p className="text-muted-foreground">Acerto nos 10 critérios MAI em todos os medicamentos</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${totalScore}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {drugScores.map((ds, di) => {
            const key = `drug-${di}`;
            const expanded = expandedFeedback.has(key);
            return (
              <Card key={di} className={`border-l-4 ${ds.correct === ds.total ? "border-l-green-500" : ds.correct >= ds.total * 0.7 ? "border-l-yellow-500" : "border-l-red-500"}`}>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedFeedback(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      <span className="font-semibold">{ds.drug} {ds.dose}</span>
                      <Badge variant={ds.correct === ds.total ? "default" : "secondary"}>{ds.correct}/{ds.total}</Badge>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="text-sm space-y-2">
                    {ds.criteriaResults.map((cr, ci) => (
                      <div key={ci} className={`flex items-start gap-2 p-2 rounded ${cr.isCorrect ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                        {cr.isCorrect ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                        <div>
                          <p className="font-medium">{cr.criterion}</p>
                          <p className="text-xs text-muted-foreground">
                            Sua resposta: <span className={RATING_LABELS[cr.userRating || ""]?.color || ""}>{RATING_LABELS[cr.userRating || ""]?.label || "—"}</span>
                            {!cr.isCorrect && <> | Correto: <span className={RATING_LABELS[cr.correctRating || ""]?.color || ""}>{RATING_LABELS[cr.correctRating || ""]?.label || "—"}</span></>}
                          </p>
                          {cr.justification && <p className="text-xs mt-1 text-muted-foreground italic">{cr.justification}</p>}
                        </div>
                      </div>
                    ))}
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
  const currentDrug = currentCase.drugs[selectedDrug];
  const completedDrugs = currentCase.drugs.map((_, di) => MAI_CRITERIA.every(c => userRatings[di]?.[c] != null));

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Patient */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Paciente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{currentCase.patient.name}</strong></p>
            <p>{currentCase.patient.age} anos | {currentCase.patient.sex} | {currentCase.patient.weight}kg</p>
            <Separator />
            <p className="font-medium">Doenças:</p>
            <ul className="list-disc list-inside">{currentCase.patient.diseases.map((d, i) => <li key={i} className="text-xs">{d}</li>)}</ul>
            {currentCase.patient.allergies && currentCase.patient.allergies.length > 0 && (
              <p className="text-red-600 text-xs"><strong>Alergias:</strong> {currentCase.patient.allergies.join(", ")}</p>
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

        {/* Drug selector */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Pill className="h-4 w-4" />Medicamentos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentCase.drugs.map((d, di) => (
              <div key={di} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedDrug === di ? "ring-2 ring-primary border-primary" : completedDrugs[di] ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "hover:border-primary/50"}`}
                onClick={() => setSelectedDrug(di)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{d.drug}</p>
                    <p className="text-xs text-muted-foreground">{d.dose} — {d.route} {d.frequency}</p>
                    <p className="text-xs text-muted-foreground italic">Indicação: {d.indication}</p>
                  </div>
                  {completedDrugs[di] && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MAI Criteria */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4" />Critérios MAI — {currentDrug.drug}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MAI_CRITERIA.map((criterion, ci) => (
                <div key={ci} className="space-y-1">
                  <Label className="text-sm font-medium">{ci + 1}. {criterion}</Label>
                  <RadioGroup
                    value={userRatings[selectedDrug]?.[criterion] || ""}
                    onValueChange={(v) => setUserRatings(p => ({
                      ...p,
                      [selectedDrug]: { ...p[selectedDrug], [criterion]: v as MAIRating }
                    }))}
                    className="flex gap-4"
                  >
                    {(["A", "B", "C"] as const).map(r => (
                      <div key={r} className="flex items-center space-x-1">
                        <RadioGroupItem value={r} id={`${selectedDrug}-${ci}-${r}`} />
                        <Label htmlFor={`${selectedDrug}-${ci}-${r}`} className={`text-xs ${RATING_LABELS[r].color}`}>{RATING_LABELS[r].label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {ci < MAI_CRITERIA.length - 1 && <Separator className="mt-2" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!allRated} onClick={() => {
          if (isVirtualRoom) {
            const { drugScores, totalScore } = getScore();
            const decisions: SimDecision[] = drugScores.flatMap(ds =>
              ds.criteriaResults.map(cr => ({
                label: `${ds.drug} — ${cr.criterion}`,
                userChoice: RATING_LABELS[cr.userRating || ""]?.label || "Não respondido",
                idealChoice: RATING_LABELS[cr.correctRating || ""]?.label || "—",
                correct: cr.isCorrect,
                category: cr.criterion,
                explanation: cr.justification || undefined,
              }))
            );
            submitResults({ score: totalScore, actions: buildSimulatorDecisions("mai", decisions) });
          }
          setScreen("report");
        }}>
          <ClipboardCheck className="h-4 w-4 mr-2" />Finalizar Avaliação MAI
        </Button>
      </div>
    </div>
  );
}
