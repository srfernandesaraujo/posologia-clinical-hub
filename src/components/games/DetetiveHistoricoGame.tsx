import { useState, useEffect, useRef } from "react";
import { Search, MessageCircle, FileText, Eye, CheckCircle, ChevronRight, Clock, AlertTriangle, Lightbulb, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";

interface DialogOption {
  text: string;
  response: string;
  revealsClue?: string;
  points: number;
  isKey?: boolean;
}

interface Investigation {
  id: string;
  type: "interview" | "document" | "exam";
  icon: string;
  title: string;
  description: string;
  dialogs: DialogOption[];
  locked?: boolean;
  unlockClue?: string;
}

interface PatientCase {
  name: string;
  icon: string;
  patientName: string;
  patientAge: string;
  patientHistory: string;
  setting: string;
  briefing: string;
  timeLimitSeconds: number;
  investigations: Investigation[];
  finalDiagnosis: { question: string; options: { text: string; correct: boolean; explanation: string }[] };
}

const patientCases: PatientCase[] = [
  {
    name: "O Caso da Polifarmácia",
    icon: "💊",
    patientName: "Dona Conceição",
    patientAge: "78 anos, viúva, mora sozinha",
    patientHistory: "Encaminhada pela UBS após queda em casa. Traz sacola com 12 medicamentos. Confusa sobre horários e indicações.",
    setting: "Farmácia Clínica — Ambulatório de Geriatria",
    briefing: "A paciente apresenta sinais de polifarmácia e possíveis medicamentos potencialmente inapropriados. Investigue o histórico completo interrogando a paciente, analisando prescrições e exames.",
    timeLimitSeconds: 300,
    investigations: [
      {
        id: "interview1", type: "interview", icon: "💬", title: "Conversa Inicial",
        description: "A paciente parece confusa mas cooperativa.",
        dialogs: [
          { text: "Dona Conceição, quais remédios a senhora toma?", response: "Ah, meu filho... são tantos. Tem o da pressão, o pra dormir, o do estômago... não lembro todos.", points: 5 },
          { text: "A senhora toma os remédios sozinha?", response: "Sim, mas às vezes confundo os horários. Minha filha fez uma tabela, mas perdi.", points: 5, revealsClue: "tabela_perdida" },
          { text: "Teve alguma queda recentemente?", response: "Caí semana passada de noite indo ao banheiro. Estava tonta.", points: 10, revealsClue: "queda_noturna", isKey: true },
          { text: "A senhora sente sonolência durante o dia?", response: "Muito! Quase durmo sentada. E à noite não consigo dormir sem o comprimido azul.", points: 10, revealsClue: "sonolencia_diurna", isKey: true },
        ],
      },
      {
        id: "prescriptions", type: "document", icon: "📋", title: "Prescrições Médicas",
        description: "Três prescrições de médicos diferentes.",
        dialogs: [
          { text: "Analisar prescrição do cardiologista", response: "Losartana 50mg 12/12h, Amlodipina 10mg/dia, AAS 100mg/dia, Sinvastatina 40mg/noite.", points: 10 },
          { text: "Analisar prescrição do geriatra", response: "Omeprazol 20mg/dia, Diazepam 10mg/noite, Amitriptilina 25mg/noite, Cálcio + Vit D.", points: 10, revealsClue: "diazepam_idoso", isKey: true },
          { text: "Analisar prescrição do ortopedista", response: "Meloxicam 15mg/dia (pós-queda), Ciclobenzaprina 10mg 8/8h.", points: 5, revealsClue: "aine_idoso" },
          { text: "Verificar interações entre as prescrições", response: "⚠️ ALERTA: Diazepam + Amitriptilina = risco de sedação excessiva e quedas. Meloxicam + AAS = risco GI. Meloxicam + Losartana = risco renal.", points: 15, revealsClue: "interacoes_graves", isKey: true },
        ],
      },
      {
        id: "exams", type: "exam", icon: "🔬", title: "Exames Laboratoriais",
        description: "Resultados de exames recentes.",
        locked: true, unlockClue: "interacoes_graves",
        dialogs: [
          { text: "Função renal", response: "Creatinina: 1.4 mg/dL (↑). TFG estimada: 38 mL/min (DRC estágio 3b). Potássio: 5.1 mEq/L.", points: 10, revealsClue: "drc_3b", isKey: true },
          { text: "Hemograma", response: "Hb: 10.8 g/dL (anemia leve). VCM: 88 fL (normocítica). Plaquetas normais.", points: 5 },
          { text: "Glicemia e HbA1c", response: "Glicemia jejum: 98 mg/dL. HbA1c: 5.8%. Sem diabetes.", points: 5 },
          { text: "Hepatograma", response: "TGO: 45 U/L (↑). TGP: 52 U/L (↑). Possível hepatotoxicidade medicamentosa.", points: 10, revealsClue: "hepatotoxicidade" },
        ],
      },
      {
        id: "interview2", type: "interview", icon: "🔍", title: "Investigação Aprofundada",
        description: "Perguntas mais específicas após análise documental.",
        locked: true, unlockClue: "queda_noturna",
        dialogs: [
          { text: "A senhora sabe que o Diazepam pode causar quedas?", response: "O Diazepam? Aquele é pra dormir! Tomo há 5 anos, o doutor nunca disse isso.", points: 10 },
          { text: "Alguém revisou todos seus remédios juntos?", response: "Nunca! Cada médico passa o dele. Ninguém olha o todo.", points: 5, isKey: true },
          { text: "A senhora compra algum remédio sem receita?", response: "Às vezes compro Dorflex quando dói as costas. E tomo um chá de boldo todo dia.", points: 10, revealsClue: "automedicacao" },
          { text: "Como está seu apetite e peso?", response: "Emagreci 4kg nos últimos 2 meses. Sinto enjoo às vezes.", points: 5 },
        ],
      },
    ],
    finalDiagnosis: {
      question: "Com base na investigação, qual é o principal problema farmacoterapêutico desta paciente?",
      options: [
        { text: "Subdosagem de anti-hipertensivos", correct: false, explanation: "A PA está controlada com losartana + amlodipina. O problema principal não é a dose." },
        { text: "Polifarmácia com medicamentos potencialmente inapropriados para idosos (Critérios de Beers)", correct: true, explanation: "Diazepam e Amitriptilina estão nos Critérios de Beers como MPI para idosos ≥65 anos. A sedação excessiva causou a queda. Meloxicam piora a função renal já comprometida. Necessidade urgente de reconciliação medicamentosa." },
        { text: "Diabetes não diagnosticada", correct: false, explanation: "HbA1c 5.8% está no limite, mas não configura diabetes. Não é o problema principal." },
        { text: "Infecção urinária causando confusão", correct: false, explanation: "Não há dados laboratoriais que sugiram ITU. A confusão é mais compatível com efeito anticolinérgico da amitriptilina." },
      ],
    },
  },
  {
    name: "O Mistério da Alergia",
    icon: "🚨",
    patientName: "Lucas Ferreira",
    patientAge: "28 anos, engenheiro",
    patientHistory: "Deu entrada na emergência com edema labial e urticária após tomar um medicamento prescrito pela dentista. Angioedema leve.",
    setting: "Pronto-Socorro — Sala de Observação",
    briefing: "O paciente precisa de antibiótico para infecção dentária mas refere 'alergia a penicilina'. Investigue a verdadeira natureza dessa alergia para definir a conduta segura.",
    timeLimitSeconds: 240,
    investigations: [
      {
        id: "interview1", type: "interview", icon: "💬", title: "Anamnese Alérgica",
        description: "Investigar o histórico de alergia.",
        dialogs: [
          { text: "O que aconteceu quando tomou penicilina?", response: "Quando era criança, uns 8 anos, minha mãe disse que eu tive alergia. Me deram amoxicilina e fiquei cheio de bolinhas vermelhas.", points: 10, revealsClue: "alergia_infancia", isKey: true },
          { text: "Você lembra se teve falta de ar ou inchaço?", response: "Não lembro de nada disso. Minha mãe só disse que fiquei com 'perebas' pelo corpo.", points: 10 },
          { text: "Já tomou algum antibiótico depois disso?", response: "Sim, já tomei azitromicina e levofloxacino sem problemas.", points: 5 },
          { text: "E hoje, o que a dentista prescreveu?", response: "Ela passou clindamicina 300mg porque eu disse que era alérgico. Depois de 2 doses comecei a ter coceira e inchaço no lábio.", points: 15, revealsClue: "reacao_clindamicina", isKey: true },
        ],
      },
      {
        id: "prescriptions", type: "document", icon: "📋", title: "Histórico de Prescrições",
        description: "Registros anteriores do sistema.",
        dialogs: [
          { text: "Buscar registros de infância", response: "Registro de 2004: 'Paciente com exantema maculopapular após amoxicilina. Sem angioedema ou anafilaxia. Provável reação viral.'", points: 15, revealsClue: "reacao_viral", isKey: true },
          { text: "Verificar prescrição da dentista", response: "Clindamicina 300mg 8/8h por 7 dias. Indicação: abscesso periapical. Nota: 'paciente refere alergia a penicilina'.", points: 5 },
          { text: "Buscar alergias no prontuário eletrônico", response: "Alerta do sistema: 'ALERGIA: PENICILINA' — cadastrado pela mãe em 2004, nunca reavaliado.", points: 10, isKey: true },
        ],
      },
      {
        id: "exams", type: "exam", icon: "🔬", title: "Testes Alérgicos",
        description: "Solicitar testes complementares.",
        locked: true, unlockClue: "reacao_viral",
        dialogs: [
          { text: "Solicitar IgE específica para penicilina", response: "Resultado: NEGATIVO. IgE < 0.1 kU/L. Baixa probabilidade de alergia mediada por IgE.", points: 15, revealsClue: "ige_negativo", isKey: true },
          { text: "Solicitar triptase sérica", response: "Triptase: 8.5 ng/mL (normal <11.5). Sem evidência de desgranulação mastocitária recente.", points: 10 },
          { text: "Solicitar IgE para clindamicina", response: "Não disponível como teste padronizado. Reação à clindamicina é geralmente não-IgE mediada.", points: 5 },
        ],
      },
    ],
    finalDiagnosis: {
      question: "Qual é a conduta farmacológica mais adequada para o abscesso dentário deste paciente?",
      options: [
        { text: "Manter clindamicina e adicionar anti-histamínico", correct: false, explanation: "O paciente teve reação à clindamicina. Continuar o mesmo fármaco com anti-histamínico não é seguro." },
        { text: "Trocar para azitromicina 500mg por 3 dias", correct: false, explanation: "Azitromicina é opção, mas não é primeira linha para abscesso dentário. Há uma opção melhor." },
        { text: "Realizar teste de provocação oral com amoxicilina e, se negativo, prescrevê-la", correct: true, explanation: "A 'alergia à penicilina' na infância foi provavelmente exantema viral (comum em crianças). IgE negativa. >90% dos pacientes rotulados como alérgicos a penicilina NÃO são. Desrotulação segura com teste de provocação permite uso do antibiótico mais eficaz." },
        { text: "Prescrever metronidazol isoladamente", correct: false, explanation: "Metronidazol em monoterapia não é ideal para abscesso dentário com flora aeróbia e anaeróbia mista." },
      ],
    },
  },
  {
    name: "O Idoso Polimedicado",
    icon: "👴",
    patientName: "Sr. Benedito",
    patientAge: "82 anos, aposentado",
    patientHistory: "Internado por confusão mental e queda. Cuidadora relata que ele 'não é mais o mesmo' há 2 semanas.",
    setting: "Enfermaria de Clínica Médica — Hospital Regional",
    briefing: "Investigue se a confusão mental tem origem medicamentosa. O paciente usa 14 medicamentos prescritos por 4 especialistas diferentes.",
    timeLimitSeconds: 360,
    investigations: [
      {
        id: "interview1", type: "interview", icon: "💬", title: "Entrevista com Cuidadora",
        description: "Dona Rosa acompanha o paciente há 3 anos.",
        dialogs: [
          { text: "O que mudou nas últimas 2 semanas?", response: "Ele começou a ver coisas que não existem, falar sozinho. Antes era lúcido, jogava dominó todo dia.", points: 10, revealsClue: "alucinacoes", isKey: true },
          { text: "Algum medicamento novo foi introduzido?", response: "Sim! O urologista passou um remédio novo pra bexiga há 15 dias. E o cardiologista trocou o remédio da pressão.", points: 15, revealsClue: "novo_medicamento", isKey: true },
          { text: "Ele está bebendo água normalmente?", response: "Pouca. Quase não bebe água. Eu insisto mas ele recusa.", points: 5, revealsClue: "desidratacao" },
          { text: "Como está a alimentação?", response: "Come muito pouco. Perdeu 3kg esse mês.", points: 5 },
        ],
      },
      {
        id: "prescriptions", type: "document", icon: "📋", title: "Lista de Medicamentos",
        description: "14 medicamentos de 4 prescritores.",
        dialogs: [
          { text: "Medicamentos do cardiologista", response: "Metoprolol 100mg/dia, Furosemida 40mg/dia, Espironolactona 25mg/dia, Digoxina 0.25mg/dia, Varfarina dose variável.", points: 10, revealsClue: "digoxina", isKey: true },
          { text: "Medicamentos do geriatra", response: "Donepezila 10mg/noite, Memantina 20mg/dia, Quetiapina 25mg/noite, Sertralina 50mg/dia.", points: 10 },
          { text: "Medicamentos do urologista", response: "Oxibutinina 5mg 8/8h — INICIADO HÁ 15 DIAS. Tansulosina 0.4mg/dia.", points: 15, revealsClue: "oxibutinina", isKey: true },
          { text: "Calcular carga anticolinérgica", response: "⚠️ CARGA ANTICOLINÉRGICA ALTA: Oxibutinina (3) + Amitriptilina (3) + Quetiapina (1) = Score 7. Risco elevado de delirium!", points: 15, revealsClue: "carga_anticolinergica", isKey: true },
        ],
      },
      {
        id: "exams", type: "exam", icon: "🔬", title: "Exames de Admissão",
        description: "Resultados da internação.",
        locked: true, unlockClue: "oxibutinina",
        dialogs: [
          { text: "Função renal e eletrólitos", response: "Creatinina: 1.8 mg/dL. TFG: 32 mL/min. Na+: 128 mEq/L (↓). K+: 5.3 mEq/L (↑).", points: 10, revealsClue: "hiponatremia", isKey: true },
          { text: "Nível sérico de digoxina", response: "Digoxina sérica: 2.8 ng/mL (terapêutico: 0.5-2.0). TOXICIDADE DIGITÁLICA!", points: 15, revealsClue: "toxicidade_digoxina", isKey: true },
          { text: "EAS e urocultura", response: "EAS: sem leucocitúria. Urocultura: sem crescimento. ITU descartada.", points: 5 },
          { text: "TC de crânio", response: "Sem lesões agudas. Atrofia cortical difusa compatível com idade.", points: 5 },
        ],
      },
    ],
    finalDiagnosis: {
      question: "Qual é a principal causa da confusão mental aguda deste paciente?",
      options: [
        { text: "Progressão da doença de Alzheimer", correct: false, explanation: "Alzheimer causa declínio gradual, não quadro agudo com alucinações em 2 semanas. O quadro é de delirium." },
        { text: "Delirium por carga anticolinérgica elevada + toxicidade digitálica", correct: true, explanation: "A introdução de oxibutinina (anticolinérgico potente) elevou a carga anticolinérgica para 7. Somado à intoxicação digitálica (nível 2.8, facilitada pela DRC e desidratação), explica o quadro de delirium hiperativo com alucinações. Conduta: suspender oxibutinina, suspender digoxina, hidratar, monitorar níveis." },
        { text: "AVC isquêmico silencioso", correct: false, explanation: "TC de crânio sem lesões agudas. O quadro flutuante é mais compatível com delirium que AVC." },
        { text: "Infecção urinária com delirium", correct: false, explanation: "EAS e urocultura negativos. ITU foi descartada como causa." },
      ],
    },
  },
];

export default function DetetiveHistoricoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "diagnosis" | "result">("select");
  const [caseIdx, setCaseIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [score, setScore] = useState(0);
  const [cluesFound, setCluesFound] = useState<Set<string>>(new Set());
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [activeInvestigation, setActiveInvestigation] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [diagnosisCorrect, setDiagnosisCorrect] = useState<boolean | null>(null);
  const [diagnosisExplanation, setDiagnosisExplanation] = useState("");
  const timerRef = useRef<number | null>(null);

  const caseData = patientCases[caseIdx];

  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startGame = () => {
    setScore(0);
    setCluesFound(new Set());
    setAskedQuestions(new Set());
    setActiveInvestigation(null);
    setTimer(0);
    setDiagnosisCorrect(null);
    setPhase("playing");
  };

  const keyCluesCount = caseData.investigations.flatMap(i => i.dialogs).filter(d => d.isKey).length;
  const foundKeyClues = caseData.investigations.flatMap(i => i.dialogs).filter(d => d.isKey && d.revealsClue && cluesFound.has(d.revealsClue)).length;

  const askQuestion = (invId: string, dialogIdx: number) => {
    const key = `${invId}-${dialogIdx}`;
    if (askedQuestions.has(key)) return;
    setAskedQuestions(prev => new Set(prev).add(key));

    const inv = caseData.investigations.find(i => i.id === invId);
    if (!inv) return;
    const dialog = inv.dialogs[dialogIdx];
    setScore(s => s + dialog.points);
    if (dialog.revealsClue) {
      setCluesFound(prev => new Set(prev).add(dialog.revealsClue!));
    }
  };

  const isUnlocked = (inv: Investigation) => {
    if (!inv.locked) return true;
    return inv.unlockClue ? cluesFound.has(inv.unlockClue) : false;
  };

  const handleDiagnosis = (optIdx: number) => {
    const opt = caseData.finalDiagnosis.options[optIdx];
    setDiagnosisCorrect(opt.correct);
    setDiagnosisExplanation(opt.explanation);
    if (opt.correct) setScore(s => s + 30);
    setTimeout(() => setPhase("result"), 2000);
  };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Detetive do Histórico Farmacoterapêutico</h2>
        <p className="text-center text-muted-foreground text-sm">Escolha o caso clínico para investigar</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {patientCases.map((c, i) => (
            <button
              key={i}
              onClick={() => setCaseIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                caseIdx === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <p className="font-semibold text-foreground mt-2">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.patientName}, {c.patientAge}</p>
            </button>
          ))}
        </div>

        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setPhase("narrative")} className="gap-2">Continuar</Button>
        </div>
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title={caseData.name}
        setting={caseData.setting}
        patientName={caseData.patientName}
        patientAge={caseData.patientAge}
        patientHistory={caseData.patientHistory}
        briefing={caseData.briefing}
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Search className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    return (
      <GameStarsResult
        score={score}
        maxScore={caseData.investigations.flatMap(i => i.dialogs).reduce((sum, d) => sum + d.points, 0) + 30}
        errors={diagnosisCorrect ? 0 : 1}
        timeSeconds={timer}
        title={diagnosisCorrect ? "Caso Resolvido!" : "Diagnóstico Incompleto"}
        subtitle={diagnosisExplanation}
        onRestart={startGame}
        onBack={() => setPhase("select")}
        details={[
          { label: "Caso", value: caseData.name },
          { label: "Pistas-chave encontradas", value: `${foundKeyClues}/${keyCluesCount}` },
          { label: "Perguntas realizadas", value: `${askedQuestions.size}` },
        ]}
      />
    );
  }

  if (phase === "diagnosis") {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Diagnóstico Final</h2>
          <p className="text-muted-foreground text-sm">Pistas-chave: {foundKeyClues}/{keyCluesCount}</p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <p className="font-medium text-foreground">{caseData.finalDiagnosis.question}</p>
            <div className="space-y-2">
              {caseData.finalDiagnosis.options.map((opt, i) => (
                <Button
                  key={i}
                  variant={diagnosisCorrect !== null ? (opt.correct ? "default" : "outline") : "outline"}
                  className="w-full justify-start text-left text-sm h-auto py-3 whitespace-normal"
                  onClick={() => handleDiagnosis(i)}
                  disabled={diagnosisCorrect !== null}
                >
                  {opt.text}
                </Button>
              ))}
            </div>
            {diagnosisCorrect !== null && (
              <div className={`p-3 rounded-lg text-sm ${diagnosisCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {diagnosisExplanation}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing phase
  const activeInv = caseData.investigations.find(i => i.id === activeInvestigation);
  const timeLeft = Math.max(0, caseData.timeLimitSeconds - timer);
  const timeProgress = (timeLeft / caseData.timeLimitSeconds) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{caseData.icon}</span>
          <h3 className="font-bold text-foreground text-sm">{caseData.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Pontos: {score}</Badge>
          <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="font-mono gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </Badge>
        </div>
      </div>

      <Progress value={timeProgress} className={`h-1.5 ${timeLeft < 60 ? "[&>div]:bg-destructive" : ""}`} />

      {/* Clue progress */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        Pistas-chave: {foundKeyClues}/{keyCluesCount}
        {foundKeyClues >= keyCluesCount * 0.6 && (
          <Button size="sm" variant="default" className="ml-auto text-xs h-7" onClick={() => setPhase("diagnosis")}>
            Fazer Diagnóstico <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!activeInv ? (
        /* Investigation selection */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {caseData.investigations.map((inv) => {
            const unlocked = isUnlocked(inv);
            const questionsAsked = inv.dialogs.filter((_, di) => askedQuestions.has(`${inv.id}-${di}`)).length;
            return (
              <button
                key={inv.id}
                onClick={() => unlocked && setActiveInvestigation(inv.id)}
                disabled={!unlocked}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  !unlocked ? "border-border bg-muted/50 opacity-60 cursor-not-allowed" : "border-border bg-card hover:border-primary/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{unlocked ? inv.icon : "🔒"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{inv.title}</p>
                    <p className="text-xs text-muted-foreground">{unlocked ? inv.description : "Desbloqueie encontrando pistas"}</p>
                  </div>
                  {questionsAsked > 0 && (
                    <Badge variant="outline" className="text-xs">{questionsAsked}/{inv.dialogs.length}</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Active investigation */
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveInvestigation(null)} className="gap-1 text-xs">
            ← Voltar às investigações
          </Button>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <span>{activeInv.icon}</span> {activeInv.title}
          </h3>
          <div className="space-y-2">
            {activeInv.dialogs.map((dialog, di) => {
              const key = `${activeInv.id}-${di}`;
              const asked = askedQuestions.has(key);
              return (
                <Card key={di} className={`transition-all ${asked ? "bg-muted/30" : "hover:border-primary/50 cursor-pointer"}`}>
                  <CardContent className="p-4">
                    <button
                      onClick={() => askQuestion(activeInv.id, di)}
                      disabled={asked}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className={`h-4 w-4 shrink-0 mt-0.5 ${asked ? "text-muted-foreground" : "text-primary"}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${asked ? "text-muted-foreground" : "text-foreground"}`}>{dialog.text}</p>
                          {asked && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-sm text-foreground animate-fade-in">
                              "{dialog.response}"
                              {dialog.isKey && (
                                <Badge variant="default" className="ml-2 text-xs">Pista-chave!</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {!asked && <Badge variant="outline" className="text-xs shrink-0">+{dialog.points}pts</Badge>}
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-2 pt-2">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar</Button>
        {foundKeyClues >= 3 && (
          <Button onClick={() => setPhase("diagnosis")} size="sm" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Diagnóstico Final
          </Button>
        )}
      </div>
    </div>
  );
}
