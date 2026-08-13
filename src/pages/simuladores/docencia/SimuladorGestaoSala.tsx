import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldAlert, ChevronRight, RotateCcw, Award, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "gestao-sala";

interface Incident {
  id: string;
  title: string;
  situation: string;
  category: string;
  options: { text: string; score: number; dimensions: { assertividade: number; empatia: number; ambiente: number }; feedback: string }[];
}

const INCIDENTS: Incident[] = [
  {
    id: "i1", title: "Aluno questiona competência", category: "Confronto",
    situation: "Durante sua aula sobre farmacocinética, um aluno levanta a mão e diz: \"Professor(a), com todo respeito, mas eu assisti um vídeo no YouTube de um farmacêutico famoso que explica isso de um jeito completamente diferente. Acho que o senhor(a) está errado(a).\" A turma toda olha para você.",
    options: [
      { text: "\"Que bom que você busca outras fontes! Pode compartilhar o ponto específico que diverge? Vamos analisar juntos com base na literatura primária.\"", score: 3, dimensions: { assertividade: 3, empatia: 3, ambiente: 3 }, feedback: "Excelente! Valida a curiosidade, convida análise crítica e transforma em momento de aprendizagem." },
      { text: "\"Eu tenho doutorado nesta área. O vídeo pode estar simplificando demais.\"", score: 1, dimensions: { assertividade: 2, empatia: 0, ambiente: 1 }, feedback: "Apelar para autoridade gera resistência. O aluno não se sentirá acolhido." },
      { text: "\"YouTube não é fonte confiável. Vamos seguir com a aula.\"", score: 0, dimensions: { assertividade: 1, empatia: 0, ambiente: 0 }, feedback: "Desqualifica a fonte sem análise e silencia o aluno. Péssimo para o ambiente." },
      { text: "\"Interessante. Vamos anotar essa dúvida e na próxima aula trago a comparação com a referência original.\"", score: 2, dimensions: { assertividade: 2, empatia: 2, ambiente: 2 }, feedback: "Bom! Não resolve na hora, mas mostra respeito e compromisso." },
    ],
  },
  {
    id: "i2", title: "Crise emocional de aluno", category: "Emocional",
    situation: "Durante uma atividade prática de dispensação, uma aluna começa a chorar silenciosamente. Você percebe que ela está com dificuldade de concentração e os olhos vermelhos. Outros alunos começam a perceber.",
    options: [
      { text: "Aproximar-se discretamente e perguntar em voz baixa: \"Está tudo bem? Quer conversar um momento lá fora?\"", score: 3, dimensions: { assertividade: 2, empatia: 3, ambiente: 3 }, feedback: "Perfeito! Acolhe com discrição, oferece espaço seguro sem expor." },
      { text: "\"O que aconteceu? Está chorando por quê?\" (em voz alta, na frente da turma)", score: 0, dimensions: { assertividade: 1, empatia: 0, ambiente: 0 }, feedback: "Expõe a aluna publicamente. Constrangedor e invasivo." },
      { text: "Ignorar e continuar a aula normalmente.", score: 0, dimensions: { assertividade: 0, empatia: 0, ambiente: 1 }, feedback: "Negligência emocional. O aluno em sofrimento não aprende e precisa de acolhimento." },
      { text: "Interromper a atividade e dizer à turma: \"Vamos fazer uma pausa de 5 minutos.\"", score: 2, dimensions: { assertividade: 2, empatia: 2, ambiente: 2 }, feedback: "Cria oportunidade de atenção sem expor diretamente, mas pode chamar atenção indiretamente." },
    ],
  },
  {
    id: "i3", title: "Turma não fez leitura prévia", category: "Engajamento",
    situation: "Você planejou uma atividade de sala invertida sobre interações medicamentosas. Ao iniciar a discussão, percebe que apenas 2 de 30 alunos fizeram a leitura prévia. A atividade planejada é inviável.",
    options: [
      { text: "\"Entendo que a leitura não aconteceu. Vamos adaptar: faremos a leitura coletiva dos pontos-chave agora (15 min) e depois a discussão. Para a próxima, usaremos um quiz de entrada.\"", score: 3, dimensions: { assertividade: 3, empatia: 2, ambiente: 3 }, feedback: "Excelente! Adapta sem punir, resolve o presente e previne o futuro com estratégia." },
      { text: "\"Quem não leu, zero de participação. Vou dar aula expositiva.\"", score: 0, dimensions: { assertividade: 2, empatia: 0, ambiente: 0 }, feedback: "Punitivo e abandonou a metodologia ativa. Não resolve o problema estruturalmente." },
      { text: "\"Vou devolver a responsabilidade: formem grupos, os 2 que leram liderem a discussão.\"", score: 2, dimensions: { assertividade: 2, empatia: 1, ambiente: 2 }, feedback: "Criativo, mas sobrecarrega os alunos preparados." },
      { text: "Dar a aula normalmente, fingindo que a leitura não era obrigatória.", score: 1, dimensions: { assertividade: 0, empatia: 1, ambiente: 1 }, feedback: "Evita confronto mas normaliza a não-preparação. Sem consequência, repetirá." },
    ],
  },
  {
    id: "i4", title: "Suspeita de cola em prova", category: "Integridade",
    situation: "Durante uma prova, você percebe dois alunos trocando olhares suspeitos e um deles posiciona a prova de forma que o outro possa ver. Não tem certeza absoluta de que houve cola.",
    options: [
      { text: "Aproximar-se silenciosamente, reposicionar-se entre os dois e dizer em voz baixa: \"Por favor, cubram suas provas.\" Registrar o ocorrido para conversar após a prova.", score: 3, dimensions: { assertividade: 3, empatia: 2, ambiente: 3 }, feedback: "Excelente! Interrompe sem acusar, preserva dignidade e documenta." },
      { text: "\"Vocês dois, pegos colando! Prova anulada!\" (em voz alta)", score: 0, dimensions: { assertividade: 3, empatia: 0, ambiente: 0 }, feedback: "Acusação pública sem evidência concreta. Pode ser injusto e gera humilhação." },
      { text: "Não fazer nada por não ter certeza absoluta.", score: 1, dimensions: { assertividade: 0, empatia: 1, ambiente: 0 }, feedback: "Omissão prejudica a integridade acadêmica e os alunos honestos." },
      { text: "Trocar as provas dos dois de lugar e continuar observando.", score: 2, dimensions: { assertividade: 2, empatia: 2, ambiente: 2 }, feedback: "Resolve parcialmente sem confronto direto, mas não aborda o comportamento." },
    ],
  },
  {
    id: "i5", title: "Discussão entre alunos", category: "Conflito",
    situation: "Durante um trabalho em grupo, dois alunos começam a discutir em tom elevado sobre a abordagem do caso clínico. Um diz: \"Seu raciocínio está completamente errado e vai prejudicar o grupo inteiro.\" O outro responde: \"Pelo menos eu estudei, diferente de você.\"",
    options: [
      { text: "Aproximar-se e dizer: \"Percebo que há perspectivas diferentes e isso é valioso. Vamos canalizar essa energia: cada um apresenta seu argumento com evidência e o grupo decide. Divergência acadêmica é saudável, ataques pessoais não.\"", score: 3, dimensions: { assertividade: 3, empatia: 3, ambiente: 3 }, feedback: "Excelente! Valida divergência, redireciona para o acadêmico e define limites claros." },
      { text: "\"Parem de brigar ou saem da sala.\"", score: 1, dimensions: { assertividade: 2, empatia: 0, ambiente: 1 }, feedback: "Autoritário sem mediação. Resolve o sintoma, não o conflito." },
      { text: "Ignorar e esperar que resolvam sozinhos.", score: 0, dimensions: { assertividade: 0, empatia: 0, ambiente: 0 }, feedback: "Conflitos não mediados escalam e prejudicam o ambiente." },
      { text: "Separar os dois em grupos diferentes.", score: 2, dimensions: { assertividade: 2, empatia: 1, ambiente: 2 }, feedback: "Resolve imediatamente, mas sem aprendizagem de gestão de conflito." },
    ],
  },
];

export default function SimuladorGestaoSala() {
  const navigate = useNavigate();
  const { isVirtualRoom, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [shuffledIncidents] = useState(() => [...INCIDENTS].sort(() => Math.random() - 0.5));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  const incident = shuffledIncidents[step];

  const handleConfirm = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (step < shuffledIncidents.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const dims = { assertividade: 0, empatia: 0, ambiente: 0 };
  answers.forEach((optIdx, i) => {
    const d = shuffledIncidents[i].options[optIdx].dimensions;
    dims.assertividade += d.assertividade;
    dims.empatia += d.empatia;
    dims.ambiente += d.ambiente;
  });
  const maxDim = shuffledIncidents.length * 3;
  const totalScore = answers.reduce((acc, optIdx, i) => acc + shuffledIncidents[i].options[optIdx].score, 0);
  const pct = Math.round((totalScore / (shuffledIncidents.length * 3)) * 100);

  useEffect(() => {
    if (showResult && !submitted) {
      submitResults({ score: pct, actions: { answers, dims } });
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
          <h1 className="text-2xl font-bold">Gestão de Sala de Aula — Incidentes Críticos</h1>
          <p className="text-muted-foreground text-sm">Responda a situações difíceis em tempo real</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {!showResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Incidente {step + 1}/{shuffledIncidents.length}: {incident.title}
              </CardTitle>
              <Badge variant="outline">{incident.category}</Badge>
            </div>
            <Progress value={(step / shuffledIncidents.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{incident.situation}</p>
            <p className="text-sm font-medium">Como você reage?</p>
            <div className="space-y-2">
              {incident.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${selected === i ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div className={`p-3 rounded-lg text-sm ${incident.options[selected].score >= 2 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                <div className="flex gap-2 mb-1">
                  <Badge variant="outline">Assertividade: {incident.options[selected].dimensions.assertividade}/3</Badge>
                  <Badge variant="outline">Empatia: {incident.options[selected].dimensions.empatia}/3</Badge>
                  <Badge variant="outline">Ambiente: {incident.options[selected].dimensions.ambiente}/3</Badge>
                </div>
                <p>{incident.options[selected].feedback}</p>
              </div>
            )}
            <Button onClick={handleConfirm} disabled={selected === null} className="w-full gap-2">
              {step < shuffledIncidents.length - 1 ? <>Próximo Incidente <ChevronRight className="h-4 w-4" /></> : "Ver Resultado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showResult && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Perfil de Gestão de Sala</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {(!isVirtualRoom || showFeedbackVR) && (
              <>
                <div className="text-center py-4">
                  <div className={`text-5xl font-bold mb-2 ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{pct}%</div>
                  <p className="text-muted-foreground text-sm">Competência em gestão de incidentes</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Assertividade", value: dims.assertividade, color: "text-blue-600" },
                    { label: "Empatia", value: dims.empatia, color: "text-emerald-600" },
                    { label: "Ambiente", value: dims.ambiente, color: "text-purple-600" },
                  ].map(d => (
                    <div key={d.label} className="text-center p-3 rounded-lg border">
                      <div className={`text-2xl font-bold ${d.color}`}>{Math.round((d.value / maxDim) * 100)}%</div>
                      <p className="text-xs text-muted-foreground">{d.label}</p>
                      <Progress value={(d.value / maxDim) * 100} className="h-1.5 mt-1" />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  {shuffledIncidents.map((inc, i) => {
                    const chosen = inc.options[answers[i]];
                    return (
                      <div key={i} className={`p-3 rounded-lg border text-sm ${chosen.score >= 2 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                        <p className="font-medium">{inc.title} ({inc.category})</p>
                        <p className="text-muted-foreground mt-1">{chosen.feedback}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">📚 Referências</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Brookfield SD. <em>The Skillful Teacher</em>. 3rd ed. Jossey-Bass, 2015.</li>
                    <li>• Hativa N. <em>Teaching for Effective Learning in Higher Education</em>. Springer, 2000.</li>
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
