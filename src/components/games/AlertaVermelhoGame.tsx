import { useState } from "react";
import { FileWarning, DollarSign, Pill, Trophy, XCircle, AlertTriangle, Activity, ClipboardList, Scale, ChevronRight, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameFeedbackOverlay from "./GameFeedbackOverlay";
import GameStarsResult from "./GameStarsResult";

interface ClinicalTest {
  id: string; name: string; cost: number; result: string; isKey: boolean; explanation: string;
}

interface NaranjoItem {
  question: string; options: { label: string; score: number }[];
}

interface ADRCase {
  id: string; title: string; patient: { name: string; age: number; sex: string };
  symptoms: string; vitals: { fc: number; pa: string; temp: number; spo2: number };
  meds: { id: number; name: string; dose: string }[];
  tests: ClinicalTest[];
  correctMedId: number;
  correctAction: string;
  naranjoExpected: number;
  explanation: string;
  reference: string;
}

const naranjoQuestions: NaranjoItem[] = [
  { question: "Existem relatos prévios dessa reação na literatura?", options: [{ label: "Sim", score: 1 }, { label: "Não", score: 0 }, { label: "Desconhecido", score: 0 }] },
  { question: "A reação apareceu após administração do fármaco suspeito?", options: [{ label: "Sim", score: 2 }, { label: "Não", score: -1 }, { label: "Desconhecido", score: 0 }] },
  { question: "A reação melhorou ao suspender o fármaco?", options: [{ label: "Sim", score: 1 }, { label: "Não", score: 0 }, { label: "Desconhecido", score: 0 }] },
  { question: "A reação reapareceu ao reintroduzir?", options: [{ label: "Sim", score: 2 }, { label: "Não", score: -1 }, { label: "Desconhecido", score: 0 }] },
  { question: "Existem causas alternativas para a reação?", options: [{ label: "Não", score: 2 }, { label: "Sim", score: -1 }, { label: "Desconhecido", score: 0 }] },
  { question: "A reação apareceu com placebo?", options: [{ label: "Não", score: 1 }, { label: "Sim", score: -1 }, { label: "Desconhecido", score: 0 }] },
  { question: "O fármaco foi detectado no sangue em concentração tóxica?", options: [{ label: "Sim", score: 1 }, { label: "Não", score: 0 }, { label: "Desconhecido", score: 0 }] },
  { question: "A reação foi dose-dependente?", options: [{ label: "Sim", score: 1 }, { label: "Não", score: 0 }, { label: "Desconhecido", score: 0 }] },
];

const cases: ADRCase[] = [
  {
    id: "rabdomiolise", title: "Rabdomiólise por Estatina",
    patient: { name: "Sr. Carlos", age: 65, sex: "M" },
    symptoms: "Dor muscular intensa, fraqueza severa nas pernas e urina muito escura nas últimas 48h.",
    vitals: { fc: 92, pa: "145/88", temp: 37.2, spo2: 96 },
    meds: [
      { id: 1, name: "Losartana 50mg", dose: "1x/dia" },
      { id: 2, name: "Sinvastatina 40mg", dose: "1x/noite" },
      { id: 3, name: "Omeprazol 20mg", dose: "1x/dia" },
    ],
    tests: [
      { id: "T1", name: "Hemograma Completo", cost: 20, result: "Leucócitos 7.800/mm³. Sem anemia.", isKey: false, explanation: "Hemograma normal descarta causas hematológicas." },
      { id: "T2", name: "AST/ALT", cost: 30, result: "AST 50 U/L, ALT 45 U/L (levemente elevadas).", isKey: false, explanation: "Elevação leve pode ocorrer na rabdomiólise pela liberação muscular." },
      { id: "T3", name: "CPK (Creatinofosfoquinase)", cost: 40, result: "⚠️ 6.500 U/L (Normal: até 170). Destruição muscular maciça!", isKey: true, explanation: "CPK >5x o normal confirma rabdomiólise. Estatinas causam miopatia por mecanismo dose-dependente." },
      { id: "T4", name: "EAS (Urina Tipo 1)", cost: 15, result: "Mioglobinúria Positiva. Coloração escura confirmada.", isKey: true, explanation: "Mioglobina na urina é patognomônico de rabdomiólise. Risco de IRA por obstrução tubular." },
      { id: "T5", name: "Creatinina/Ureia", cost: 25, result: "Creatinina 1.8 mg/dL (elevada). Ureia 65 mg/dL.", isKey: false, explanation: "Elevação sugere comprometimento renal secundário à mioglobinúria." },
      { id: "T6", name: "Potássio Sérico", cost: 15, result: "K+ 5.8 mEq/L (elevado).", isKey: false, explanation: "Hipercalemia ocorre por lise celular maciça. Risco de arritmia." },
    ],
    correctMedId: 2, correctAction: "suspend",
    naranjoExpected: 7,
    explanation: "Sinvastatina causa rabdomiólise por toxicidade mitocondrial muscular. CPK >5x confirma. Conduta: suspender estatina, hidratação vigorosa, monitorar função renal.",
    reference: "Brunton LL. Goodman & Gilman, 13ª ed. Cap 31.",
  },
  {
    id: "hipoglicemia", title: "Hipoglicemia por Sulfonilureia",
    patient: { name: "Dona Maria", age: 78, sex: "F" },
    symptoms: "Confusão mental, sudorese profusa, tremores e taquicardia há 2 horas. Família relata que não almoçou.",
    vitals: { fc: 110, pa: "100/65", temp: 36.0, spo2: 97 },
    meds: [
      { id: 1, name: "Glibenclamida 5mg", dose: "2x/dia" },
      { id: 2, name: "Metformina 850mg", dose: "2x/dia" },
      { id: 3, name: "Enalapril 10mg", dose: "1x/dia" },
      { id: 4, name: "AAS 100mg", dose: "1x/dia" },
    ],
    tests: [
      { id: "T1", name: "Glicemia Capilar", cost: 5, result: "⚠️ 38 mg/dL — Hipoglicemia severa!", isKey: true, explanation: "Glicemia <54 mg/dL define hipoglicemia clinicamente significativa (ADA)." },
      { id: "T2", name: "Hemoglobina Glicada", cost: 30, result: "HbA1c 5.8% — Controle excessivo para idosa.", isKey: true, explanation: "HbA1c <6% em idosa indica controle agressivo demais. Meta ≥7% em idosos frágeis." },
      { id: "T3", name: "Função Renal", cost: 25, result: "Creatinina 1.5 mg/dL, TFG 35 mL/min.", isKey: false, explanation: "DRC reduz clearance da glibenclamida, acumulando metabólitos ativos hipoglicemiantes." },
      { id: "T4", name: "Hemograma", cost: 20, result: "Normal.", isKey: false, explanation: "Descarta causas hematológicas dos sintomas." },
      { id: "T5", name: "Insulina/Peptídeo C", cost: 40, result: "Insulina elevada, Peptídeo C elevado — endógeno.", isKey: false, explanation: "Confirma que a hipoglicemia é por estímulo endógeno (sulfonilureia), não insulina exógena." },
    ],
    correctMedId: 1, correctAction: "suspend",
    naranjoExpected: 8,
    explanation: "Glibenclamida em idosa com DRC causa hipoglicemia prolongada por acúmulo de metabólitos ativos. Conduta: glicose IV, suspender glibenclamida, ajustar meta glicêmica.",
    reference: "ADA Standards of Care 2024 — Older Adults.",
  },
  {
    id: "hepatotoxicidade", title: "Hepatotoxicidade por Amoxicilina-Clavulanato",
    patient: { name: "Pedro Alves", age: 52, sex: "M" },
    symptoms: "Icterícia progressiva, colúria e prurido intenso há 5 dias. Iniciou antibiótico há 3 semanas para sinusite.",
    vitals: { fc: 78, pa: "130/80", temp: 37.0, spo2: 98 },
    meds: [
      { id: 1, name: "Amoxicilina-Clavulanato 875mg", dose: "2x/dia" },
      { id: 2, name: "Losartana 50mg", dose: "1x/dia" },
      { id: 3, name: "Sinvastatina 20mg", dose: "1x/noite" },
    ],
    tests: [
      { id: "T1", name: "Bilirrubinas", cost: 25, result: "⚠️ BT 8.2 mg/dL (BD 6.5). Padrão colestático.", isKey: true, explanation: "Predomínio de bilirrubina direta indica colestase. Amoxicilina-clavulanato é causa clássica." },
      { id: "T2", name: "TGO/TGP", cost: 20, result: "TGO 180, TGP 220 (elevadas).", isKey: false, explanation: "Elevação moderada de transaminases acompanha o padrão colestático." },
      { id: "T3", name: "Fosfatase Alcalina/GGT", cost: 25, result: "⚠️ FA 450, GGT 380 (muito elevadas).", isKey: true, explanation: "FA e GGT muito elevadas confirmam padrão colestático. Razão R (ALT/FA) <2 = colestase." },
      { id: "T4", name: "Sorologias Hepatite", cost: 40, result: "Anti-HAV IgM negativo, HBsAg negativo, Anti-HCV negativo.", isKey: false, explanation: "Descarta causas virais de hepatite aguda." },
      { id: "T5", name: "USG Abdome", cost: 50, result: "Vias biliares sem dilatação. Sem litíase.", isKey: false, explanation: "Descarta obstrução mecânica. Reforça etiologia medicamentosa." },
      { id: "T6", name: "TAP/INR", cost: 15, result: "INR 1.1 (normal).", isKey: false, explanation: "Função de síntese hepática preservada — bom prognóstico." },
    ],
    correctMedId: 1, correctAction: "suspend",
    naranjoExpected: 6,
    explanation: "Amoxicilina-clavulanato é a causa mais comum de hepatotoxicidade medicamentosa. O clavulanato é o principal responsável. Padrão tipicamente colestático, pode surgir até 6 semanas após uso.",
    reference: "LiverTox — NIDDK/NIH Database.",
  },
  {
    id: "serotonina", title: "Síndrome Serotoninérgica",
    patient: { name: "Ana Costa", age: 34, sex: "F" },
    symptoms: "Agitação, tremores, diarreia, sudorese e mioclonias há 12h. Psiquiatra aumentou antidepressivo há 3 dias.",
    vitals: { fc: 118, pa: "150/95", temp: 38.8, spo2: 95 },
    meds: [
      { id: 1, name: "Fluoxetina 40mg", dose: "1x/dia" },
      { id: 2, name: "Tramadol 50mg", dose: "6/6h" },
      { id: 3, name: "Ondansetrona 4mg", dose: "SOS" },
      { id: 4, name: "Levotiroxina 75mcg", dose: "1x/dia" },
    ],
    tests: [
      { id: "T1", name: "Hemograma", cost: 20, result: "Leucocitose leve: 12.000/mm³.", isKey: false, explanation: "Leucocitose inespecífica pode ocorrer em síndromes hipertérmicas." },
      { id: "T2", name: "CPK", cost: 30, result: "⚠️ 1.200 U/L (elevada).", isKey: true, explanation: "CPK elevada indica rigidez muscular/mioclonias, compatível com síndrome serotoninérgica." },
      { id: "T3", name: "Gasometria", cost: 25, result: "Acidose metabólica leve. pH 7.32, Lactato 3.2.", isKey: false, explanation: "Acidose lática por hiperatividade muscular e hipertermia." },
      { id: "T4", name: "Função Renal", cost: 20, result: "Creatinina 1.0 mg/dL. Normal.", isKey: false, explanation: "Função renal preservada, mas monitorar pela CPK elevada." },
      { id: "T5", name: "TSH", cost: 25, result: "TSH 2.1 mUI/L. Normal.", isKey: false, explanation: "Descarta tireotoxicose como causa dos sintomas hipercinéticos." },
    ],
    correctMedId: 2, correctAction: "suspend",
    naranjoExpected: 7,
    explanation: "A combinação Fluoxetina (ISRS) + Tramadol (agonista serotoninérgico) causa síndrome serotoninérgica pela tríade: alteração mental, hiperatividade autonômica e neuromuscular. Tramadol deve ser suspenso imediatamente.",
    reference: "Boyer EW, Shannon M. NEJM 2005;352:1112-20.",
  },
  {
    id: "angioedema", title: "Angioedema por IECA",
    patient: { name: "José Ferreira", age: 60, sex: "M" },
    symptoms: "Edema labial e lingual progressivo há 6 horas, com dificuldade para engolir. Sem urticária.",
    vitals: { fc: 88, pa: "160/95", temp: 36.8, spo2: 94 },
    meds: [
      { id: 1, name: "Enalapril 20mg", dose: "2x/dia" },
      { id: 2, name: "Hidroclorotiazida 25mg", dose: "1x/dia" },
      { id: 3, name: "Metformina 850mg", dose: "2x/dia" },
    ],
    tests: [
      { id: "T1", name: "Hemograma", cost: 20, result: "Normal. Eosinófilos normais.", isKey: false, explanation: "Angioedema por IECA NÃO é mediado por IgE — eosinófilos normais são esperados." },
      { id: "T2", name: "Triptase Sérica", cost: 35, result: "Normal (< 11 ng/mL).", isKey: true, explanation: "Triptase normal descarta anafilaxia/mastocitose. Confirma mecanismo bradicinina." },
      { id: "T3", name: "C4 / Inibidor de C1", cost: 40, result: "C4 e C1-INH normais.", isKey: true, explanation: "Descarta angioedema hereditário (deficiência de C1-INH). IECA causa angioedema por acúmulo de bradicinina." },
      { id: "T4", name: "IgE Total", cost: 25, result: "Normal.", isKey: false, explanation: "IgE normal confirma que não é reação alérgica clássica tipo I." },
      { id: "T5", name: "Laringoscopia", cost: 50, result: "Edema moderado de orofaringe. Via aérea patente.", isKey: false, explanation: "Avaliação da via aérea é essencial para definir gravidade." },
    ],
    correctMedId: 1, correctAction: "suspend",
    naranjoExpected: 7,
    explanation: "Enalapril (IECA) causa angioedema por acúmulo de bradicinina (inibição da ECA = menor degradação). Pode ocorrer meses/anos após início. Trocar por BRA (losartana) com cautela.",
    reference: "Byrd JB et al. NEJM 2020;382:1136-48.",
  },
];

const actions = [
  { id: "suspend", label: "Suspender fármaco", icon: XCircle },
  { id: "reduce", label: "Reduzir dose", icon: Scale },
  { id: "switch", label: "Trocar por alternativa", icon: ClipboardList },
];

const difficultyConfig: Record<GameDifficulty, { budget: number; healthDecay: number; showNaranjo: boolean }> = {
  academic: { budget: 150, healthDecay: 10, showNaranjo: false },
  clinical: { budget: 120, healthDecay: 15, showNaranjo: true },
  specialist: { budget: 80, healthDecay: 20, showNaranjo: true },
};

export default function AlertaVermelhoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "playing" | "naranjo" | "action" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [caseIndex, setCaseIndex] = useState(0);
  const [budget, setBudget] = useState(150);
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [selectedMed, setSelectedMed] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [naranjoAnswers, setNaranjoAnswers] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [totalCases, setTotalCases] = useState(0);
  const [casesWon, setCasesWon] = useState(0);

  const config = difficultyConfig[difficulty];
  const currentCase = cases[caseIndex];

  const startGame = () => {
    setBudget(config.budget);
    setHealth(100);
    setScore(0);
    setErrors(0);
    setOrdered([]);
    setSelectedMed(null);
    setSelectedAction(null);
    setNaranjoAnswers([]);
    setTotalCases(0);
    setCasesWon(0);
    setCaseIndex(0);
    setPhase("playing");
  };

  const orderTest = (test: ClinicalTest) => {
    if (budget < test.cost) { toast.error("Orçamento insuficiente!"); return; }
    setBudget(b => b - test.cost);
    setHealth(h => Math.max(0, h - config.healthDecay));
    setOrdered(o => [...o, test.id]);
    setScore(s => s + (test.isKey ? 25 : 10));

    setFeedback({
      isCorrect: test.isKey,
      title: test.isKey ? "Exame-Chave!" : "Resultado Recebido",
      explanation: test.explanation,
      reference: test.isKey ? currentCase.reference : undefined,
    });
  };

  const confirmDiagnosis = () => {
    if (selectedMed === null) { toast.error("Selecione o fármaco suspeito!"); return; }
    if (config.showNaranjo) {
      setPhase("naranjo");
    } else {
      setPhase("action");
    }
  };

  const submitNaranjo = () => {
    const naranjoScore = naranjoAnswers.reduce((a, b) => a + b, 0);
    const expectedRange = currentCase.naranjoExpected;
    const isClose = Math.abs(naranjoScore - expectedRange) <= 2;
    if (isClose) setScore(s => s + 20);
    else setErrors(e => e + 1);

    setFeedback({
      isCorrect: isClose,
      title: `Naranjo: ${naranjoScore} pontos`,
      explanation: naranjoScore >= 9 ? "Definida" : naranjoScore >= 5 ? "Provável" : naranjoScore >= 1 ? "Possível" : "Duvidosa",
      tip: `Classificação esperada: ${expectedRange >= 9 ? "Definida" : expectedRange >= 5 ? "Provável" : "Possível"} (${expectedRange} pts)`,
      reference: "Naranjo CA et al. Clin Pharmacol Ther 1981;30:239-45.",
    });
  };

  const submitAction = () => {
    if (!selectedAction) { toast.error("Selecione a conduta!"); return; }
    const correctMed = selectedMed === currentCase.correctMedId;
    const correctAct = selectedAction === currentCase.correctAction;
    const isCorrect = correctMed && correctAct;

    if (isCorrect) { setScore(s => s + 40); setCasesWon(w => w + 1); }
    else setErrors(e => e + 1);

    setTotalCases(t => t + 1);

    setFeedback({
      isCorrect,
      title: isCorrect ? "Conduta Correta!" : "Erro na Conduta",
      explanation: currentCase.explanation,
      reference: currentCase.reference,
      tip: !correctMed ? `Fármaco correto: ${currentCase.meds.find(m => m.id === currentCase.correctMedId)?.name}` : !correctAct ? `Ação correta: ${actions.find(a => a.id === currentCase.correctAction)?.label}` : undefined,
    });
  };

  const nextCase = () => {
    setFeedback(null);
    if (caseIndex + 1 < cases.length && health > 0 && budget > 0) {
      setCaseIndex(i => i + 1);
      setOrdered([]);
      setSelectedMed(null);
      setSelectedAction(null);
      setNaranjoAnswers([]);
      setPhase("playing");
    } else {
      setPhase("result");
    }
  };

  const maxScore = cases.length * 100;

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Alerta Vermelho — Farmacovigilância"
        setting="Centro de Farmacovigilância — Hospital Terciário"
        briefing="Analise cada caso clínico de RAM (Reação Adversa a Medicamento). Gerencie orçamento de exames, identifique o fármaco responsável e tome a conduta correta. Cada exame-chave vale mais pontos!"
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">Orçamento: ${config.budget} • {config.showNaranjo ? "Com" : "Sem"} Naranjo • {cases.length} casos</p>
        <Button onClick={startGame} size="lg">Iniciar Investigação</Button>
      </div>
    );
  }

  if (feedback && phase !== "result") {
    return (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={() => {
          if (phase === "naranjo") { setFeedback(null); setPhase("action"); }
          else if (phase === "action") { nextCase(); }
          else { setFeedback(null); }
        }}
      />
    );
  }

  if (phase === "result") {
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={casesWon > 0 ? "Investigação Concluída!" : "Falha na Farmacovigilância"}
        subtitle={`${casesWon}/${totalCases} casos resolvidos corretamente. Pontuação: ${score}/${maxScore}.`}
        onRestart={() => setPhase("narrative")}
      />
    );
  }

  if (phase === "naranjo") {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-center text-foreground flex items-center justify-center gap-2">
          <Scale className="h-5 w-5" /> Algoritmo de Naranjo
        </h3>
        <p className="text-xs text-center text-muted-foreground">Classifique a causalidade da RAM</p>
        {naranjoQuestions.map((nq, idx) => (
          <Card key={idx} className={naranjoAnswers[idx] !== undefined ? "border-primary/30" : ""}>
            <CardContent className="py-3">
              <p className="text-xs font-medium text-foreground mb-2">{idx + 1}. {nq.question}</p>
              <div className="flex gap-2">
                {nq.options.map((opt, oi) => (
                  <Button
                    key={oi}
                    size="sm"
                    variant={naranjoAnswers[idx] === opt.score ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => {
                      const updated = [...naranjoAnswers];
                      updated[idx] = opt.score;
                      setNaranjoAnswers(updated);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button
          onClick={submitNaranjo}
          disabled={naranjoAnswers.length < naranjoQuestions.length || naranjoAnswers.some(a => a === undefined)}
          className="w-full" size="lg"
        >
          Calcular Score de Naranjo
        </Button>
      </div>
    );
  }

  if (phase === "action") {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-center text-foreground">Conduta Farmacoterapêutica</h3>
        <p className="text-sm text-center text-muted-foreground">
          Fármaco selecionado: <strong>{currentCase.meds.find(m => m.id === selectedMed)?.name}</strong>
        </p>
        <div className="space-y-2">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button
                key={a.id}
                variant={selectedAction === a.id ? "default" : "outline"}
                className="w-full justify-start gap-2"
                onClick={() => setSelectedAction(a.id)}
              >
                <Icon className="h-4 w-4" /> {a.label}
              </Button>
            );
          })}
        </div>
        <Button onClick={submitAction} disabled={!selectedAction} className="w-full" size="lg">
          Confirmar Conduta
        </Button>
      </div>
    );
  }

  // Main playing screen
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-muted-foreground">Saúde:</span>{" "}
            <span className={health < 40 ? "text-destructive font-bold" : ""}>{health}%</span>
          </div>
          <Progress value={health} className="w-20 h-2 [&>div]:bg-destructive" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Caso {caseIndex + 1}/{cases.length}</Badge>
          <Badge variant="outline">Pontos: {score}</Badge>
          <div className={`flex items-center gap-1 text-sm font-bold ${budget < 30 ? "text-destructive animate-pulse" : "text-green-500"}`}>
            <DollarSign className="h-4 w-4" />{budget}
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs gap-1"><Heart className="h-3 w-3" /> FC {currentCase.vitals.fc}</Badge>
        <Badge variant="outline" className="text-xs">PA {currentCase.vitals.pa}</Badge>
        <Badge variant="outline" className="text-xs">T {currentCase.vitals.temp}°C</Badge>
        <Badge variant="outline" className="text-xs">SpO₂ {currentCase.vitals.spo2}%</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient Info */}
        <div className="space-y-3">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">
                {currentCase.patient.name}, {currentCase.patient.age} anos ({currentCase.patient.sex})
              </p>
              <p className="text-sm font-medium flex items-start gap-2">
                <FileWarning className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                {currentCase.symptoms}
              </p>
            </CardContent>
          </Card>

          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Medicamentos em Uso</p>
            {currentCase.meds.map(m => (
              <Button
                key={m.id}
                variant={selectedMed === m.id ? "default" : "outline"}
                size="sm"
                className="w-full mb-1.5 justify-between text-xs"
                onClick={() => setSelectedMed(m.id)}
              >
                <span className="flex items-center gap-1"><Pill className="h-3 w-3" /> {m.name}</span>
                <span className="text-muted-foreground">{m.dose}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Tests */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Solicitar Exames</p>
          {currentCase.tests.filter(t => !ordered.includes(t.id)).map(t => (
            <Button key={t.id} variant="outline" size="sm" className="w-full justify-between text-xs" onClick={() => orderTest(t)}>
              {t.name} <Badge variant="secondary" className="text-[10px]">${t.cost}</Badge>
            </Button>
          ))}

          {ordered.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Resultados</p>
              {ordered.map(id => {
                const t = currentCase.tests.find(x => x.id === id)!;
                return (
                  <Card key={id} className={t.isKey ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
                    <CardContent className="py-2">
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className={`text-xs mt-0.5 ${t.isKey ? "text-yellow-500 font-medium" : "text-muted-foreground"}`}>{t.result}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Button onClick={confirmDiagnosis} disabled={selectedMed === null} className="w-full" size="lg">
        Confirmar Fármaco Suspeito e Prosseguir <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
