import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, ChevronRight, RotateCcw, Award, Lightbulb, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const BLOOM_LEVELS = [
  { level: 1, name: "Lembrar", color: "bg-red-500", verbs: ["Listar", "Definir", "Identificar", "Nomear", "Citar", "Reconhecer"], description: "Recuperar informações da memória" },
  { level: 2, name: "Compreender", color: "bg-orange-500", verbs: ["Explicar", "Descrever", "Resumir", "Classificar", "Comparar", "Exemplificar"], description: "Construir significado" },
  { level: 3, name: "Aplicar", color: "bg-yellow-500", verbs: ["Calcular", "Resolver", "Utilizar", "Demonstrar", "Implementar", "Executar"], description: "Usar em situação concreta" },
  { level: 4, name: "Analisar", color: "bg-green-500", verbs: ["Diferenciar", "Organizar", "Atribuir", "Investigar", "Relacionar", "Deduzir"], description: "Decompor e examinar relações" },
  { level: 5, name: "Avaliar", color: "bg-blue-500", verbs: ["Julgar", "Criticar", "Justificar", "Recomendar", "Priorizar", "Defender"], description: "Fazer julgamentos fundamentados" },
  { level: 6, name: "Criar", color: "bg-purple-500", verbs: ["Elaborar", "Propor", "Projetar", "Construir", "Formular", "Desenvolver"], description: "Gerar algo novo" },
];

interface Challenge {
  id: string;
  objective: string;
  targetLevel: number;
  questions: { text: string; level: number; feedback: string }[];
}

const CHALLENGES: Challenge[] = [
  {
    id: "c1",
    objective: "Compreender o mecanismo de ação dos anti-inflamatórios não esteroidais (AINEs)",
    targetLevel: 4,
    questions: [
      { text: "Cite três exemplos de AINEs.", level: 1, feedback: "Nível 'Lembrar'. Apenas recupera nomes da memória." },
      { text: "Explique o mecanismo de ação dos AINEs na inibição da COX.", level: 2, feedback: "Nível 'Compreender'. Requer explicação do conceito." },
      { text: "Calcule a dose de ibuprofeno para uma criança de 20kg com febre.", level: 3, feedback: "Nível 'Aplicar'. Usa conhecimento em situação prática." },
      { text: "Compare os perfis de seletividade COX-1/COX-2 do ibuprofeno e celecoxibe e analise as implicações clínicas de cada perfil.", level: 4, feedback: "Nível 'Analisar'. Exige decomposição e comparação de características com implicações." },
      { text: "Avalie se a prescrição de um AINE é apropriada para um paciente idoso com IRC estágio 3, HAS e histórico de úlcera gástrica. Justifique.", level: 5, feedback: "Nível 'Avaliar'. Requer julgamento clínico multi-dimensional." },
      { text: "Elabore um protocolo de escolha racional de AINE para uma unidade de pronto-socorro, considerando perfil de pacientes, contraindicações e custo.", level: 6, feedback: "Nível 'Criar'. Exige geração de produto novo integrando múltiplos critérios." },
    ],
  },
  {
    id: "c2",
    objective: "Compreender a farmacocinética de antibióticos aminoglicosídeos",
    targetLevel: 5,
    questions: [
      { text: "Defina 'concentração inibitória mínima (CIM)' e 'efeito pós-antibiótico'.", level: 1, feedback: "Nível 'Lembrar'. Definições puras." },
      { text: "Descreva por que aminoglicosídeos têm atividade concentração-dependente.", level: 2, feedback: "Nível 'Compreender'. Explicar relação conceitual." },
      { text: "Calcule a dose de gentamicina usando o método de Hartford (7mg/kg) para um paciente de 70kg com ClCr de 80 mL/min.", level: 3, feedback: "Nível 'Aplicar'. Cálculo direto." },
      { text: "Analise por que o monitoramento de nível sérico (TDM) de vale é mais relevante que o de pico para prevenção de nefrotoxicidade.", level: 4, feedback: "Nível 'Analisar'. Decomposição de relação PK/toxicidade." },
      { text: "Avalie criticamente o regime de dose única diária vs. doses múltiplas de gentamicina em pacientes com sepse, com base em evidências.", level: 5, feedback: "Nível 'Avaliar'. Julgamento baseado em evidência." },
      { text: "Proponha um protocolo de TDM institucional para aminoglicosídeos, incluindo critérios de coleta, ajuste e monitoramento de toxicidade.", level: 6, feedback: "Nível 'Criar'. Desenvolvimento de protocolo original." },
    ],
  },
  {
    id: "c3",
    objective: "Entender a farmacoterapia da hipertensão arterial",
    targetLevel: 5,
    questions: [
      { text: "Liste as cinco classes principais de anti-hipertensivos.", level: 1, feedback: "Nível 'Lembrar'. Listagem de memória." },
      { text: "Explique por que IECA são preferidos em pacientes com nefropatia diabética.", level: 2, feedback: "Nível 'Compreender'. Conexão fisiopatológica." },
      { text: "Prescreva um esquema anti-hipertensivo para paciente de 55 anos, DM2, microalbuminúria, PA 160/100.", level: 3, feedback: "Nível 'Aplicar'. Caso clínico direto." },
      { text: "Diferencie os mecanismos pelos quais BCC di-hidropiridínicos e não di-hidropiridínicos reduzem a PA e analise quando usar cada um.", level: 4, feedback: "Nível 'Analisar'. Comparação mechanística com aplicação." },
      { text: "Critique a decisão de adicionar espironolactona a um paciente já em uso de IECA + BRA, considerando riscos e benefícios baseados em evidência.", level: 5, feedback: "Nível 'Avaliar'. Julgamento de decisão terapêutica." },
      { text: "Desenvolva um algoritmo de escalonamento de anti-hipertensivos para uma UBS, considerando protocolos do MS, disponibilidade na RENAME e perfil populacional.", level: 6, feedback: "Nível 'Criar'. Construção de ferramenta original." },
    ],
  },
];

type Phase = "classify" | "elevate";

export default function SimuladorElaboracaoQuestoes() {
  const navigate = useNavigate();
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("classify");
  const [classifyAnswers, setClassifyAnswers] = useState<(number | null)[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [showClassifyResult, setShowClassifyResult] = useState(false);
  const [elevateChoice, setElevateChoice] = useState<number | null>(null);
  const [showElevateResult, setShowElevateResult] = useState(false);
  const [vrShowFeedback, setVrShowFeedback] = useState(false);

  const challenge = CHALLENGES[challengeIdx];

  const { isVirtualRoom: isVR, submitResults, submitted } = useVirtualRoomCase("elaboracao-questoes");

  // Auto-submit when elevate result is shown
  useEffect(() => {
    if (isVR && showElevateResult && !submitted) {
      const score = Math.round(((classifyScore + (elevateChoice === challenge.targetLevel ? 1 : 0)) / (challenge.questions.length + 1)) * 100);
      submitResults({ score, actions: { classifyScore, elevateCorrect: elevateChoice === challenge.targetLevel }, timeSpentSeconds: 0 });
    }
  }, [showElevateResult]);

  // 15s redirect
  useEffect(() => {
    if (isVR && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVR, submitted, navigate]);

  const handleClassify = () => {
    if (selectedLevel === null) return;
    const newAnswers = [...classifyAnswers];
    newAnswers[currentQ] = selectedLevel;
    setClassifyAnswers(newAnswers);
    setSelectedLevel(null);
    if (currentQ < challenge.questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowClassifyResult(true);
    }
  };

  const classifyScore = classifyAnswers.reduce((acc, ans, i) => {
    return acc + (ans === challenge.questions[i].level ? 1 : 0);
  }, 0);

  const handleStartElevate = () => {
    setPhase("elevate");
    setShowClassifyResult(false);
  };

  const handleRestart = () => {
    setChallengeIdx((challengeIdx + 1) % CHALLENGES.length);
    setPhase("classify");
    setClassifyAnswers([]);
    setSelectedLevel(null);
    setCurrentQ(0);
    setShowClassifyResult(false);
    setElevateChoice(null);
    setShowElevateResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/simuladores"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Elaboração de Questões — Taxonomia de Bloom</h1>
          <p className="text-muted-foreground text-sm">Treine a criação de questões em diferentes níveis cognitivos</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Bloom Pyramid */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2 justify-center">
            {BLOOM_LEVELS.map((b) => (
              <div key={b.level} className="text-center">
                <div className={`${b.color} text-white rounded-lg px-3 py-1.5 text-xs font-bold`}>{b.name}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px]">{b.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">← Nível inferior · Nível superior →</p>
        </CardContent>
      </Card>

      {/* Objective */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Objetivo de Aprendizagem</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{challenge.objective}</p>
          <p className="text-xs text-muted-foreground mt-1">Nível-alvo da avaliação: <Badge className={BLOOM_LEVELS[challenge.targetLevel - 1].color + " text-white"}>{BLOOM_LEVELS[challenge.targetLevel - 1].name}</Badge></p>
        </CardContent>
      </Card>

      {/* Phase 1: Classify */}
      {phase === "classify" && !showClassifyResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fase 1: Classifique o Nível — Questão {currentQ + 1}/{challenge.questions.length}</CardTitle>
            <Progress value={(currentQ / challenge.questions.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm italic">"{challenge.questions[currentQ].text}"</p>
            </div>
            <p className="text-sm text-muted-foreground">Em qual nível da Taxonomia de Bloom esta questão se enquadra?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BLOOM_LEVELS.map((b) => (
                <button
                  key={b.level}
                  onClick={() => setSelectedLevel(b.level)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedLevel === b.level ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${b.color} mx-auto mb-1`} />
                  {b.name}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p className="font-medium mb-1">Verbos-chave do nível selecionado:</p>
              <p>{selectedLevel ? BLOOM_LEVELS[selectedLevel - 1].verbs.join(", ") : "Selecione um nível"}</p>
            </div>
            <Button onClick={handleClassify} disabled={selectedLevel === null} className="w-full gap-2">
              Confirmar <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Classify Results */}
      {showClassifyResult && phase === "classify" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Resultado da Classificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-3">
              <div className={`text-4xl font-bold ${classifyScore >= 4 ? "text-emerald-600" : classifyScore >= 2 ? "text-amber-600" : "text-destructive"}`}>
                {classifyScore}/{challenge.questions.length}
              </div>
              <p className="text-muted-foreground text-sm">questões classificadas corretamente</p>
            </div>
            <div className="space-y-2">
              {challenge.questions.map((q, i) => {
                const correct = classifyAnswers[i] === q.level;
                return (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <p className="italic mb-1">"{q.text}"</p>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">Sua resposta: {BLOOM_LEVELS[(classifyAnswers[i] || 1) - 1].name}</Badge>
                      {!correct && <Badge className={BLOOM_LEVELS[q.level - 1].color + " text-white"}>Correto: {BLOOM_LEVELS[q.level - 1].name}</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-1">{q.feedback}</p>
                  </div>
                );
              })}
            </div>
            <Button onClick={handleStartElevate} className="w-full gap-2">Fase 2: Elevar Nível Taxonômico <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Elevate */}
      {phase === "elevate" && !showElevateResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fase 2: Eleve o Nível da Questão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Questão original (Nível {BLOOM_LEVELS[0].name}):</p>
              <p className="text-sm italic">"{challenge.questions[0].text}"</p>
            </div>
            <p className="text-sm">Selecione qual reformulação eleva corretamente esta questão para o nível <Badge className={BLOOM_LEVELS[challenge.targetLevel - 1].color + " text-white"}>{BLOOM_LEVELS[challenge.targetLevel - 1].name}</Badge>:</p>
            <div className="space-y-2">
              {[
                challenge.questions[challenge.targetLevel - 1],
                challenge.questions[1],
                challenge.questions[Math.min(challenge.targetLevel, challenge.questions.length - 1)],
              ].sort(() => Math.random() - 0.5).map((q, i) => (
                <button
                  key={i}
                  onClick={() => setElevateChoice(q.level)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                    elevateChoice === q.level ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  "{q.text}"
                </button>
              ))}
            </div>
            <Button onClick={() => setShowElevateResult(true)} disabled={elevateChoice === null} className="w-full">Verificar Resposta</Button>
          </CardContent>
        </Card>
      )}

      {showElevateResult && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className={`p-4 rounded-lg text-sm ${elevateChoice === challenge.targetLevel ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              <p className="font-bold mb-1">{elevateChoice === challenge.targetLevel ? "✅ Correto!" : "⚠️ Não era o nível alvo."}</p>
              <p className="text-muted-foreground">A questão no nível {BLOOM_LEVELS[challenge.targetLevel - 1].name} era:</p>
              <p className="italic mt-1">"{challenge.questions[challenge.targetLevel - 1].text}"</p>
              <p className="mt-2">{challenge.questions[challenge.targetLevel - 1].feedback}</p>
            </div>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">📚 Referências</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Anderson LW, Krathwohl DR. <em>A Taxonomy for Learning, Teaching, and Assessing</em>. Pearson, 2001.</li>
                <li>• Bloom BS. <em>Taxonomy of Educational Objectives</em>. Longman, 1956.</li>
              </ul>
            </div>
            <Button onClick={handleRestart} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Próximo Desafio</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
