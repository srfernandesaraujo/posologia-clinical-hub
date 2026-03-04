import { useState } from "react";
import { Droplet, ArrowRight, Map, ChevronRight, Microscope, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface StoryNode {
  id: string;
  title: string;
  labData: string;
  question: string;
  explanation?: string;
  reference?: string;
  options: { text: string; nextNode: string; isError: boolean; feedback?: string }[];
}

interface HemogramCase {
  name: string;
  icon: string;
  patientName: string;
  patientAge: string;
  patientHistory: string;
  setting: string;
  briefing: string;
  nodes: Record<string, StoryNode>;
  finalDiagnosis: string;
}

const hemogramCases: HemogramCase[] = [
  {
    name: "Anemia Ferropénica",
    icon: "🩸",
    patientName: "Maria das Graças",
    patientAge: "45 anos, professora",
    patientHistory: "Menorragia há 6 meses. Cansaço progressivo, unhas quebradiças, desejo de comer gelo (pagofagia). Palidez de mucosas.",
    setting: "Laboratório de Análises Clínicas — Hospital Universitário",
    briefing: "Navegue pelo labirinto de exames laboratoriais para chegar ao diagnóstico correto. Cada decisão errada custa pontos.",
    nodes: {
      root: {
        id: "root", title: "Hemograma Inicial",
        labData: "Hb: 8.5 g/dL ↓ | Ht: 26% ↓ | Hemácias: 4.2×10⁶/µL",
        question: "Anemia confirmada. Qual índice hematimétrico avaliar PRIMEIRO?",
        explanation: "A classificação morfológica (VCM) é o primeiro passo na investigação etiológica da anemia.",
        reference: "Failace R. Hemograma: Manual de Interpretação, 6ª ed.",
        options: [
          { text: "Leucócitos (Série Branca)", nextNode: "", isError: true, feedback: "Leucócitos avaliam infecção/neoplasia, não classificam anemia. Foque nos índices eritrocitários." },
          { text: "VCM (Volume Corpuscular Médio)", nextNode: "vcm", isError: false },
          { text: "Ferro Sérico direto", nextNode: "", isError: true, feedback: "Ferro sérico isolado tem baixa especificidade. Primeiro classifique pelo VCM." },
          { text: "Reticulócitos", nextNode: "", isError: true, feedback: "Reticulócitos diferenciam hipo/hiperproliferativa, mas o VCM é o primeiro passo classificatório." },
        ],
      },
      vcm: {
        id: "vcm", title: "Classificação Morfológica",
        labData: "VCM: 68 fL ↓ (Ref: 80-100) | HCM: 24 pg ↓ | RDW: 18% ↑",
        question: "Anemia microcítica hipocrômica com anisocitose. Qual exame solicitar?",
        explanation: "VCM <80 fL = microcítica. Causas: ferropenia, talassemia, doença crônica, sideroblástica. O perfil de ferro diferencia.",
        reference: "Hoffbrand AV. Fundamentos em Hematologia, 7ª ed.",
        options: [
          { text: "Vitamina B12 e Ácido Fólico", nextNode: "", isError: true, feedback: "B12/folato investigam macrocitose (VCM >100). Aqui o VCM está baixo." },
          { text: "Ferritina + Ferro Sérico + TIBC", nextNode: "ferro", isError: false },
          { text: "Eletroforese de Hemoglobina", nextNode: "eletroforese", isError: false },
          { text: "Teste de Coombs", nextNode: "", isError: true, feedback: "Coombs investiga anemia hemolítica autoimune, geralmente normocítica." },
        ],
      },
      ferro: {
        id: "ferro", title: "Perfil de Ferro",
        labData: "Ferritina: 4 ng/mL ↓↓ (Ref: 12-150) | Ferro sérico: 25 µg/dL ↓ | TIBC: 450 µg/dL ↑ | Saturação Transferrina: 5.5% ↓↓",
        question: "Perfil clássico de ferropenia. Qual é a causa mais provável nesta paciente?",
        explanation: "Ferritina <12 = depleção de estoque. TIBC elevado = organismo tentando captar mais ferro. Sat.Transferrina <16% confirma deficiência funcional.",
        reference: "Camaschella C. Iron-deficiency anemia. NEJM 2015",
        options: [
          { text: "Perda menstrual crônica (menorragia)", nextNode: "victory", isError: false },
          { text: "Deficiência dietética isolada", nextNode: "", isError: true, feedback: "Possível contribuinte, mas a menorragia de 6 meses é a causa principal da perda crônica." },
          { text: "Sangramento gastrointestinal oculto", nextNode: "", isError: true, feedback: "Importante em homens e pós-menopausa, mas nesta paciente a menorragia explica o quadro." },
        ],
      },
      eletroforese: {
        id: "eletroforese", title: "Eletroforese de Hemoglobina",
        labData: "HbA: 97.2% | HbA2: 2.1% (Ref: 2-3.5%) | HbF: 0.7% | HbS: ausente",
        question: "Eletroforese normal. O que isso descarta e para onde seguir?",
        explanation: "HbA2 normal descarta beta-talassemia minor (seria >3.5%). Sem HbS descarta doença falciforme.",
        reference: "Weatherall DJ. Lancet 2001",
        options: [
          { text: "Descarta talassemia. Investigar ferro.", nextNode: "ferro", isError: false },
          { text: "Confirma talassemia. Iniciar aconselhamento.", nextNode: "", isError: true, feedback: "HbA2 está NORMAL. Talassemia minor teria HbA2 >3.5%." },
          { text: "Pedir teste genético para alfa-talassemia", nextNode: "", isError: true, feedback: "Possível, mas improvável neste contexto. Primeiro investigar ferro, causa mais comum." },
        ],
      },
    },
    finalDiagnosis: "Anemia Ferropénica por Menorragia",
  },
  {
    name: "Anemia Megaloblástica",
    icon: "🔴",
    patientName: "Roberto Silva",
    patientAge: "72 anos, vegetariano há 20 anos",
    patientHistory: "Parestesias em mãos e pés há 3 meses. Glossite (língua lisa e dolorosa). Declínio cognitivo leve. Marcha instável.",
    setting: "Ambulatório de Hematologia — Hospital de Clínicas",
    briefing: "Os sintomas neurológicos associados a anemia sugerem uma causa específica. Investigue passo a passo.",
    nodes: {
      root: {
        id: "root", title: "Hemograma Inicial",
        labData: "Hb: 9.8 g/dL ↓ | VCM: 112 fL ↑↑ | HCM: 38 pg ↑ | Leucócitos: 3.500 ↓ | Plaquetas: 130.000 ↓",
        question: "Anemia macrocítica com pancitopenia leve. Qual exame solicitar?",
        explanation: "VCM >100 = macrocítica. Pancitopenia + macrocitose sugere megaloblástica ou mielodisplasia.",
        reference: "Green R. Blood 2017",
        options: [
          { text: "Vitamina B12 e Ácido Fólico séricos", nextNode: "b12", isError: false },
          { text: "Perfil de Ferro", nextNode: "", isError: true, feedback: "Ferro investiga microcitose. Aqui o VCM é ALTO." },
          { text: "TSH (Hipotireoidismo)", nextNode: "", isError: true, feedback: "Hipotireoidismo pode causar macrocitose leve, mas não pancitopenia com VCM >110." },
          { text: "Reticulócitos", nextNode: "reticulocitos", isError: false },
        ],
      },
      reticulocitos: {
        id: "reticulocitos", title: "Contagem de Reticulócitos",
        labData: "Reticulócitos: 0.5% ↓ (Ref: 1-2%) | Reticulócitos corrigidos: 0.25%",
        question: "Reticulócitos baixos (hipoproliferativa). Próximo passo?",
        explanation: "Anemia hipoproliferativa = medula não está compensando. Descarta hemólise como causa primária.",
        reference: "Hoffbrand AV. Fundamentos em Hematologia, 7ª ed.",
        options: [
          { text: "Vitamina B12 e Ácido Fólico", nextNode: "b12", isError: false },
          { text: "Biópsia de medula óssea", nextNode: "", isError: true, feedback: "Indicada se suspeita de mielodisplasia, mas primeiro excluir causas tratáveis (B12/folato)." },
        ],
      },
      b12: {
        id: "b12", title: "Dosagem de Vitaminas",
        labData: "Vitamina B12: 85 pg/mL ↓↓ (Ref: 200-900) | Ácido Fólico: 12 ng/mL (normal) | Homocisteína: 45 µmol/L ↑↑ | Ácido Metilmalônico: 1.200 nmol/L ↑↑",
        question: "B12 muito baixa com marcadores elevados. Qual a causa mais provável neste paciente?",
        explanation: "Homocisteína E ácido metilmalônico elevados = deficiência de B12 (folato eleva só homocisteína). B12 <200 é deficiente.",
        reference: "Stabler SP. NEJM 2013",
        options: [
          { text: "Deficiência dietética por vegetarianismo estrito", nextNode: "anticorpos", isError: false },
          { text: "Anemia perniciosa (autoimune)", nextNode: "anticorpos", isError: false },
          { text: "Uso de metformina", nextNode: "", isError: true, feedback: "Metformina reduz absorção de B12, mas paciente não é diabético." },
        ],
      },
      anticorpos: {
        id: "anticorpos", title: "Investigação Autoimune",
        labData: "Anti-fator intrínseco: POSITIVO | Anti-célula parietal: POSITIVO | Gastrina sérica: 850 pg/mL ↑↑ (Ref: <100)",
        question: "Anticorpos positivos + hipergastrinemia. Diagnóstico final?",
        explanation: "Anticorpos anti-FI são altamente específicos para anemia perniciosa. A gastrite atrófica autoimune destrói células parietais, eliminando fator intrínseco e ácido.",
        reference: "Toh BH. NEJM 1997",
        options: [
          { text: "Anemia Perniciosa (Gastrite Atrófica Autoimune)", nextNode: "victory", isError: false },
          { text: "Deficiência dietética pura", nextNode: "", isError: true, feedback: "Anti-FI positivo confirma causa autoimune. A dieta vegetariana pode ter contribuído, mas a causa primária é autoimune." },
          { text: "Síndrome Mielodisplásica", nextNode: "", isError: true, feedback: "Anticorpos anti-FI positivos e B12 muito baixa apontam para perniciosa, não mielodisplasia." },
        ],
      },
    },
    finalDiagnosis: "Anemia Perniciosa (Megaloblástica por deficiência de B12)",
  },
  {
    name: "Anemia Hemolítica",
    icon: "💥",
    patientName: "Fernando Mendes",
    patientAge: "35 anos, descendente africano",
    patientHistory: "Icterícia súbita e urina escura ('cor de coca-cola') há 2 dias. Dor abdominal e lombar. Iniciou primaquina há 5 dias para profilaxia de malária (viagem a Moçambique).",
    setting: "Emergência — Hospital de Referência em Doenças Tropicais",
    briefing: "Icterícia aguda após início de medicamento. Investigue a causa hemolítica.",
    nodes: {
      root: {
        id: "root", title: "Hemograma de Urgência",
        labData: "Hb: 7.2 g/dL ↓↓ (era 14.0 há 1 semana) | VCM: 92 fL | Reticulócitos: 12% ↑↑↑ | Leucócitos: 11.000 | Esferócitos e corpúsculos de Heinz no esfregaço",
        question: "Queda abrupta de Hb com reticulocitose intensa. O que isso indica?",
        explanation: "Reticulócitos >2% = medula hiperproliferativa compensando destruição. Queda aguda de 7g/dL em 1 semana = hemólise grave.",
        reference: "Dhaliwal G. Am Fam Physician 2004",
        options: [
          { text: "Anemia hemolítica aguda", nextNode: "hemolise", isError: false },
          { text: "Sangramento gastrointestinal oculto", nextNode: "", isError: true, feedback: "Sangramento teria reticulócitos elevados, mas NÃO corpúsculos de Heinz. E o esfregaço mostra hemólise." },
          { text: "Aplasia medular", nextNode: "", isError: true, feedback: "Aplasia teria reticulócitos BAIXOS, não 12%. Aqui a medula está hiper-respondendo." },
        ],
      },
      hemolise: {
        id: "hemolise", title: "Marcadores de Hemólise",
        labData: "LDH: 980 U/L ↑↑ | Bilirrubina indireta: 5.8 mg/dL ↑↑ | Haptoglobina: <10 mg/dL ↓↓ (indetectável) | Coombs direto: NEGATIVO",
        question: "Hemólise confirmada. Coombs negativo descarta causa autoimune. Qual é a causa mais provável?",
        explanation: "Haptoglobina indetectável = hemólise intravascular grave. LDH e BI elevados confirmam. Coombs negativo descarta AHAI.",
        reference: "Marchand A. Clin Chem 1980",
        options: [
          { text: "Deficiência de G6PD desencadeada por primaquina", nextNode: "g6pd", isError: false },
          { text: "Esferocitose hereditária", nextNode: "", isError: true, feedback: "Esferocitose é crônica, não aguda. E é desencadeada por infecções, não fármacos." },
          { text: "Púrpura Trombocitopênica Trombótica (PTT)", nextNode: "", isError: true, feedback: "PTT teria trombocitopenia grave e esquizócitos. Aqui há corpúsculos de Heinz, clássico de G6PD." },
          { text: "Malária (Plasmodium falciparum)", nextNode: "", isError: true, feedback: "Possível em viajante, mas o timing (5 dias após primaquina) e corpúsculos de Heinz apontam G6PD." },
        ],
      },
      g6pd: {
        id: "g6pd", title: "Confirmação Enzimática",
        labData: "Atividade G6PD: 1.2 U/g Hb ↓↓ (Ref: 4.6-13.5) — Nota: dosar APÓS resolução da crise (reticulócitos têm G6PD normal e podem falsear resultado)",
        question: "G6PD baixa confirma. Qual a conduta imediata?",
        explanation: "G6PD deficiente não metaboliza radicais livres, causando desnaturação da Hb (corpúsculos de Heinz) e hemólise. É a enzimopatia mais comum do mundo.",
        reference: "Cappellini MD, Fiorelli G. Lancet 2008",
        options: [
          { text: "Suspender primaquina + suporte transfusional + hidratação", nextNode: "victory", isError: false },
          { text: "Iniciar corticoide (como em AHAI)", nextNode: "", isError: true, feedback: "Corticoides tratam hemólise AUTOIMUNE (Coombs+). Aqui é enzimática, Coombs negativo." },
          { text: "Esplenectomia de urgência", nextNode: "", isError: true, feedback: "Esplenectomia é para esferocitose refratária. Na G6PD basta remover o agente oxidante." },
        ],
      },
    },
    finalDiagnosis: "Anemia Hemolítica Aguda por Deficiência de G6PD (induzida por Primaquina)",
  },
];

export default function LabirintoHemogramaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "result">("select");
  const [caseIdx, setCaseIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [currentNodeId, setCurrentNodeId] = useState("root");
  const [score, setScore] = useState(100);
  const [errors, setErrors] = useState(0);
  const [pathHistory, setPathHistory] = useState<string[]>(["Início"]);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [gameWon, setGameWon] = useState(false);

  const caseData = hemogramCases[caseIdx];
  const node = caseData.nodes[currentNodeId];

  const startGame = () => {
    setCurrentNodeId("root");
    setScore(100);
    setErrors(0);
    setPathHistory(["Início"]);
    setFeedback(null);
    setGameWon(false);
    setPhase("playing");
  };

  const handleOption = (opt: { text: string; nextNode: string; isError: boolean; feedback?: string }) => {
    if (opt.isError) {
      const newScore = Math.max(0, score - 15);
      setScore(newScore);
      setErrors(e => e + 1);
      setFeedback({
        isCorrect: false,
        title: "Raciocínio Incorreto",
        explanation: opt.feedback || "Essa não é a melhor abordagem. Pense na classificação morfológica.",
        tip: "Revise a sequência lógica da investigação de anemias.",
      });
      if (newScore <= 0) {
        setTimeout(() => { setFeedback(null); setPhase("result"); }, 100);
      }
      return;
    }

    if (opt.nextNode === "victory") {
      setGameWon(true);
      setPathHistory(p => [...p, caseData.finalDiagnosis]);
      const nextNode = caseData.nodes[currentNodeId];
      setFeedback({
        isCorrect: true,
        title: "Diagnóstico Correto!",
        explanation: nextNode?.explanation || `${caseData.finalDiagnosis} — Parabéns pela investigação!`,
        reference: nextNode?.reference,
      });
      return;
    }

    const next = caseData.nodes[opt.nextNode];
    if (next) {
      setCurrentNodeId(opt.nextNode);
      setPathHistory(p => [...p, next.title]);
      // Show positive feedback for the current node
      if (node?.explanation) {
        setFeedback({
          isCorrect: true,
          title: "Correto!",
          explanation: node.explanation,
          reference: node.reference,
        });
      }
    }
  };

  const handleFeedbackContinue = () => {
    if (gameWon) { setFeedback(null); setPhase("result"); return; }
    setFeedback(null);
  };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Labirinto do Hemograma</h2>
        <p className="text-center text-muted-foreground text-sm">Escolha o caso clínico e navegue pelo labirinto diagnóstico</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {hemogramCases.map((c, i) => (
            <button
              key={i}
              onClick={() => setCaseIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                caseIdx === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <p className="font-semibold text-foreground mt-2">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.patientName}</p>
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
        title={`Labirinto: ${caseData.name}`}
        setting={caseData.setting}
        patientName={caseData.patientName}
        patientAge={caseData.patientAge}
        patientHistory={caseData.patientHistory}
        briefing={caseData.briefing}
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Microscope className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    return (
      <GameStarsResult
        score={score}
        maxScore={100}
        errors={errors}
        title={gameWon ? "Diagnóstico Correto!" : "Investigação Falhou"}
        subtitle={gameWon ? `${caseData.finalDiagnosis}` : "As pistas laboratoriais levaram a um beco sem saída."}
        onRestart={startGame}
        onBack={() => setPhase("select")}
        details={[
          { label: "Caso", value: caseData.name },
          { label: "Passos no labirinto", value: `${pathHistory.length}` },
          { label: "Caminho", value: pathHistory.join(" → ") },
        ]}
      />
    );
  }

  // Playing
  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={feedback.isCorrect}
          title={feedback.title}
          explanation={feedback.explanation}
          reference={feedback.reference}
          tip={feedback.tip}
          onContinue={handleFeedbackContinue}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
        <Map className="h-3 w-3" />
        {pathHistory.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3" />}
            <span className={i === pathHistory.length - 1 ? "text-primary font-semibold" : ""}>{p}</span>
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>{caseData.icon}</span>
          <h3 className="font-bold text-foreground text-sm">{caseData.name}</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant={score > 60 ? "secondary" : "destructive"}>Pontos: {score}/100</Badge>
          <Badge variant="outline">Erros: {errors}</Badge>
        </div>
      </div>

      {node && (
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {node.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-mono text-foreground flex items-start gap-2">
                <Droplet className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                {node.labData}
              </p>
            </div>
            <p className="text-base font-medium text-foreground">{node.question}</p>
            <div className="space-y-2">
              {node.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left text-sm h-auto py-3 whitespace-normal hover:border-primary/50"
                  onClick={() => handleOption(opt)}
                >
                  <ChevronRight className="h-4 w-4 shrink-0 mr-2" />
                  {opt.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar ao menu</Button>
      </div>
    </div>
  );
}
