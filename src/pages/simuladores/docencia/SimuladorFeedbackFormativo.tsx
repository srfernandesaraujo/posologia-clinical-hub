import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MessageSquareHeart, CheckCircle, XCircle, RotateCcw, ChevronRight, User, Award, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

type FeedbackModel = "pendleton" | "r2c2" | "aloba";

interface Scenario {
  id: string;
  studentName: string;
  context: string;
  score: number;
  strengths: string[];
  errors: string[];
  difficulty: string;
}

interface ModelStep {
  title: string;
  instruction: string;
  options: { text: string; score: number; feedback: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    studentName: "Ana Beatriz",
    context: "Dispensação de medicamento controlado (Clonazepam 2mg). A aluna esqueceu de verificar a receita (tipo B1), não orientou sobre efeitos adversos e entregou o medicamento sem conferir a identificação do paciente.",
    score: 35,
    strengths: ["Comunicação cordial com o paciente", "Postura profissional adequada"],
    errors: ["Não verificou a validade da receita B1", "Não orientou sobre sonolência e risco de dependência", "Não conferiu identidade do paciente"],
    difficulty: "Médio",
  },
  {
    id: "s2",
    studentName: "Carlos Eduardo",
    context: "Anamnese farmacêutica com paciente idoso polimedicado (8 medicamentos). O aluno identificou corretamente 2 interações, mas perdeu uma interação grave (varfarina + AAS) e não perguntou sobre uso de fitoterápicos.",
    score: 60,
    strengths: ["Identificou interação IECA + espironolactona", "Verificou adesão ao tratamento", "Tom empático com o paciente"],
    errors: ["Não identificou interação varfarina + AAS (risco hemorrágico)", "Não investigou uso de fitoterápicos/suplementos", "Não verificou função renal para ajuste de dose"],
    difficulty: "Difícil",
  },
  {
    id: "s3",
    studentName: "Marina Silva",
    context: "Cálculo de dose pediátrica de Amoxicilina para criança de 12kg com otite média aguda. A aluna calculou corretamente a dose (mg/kg/dia) mas errou na conversão para mL da suspensão e prescreveu volume 50% maior que o adequado.",
    score: 50,
    strengths: ["Cálculo de dose por peso correto", "Escolha adequada do antibiótico", "Verificou alergias"],
    errors: ["Erro na conversão mg → mL (usou concentração errada da suspensão)", "Dose final 50% acima do recomendado — risco de toxicidade", "Não conferiu o cálculo com dupla checagem"],
    difficulty: "Fácil",
  },
];

const MODELS: Record<FeedbackModel, { name: string; description: string; steps: ModelStep[] }> = {
  pendleton: {
    name: "Pendleton",
    description: "Modelo estruturado que começa pelos pontos positivos identificados pelo próprio aluno.",
    steps: [
      {
        title: "1. O que o aluno fez bem (auto-avaliação)",
        instruction: "Peça ao aluno que identifique seus próprios pontos fortes. Como você iniciaria?",
        options: [
          { text: "\"Ana, o que você acha que fez bem nesta atividade?\"", score: 3, feedback: "Excelente! Perguntar antes permite que o aluno reflita e se engaje no processo." },
          { text: "\"Vou te dizer o que você fez bem e o que errou.\"", score: 0, feedback: "Esta abordagem é diretiva e não promove reflexão. No modelo Pendleton, o aluno fala primeiro." },
          { text: "\"Você cometeu vários erros graves. Vamos discutir.\"", score: 0, feedback: "Começar pelos erros é punitivo e gera resistência. O modelo Pendleton sempre inicia pelos acertos." },
          { text: "\"Antes de mais nada, quais aspectos da sua atuação você considerou positivos?\"", score: 2, feedback: "Boa abordagem! Direciona para o positivo, embora seja um pouco formal." },
        ],
      },
      {
        title: "2. Professor reforça pontos positivos",
        instruction: "Agora é sua vez de reconhecer o que o aluno fez bem. Qual abordagem é mais eficaz?",
        options: [
          { text: "\"Concordo com você e acrescento que sua comunicação com o paciente foi muito boa.\"", score: 3, feedback: "Perfeito! Valida a auto-avaliação do aluno e adiciona observações específicas." },
          { text: "\"Sim, ok, mas vamos falar do que importa — os erros.\"", score: 0, feedback: "Desvaloriza a etapa positiva e viola o modelo. Os acertos são tão importantes quanto os erros." },
          { text: "\"Tudo bem.\"", score: 1, feedback: "Resposta vaga e genérica. O professor deve ser específico sobre os pontos fortes." },
          { text: "\"Sua postura profissional foi exemplar. Isso é fundamental para a confiança do paciente.\"", score: 2, feedback: "Bom! Específico e conecta ao impacto prático." },
        ],
      },
      {
        title: "3. O que poderia ser melhorado (auto-avaliação)",
        instruction: "Peça ao aluno que identifique áreas de melhoria. Como você formularia?",
        options: [
          { text: "\"Agora, que aspectos você acredita que poderiam ter sido diferentes?\"", score: 3, feedback: "Excelente! Linguagem neutra que promove reflexão sem julgamento." },
          { text: "\"Onde você errou?\"", score: 1, feedback: "Direto demais e com tom acusatório. 'Errou' carrega julgamento negativo." },
          { text: "\"Você percebeu que quase prejudicou o paciente?\"", score: 0, feedback: "Provocativo e ameaçador. Gera defensividade e bloqueia a aprendizagem." },
          { text: "\"Se pudesse refazer, o que faria de forma diferente?\"", score: 2, feedback: "Boa formulação! Foca no futuro e na melhoria." },
        ],
      },
      {
        title: "4. Professor sugere melhorias com plano de ação",
        instruction: "Complementar com suas observações e propor um plano. Qual a melhor abordagem?",
        options: [
          { text: "\"Além do que você mencionou, notei que a verificação da receita foi omitida. Que tal praticarmos o checklist de dispensação na próxima aula?\"", score: 3, feedback: "Perfeito! Específico, construtivo e com plano de ação concreto." },
          { text: "\"Você precisa estudar mais. Não pode errar isso.\"", score: 0, feedback: "Genérico e punitivo. Não oferece direção nem ação concreta." },
          { text: "\"Sugiro que você revise o protocolo de dispensação. Podemos agendar uma prática supervisionada?\"", score: 2, feedback: "Bom! Oferece recurso e acompanhamento." },
          { text: "\"Na próxima vez, tente não esquecer de verificar a receita.\"", score: 1, feedback: "Vago. Não oferece estratégia para evitar a recorrência." },
        ],
      },
    ],
  },
  r2c2: {
    name: "R2C2",
    description: "Relationship, Reaction, Content, Coaching — modelo em 4 fases focado na relação de confiança.",
    steps: [
      {
        title: "Fase 1: Relationship (Construir Relação)",
        instruction: "Estabeleça rapport e demonstre interesse genuíno. Como você abriria a conversa?",
        options: [
          { text: "\"Obrigado por se disponibilizar para conversar. Como você está se sentindo após a atividade?\"", score: 3, feedback: "Excelente! Demonstra cuidado e abre espaço emocional seguro." },
          { text: "\"Sente-se. Preciso falar sobre seu desempenho.\"", score: 0, feedback: "Tom autoritário que cria barreira relacional." },
          { text: "\"Antes de discutirmos os resultados, quero que saiba que estou aqui para ajudar no seu desenvolvimento.\"", score: 2, feedback: "Bom! Estabelece intenção positiva." },
          { text: "\"Vamos direto ao ponto, temos pouco tempo.\"", score: 1, feedback: "Pular a relação compromete todo o processo de feedback." },
        ],
      },
      {
        title: "Fase 2: Reaction (Explorar Reação)",
        instruction: "Explore como o aluno reagiu ao próprio desempenho e aos dados apresentados.",
        options: [
          { text: "\"Ao revisar sua atuação, o que chamou sua atenção? O que te surpreendeu?\"", score: 3, feedback: "Perfeito! Explora a percepção e emoções do aluno sobre os dados." },
          { text: "\"Você viu seus erros? O que achou?\"", score: 1, feedback: "Direciona para o negativo e não explora reação emocional." },
          { text: "\"Como você se sentiu ao perceber os gaps no seu desempenho?\"", score: 2, feedback: "Bom, explora emoção, mas 'gaps' pode ser percebido como negativo." },
          { text: "\"Seus resultados foram abaixo da média. Isso te preocupa?\"", score: 0, feedback: "Comparação com média é ameaçadora e não promove reflexão construtiva." },
        ],
      },
      {
        title: "Fase 3: Content (Explorar Conteúdo)",
        instruction: "Aprofunde a compreensão dos dados de desempenho com o aluno.",
        options: [
          { text: "\"Vamos olhar juntos os dados. Sua comunicação foi avaliada como excelente. Na verificação de receita, houve uma lacuna. O que você acha que aconteceu?\"", score: 3, feedback: "Excelente! Usa dados específicos, equilibra positivo/negativo e convida reflexão." },
          { text: "\"Os dados mostram que você falhou em 3 dos 5 critérios.\"", score: 0, feedback: "Apresentar dados como 'falhas' é punitivo. Deve-se contextualizar." },
          { text: "\"Quero entender melhor: em que momento da dispensação você decidiu não verificar a receita?\"", score: 2, feedback: "Bom! Busca entender o processo cognitivo do aluno." },
          { text: "\"Você claramente não estudou o protocolo.\"", score: 0, feedback: "Julgamento sem evidência. Viola completamente o modelo R2C2." },
        ],
      },
      {
        title: "Fase 4: Coaching (Planejar Mudança)",
        instruction: "Co-construa um plano de desenvolvimento com o aluno.",
        options: [
          { text: "\"Baseado no que discutimos, que meta específica você gostaria de definir para a próxima prática? Como posso te apoiar nisso?\"", score: 3, feedback: "Perfeito! Co-construção de meta com oferta de suporte — essência do coaching." },
          { text: "\"Você precisa melhorar. Estude mais para a próxima.\"", score: 0, feedback: "Genérico, sem meta específica e sem plano de suporte." },
          { text: "\"Sugiro que você pratique o checklist 3 vezes antes da próxima avaliação. Podemos fazer uma sessão juntos?\"", score: 2, feedback: "Bom! Meta específica com oferta de suporte." },
          { text: "\"Vou te dar mais uma chance na semana que vem.\"", score: 1, feedback: "Posiciona o professor como juiz, não como coach." },
        ],
      },
    ],
  },
  aloba: {
    name: "ALOBA",
    description: "Agenda-Led, Outcome-Based Analysis — feedback orientado pela agenda do aluno.",
    steps: [
      {
        title: "1. Definir Agenda (Agenda-Led)",
        instruction: "O aluno define o que quer discutir. Como você facilitaria isso?",
        options: [
          { text: "\"O que você gostaria de focar na nossa discussão hoje? Há algo específico que te preocupou?\"", score: 3, feedback: "Excelente! Coloca o aluno no centro e respeita sua agenda." },
          { text: "\"Eu preparei uma lista de pontos para discutirmos.\"", score: 1, feedback: "No ALOBA, a agenda é do aluno, não do professor." },
          { text: "\"Vamos falar sobre seus erros na dispensação.\"", score: 0, feedback: "Impõe agenda e foca no negativo." },
          { text: "\"Há algum aspecto da atividade que você gostaria de explorar comigo?\"", score: 2, feedback: "Bom! Convida participação." },
        ],
      },
      {
        title: "2. Identificar Resultados Desejados (Outcome-Based)",
        instruction: "Ajude o aluno a definir o resultado que queria alcançar.",
        options: [
          { text: "\"Qual era o resultado ideal que você buscava nesta dispensação? O que você queria que acontecesse?\"", score: 3, feedback: "Perfeito! Conecta a ação ao objetivo — base da análise ALOBA." },
          { text: "\"O resultado certo seria ter verificado a receita. Você não fez isso.\"", score: 0, feedback: "Diretivo e acusatório. Não explora a perspectiva do aluno." },
          { text: "\"Na sua opinião, como seria uma dispensação perfeita neste caso?\"", score: 2, feedback: "Bom! Promove reflexão sobre o padrão ideal." },
          { text: "\"Você atingiu o objetivo da atividade?\"", score: 1, feedback: "Pergunta fechada que não promove análise profunda." },
        ],
      },
      {
        title: "3. Analisar o Gap (Gap Analysis)",
        instruction: "Compare o que aconteceu com o que era desejado. Qual a melhor abordagem?",
        options: [
          { text: "\"Então, se o objetivo era garantir segurança, e a verificação da receita foi pulada — o que você acha que contribuiu para essa lacuna?\"", score: 3, feedback: "Excelente! Análise de gap sem julgamento, focada em causas." },
          { text: "\"A diferença entre o ideal e o que você fez é enorme.\"", score: 0, feedback: "Julgamento hiperbólico que gera desmotivação." },
          { text: "\"Que fatores você identifica entre o que planejou e o que executou?\"", score: 2, feedback: "Bom! Convida análise estruturada." },
          { text: "\"Você falhou por falta de preparo.\"", score: 0, feedback: "Atribui causa sem investigar. Viola o modelo ALOBA." },
        ],
      },
      {
        title: "4. Planejar Ações Futuras",
        instruction: "Co-construa estratégias baseadas na análise feita.",
        options: [
          { text: "\"Com base na nossa análise, que estratégia concreta você pode adotar para fechar esse gap na próxima prática?\"", score: 3, feedback: "Perfeito! O aluno propõe a solução — maior engajamento e autonomia." },
          { text: "\"Vou te passar um checklist para seguir na próxima vez.\"", score: 1, feedback: "Solução imposta, sem construção conjunta." },
          { text: "\"Que tal criarmos juntos um protocolo pessoal de verificação para suas próximas dispensações?\"", score: 2, feedback: "Bom! Co-construção prática." },
          { text: "\"Estude mais e tente não errar novamente.\"", score: 0, feedback: "Genérico e sem estratégia." },
        ],
      },
    ],
  },
};

export default function SimuladorFeedbackFormativo() {
  const [model, setModel] = useState<FeedbackModel | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const scenario = SCENARIOS[scenarioIndex];

  const handleSelectModel = (m: FeedbackModel) => {
    setModel(m);
    setCurrentStep(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowResult(false);
  };

  const handleSelectOption = (optIndex: number) => {
    setSelectedOption(optIndex);
  };

  const handleConfirm = () => {
    if (selectedOption === null || !model) return;
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    if (currentStep < MODELS[model].steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  const totalScore = model ? answers.reduce((acc, optIdx, stepIdx) => acc + MODELS[model].steps[stepIdx].options[optIdx].score, 0) : 0;
  const maxScore = model ? MODELS[model].steps.length * 3 : 1;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const handleRestart = () => {
    setModel(null);
    setCurrentStep(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowResult(false);
  };

  const handleNextScenario = () => {
    setScenarioIndex((scenarioIndex + 1) % SCENARIOS.length);
    setModel(null);
    setCurrentStep(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/simuladores">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Simulador de Feedback Formativo</h1>
          <p className="text-muted-foreground text-sm">Treine a habilidade de dar feedback construtivo usando modelos validados</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Scenario Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Cenário: {scenario.studentName}
            </CardTitle>
            <Badge variant="outline">{scenario.difficulty}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{scenario.context}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Score do aluno:</span>
            <Badge variant={scenario.score < 50 ? "destructive" : "secondary"}>{scenario.score}%</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-emerald-500/10 rounded-lg p-3">
              <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">Pontos Fortes</p>
              <ul className="space-y-1">{scenario.strengths.map((s, i) => <li key={i} className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />{s}</li>)}</ul>
            </div>
            <div className="bg-destructive/10 rounded-lg p-3">
              <p className="font-medium text-destructive mb-1">Erros Identificados</p>
              <ul className="space-y-1">{scenario.errors.map((e, i) => <li key={i} className="flex items-start gap-1.5"><XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />{e}</li>)}</ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      {!model && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Escolha o Modelo de Feedback</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {(Object.entries(MODELS) as [FeedbackModel, typeof MODELS["pendleton"]][]).map(([key, m]) => (
              <Card key={key} className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-2 hover:border-primary/50" onClick={() => handleSelectModel(key)}>
                <CardContent className="pt-5 text-center">
                  <MessageSquareHeart className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-bold text-lg">{m.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{m.steps.length} etapas</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Steps */}
      {model && !showResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Modelo {MODELS[model].name} — Etapa {currentStep + 1}/{MODELS[model].steps.length}</CardTitle>
              <Badge variant="outline">{Math.round(((currentStep) / MODELS[model].steps.length) * 100)}%</Badge>
            </div>
            <Progress value={(currentStep / MODELS[model].steps.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">{MODELS[model].steps[currentStep].title}</h3>
              <p className="text-sm text-muted-foreground">{MODELS[model].steps[currentStep].instruction}</p>
            </div>
            <div className="space-y-2">
              {MODELS[model].steps[currentStep].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                    selectedOption === i ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {selectedOption !== null && (
              <div className={`p-3 rounded-lg text-sm ${
                MODELS[model].steps[currentStep].options[selectedOption].score >= 2 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}>
                <p className="font-medium mb-1">
                  {MODELS[model].steps[currentStep].options[selectedOption].score === 3 ? "✅ Excelente escolha!" :
                   MODELS[model].steps[currentStep].options[selectedOption].score === 2 ? "👍 Boa escolha!" :
                   MODELS[model].steps[currentStep].options[selectedOption].score === 1 ? "⚠️ Pode melhorar" : "❌ Inadequado"}
                </p>
                <p>{MODELS[model].steps[currentStep].options[selectedOption].feedback}</p>
              </div>
            )}
            <Button onClick={handleConfirm} disabled={selectedOption === null} className="w-full gap-2">
              {currentStep < MODELS[model].steps.length - 1 ? <>Próxima Etapa <ChevronRight className="h-4 w-4" /></> : "Ver Resultado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {showResult && model && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Resultado — Modelo {MODELS[model].name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className={`text-5xl font-bold mb-2 ${percentage >= 75 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-destructive"}`}>
                {percentage}%
              </div>
              <p className="text-muted-foreground">
                {percentage >= 75 ? "Excelente domínio do modelo!" : percentage >= 50 ? "Bom, mas há espaço para melhoria." : "Revise os princípios do modelo."}
              </p>
              <Progress value={percentage} className="h-3 mt-3 max-w-xs mx-auto" />
            </div>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Revisão por Etapa</h3>
              {MODELS[model].steps.map((step, i) => {
                const chosen = step.options[answers[i]];
                return (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${chosen.score >= 2 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-muted-foreground mt-1">Sua escolha: "{chosen.text}"</p>
                    <p className="mt-1">{chosen.feedback}</p>
                    <Badge variant="outline" className="mt-1">{chosen.score}/3 pontos</Badge>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">📚 Referências</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Pendleton D, et al. <em>The New Consultation</em>. Oxford University Press, 2003.</li>
                <li>• Sargeant J, et al. <em>R2C2 model for feedback</em>. Acad Med. 2015;90(11):1698-706.</li>
                <li>• Silverman J, et al. <em>Skills for Communicating with Patients</em>. 3rd ed. CRC Press, 2013.</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="outline" className="flex-1 gap-2"><RotateCcw className="h-4 w-4" /> Tentar Outro Modelo</Button>
              <Button onClick={handleNextScenario} className="flex-1 gap-2">Próximo Cenário <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
