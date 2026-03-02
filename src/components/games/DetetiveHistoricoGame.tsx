import { useState } from "react";
import { Search, Pill, Leaf, AlertTriangle, FileText, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Search, Pill, Leaf, AlertTriangle, FileText, CheckCircle,
};

interface Question {
  id: number;
  title: string;
  description: string;
  type: "text" | "boolean-text";
  icon: string;
  booleanLabel?: string;
  textPlaceholder?: string;
}

const questions: Question[] = [
  { id: 1, title: "O Motivo Principal", description: "O que o traz aqui hoje? Qual é o sintoma ou preocupação principal?", type: "text", icon: "Search" },
  { id: 2, title: "O Arsenal Diário", description: "Toma algum medicamento de uso contínuo (receitado por um médico)?", type: "boolean-text", booleanLabel: "Sim, tomo medicamentos", textPlaceholder: "Ex: Losartana 50mg de manhã", icon: "Pill" },
  { id: 3, title: "Os Aliados Naturais", description: "Faz uso de chás frequentes, plantas medicinais ou suplementos (vitaminas, ômega 3)?", type: "boolean-text", booleanLabel: "Sim, uso produtos naturais/suplementos", textPlaceholder: "Ex: Chá de camomila à noite, Vitamina C", icon: "Leaf" },
  { id: 4, title: "Sinais de Alerta", description: "Tem alguma alergia conhecida a medicamentos ou alimentos?", type: "boolean-text", booleanLabel: "Sim, tenho alergias", textPlaceholder: "Ex: Alergia a Penicilina", icon: "AlertTriangle" },
];

interface Answer {
  booleanValue?: boolean;
  textValue?: string;
}

export default function DetetiveHistoricoGame() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [showDossier, setShowDossier] = useState(false);

  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const answer = answers[q?.id] || {};
  const isLast = currentStep === questions.length - 1;

  const updateAnswer = (patch: Partial<Answer>) => {
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], ...patch } }));
  };

  const handleNext = () => {
    if (isLast) {
      setShowDossier(true);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowDossier(false);
  };

  // --- Dossier View ---
  if (showDossier) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex rounded-full bg-green-100 p-4 mb-2">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold">O Seu Histórico Farmacoterapêutico</h2>
          <p className="text-muted-foreground">Dossiê clínico completo — pronto para a consulta.</p>
        </div>

        <div className="space-y-4">
          {questions.map((question) => {
            const a = answers[question.id];
            const Icon = iconMap[question.icon] || FileText;

            const isEmpty = !a || (question.type === "boolean-text" && a.booleanValue === false) || (question.type === "text" && !a.textValue?.trim());

            return (
              <Card key={question.id} className={isEmpty ? "opacity-70" : ""}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div className={`rounded-lg p-2 mt-0.5 ${isEmpty ? "bg-muted" : "bg-green-100"}`}>
                    <Icon className={`h-5 w-5 ${isEmpty ? "text-muted-foreground" : "text-green-700"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold">{question.title}</p>
                    {isEmpty ? (
                      <Badge variant="secondary" className="mt-1">Negado / Não utiliza</Badge>
                    ) : (
                      <p className="text-sm mt-1 whitespace-pre-wrap">{a?.textValue}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button variant="outline" onClick={handleRestart} className="gap-2">
            <Search className="h-4 w-4" /> Nova Investigação
          </Button>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => toast.info("Funcionalidade de PDF/Email em desenvolvimento!")}
          >
            <FileText className="h-5 w-5" /> Exportar para o Profissional de Saúde
          </Button>
        </div>
      </div>
    );
  }

  // --- Wizard View ---
  const Icon = iconMap[q.icon] || FileText;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>A construir o Dossiê Clínico...</span>
          <span>Passo {currentStep + 1} de {questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="transition-all duration-300">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex rounded-full bg-primary/10 p-4 mx-auto mb-3">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-serif text-xl">{q.title}</CardTitle>
          <p className="text-muted-foreground mt-1">{q.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.type === "text" && (
            <Textarea
              rows={4}
              placeholder="Escreva aqui a sua resposta..."
              value={answer.textValue || ""}
              onChange={(e) => updateAnswer({ textValue: e.target.value })}
            />
          )}

          {q.type === "boolean-text" && (
            <>
              <div className="flex gap-3">
                <Button
                  variant={answer.booleanValue === false ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => updateAnswer({ booleanValue: false, textValue: "" })}
                >
                  Não
                </Button>
                <Button
                  variant={answer.booleanValue === true ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => updateAnswer({ booleanValue: true })}
                >
                  {q.booleanLabel}
                </Button>
              </div>
              {answer.booleanValue && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Textarea
                    rows={3}
                    placeholder={q.textPlaceholder}
                    value={answer.textValue || ""}
                    onChange={(e) => updateAnswer({ textValue: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        {currentStep > 0 ? (
          <Button variant="outline" onClick={handlePrev} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        ) : <div />}
        <Button onClick={handleNext} className="gap-1">
          {isLast ? "Concluir Investigação" : "Próxima Pista"}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
