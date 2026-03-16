import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Stethoscope, ChevronRight, RotateCcw, Award, User, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const SLUG = "preceptoria-clinica";

interface OMPScenario {
  id: string;
  residentName: string;
  casePresentation: string;
  steps: {
    title: string;
    ompStep: string;
    instruction: string;
    options: { text: string; score: number; feedback: string }[];
  }[];
}

const SCENARIOS: OMPScenario[] = [
  {
    id: "omp1",
    residentName: "Dra. Camila (R1 Farmácia Clínica)",
    casePresentation: "\"Preceptor, tenho um paciente de 68 anos, internado por pneumonia adquirida na comunidade. Está em uso de Ceftriaxona 2g/dia há 5 dias. A cultura de escarro veio com Streptococcus pneumoniae sensível a penicilina. O paciente melhorou clinicamente — afebril há 48h, leucograma normalizando. Eu acho que devemos fazer o descalonamento para Amoxicilina oral, mas não tenho certeza se já é o momento.\"",
    steps: [
      {
        title: "Passo 1: Comprometer com uma Hipótese",
        ompStep: "Get a Commitment",
        instruction: "O primeiro passo do OMP é pedir que o residente se comprometa com uma hipótese/conduta. Como você faria?",
        options: [
          { text: "\"Camila, você mencionou descalonamento. Pode me dizer especificamente: o que te leva a acreditar que agora é o momento certo para fazer a transição IV→VO?\"", score: 3, feedback: "Excelente! Pede comprometimento específico com raciocínio — essência do passo 1." },
          { text: "\"Sim, descalonamento é a conduta correta. Pode prescrever Amoxicilina.\"", score: 0, feedback: "Você deu a resposta sem explorar o raciocínio. Perdeu toda oportunidade de ensino." },
          { text: "\"O que você faria?\" (pergunta genérica)", score: 1, feedback: "Muito vago. No OMP, a pergunta deve ser focada no caso específico." },
          { text: "\"Antes de decidir, quais critérios você usaria para definir se é hora do switch IV→VO?\"", score: 2, feedback: "Bom! Explora critérios, mas não pede comprometimento direto com a conduta." },
        ],
      },
      {
        title: "Passo 2: Explorar o Raciocínio",
        ompStep: "Probe for Supporting Evidence",
        instruction: "Agora explore as evidências que sustentam o raciocínio da residente.",
        options: [
          { text: "\"Quais critérios específicos de switch IV→VO você está considerando? O que a literatura diz sobre timing em PAC?\"", score: 3, feedback: "Perfeito! Pede evidência sem dar a resposta. Estimula busca ativa de conhecimento." },
          { text: "\"Os critérios de switch são: afebril 24-48h, melhora clínica, tolerância VO e cultura sensível. Você checou todos?\"", score: 1, feedback: "Você deu os critérios! A residente deveria ter listado. Ensino passivo." },
          { text: "\"Você já pesquisou sobre isso?\"", score: 1, feedback: "Vago e pode soar como teste/julgamento." },
          { text: "\"Que evidências clínicas e laboratoriais sustentam sua decisão de descalonar agora vs esperar mais um dia?\"", score: 2, feedback: "Bom! Pede evidência com contexto temporal." },
        ],
      },
      {
        title: "Passo 3: Ensinar um Princípio Geral",
        ompStep: "Teach General Rules",
        instruction: "Ensine um princípio generalizável — algo que ela possa aplicar em outros casos.",
        options: [
          { text: "\"Ótimo raciocínio. Uma regra geral para descalonamento: sempre que a cultura identifica o patógeno, buscamos o antibiótico de menor espectro eficaz. Isso é o 'De-escalation Principle' do antimicrobial stewardship — reduz resistência e custos.\"", score: 3, feedback: "Perfeito! Ensina um princípio generalizável, não apenas a resposta do caso." },
          { text: "\"Neste caso, troque para Amoxicilina 500mg 8/8h por 5 dias.\"", score: 0, feedback: "Resposta pontual sem princípio generalizável. A residente não aprende a regra." },
          { text: "\"Lembre-se: descalonamento segue cultura, não empirismo. Se o antibiograma mostra sensibilidade, o espectro mais estreito é sempre preferível quando clinicamente viável.\"", score: 2, feedback: "Bom! Regra clara e aplicável a outros casos." },
          { text: "\"Pesquise sobre isso depois.\"", score: 0, feedback: "Perdeu a oportunidade de ensino no momento clínico — a essência do OMP." },
        ],
      },
      {
        title: "Passo 4: Reforçar Acertos",
        ompStep: "Reinforce What Was Done Right",
        instruction: "Identifique e reforce especificamente o que a residente fez bem.",
        options: [
          { text: "\"Camila, quero destacar que você fez algo excelente: identificou proativamente a oportunidade de descalonamento. Muitos residentes esperam o staff sugerir. Sua análise do antibiograma cruzada com a clínica foi precisa.\"", score: 3, feedback: "Perfeito! Reforço específico, comportamental e que promove autonomia." },
          { text: "\"Bom trabalho.\"", score: 1, feedback: "Genérico demais. Reforço vago não consolida o comportamento." },
          { text: "\"Você acertou, mas precisa melhorar em outras coisas.\"", score: 0, feedback: "Anula o reforço com a ressalva. Separe as etapas!" },
          { text: "\"Seu raciocínio sobre os critérios de switch e a análise do antibiograma mostraram maturidade clínica.\"", score: 2, feedback: "Bom! Específico e positivo." },
        ],
      },
      {
        title: "Passo 5: Corrigir Erros",
        ompStep: "Correct Mistakes",
        instruction: "A residente não mencionou verificar função renal para ajuste de dose da Amoxicilina oral. Como você corrige construtivamente?",
        options: [
          { text: "\"Excelente plano geral. Um aspecto que devemos incorporar: antes de definir a dose oral, precisamos conferir a função renal atual. Se o ClCr estiver reduzido, a dose precisa de ajuste. Qual seria seu próximo passo?\"", score: 3, feedback: "Perfeito! Corrige sem punir, conecta ao plano dela e devolve a reflexão." },
          { text: "\"Você esqueceu de verificar a função renal. Isso é básico.\"", score: 0, feedback: "Tom punitivo ('isso é básico') que gera vergonha, não aprendizagem." },
          { text: "\"Ah, e verifique a função renal.\"", score: 1, feedback: "Menciona mas sem profundidade. Não explora por que é importante." },
          { text: "\"Um ponto a considerar em idosos: a função renal pode estar comprometida mesmo com creatinina normal. Calcular o ClCr antes do ajuste é uma boa prática. O que acha de verificar isso agora?\"", score: 2, feedback: "Bom! Contextualiza e convida ação." },
        ],
      },
    ],
  },
];

interface OMPScenario {
  id: string;
  residentName: string;
  casePresentation: string;
  steps: {
    title: string;
    ompStep: string;
    instruction: string;
    options: { text: string; score: number; feedback: string }[];
  }[];
}

const SCENARIOS: OMPScenario[] = [
  {
    id: "omp1",
    residentName: "Dra. Camila (R1 Farmácia Clínica)",
    casePresentation: "\"Preceptor, tenho um paciente de 68 anos, internado por pneumonia adquirida na comunidade. Está em uso de Ceftriaxona 2g/dia há 5 dias. A cultura de escarro veio com Streptococcus pneumoniae sensível a penicilina. O paciente melhorou clinicamente — afebril há 48h, leucograma normalizando. Eu acho que devemos fazer o descalonamento para Amoxicilina oral, mas não tenho certeza se já é o momento.\"",
    steps: [
      {
        title: "Passo 1: Comprometer com uma Hipótese",
        ompStep: "Get a Commitment",
        instruction: "O primeiro passo do OMP é pedir que o residente se comprometa com uma hipótese/conduta. Como você faria?",
        options: [
          { text: "\"Camila, você mencionou descalonamento. Pode me dizer especificamente: o que te leva a acreditar que agora é o momento certo para fazer a transição IV→VO?\"", score: 3, feedback: "Excelente! Pede comprometimento específico com raciocínio — essência do passo 1." },
          { text: "\"Sim, descalonamento é a conduta correta. Pode prescrever Amoxicilina.\"", score: 0, feedback: "Você deu a resposta sem explorar o raciocínio. Perdeu toda oportunidade de ensino." },
          { text: "\"O que você faria?\" (pergunta genérica)", score: 1, feedback: "Muito vago. No OMP, a pergunta deve ser focada no caso específico." },
          { text: "\"Antes de decidir, quais critérios você usaria para definir se é hora do switch IV→VO?\"", score: 2, feedback: "Bom! Explora critérios, mas não pede comprometimento direto com a conduta." },
        ],
      },
      {
        title: "Passo 2: Explorar o Raciocínio",
        ompStep: "Probe for Supporting Evidence",
        instruction: "Agora explore as evidências que sustentam o raciocínio da residente.",
        options: [
          { text: "\"Quais critérios específicos de switch IV→VO você está considerando? O que a literatura diz sobre timing em PAC?\"", score: 3, feedback: "Perfeito! Pede evidência sem dar a resposta. Estimula busca ativa de conhecimento." },
          { text: "\"Os critérios de switch são: afebril 24-48h, melhora clínica, tolerância VO e cultura sensível. Você checou todos?\"", score: 1, feedback: "Você deu os critérios! A residente deveria ter listado. Ensino passivo." },
          { text: "\"Você já pesquisou sobre isso?\"", score: 1, feedback: "Vago e pode soar como teste/julgamento." },
          { text: "\"Que evidências clínicas e laboratoriais sustentam sua decisão de descalonar agora vs esperar mais um dia?\"", score: 2, feedback: "Bom! Pede evidência com contexto temporal." },
        ],
      },
      {
        title: "Passo 3: Ensinar um Princípio Geral",
        ompStep: "Teach General Rules",
        instruction: "Ensine um princípio generalizável — algo que ela possa aplicar em outros casos.",
        options: [
          { text: "\"Ótimo raciocínio. Uma regra geral para descalonamento: sempre que a cultura identifica o patógeno, buscamos o antibiótico de menor espectro eficaz. Isso é o 'De-escalation Principle' do antimicrobial stewardship — reduz resistência e custos.\"", score: 3, feedback: "Perfeito! Ensina um princípio generalizável, não apenas a resposta do caso." },
          { text: "\"Neste caso, troque para Amoxicilina 500mg 8/8h por 5 dias.\"", score: 0, feedback: "Resposta pontual sem princípio generalizável. A residente não aprende a regra." },
          { text: "\"Lembre-se: descalonamento segue cultura, não empirismo. Se o antibiograma mostra sensibilidade, o espectro mais estreito é sempre preferível quando clinicamente viável.\"", score: 2, feedback: "Bom! Regra clara e aplicável a outros casos." },
          { text: "\"Pesquise sobre isso depois.\"", score: 0, feedback: "Perdeu a oportunidade de ensino no momento clínico — a essência do OMP." },
        ],
      },
      {
        title: "Passo 4: Reforçar Acertos",
        ompStep: "Reinforce What Was Done Right",
        instruction: "Identifique e reforce especificamente o que a residente fez bem.",
        options: [
          { text: "\"Camila, quero destacar que você fez algo excelente: identificou proativamente a oportunidade de descalonamento. Muitos residentes esperam o staff sugerir. Sua análise do antibiograma cruzada com a clínica foi precisa.\"", score: 3, feedback: "Perfeito! Reforço específico, comportamental e que promove autonomia." },
          { text: "\"Bom trabalho.\"", score: 1, feedback: "Genérico demais. Reforço vago não consolida o comportamento." },
          { text: "\"Você acertou, mas precisa melhorar em outras coisas.\"", score: 0, feedback: "Anula o reforço com a ressalva. Separe as etapas!" },
          { text: "\"Seu raciocínio sobre os critérios de switch e a análise do antibiograma mostraram maturidade clínica.\"", score: 2, feedback: "Bom! Específico e positivo." },
        ],
      },
      {
        title: "Passo 5: Corrigir Erros",
        ompStep: "Correct Mistakes",
        instruction: "A residente não mencionou verificar função renal para ajuste de dose da Amoxicilina oral. Como você corrige construtivamente?",
        options: [
          { text: "\"Excelente plano geral. Um aspecto que devemos incorporar: antes de definir a dose oral, precisamos conferir a função renal atual. Se o ClCr estiver reduzido, a dose precisa de ajuste. Qual seria seu próximo passo?\"", score: 3, feedback: "Perfeito! Corrige sem punir, conecta ao plano dela e devolve a reflexão." },
          { text: "\"Você esqueceu de verificar a função renal. Isso é básico.\"", score: 0, feedback: "Tom punitivo ('isso é básico') que gera vergonha, não aprendizagem." },
          { text: "\"Ah, e verifique a função renal.\"", score: 1, feedback: "Menciona mas sem profundidade. Não explora por que é importante." },
          { text: "\"Um ponto a considerar em idosos: a função renal pode estar comprometida mesmo com creatinina normal. Calcular o ClCr antes do ajuste é uma boa prática. O que acha de verificar isso agora?\"", score: 2, feedback: "Bom! Contextualiza e convida ação." },
        ],
      },
    ],
  },
];

export default function SimuladorPreceptoriaClinica() {
  const navigate = useNavigate();
  const { isVirtualRoom, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [scenarioIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  const scenario = SCENARIOS[scenarioIdx];

  const handleConfirm = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (step < scenario.steps.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const totalScore = answers.reduce((acc, optIdx, i) => acc + scenario.steps[i].options[optIdx].score, 0);
  const maxScore = scenario.steps.length * 3;
  const pct = Math.round((totalScore / maxScore) * 100);

  useEffect(() => {
    if (isVirtualRoom && showResult && !submitted) {
      submitResults({ score: pct, actions: { answers } });
    }
  }, [showResult]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/", 15000);
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
          <h1 className="text-2xl font-bold">Preceptoria Clínica — One-Minute Preceptor</h1>
          <p className="text-muted-foreground text-sm">Treine os 5 passos do modelo OMP</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Case Presentation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {scenario.residentName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 text-sm italic">{scenario.casePresentation}</div>
        </CardContent>
      </Card>

      {/* OMP Steps Visual */}
      <div className="flex items-center gap-1 text-xs overflow-x-auto pb-2">
        {scenario.steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-1 whitespace-nowrap ${i <= step || showResult ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              i < step || showResult ? "bg-primary text-primary-foreground" : i === step && !showResult ? "border-2 border-primary" : "border border-border"
            }`}>{i + 1}</div>
            <span className="hidden sm:inline">{s.ompStep}</span>
            {i < 4 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* Steps */}
      {!showResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{scenario.steps[step].title}</CardTitle>
            <Progress value={(step / scenario.steps.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{scenario.steps[step].instruction}</p>
            <div className="space-y-2">
              {scenario.steps[step].options.map((opt, i) => (
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
              <div className={`p-3 rounded-lg text-sm ${scenario.steps[step].options[selected].score >= 2 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                <Badge variant="outline" className="mb-1">{scenario.steps[step].options[selected].score}/3</Badge>
                <p>{scenario.steps[step].options[selected].feedback}</p>
              </div>
            )}
            <Button onClick={handleConfirm} disabled={selected === null} className="w-full gap-2">
              {step < scenario.steps.length - 1 ? <>Próximo Passo <ChevronRight className="h-4 w-4" /></> : "Ver Resultado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {showResult && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Resultado — One-Minute Preceptor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {(!isVirtualRoom || showFeedbackVR) && (
              <>
                <div className="text-center py-4">
                  <div className={`text-5xl font-bold mb-2 ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{pct}%</div>
                  <p className="text-muted-foreground text-sm">
                    {pct >= 80 ? "Preceptor exemplar!" : pct >= 60 ? "Bom, mas pode refinar a técnica." : "Revise os 5 passos do OMP."}
                  </p>
                </div>
                <div className="space-y-2">
                  {scenario.steps.map((s, i) => {
                    const chosen = s.options[answers[i]];
                    return (
                      <div key={i} className={`p-3 rounded-lg border text-sm ${chosen.score >= 2 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{s.ompStep}</p>
                          <Badge variant="outline">{chosen.score}/3</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{chosen.feedback}</p>
                      </div>
                    );
                  })}
                </div>
                <Separator />
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">📚 Referências</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Neher JO, et al. A five-step "microskills" model of clinical teaching. <em>J Am Board Fam Pract</em>. 1992;5(4):419-24.</li>
                    <li>• Furney SL, et al. Teaching the one-minute preceptor. <em>J Gen Intern Med</em>. 2001;16(9):620-4.</li>
                    <li>• Irby DM. Teaching and learning in ambulatory care settings. <em>Acad Med</em>. 1995;70(10):898-931.</li>
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
