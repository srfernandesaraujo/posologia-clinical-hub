import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, ChevronRight, RotateCcw, Award, MessageCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "conducao-caso";

interface StudentPersona {
  name: string;
  profile: string;
  emoji: string;
}

interface Moment {
  situation: string;
  studentSpeaking: string;
  persona: string;
  options: { text: string; score: number; type: "facilitador" | "palestrante" | "omisso"; feedback: string }[];
}

interface PBLCase {
  title: string;
  context: string;
  students: StudentPersona[];
  moments: Moment[];
}

const PBL_CASES: PBLCase[] = [
  {
    title: "Caso: Polifarmácia em Idoso na UBS",
    context: "Você é facilitador de um grupo PBL com 6 alunos do 4º ano de Farmácia. O caso apresentado é de um idoso de 82 anos usando 9 medicamentos, com queixa de tontura e queda recente. Os alunos devem identificar PRMs e propor intervenções.",
    students: [
      { name: "João", profile: "Dominante, fala muito, às vezes com informações incorretas", emoji: "🗣️" },
      { name: "Letícia", profile: "Tímida, sabe muito mas raramente se manifesta", emoji: "🤫" },
      { name: "Pedro", profile: "Errado mas confiante — defende posições incorretas com convicção", emoji: "💪" },
      { name: "Sofia", profile: "Questionadora, desafia o professor e colegas", emoji: "🤔" },
    ],
    moments: [
      {
        situation: "Início da discussão. O grupo está em silêncio após ler o caso.",
        studentSpeaking: "Ninguém fala. Silêncio de 30 segundos.",
        persona: "Grupo",
        options: [
          { text: "\"Quais são as primeiras impressões de vocês sobre este caso? O que chamou atenção?\"", score: 3, type: "facilitador", feedback: "Pergunta aberta que convida participação sem direcionar." },
          { text: "\"O problema aqui é a polifarmácia. Vamos listar os medicamentos.\"", score: 0, type: "palestrante", feedback: "Você deu a resposta! O grupo deveria chegar a essa conclusão sozinho." },
          { text: "Esperar mais 2 minutos em silêncio.", score: 1, type: "omisso", feedback: "Silêncio pode ser pedagógico, mas 30s já é suficiente. O grupo precisa de estímulo." },
          { text: "\"João, o que você acha que está acontecendo com este paciente?\"", score: 2, type: "facilitador", feedback: "Nomear um aluno funciona, mas pode intimidar. Preferir perguntas ao grupo primeiro." },
        ],
      },
      {
        situation: "João começa a dominar a discussão, falando sem parar.",
        studentSpeaking: "🗣️ João: \"Obviamente o problema são os benzodiazepínicos. Eu li que todos causam queda. Tem que tirar todos. E o omeprazol também não serve pra nada, tem que tirar...\" (continua por 3 minutos)",
        persona: "João",
        options: [
          { text: "\"João, obrigado pela contribuição. Letícia, Sofia — vocês concordam com essa análise? Há outras perspectivas?\"", score: 3, type: "facilitador", feedback: "Excelente! Valida, redireciona e inclui alunos quietos sem constranger." },
          { text: "\"João, nem todos os BZD causam o mesmo risco de queda. Você está generalizando.\"", score: 1, type: "palestrante", feedback: "Corrige diretamente — o grupo deveria fazer isso. Você ensinou, não facilitou." },
          { text: "Deixar João continuar falando.", score: 0, type: "omisso", feedback: "Permitir que um aluno domine prejudica o aprendizado de todos." },
          { text: "\"Grupo, alguém gostaria de complementar ou questionar o que o João trouxe?\"", score: 2, type: "facilitador", feedback: "Bom! Abre para contra-argumentos sem constranger João." },
        ],
      },
      {
        situation: "Pedro defende com convicção que \"omeprazol causa osteoporose em 1 semana\".",
        studentSpeaking: "💪 Pedro: \"Isso é fato, eu vi num site. Omeprazol destrói os ossos rapidamente. Tem que suspender imediatamente.\"",
        persona: "Pedro",
        options: [
          { text: "\"Pedro, essa é uma preocupação real. O que a literatura baseada em evidências diz sobre o tempo necessário para esse efeito? Alguém pode pesquisar?\"", score: 3, type: "facilitador", feedback: "Valida a preocupação, questiona a evidência e delega a busca ao grupo. Perfeito!" },
          { text: "\"Isso está errado, Pedro. O risco é com uso prolongado (>1 ano), não em 1 semana.\"", score: 1, type: "palestrante", feedback: "Correto factualmente, mas você deu a resposta. O grupo perdeu a oportunidade de aprender a buscar evidência." },
          { text: "\"Interessante. Sofia, o que você acha dessa afirmação?\"", score: 2, type: "facilitador", feedback: "Bom! Usa a questionadora natural do grupo para desafiar a afirmação." },
          { text: "Ignorar e mudar de assunto.", score: 0, type: "omisso", feedback: "Informação errada não corrigida se consolida como aprendizado incorreto." },
        ],
      },
      {
        situation: "Letícia está claramente desconfortável e não participou ainda.",
        studentSpeaking: "🤫 Letícia olha para baixo e anota algo no caderno.",
        persona: "Letícia",
        options: [
          { text: "\"Letícia, percebi que você anotou algo. Gostaria de compartilhar sua reflexão com o grupo?\"", score: 3, type: "facilitador", feedback: "Convite gentil baseado em observação. Valoriza sem expor." },
          { text: "\"Letícia, responda: quais interações medicamentosas você identificou?\"", score: 1, type: "palestrante", feedback: "Pergunta direta demais para aluna tímida. Pode gerar mais ansiedade." },
          { text: "Não fazer nada — ela participará quando quiser.", score: 0, type: "omisso", feedback: "Alunos tímidos raramente se manifestam espontaneamente. O facilitador deve criar oportunidades." },
          { text: "\"Grupo, vamos fazer uma rodada rápida. Cada um compartilha uma observação. Podemos começar pela Letícia?\"", score: 2, type: "facilitador", feedback: "Estrutura dá segurança, mas começar pela tímida pode ser intimidante." },
        ],
      },
      {
        situation: "Sofia questiona a relevância do caso.",
        studentSpeaking: "🤔 Sofia: \"Professor, mas isso é muito básico. Qualquer um sabe que tem que revisar medicamentos de idoso. Qual é o desafio real aqui?\"",
        persona: "Sofia",
        options: [
          { text: "\"Ótima provocação, Sofia. Então vamos aprofundar: se vocês fossem o farmacêutico desta UBS, como priorizariam quais medicamentos revisar primeiro? Qual critério usariam?\"", score: 3, type: "facilitador", feedback: "Transforma o desafio em oportunidade de aprofundamento. Usa a energia da aluna a favor." },
          { text: "\"O caso não é tão simples quanto parece. Preste mais atenção.\"", score: 0, type: "palestrante", feedback: "Resposta defensiva que cria antagonismo." },
          { text: "\"Você acha básico? Então me diga todos os PRMs deste caso.\"", score: 0, type: "palestrante", feedback: "Tom desafiador/competitivo. O facilitador não deve 'testar' para provar dificuldade." },
          { text: "\"Se o grupo concorda que é simples, que tal proporem um plano de desprescrição com cronograma?\"", score: 2, type: "facilitador", feedback: "Bom! Eleva a complexidade de forma natural." },
        ],
      },
    ],
  },
];

export default function SimuladorConducaoCaso() {
  const navigate = useNavigate();
  const { isVirtualRoom, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [caseIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  const pblCase = PBL_CASES[caseIdx];
  const moment = pblCase.moments[step];

  const handleConfirm = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (step < pblCase.moments.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const totalScore = answers.reduce((acc, optIdx, i) => acc + pblCase.moments[i].options[optIdx].score, 0);
  const maxScore = pblCase.moments.length * 3;
  const pct = Math.round((totalScore / maxScore) * 100);

  const facilitadorCount = answers.filter((optIdx, i) => pblCase.moments[i].options[optIdx].type === "facilitador").length;
  const palestranteCount = answers.filter((optIdx, i) => pblCase.moments[i].options[optIdx].type === "palestrante").length;
  const omissoCount = answers.filter((optIdx, i) => pblCase.moments[i].options[optIdx].type === "omisso").length;

  useEffect(() => {
    if (isVirtualRoom && showResult && !submitted) {
      submitResults({ score: pct, actions: { answers, facilitadorCount, palestranteCount, omissoCount } });
    }
  }, [showResult]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const handleRestart = () => {
    setStep(0);
    setAnswers([]);
    setSelected(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isVirtualRoom ? "/" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Condução de Caso Clínico (PBL/TBL)</h1>
          <p className="text-muted-foreground text-sm">Treine a facilitação de discussões em grupo</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Case Context */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {pblCase.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{pblCase.context}</p>
          <div className="flex flex-wrap gap-2">
            {pblCase.students.map((s) => (
              <Badge key={s.name} variant="outline" className="gap-1">
                {s.emoji} {s.name} — {s.profile}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Moments */}
      {!showResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Momento {step + 1}/{pblCase.moments.length}</CardTitle>
              <Badge variant="outline">{Math.round((step / pblCase.moments.length) * 100)}%</Badge>
            </div>
            <Progress value={(step / pblCase.moments.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground italic">{moment.situation}</p>
            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <MessageCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-sm">{moment.studentSpeaking}</p>
            </div>
            <p className="text-sm font-medium">Como você intervém?</p>
            <div className="space-y-2">
              {moment.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                    selected === i ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div className={`p-3 rounded-lg text-sm ${
                moment.options[selected].type === "facilitador" ? "bg-emerald-500/10" : moment.options[selected].type === "palestrante" ? "bg-amber-500/10" : "bg-destructive/10"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{moment.options[selected].type === "facilitador" ? "🟢 Facilitador" : moment.options[selected].type === "palestrante" ? "🟡 Palestrante" : "🔴 Omisso"}</Badge>
                  <Badge variant="outline">{moment.options[selected].score}/3</Badge>
                </div>
                <p>{moment.options[selected].feedback}</p>
              </div>
            )}
            <Button onClick={handleConfirm} disabled={selected === null} className="w-full gap-2">
              {step < pblCase.moments.length - 1 ? <>Próximo Momento <ChevronRight className="h-4 w-4" /></> : "Ver Resultado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {showResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Perfil de Facilitação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {(!isVirtualRoom || showFeedbackVR) && (
              <>
                <div className="text-center py-4">
                  <div className={`text-5xl font-bold mb-2 ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{pct}%</div>
                  <p className="text-muted-foreground text-sm">
                    {pct >= 75 ? "Excelente facilitador!" : pct >= 50 ? "Bom, mas tendência a 'dar aula'." : "Mais palestrante que facilitador. Pratique mais!"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-500/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-600">{facilitadorCount}</div>
                    <p className="text-xs text-muted-foreground">Facilitador</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-amber-600">{palestranteCount}</div>
                    <p className="text-xs text-muted-foreground">Palestrante</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-destructive">{omissoCount}</div>
                    <p className="text-xs text-muted-foreground">Omisso</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  {pblCase.moments.map((m, i) => {
                    const chosen = m.options[answers[i]];
                    return (
                      <div key={i} className={`p-3 rounded-lg border text-sm ${chosen.type === "facilitador" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                        <p className="text-muted-foreground italic text-xs">{m.situation}</p>
                        <p className="mt-1">Sua escolha: "{chosen.text}"</p>
                        <p className="text-muted-foreground mt-1">{chosen.feedback}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">📚 Referências</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Barrows HS. <em>Problem-Based Learning in Medicine</em>. Springer, 1980.</li>
                    <li>• Michaelsen LK, et al. <em>Team-Based Learning</em>. Stylus Publishing, 2004.</li>
                    <li>• Dolmans DHJM, et al. Problem-based learning: future challenges for educational practice and research. Med Educ. 2005;39(7):732-41.</li>
                  </ul>
                </div>
                {!isVirtualRoom && <Button onClick={handleRestart} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Reiniciar</Button>}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
