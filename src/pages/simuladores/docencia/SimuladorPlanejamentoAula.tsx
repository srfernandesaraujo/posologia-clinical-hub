import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, CheckCircle, XCircle, ChevronRight, RotateCcw, Award, Target, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const SLUG = "planejamento-aula";

interface Competence {
  id: string;
  area: string;
  text: string;
}

interface Methodology {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
}

interface Assessment {
  id: string;
  name: string;
  description: string;
  measures: string[];
}

const COMPETENCES: Competence[] = [
  { id: "c1", area: "Cuidado em Saúde", text: "Realizar o cuidado farmacêutico ao paciente, família e comunidade, de forma a promover o uso racional de medicamentos." },
  { id: "c2", area: "Gestão em Saúde", text: "Gerenciar a seleção, programação, aquisição, armazenamento e distribuição de medicamentos e insumos." },
  { id: "c3", area: "Tecnologia e Inovação", text: "Desenvolver e produzir medicamentos, alimentos e cosméticos de acordo com normas e protocolos vigentes." },
  { id: "c4", area: "Cuidado em Saúde", text: "Promover ações de educação em saúde junto a pacientes, equipe e comunidade." },
  { id: "c5", area: "Gestão em Saúde", text: "Participar da elaboração, implementação e acompanhamento de políticas de saúde." },
];

const METHODOLOGIES: Methodology[] = [
  { id: "m1", name: "Aula Expositiva Dialogada", description: "Exposição com interação e questionamento", bestFor: ["c2", "c5"] },
  { id: "m2", name: "Estudo de Caso", description: "Análise de situação real ou simulada", bestFor: ["c1", "c4"] },
  { id: "m3", name: "Simulação / Role-Play", description: "Prática em cenário simulado", bestFor: ["c1", "c3"] },
  { id: "m4", name: "TBL (Team-Based Learning)", description: "Aprendizagem em equipe com teste individual e discussão", bestFor: ["c1", "c2", "c4"] },
  { id: "m5", name: "Sala Invertida", description: "Estudo prévio + atividade prática em sala", bestFor: ["c1", "c3", "c4"] },
  { id: "m6", name: "Aprendizagem Baseada em Projetos", description: "Projeto integrativo com produto final", bestFor: ["c3", "c5"] },
  { id: "m7", name: "Seminário", description: "Apresentação e debate em grupo", bestFor: ["c4", "c5"] },
];

const ASSESSMENTS: Assessment[] = [
  { id: "a1", name: "Prova Objetiva", description: "Questões de múltipla escolha", measures: ["conhecimento", "compreensão"] },
  { id: "a2", name: "OSCE", description: "Exame clínico objetivo estruturado", measures: ["habilidade", "atitude", "comunicação"] },
  { id: "a3", name: "Portfólio Reflexivo", description: "Compilação reflexiva de atividades", measures: ["reflexão", "metacognição", "desenvolvimento"] },
  { id: "a4", name: "Rubrica de Desempenho", description: "Avaliação com critérios explícitos", measures: ["habilidade", "processo", "produto"] },
  { id: "a5", name: "Mini-CEX", description: "Avaliação clínica breve por observação", measures: ["habilidade clínica", "comunicação", "profissionalismo"] },
  { id: "a6", name: "Relatório Técnico", description: "Documento técnico-científico", measures: ["escrita", "análise", "síntese"] },
];

type Step = "competence" | "objective" | "methodology" | "assessment" | "result";

export default function SimuladorPlanejamentoAula() {
  const navigate = useNavigate();
  const { isVirtualRoom, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [step, setStep] = useState<Step>("competence");
  const [selectedCompetence, setSelectedCompetence] = useState<string | null>(null);
  const [objectiveLevel, setObjectiveLevel] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  const competence = COMPETENCES.find(c => c.id === selectedCompetence);

  const objectiveLevels = [
    { id: "aplicar", label: "Aplicar", desc: "O aluno deverá aplicar o conhecimento em cenário prático" },
    { id: "analisar", label: "Analisar", desc: "O aluno deverá analisar criticamente os dados e relações" },
    { id: "avaliar", label: "Avaliar", desc: "O aluno deverá avaliar e tomar decisões baseadas em evidências" },
    { id: "criar", label: "Criar", desc: "O aluno deverá criar/propor soluções originais" },
  ];

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };
  const toggleAssessment = (id: string) => {
    setSelectedAssessments(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const methodAlignment = selectedMethods.filter(mId => {
    const m = METHODOLOGIES.find(x => x.id === mId);
    return m && selectedCompetence && m.bestFor.includes(selectedCompetence);
  }).length;

  const assessmentAlignment = selectedAssessments.filter(aId => {
    const a = ASSESSMENTS.find(x => x.id === aId);
    if (!a) return false;
    if (objectiveLevel === "aplicar" || objectiveLevel === "analisar") return a.measures.includes("habilidade") || a.measures.includes("análise");
    if (objectiveLevel === "avaliar") return a.measures.includes("habilidade clínica") || a.measures.includes("comunicação");
    if (objectiveLevel === "criar") return a.measures.includes("produto") || a.measures.includes("síntese");
    return false;
  }).length;

  const totalAlignment = selectedMethods.length > 0 && selectedAssessments.length > 0
    ? Math.round(((methodAlignment / selectedMethods.length) + (assessmentAlignment / selectedAssessments.length)) / 2 * 100)
    : 0;

  // VR auto-submit
  useEffect(() => {
    if (isVirtualRoom && step === "result" && !submitted) {
      submitResults({ score: totalAlignment, actions: { selectedCompetence, objectiveLevel, selectedMethods, selectedAssessments } });
    }
  }, [step]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const t = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(t);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const handleRestart = () => {
    setStep("competence");
    setSelectedCompetence(null);
    setObjectiveLevel(null);
    setSelectedMethods([]);
    setSelectedAssessments([]);
  };

  const steps = ["competence", "objective", "methodology", "assessment", "result"] as Step[];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isVirtualRoom ? "/" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Planejamento de Aula por Competências</h1>
          <p className="text-muted-foreground text-sm">Alinhamento construtivo com DCNs de Farmácia (Biggs)</p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">Formação Docente</Badge>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs">
        {["Competência", "Objetivo", "Metodologia", "Avaliação", "Resultado"].map((label, i) => (
          <div key={i} className={`flex items-center gap-1 ${i <= stepIdx ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i < stepIdx ? "bg-primary text-primary-foreground" : i === stepIdx ? "border-2 border-primary text-primary" : "border border-border"}`}>
              {i < stepIdx ? "✓" : i + 1}
            </div>
            <span className="hidden sm:inline">{label}</span>
            {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Competence */}
      {step === "competence" && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Selecione a Competência (DCN)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {COMPETENCES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompetence(c.id)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${selectedCompetence === c.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                <Badge variant="outline" className="mb-1">{c.area}</Badge>
                <p>{c.text}</p>
              </button>
            ))}
            <Button onClick={() => setStep("objective")} disabled={!selectedCompetence} className="w-full mt-3 gap-2">Próximo <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Objective */}
      {step === "objective" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Defina o Nível do Objetivo de Aprendizagem</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Competência selecionada:</p>
              <p className="font-medium">{competence?.text}</p>
            </div>
            {objectiveLevels.map(o => (
              <button
                key={o.id}
                onClick={() => setObjectiveLevel(o.id)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${objectiveLevel === o.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                <span className="font-medium">{o.label}</span> — {o.desc}
              </button>
            ))}
            <Button onClick={() => setStep("methodology")} disabled={!objectiveLevel} className="w-full gap-2">Próximo <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Methodology */}
      {step === "methodology" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Escolha as Metodologias (selecione 1-3)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {METHODOLOGIES.map(m => {
              const isAligned = selectedCompetence && m.bestFor.includes(selectedCompetence);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMethod(m.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${selectedMethods.includes(m.id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    {isAligned && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Alinhado</Badge>}
                  </div>
                  <p className="text-muted-foreground">{m.description}</p>
                </button>
              );
            })}
            <Button onClick={() => setStep("assessment")} disabled={selectedMethods.length === 0} className="w-full gap-2">Próximo <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Assessment */}
      {step === "assessment" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Escolha os Métodos Avaliativos (1-3)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ASSESSMENTS.map(a => (
              <button
                key={a.id}
                onClick={() => toggleAssessment(a.id)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${selectedAssessments.includes(a.id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                <span className="font-medium">{a.name}</span> — {a.description}
                <p className="text-xs text-muted-foreground mt-1">Mede: {a.measures.join(", ")}</p>
              </button>
            ))}
            <Button onClick={() => setStep("result")} disabled={selectedAssessments.length === 0} className="w-full gap-2">Ver Alinhamento <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {step === "result" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Alinhamento Construtivo (Biggs)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {(!isVirtualRoom || showFeedbackVR) && (
              <>
                <div className="text-center py-4">
                  <div className={`text-5xl font-bold mb-2 ${totalAlignment >= 70 ? "text-emerald-600" : totalAlignment >= 40 ? "text-amber-600" : "text-destructive"}`}>{totalAlignment}%</div>
                  <p className="text-muted-foreground text-sm">Coerência do Alinhamento Construtivo</p>
                  <Progress value={totalAlignment} className="h-3 mt-3 max-w-xs mx-auto" />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg border">
                    <p className="font-medium mb-1">🎯 Competência DCN</p>
                    <p className="text-muted-foreground">{competence?.text}</p>
                    <Badge variant="outline" className="mt-1">{competence?.area}</Badge>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="font-medium mb-1">📐 Nível do Objetivo</p>
                    <p className="text-muted-foreground">{objectiveLevels.find(o => o.id === objectiveLevel)?.desc}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="font-medium mb-1">📚 Metodologias</p>
                    {selectedMethods.map(mId => {
                      const m = METHODOLOGIES.find(x => x.id === mId)!;
                      const aligned = selectedCompetence && m.bestFor.includes(selectedCompetence);
                      return (
                        <div key={mId} className="flex items-center gap-2 mt-1">
                          {aligned ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          <span>{m.name}</span>
                          {!aligned && <span className="text-xs text-muted-foreground">(baixo alinhamento com esta competência)</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="font-medium mb-1">✅ Avaliação</p>
                    {selectedAssessments.map(aId => {
                      const a = ASSESSMENTS.find(x => x.id === aId)!;
                      return <p key={aId} className="text-muted-foreground">• {a.name}: {a.measures.join(", ")}</p>;
                    })}
                  </div>
                </div>

                <Separator />
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">📚 Referências</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Biggs J, Tang C. <em>Teaching for Quality Learning at University</em>. 4th ed. Open University Press, 2011.</li>
                    <li>• Brasil. Resolução CNE/CES nº 6/2017 — DCNs Farmácia.</li>
                  </ul>
                </div>
                {!isVirtualRoom && <Button onClick={handleRestart} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Planejar Nova Aula</Button>}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
