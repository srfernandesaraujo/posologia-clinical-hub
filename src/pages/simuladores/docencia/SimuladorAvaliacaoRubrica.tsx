import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ClipboardCheck, ChevronRight, RotateCcw, Award, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

interface RubricCriterion {
  name: string;
  levels: string[];
  expertScore: number; // 0-3 index
}

interface OSCEStation {
  id: string;
  title: string;
  narrative: string;
  criteria: RubricCriterion[];
}

const STATIONS: OSCEStation[] = [
  {
    id: "osce1",
    title: "Estação OSCE: Dispensação de Antibiótico",
    narrative: `O aluno Lucas atende uma paciente com receita de Azitromicina 500mg (3 dias) para faringite bacteriana.

Observações:
- Cumprimentou a paciente pelo nome ✓
- Não perguntou sobre alergias ✗
- Verificou a receita (data, assinatura, CRM) ✓
- Orientou sobre posologia: "Tomar 1 comprimido por dia durante 3 dias" ✓
- NÃO orientou sobre interação com antiácidos ✗
- NÃO perguntou sobre outros medicamentos em uso ✗
- Orientou sobre conservação e armazenamento ✓
- Despediu-se cordialmente e perguntou se tinha dúvidas ✓
- Tempo total: 4 minutos (adequado)
- Tom de voz: claro e audível
- Postura: manteve contato visual, posição acolhedora`,
    criteria: [
      {
        name: "Acolhimento e Comunicação",
        levels: ["Não cumprimenta, linguagem técnica excessiva", "Cumprimenta mas comunicação impessoal", "Comunicação clara e cordial", "Comunicação empática, personalizada, verifica compreensão"],
        expertScore: 2,
      },
      {
        name: "Verificação da Prescrição",
        levels: ["Não verifica a receita", "Verifica parcialmente (só assinatura)", "Verifica data, assinatura e CRM", "Verifica completo + confronta com histórico"],
        expertScore: 2,
      },
      {
        name: "Investigação de Alergias e Uso de Medicamentos",
        levels: ["Não pergunta sobre alergias nem outros medicamentos", "Pergunta sobre alergias apenas", "Pergunta alergias e medicamentos", "Investigação completa incluindo fitoterápicos e automedicação"],
        expertScore: 0,
      },
      {
        name: "Orientação Farmacêutica",
        levels: ["Não orienta sobre o medicamento", "Orienta apenas posologia", "Orienta posologia + efeitos adversos", "Orientação completa: posologia, EA, interações, armazenamento"],
        expertScore: 1,
      },
      {
        name: "Raciocínio Clínico",
        levels: ["Não avalia adequação do tratamento", "Avalia superficialmente", "Avalia adequação e identifica problemas parciais", "Avaliação crítica completa com intervenção quando necessário"],
        expertScore: 1,
      },
    ],
  },
  {
    id: "osce2",
    title: "Estação OSCE: Anamnese Farmacêutica — Idoso Polimedicado",
    narrative: `A aluna Fernanda realiza anamnese farmacêutica com Sr. José, 78 anos, usando 7 medicamentos.

Observações:
- Apresentou-se e explicou o objetivo da consulta ✓
- Usou linguagem acessível ✓
- Perguntou sobre todos os medicamentos prescritos ✓
- NÃO perguntou sobre medicamentos sem receita (automedicação) ✗
- Identificou que o paciente toma Captopril junto com a refeição (reduz absorção) ✓
- NÃO verificou horários de administração de todos os medicamentos ✗
- Perguntou sobre efeitos adversos sentidos ✓
- Avaliou adesão com método indireto (pergunta aberta) ✓
- NÃO utilizou instrumento validado de adesão (Morisky, ARMS) ✗
- Registrou informações de forma organizada ✓
- Tempo: 8 minutos (levemente longo)
- Demonstrou empatia ao ouvir queixas do paciente ✓`,
    criteria: [
      {
        name: "Acolhimento e Rapport",
        levels: ["Não se apresenta nem explica objetivo", "Se apresenta mas não explica contexto", "Apresentação adequada com objetivo claro", "Rapport exemplar com escuta ativa e validação emocional"],
        expertScore: 3,
      },
      {
        name: "Coleta de Dados Farmacoterapêuticos",
        levels: ["Coleta incompleta (<50% dos medicamentos)", "Coleta parcial (prescritos apenas)", "Coleta completa prescritos + automedicação", "Coleta integral incluindo fitoterápicos, suplementos e hábitos"],
        expertScore: 1,
      },
      {
        name: "Avaliação de Adesão",
        levels: ["Não avalia adesão", "Avalia com pergunta genérica", "Usa método indireto estruturado", "Combina método indireto + instrumento validado"],
        expertScore: 2,
      },
      {
        name: "Identificação de PRM",
        levels: ["Não identifica nenhum PRM", "Identifica 1 PRM", "Identifica 2+ PRMs com classificação", "Identificação completa com análise de causalidade"],
        expertScore: 1,
      },
      {
        name: "Gestão do Tempo",
        levels: ["Muito curto (<3min) ou muito longo (>12min)", "Parcialmente adequado (tempo irregular)", "Adequado (5-8 min)", "Excelente gestão com priorização eficiente"],
        expertScore: 1,
      },
    ],
  },
];

export default function SimuladorAvaliacaoRubrica() {
  const navigate = useNavigate();
  const [stationIdx, setStationIdx] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const [currentCriterion, setCurrentCriterion] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [vrShowFeedback, setVrShowFeedback] = useState(false);

  const station = STATIONS[stationIdx];

  const { isVirtualRoom: isVR, submitResults, submitted } = useVirtualRoomCase("avaliacao-rubrica");

  // Auto-submit when result is shown
  useEffect(() => {
    if (isVR && showResult && !submitted) {
      submitResults({ score: Math.round(kappa * 100), actions: { scores, agreements }, timeSpentSeconds: 0 });
    }
  }, [showResult]);

  // 15s redirect
  useEffect(() => {
    if (isVR && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVR, submitted, navigate]);

  const handleScore = (level: number) => {
    const newScores = [...scores];
    newScores[currentCriterion] = level;
    setScores(newScores);
  };

  const handleNext = () => {
    if (scores[currentCriterion] === null || scores[currentCriterion] === undefined) return;
    if (currentCriterion < station.criteria.length - 1) {
      setCurrentCriterion(currentCriterion + 1);
    } else {
      setShowResult(true);
    }
  };

  // Kappa calculation (simplified: agreement rate)
  const agreements = scores.filter((s, i) => s === station.criteria[i].expertScore).length;
  const kappa = agreements / station.criteria.length;
  const kappaLabel = kappa >= 0.8 ? "Excelente" : kappa >= 0.6 ? "Bom" : kappa >= 0.4 ? "Moderado" : "Fraco";

  const handleRestart = () => {
    setStationIdx((stationIdx + 1) % STATIONS.length);
    setScores([]);
    setCurrentCriterion(0);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/simuladores"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Avaliação por Rubrica (OSCE)</h1>
          <p className="text-muted-foreground text-sm">Treine a calibração como avaliador clínico</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Station Narrative */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> {station.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-line max-h-[300px] overflow-y-auto">
            {station.narrative}
          </div>
        </CardContent>
      </Card>

      {/* Scoring */}
      {!showResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Critério {currentCriterion + 1}/{station.criteria.length}: {station.criteria[currentCriterion].name}</CardTitle>
            </div>
            <Progress value={(currentCriterion / station.criteria.length) * 100} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Avalie o desempenho do aluno neste critério:</p>
            {station.criteria[currentCriterion].levels.map((level, i) => (
              <button
                key={i}
                onClick={() => handleScore(i)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                  scores[currentCriterion] === i ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Badge variant="outline" className="mb-1">{i + 1}/4</Badge>
                <p>{level}</p>
              </button>
            ))}
            <Button onClick={handleNext} disabled={scores[currentCriterion] === null || scores[currentCriterion] === undefined} className="w-full gap-2">
              {currentCriterion < station.criteria.length - 1 ? <>Próximo Critério <ChevronRight className="h-4 w-4" /></> : "Ver Resultado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {showResult && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Resultado da Calibração</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className={`text-5xl font-bold mb-2 ${kappa >= 0.6 ? "text-emerald-600" : kappa >= 0.4 ? "text-amber-600" : "text-destructive"}`}>
                {Math.round(kappa * 100)}%
              </div>
              <p className="text-muted-foreground text-sm">Concordância com gabarito de especialistas</p>
              <Badge className={`mt-2 ${kappa >= 0.6 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                Kappa: {kappaLabel}
              </Badge>
            </div>
            <div className="space-y-2">
              {station.criteria.map((c, i) => {
                const match = scores[i] === c.expertScore;
                return (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${match ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <p className="font-medium">{c.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">Sua nota: {(scores[i] ?? 0) + 1}/4</Badge>
                      <Badge variant={match ? "default" : "destructive"}>Expert: {c.expertScore + 1}/4</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Gabarito: "{c.levels[c.expertScore]}"
                    </p>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">📚 Referências</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Harden RM, et al. <em>AMEE Guide No. 81 — OSCE</em>. Med Teach. 2015.</li>
                <li>• Norcini JJ, et al. Criteria for good assessment. Med Teach. 2011;33(3):206-14.</li>
              </ul>
            </div>
            {!isVR && <Button onClick={handleRestart} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Próxima Estação</Button>}
          </CardContent>
        </Card>
      )}

      {isVR && submitted && !vrShowFeedback && (
        <Button onClick={() => setVrShowFeedback(true)} variant="outline" className="w-full gap-2">
          <Eye className="h-4 w-4" /> Mostrar Resultados
        </Button>
      )}
      {isVR && submitted && vrShowFeedback && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <div className={`text-3xl font-bold ${Math.round(kappa * 100) >= 80 ? "text-green-600" : Math.round(kappa * 100) >= 50 ? "text-yellow-600" : "text-destructive"}`}>{Math.round(kappa * 100)}%</div>
          <p className="text-sm text-muted-foreground">{Math.round(kappa * 100) >= 80 ? "🏆 Excelente!" : Math.round(kappa * 100) >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise seus conceitos"}</p>
          <p className="text-xs text-muted-foreground">Redirecionando em 15 segundos...</p>
        </div>
      )}
    </div>
  );
}
