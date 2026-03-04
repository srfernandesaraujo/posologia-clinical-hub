import { useState, useEffect, useRef } from "react";
import { Search, Eye, Beaker, Pill, AlertTriangle, Clock, FileText, Heart, Brain, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface VitalSigns {
  fc: string; pa: string; fr: string; temp: string; spo2: string; pupilas: string; glasgow: string;
}

interface Evidence {
  id: string;
  name: string;
  icon: string;
  description: string;
  location: string;
  found: boolean;
  points: number;
}

interface LabTest {
  id: string;
  name: string;
  cost: number;
  result: string;
  isKey: boolean;
  ordered: boolean;
}

interface ToxCase {
  id: string;
  title: string;
  arrival: string;
  vitals: VitalSigns;
  toxidrome: string;
  toxidromeType: "colinergica" | "anticolinergica" | "simpatimimetica" | "opioide" | "sedativo" | "serotoninergica";
  substance: string;
  antidote: string;
  antidoteOptions: string[];
  evidences: Evidence[];
  labTests: LabTest[];
  physicalExam: string[];
  timerSeconds: number;
  explanation: string;
  reference: string;
  deteriorationWarning: string;
}

const toxidromeDescriptions: Record<string, { symptoms: string; key: string }> = {
  colinergica: { symptoms: "DUMBELS: Diarreia, Urinação, Miose, Broncorreia, Emese, Lacrimejamento, Salivação", key: "Miose + bradicardia + broncorreia" },
  anticolinergica: { symptoms: "Midríase, taquicardia, pele seca e quente, retenção urinária, agitação, alucinações", key: "Midríase + pele seca + taquicardia" },
  simpatimimetica: { symptoms: "Midríase, taquicardia, hipertensão, diaforese, hipertermia, agitação", key: "Midríase + taquicardia + diaforese" },
  opioide: { symptoms: "Miose, depressão respiratória, bradicardia, hipotensão, hipotermia", key: "Miose + FR↓ + rebaixamento" },
  sedativo: { symptoms: "Sonolência, ataxia, disartria, hipotensão, depressão respiratória", key: "Sonolência + ataxia + FR↓" },
  serotoninergica: { symptoms: "Hipertermia, agitação, clônus, hiperreflexia, diaforese, tremor", key: "Hipertermia + clônus + agitação" },
};

const cases: ToxCase[] = [
  {
    id: "organo", title: "Caso 1: O Agricultor",
    arrival: "Homem de 45 anos, trazido pelo SAMU de zona rural. Encontrado inconsciente no galpão de agrotóxicos. Roupas com cheiro forte.",
    vitals: { fc: "48 bpm ↓", pa: "90/60 mmHg ↓", fr: "24 irpm", temp: "36.5°C", spo2: "88% ↓", pupilas: "Mióticas puntiformes", glasgow: "E1V1M3 = 5" },
    toxidrome: "Colinérgica", toxidromeType: "colinergica",
    substance: "Organofosforado (Clorpirifós)",
    antidote: "Atropina",
    antidoteOptions: ["Atropina", "Naloxona", "Flumazenil", "N-Acetilcisteína", "Pralidoxima"],
    evidences: [
      { id: "e1", name: "Frasco de agrotóxico", icon: "🧪", description: "Frasco de Clorpirifós 480 EC, quase vazio. Rótulo: organofosforado.", location: "Bolso da calça", found: false, points: 30 },
      { id: "e2", name: "Roupas contaminadas", icon: "👕", description: "Camisa e calça com odor forte de solvente. Manchas esverdeadas.", location: "Paciente", found: false, points: 15 },
      { id: "e3", name: "Relato do vizinho", icon: "🗣️", description: "'Ele tava aplicando veneno no plantio sem máscara. Faz isso sempre.'", location: "Acompanhante", found: false, points: 20 },
    ],
    labTests: [
      { id: "l1", name: "Colinesterase sérica", cost: 1, result: "⚠️ 450 U/L (ref: 5000-12000). Inibição >90% da colinesterase — CONFIRMA intoxicação por organofosforado.", isKey: true, ordered: false },
      { id: "l2", name: "Gasometria arterial", cost: 1, result: "pH 7.28, pCO₂ 52, pO₂ 58, HCO₃ 22. Acidose respiratória por broncorreia.", isKey: false, ordered: false },
      { id: "l3", name: "Hemograma completo", cost: 1, result: "Hb 14.2, Leucócitos 11.800 (leve leucocitose de estresse). Plaquetas normais.", isKey: false, ordered: false },
      { id: "l4", name: "Função renal + eletrólitos", cost: 1, result: "Creatinina 1.0, K⁺ 4.8, Na⁺ 139. Sem alterações significativas.", isKey: false, ordered: false },
    ],
    physicalExam: [
      "👁️ Pupilas mióticas puntiformes bilaterais (<2mm)",
      "🫁 MV reduzido bilateralmente com roncos e estertores difusos (broncorreia intensa)",
      "💧 Sialorreia profusa, lacrimejamento",
      "💦 Diaforese intensa, pele úmida",
      "🤢 Incontinência fecal e urinária (fasciculações abdominais)",
      "💪 Fasciculações musculares difusas em membros",
    ],
    timerSeconds: 480,
    explanation: "Organofosforados inibem irreversivelmente a acetilcolinesterase, acumulando acetilcolina nas sinapses. Toxidrome colinérgica (DUMBELS). Tratamento: 1) Descontaminação (retirar roupas) 2) Atropina IV em doses crescentes até secar secreções 3) Pralidoxima (reativa a colinesterase se <24h) 4) Suporte ventilatório. Dose de Atropina: 1-2mg IV a cada 5min, dobrando até efeito.",
    reference: "Eddleston M et al. Lancet 2008;371:597-607",
    deteriorationWarning: "SpO₂ caindo: broncorreia obstruindo vias aéreas!",
  },
  {
    id: "paracetamol", title: "Caso 2: A Adolescente",
    arrival: "Mulher de 17 anos, trazida pela mãe. Encontrou caixa vazia de Paracetamol 750mg (20 comprimidos) no quarto. Ingestão há ~4 horas.",
    vitals: { fc: "88 bpm", pa: "115/70 mmHg", fr: "18 irpm", temp: "36.8°C", spo2: "98%", pupilas: "Isocóricas fotorreagentes", glasgow: "E4V5M6 = 15" },
    toxidrome: "Hepatotóxica (sem toxidrome clássica nas primeiras horas)", toxidromeType: "sedativo",
    substance: "Paracetamol (Acetaminofeno)",
    antidote: "N-Acetilcisteína",
    antidoteOptions: ["N-Acetilcisteína", "Atropina", "Naloxona", "Carvão ativado", "Deferoxamina"],
    evidences: [
      { id: "e1", name: "Caixa vazia de Paracetamol", icon: "📦", description: "Caixa de Paracetamol 750mg x 20 comprimidos. Todas as cartelas vazias. Dose estimada: 15g.", location: "Trazida pela mãe", found: false, points: 30 },
      { id: "e2", name: "Bilhete no quarto", icon: "📝", description: "Bilhete com conteúdo emocional. Indica ingestão intencional.", location: "Relatado pela mãe", found: false, points: 15 },
      { id: "e3", name: "Relato da paciente", icon: "🗣️", description: "'Tomei tudo de uma vez há umas 4 horas. Não vomitei. Estou com um pouco de enjoo.'", location: "Paciente", found: false, points: 20 },
    ],
    labTests: [
      { id: "l1", name: "Nível sérico de Paracetamol (4h)", cost: 1, result: "⚠️ 250 mcg/mL (ref: terapêutico <20). Plotar no Nomograma de Rumack-Matthew: ACIMA da linha de tratamento.", isKey: true, ordered: false },
      { id: "l2", name: "TGO/TGP", cost: 1, result: "TGO: 45 U/L, TGP: 52 U/L. Ainda normais — hepatotoxicidade aparece em 24-72h!", isKey: true, ordered: false },
      { id: "l3", name: "INR/TP", cost: 1, result: "INR 1.1. Normal agora, mas pode subir para >6 em 48-72h se não tratar.", isKey: false, ordered: false },
      { id: "l4", name: "Função renal", cost: 1, result: "Creatinina 0.7, Ureia 28. Normal. Nefrotoxicidade pode ocorrer em doses >15g.", isKey: false, ordered: false },
    ],
    physicalExam: [
      "👁️ Pupilas isocóricas, fotorreagentes (normais)",
      "🤢 Náusea leve, sem vômitos",
      "🫁 Ausculta pulmonar e cardíaca normais",
      "🔍 Abdome: dor leve em hipocôndrio direito à palpação profunda",
      "🧠 Consciente, orientada, Glasgow 15, chorosa",
      "⚠️ ATENÇÃO: Paciente aparentemente bem NÃO descarta toxicidade — fase silenciosa do paracetamol",
    ],
    timerSeconds: 600,
    explanation: "Paracetamol em doses >150mg/kg é hepatotóxico. O metabólito tóxico NAPQI é normalmente conjugado com glutationa, mas em superdose esgota os estoques de glutationa e causa necrose hepática. N-Acetilcisteína (NAC) repõe glutationa. Eficácia máxima se iniciada em <8h. Dose: 150mg/kg em 1h, depois 50mg/kg em 4h, depois 100mg/kg em 16h IV.",
    reference: "Rumack BH. Clin Pharmacol Ther 2019",
    deteriorationWarning: "Sem tratamento: hepatite fulminante em 48-72h!",
  },
  {
    id: "benzo", title: "Caso 3: O Idoso Sedado",
    arrival: "Homem de 82 anos, trazido de ILPI. Encontrado não responsivo na cama. Uso crônico de Diazepam 10mg/noite. Cuidador relata que 'tomou vários comprimidos'.",
    vitals: { fc: "62 bpm", pa: "100/60 mmHg ↓", fr: "8 irpm ↓↓", temp: "35.8°C ↓", spo2: "85% ↓↓", pupilas: "Médias, pouco reagentes", glasgow: "E1V1M4 = 6" },
    toxidrome: "Sedativo-hipnótica", toxidromeType: "sedativo",
    substance: "Benzodiazepínico (Diazepam)",
    antidote: "Flumazenil",
    antidoteOptions: ["Flumazenil", "Naloxona", "Atropina", "Fisostigmina", "Glucagon"],
    evidences: [
      { id: "e1", name: "Frasco de Diazepam vazio", icon: "💊", description: "Frasco de Diazepam 10mg (30 comprimidos) dispensado há 5 dias. Vazio.", location: "Mesa de cabeceira", found: false, points: 30 },
      { id: "e2", name: "Relato do cuidador", icon: "🗣️", description: "'Ele anda muito agitado à noite. Acho que tomou vários de uma vez porque não conseguia dormir.'", location: "Cuidador", found: false, points: 20 },
      { id: "e3", name: "Prescrição médica", icon: "📋", description: "Diazepam 10mg 1x/noite (uso há 8 anos). Critério de Beers: medicamento potencialmente inapropriado em idosos.", location: "Prontuário", found: false, points: 15 },
    ],
    labTests: [
      { id: "l1", name: "Screening toxicológico urinário", cost: 1, result: "⚠️ POSITIVO para benzodiazepínicos. Negativo para opioides, anfetaminas, barbitúricos.", isKey: true, ordered: false },
      { id: "l2", name: "Gasometria", cost: 1, result: "pH 7.30, pCO₂ 58 ↑, pO₂ 52 ↓. Acidose respiratória por depressão respiratória.", isKey: true, ordered: false },
      { id: "l3", name: "Glicemia", cost: 1, result: "102 mg/dL. Normal — descarta hipoglicemia como causa do rebaixamento.", isKey: false, ordered: false },
      { id: "l4", name: "TC de crânio", cost: 2, result: "Sem evidências de AVC ou hemorragia. Descarta causa estrutural.", isKey: false, ordered: false },
    ],
    physicalExam: [
      "👁️ Pupilas médias (3-4mm), pouco fotorreagentes",
      "🫁 FR 8 irpm, respiração superficial, MV reduzido em bases",
      "🧠 Glasgow 6, responde apenas a estímulo doloroso com retirada",
      "💪 Hipotonia generalizada, reflexos diminuídos",
      "🌡️ Hipotermia leve (35.8°C)",
      "🔍 Sem sinais focais, sem rigidez de nuca",
    ],
    timerSeconds: 420,
    explanation: "Benzodiazepínicos potencializam GABA-A, causando sedação, depressão respiratória e hipotonia. Flumazenil é antagonista competitivo do receptor BZD. CUIDADO: em uso crônico pode precipitar convulsões! Dose: 0.2mg IV em 30s, repetir 0.1mg a cada minuto até despertar (máx 1mg). Em idosos: risco de arritmia e convulsão — titular com cautela.",
    reference: "Sivilotti MLA. NEJM 2016 — BZD overdose management",
    deteriorationWarning: "FR caindo: risco de apneia!",
  },
  {
    id: "litio", title: "Caso 4: A Paciente Psiquiátrica",
    arrival: "Mulher de 55 anos, com transtorno bipolar. Trazida pelo marido com tremores grosseiros, vômitos e confusão mental há 2 dias. Usa Carbonato de Lítio 900mg/dia.",
    vitals: { fc: "58 bpm ↓", pa: "130/85 mmHg", fr: "20 irpm", temp: "36.2°C", spo2: "96%", pupilas: "Isocóricas", glasgow: "E3V4M5 = 12" },
    toxidrome: "Intoxicação por Lítio (sem toxidrome clássica)", toxidromeType: "serotoninergica",
    substance: "Lítio (intoxicação crônica)",
    antidote: "Hemodiálise",
    antidoteOptions: ["Hemodiálise", "N-Acetilcisteína", "Carvão ativado", "Flumazenil", "Gluconato de cálcio"],
    evidences: [
      { id: "e1", name: "Medicações da paciente", icon: "💊", description: "Carbonato de Lítio 300mg 3x/dia. Hidroclorotiazida 25mg/dia (recém prescrita). Losartana 50mg/dia.", location: "Bolsa", found: false, points: 30 },
      { id: "e2", name: "Relato do marido", icon: "🗣️", description: "'Ela começou com a nova 'pílula da pressão' há 10 dias. Desde então piorou: tremor, enjoo, confusão.'", location: "Acompanhante", found: false, points: 25 },
      { id: "e3", name: "Receita recente", icon: "📋", description: "Hidroclorotiazida 25mg/dia prescrita há 10 dias. NOTA: Tiazídicos reduzem excreção renal de lítio!", location: "Carteira", found: false, points: 20 },
    ],
    labTests: [
      { id: "l1", name: "Litemia", cost: 1, result: "⚠️ 3.2 mEq/L (terapêutico: 0.6-1.2 mEq/L). Nível TÓXICO — indica intoxicação grave.", isKey: true, ordered: false },
      { id: "l2", name: "Função renal", cost: 1, result: "Creatinina 2.1 ↑, Ureia 68 ↑. IRA pré-renal por desidratação (vômitos) agravando acúmulo de lítio.", isKey: true, ordered: false },
      { id: "l3", name: "TSH", cost: 1, result: "TSH 8.5 ↑. Hipotireoidismo induzido pelo lítio (uso crônico).", isKey: false, ordered: false },
      { id: "l4", name: "ECG", cost: 1, result: "Bradicardia sinusal, achatamento de onda T, prolongamento de QT. Alterações compatíveis com intoxicação por lítio.", isKey: false, ordered: false },
    ],
    physicalExam: [
      "👁️ Pupilas isocóricas, nistagmo horizontal",
      "🤲 Tremor grosseiro de mãos e língua (diferente do tremor fino terapêutico)",
      "🧠 Confusa, desorientada no tempo, disartria",
      "🫁 MV normal, sem alterações cardiopulmonares significativas",
      "💧 Sinais de desidratação: mucosas secas, turgor diminuído",
      "⚡ Hiperreflexia, clônus em tornozelos",
    ],
    timerSeconds: 540,
    explanation: "Intoxicação crônica por lítio é mais perigosa que aguda. Tiazídicos reduzem clearance renal de lítio por aumentar reabsorção de sódio/lítio no túbulo proximal. Litemia >2.5 com sintomas neurológicos: indicação de hemodiálise. Carvão ativado NÃO adsorve lítio. Tratamento: 1) Hidratação IV vigorosa 2) Suspender lítio e tiazídico 3) Hemodiálise se litemia >2.5 com sintomas ou >4.0 assintomático.",
    reference: "Decker BS et al. EXTRIP Workgroup — AJKD 2015",
    deteriorationWarning: "Neurológico deteriorando: risco de convulsões e coma!",
  },
];

const diffConfig: Record<GameDifficulty, { timerMult: number; showHints: boolean; labCostMult: number }> = {
  academic: { timerMult: 1.5, showHints: true, labCostMult: 0.5 },
  clinical: { timerMult: 1, showHints: false, labCostMult: 1 },
  specialist: { timerMult: 0.7, showHints: false, labCostMult: 1.5 },
};

type Phase = "narrative" | "difficulty" | "caseIntro" | "investigation" | "diagnosis" | "feedback" | "result";
type InvTab = "vitals" | "exam" | "evidence" | "labs";

export default function DetetiveToxicologicoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<Phase>("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [currentCase, setCurrentCase] = useState(0);
  const [timeLeft, setTimeLeft] = useState(480);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [casesSolved, setCasesSolved] = useState(0);
  const [evidencesFound, setEvidencesFound] = useState<string[]>([]);
  const [labsOrdered, setLabsOrdered] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<InvTab>("vitals");
  const [selectedAntidote, setSelectedAntidote] = useState<string | null>(null);
  const [patientStability, setPatientStability] = useState(100);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);

  const timerRef = useRef<number | null>(null);
  const conf = diffConfig[difficulty];
  const toxCase = cases[currentCase];

  // Timer
  useEffect(() => {
    if (phase !== "investigation") return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPatientStability(0);
          setPhase("diagnosis");
          return 0;
        }
        // Patient deteriorates over time
        if (prev % 60 === 0) {
          setPatientStability(s => Math.max(0, s - 5));
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const findEvidence = (evidenceId: string) => {
    if (evidencesFound.includes(evidenceId)) return;
    const ev = toxCase.evidences.find(e => e.id === evidenceId);
    if (!ev) return;
    setEvidencesFound(prev => [...prev, evidenceId]);
    setScore(s => s + ev.points);
    toast.success(`🔍 Evidência encontrada: ${ev.name}`);
  };

  const orderLab = (labId: string) => {
    if (labsOrdered.includes(labId)) return;
    const lab = toxCase.labTests.find(l => l.id === labId);
    if (!lab) return;
    setLabsOrdered(prev => [...prev, labId]);
    setScore(s => s + (lab.isKey ? 40 : 15));
    setPatientStability(s => Math.max(0, s - 3)); // Cost of time
  };

  const submitDiagnosis = () => {
    if (!selectedAntidote) {
      toast.error("Selecione o antídoto antes de confirmar!");
      return;
    }

    const isCorrect = selectedAntidote === toxCase.antidote;
    if (isCorrect) {
      setCasesSolved(c => c + 1);
      setScore(s => s + 200);
      setFeedback({
        isCorrect: true,
        title: `✅ Antídoto correto: ${toxCase.antidote}!`,
        explanation: toxCase.explanation,
        reference: toxCase.reference,
      });
    } else {
      setErrors(e => e + 1);
      setPatientStability(s => Math.max(0, s - 30));
      setFeedback({
        isCorrect: false,
        title: `❌ Antídoto incorreto! O correto era: ${toxCase.antidote}`,
        explanation: toxCase.explanation,
        reference: toxCase.reference,
        tip: `Toxidrome: ${toxCase.toxidrome}. ${toxidromeDescriptions[toxCase.toxidromeType]?.key}`,
      });
    }
    setPhase("feedback");
  };

  const resetForNextCase = () => {
    const next = currentCase + 1;
    if (next >= cases.length) {
      setPhase("result");
    } else {
      setCurrentCase(next);
      setEvidencesFound([]);
      setLabsOrdered([]);
      setSelectedAntidote(null);
      setPatientStability(100);
      setTimeLeft(Math.round(cases[next].timerSeconds * conf.timerMult));
      setPhase("caseIntro");
    }
  };

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Detetive Toxicológico"
        setting="Pronto-Socorro — Centro de Informação Toxicológica"
        briefing="Pacientes chegam inconscientes ou deteriorando. Examine sinais vitais, identifique a toxidrome, colete evidências no cenário, solicite exames toxicológicos e administre o antídoto correto antes que o paciente piore."
        patientName="Central Toxicológica"
        patientAge="4 casos, 4 substâncias"
        patientHistory="Organofosforado, Paracetamol, Benzodiazepínico e Lítio. Cada caso é uma investigação completa com evidências, exames e toxidromes diferentes."
        onStart={() => setPhase("difficulty")}
        icon={<Search className="h-10 w-10 text-primary" />}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-xl font-bold">Selecione a dificuldade</h2>
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <Button size="lg" onClick={() => {
          setTimeLeft(Math.round(cases[0].timerSeconds * conf.timerMult));
          setPhase("caseIntro");
        }}>
          Iniciar Investigação
        </Button>
      </div>
    );
  }

  if (phase === "caseIntro") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
        <div className="rounded-full bg-amber-500/10 p-6">
          <Search className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold">{toxCase.title}</h2>
        <Card className="max-w-md w-full">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm">{toxCase.arrival}</p>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">⚠️ {toxCase.deteriorationWarning}</p>
            </div>
          </CardContent>
        </Card>
        <Button size="lg" onClick={() => setPhase("investigation")} className="gap-2">
          <Eye className="h-4 w-4" /> Iniciar Investigação
        </Button>
      </div>
    );
  }

  if (phase === "feedback") {
    return feedback ? (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={resetForNextCase}
      />
    ) : null;
  }

  if (phase === "result") {
    const maxScore = cases.reduce((s, c) => s + 200 + c.evidences.reduce((a, e) => a + e.points, 0) + c.labTests.filter(l => l.isKey).length * 40, 0);
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={casesSolved === cases.length ? "Detetive Toxicológico Mestre!" : `${casesSolved}/${cases.length} Casos Resolvidos`}
        subtitle={errors === 0 ? "Todos os antídotos corretos. Impressionante!" : "Revise as toxidromes e seus antídotos específicos."}
        onRestart={() => {
          setPhase("narrative");
          setScore(0);
          setErrors(0);
          setCurrentCase(0);
          setCasesSolved(0);
          setEvidencesFound([]);
          setLabsOrdered([]);
          setSelectedAntidote(null);
          setPatientStability(100);
        }}
        details={[
          { label: "Casos resolvidos", value: `${casesSolved}/${cases.length}` },
          { label: "Evidências coletadas", value: String(evidencesFound.length) },
          { label: "Exames solicitados", value: String(labsOrdered.length) },
          { label: "Antídotos errados", value: String(errors) },
        ]}
      />
    );
  }

  // Investigation phase
  if (phase === "diagnosis") {
    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-xl font-bold text-center">🎯 Diagnóstico Final</h2>
        <p className="text-center text-muted-foreground">Selecione o antídoto correto para {toxCase.title}</p>

        {conf.showHints && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3 text-sm">
              <p className="font-medium text-yellow-600 dark:text-yellow-400">💡 Toxidrome: {toxCase.toxidrome}</p>
              <p className="text-xs text-muted-foreground mt-1">{toxidromeDescriptions[toxCase.toxidromeType]?.symptoms}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-2">
          {toxCase.antidoteOptions.map(opt => (
            <Button
              key={opt}
              variant={selectedAntidote === opt ? "default" : "outline"}
              className="justify-start text-left h-auto py-3"
              onClick={() => setSelectedAntidote(opt)}
            >
              <Pill className="h-4 w-4 mr-2 shrink-0" /> {opt}
            </Button>
          ))}
        </div>

        <Button onClick={submitDiagnosis} className="w-full gap-2" size="lg" disabled={!selectedAntidote}>
          Confirmar Antídoto
        </Button>
      </div>
    );
  }

  // Investigation tabs
  const tabs: { key: InvTab; label: string; icon: React.ReactNode }[] = [
    { key: "vitals", label: "Sinais Vitais", icon: <Heart className="h-3.5 w-3.5" /> },
    { key: "exam", label: "Exame Físico", icon: <Eye className="h-3.5 w-3.5" /> },
    { key: "evidence", label: "Evidências", icon: <Search className="h-3.5 w-3.5" /> },
    { key: "labs", label: "Laboratório", icon: <Beaker className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="gap-1">
          <Clock className="h-3 w-3" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </Badge>
        <div className="flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-red-500" />
          <Progress value={patientStability} className="w-20 h-2" />
          <span className="text-xs">{patientStability}%</span>
        </div>
        <Badge variant="secondary">{score} pts</Badge>
        <Badge variant="outline">Caso {currentCase + 1}/{cases.length}</Badge>
        <Badge variant="outline">🔍 {evidencesFound.length}/{toxCase.evidences.length}</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "vitals" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2"><Thermometer className="h-4 w-4" /> Sinais Vitais</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(toxCase.vitals).map(([key, value]) => {
                const labels: Record<string, string> = { fc: "FC", pa: "PA", fr: "FR", temp: "Temp", spo2: "SpO₂", pupilas: "Pupilas", glasgow: "Glasgow" };
                const isAbnormal = value.includes("↓") || value.includes("↑");
                return (
                  <div key={key} className={`rounded-lg p-3 border ${isAbnormal ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800" : "border-border bg-muted/30"}`}>
                    <p className="text-[10px] text-muted-foreground uppercase">{labels[key] || key}</p>
                    <p className={`text-sm font-bold ${isAbnormal ? "text-red-600 dark:text-red-400" : ""}`}>{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "exam" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Exame Físico</h3>
            <div className="space-y-2">
              {toxCase.physicalExam.map((finding, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-sm">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2"><Search className="h-4 w-4" /> Evidências no Cenário</h3>
            <div className="space-y-2">
              {toxCase.evidences.map(ev => {
                const found = evidencesFound.includes(ev.id);
                return (
                  <Card key={ev.id} className={`cursor-pointer transition-all ${found ? "border-green-500/30 bg-green-50 dark:bg-green-950/20" : "hover:border-primary/40"}`}
                    onClick={() => findEvidence(ev.id)}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <span className="text-2xl">{ev.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{ev.name}</p>
                          <Badge variant="outline" className="text-[10px]">{ev.location}</Badge>
                        </div>
                        {found ? (
                          <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Clique para examinar</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "labs" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2"><Beaker className="h-4 w-4" /> Exames Laboratoriais</h3>
            <div className="space-y-2">
              {toxCase.labTests.map(lab => {
                const ordered = labsOrdered.includes(lab.id);
                return (
                  <Card key={lab.id} className={ordered && lab.isKey ? "border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{lab.name}</p>
                        {!ordered ? (
                          <Button size="sm" variant="outline" onClick={() => orderLab(lab.id)} className="text-xs">
                            Solicitar
                          </Button>
                        ) : (
                          <Badge variant={lab.isKey ? "default" : "secondary"} className="text-[10px]">
                            {lab.isKey ? "ALERTA" : "Resultado"}
                          </Badge>
                        )}
                      </div>
                      {ordered && <p className="text-sm mt-2 text-muted-foreground">{lab.result}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit diagnosis button */}
      <Button onClick={() => setPhase("diagnosis")} className="w-full gap-2" size="lg"
        variant={evidencesFound.length >= 2 ? "default" : "outline"}>
        <Pill className="h-4 w-4" /> Ir para Diagnóstico
      </Button>
    </div>
  );
}
