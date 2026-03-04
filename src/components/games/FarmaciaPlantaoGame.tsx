import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Clock, AlertTriangle, CheckCircle, XCircle, User, Pill, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Prescription {
  id: string;
  patientName: string;
  age: number;
  sector: string;
  medications: { name: string; dose: string; route: string; frequency: string }[];
  hasError: boolean;
  errorType?: "dose" | "interaction" | "allergy" | "contraindication" | "duplicate";
  errorDescription?: string;
  errorMed?: string;
  correctAction?: string;
  explanation: string;
  urgency: "normal" | "urgent" | "critical";
  patience: number;
  maxPatience: number;
  orientationNeeded?: string;
  reference: string;
}

interface Shift {
  id: number;
  name: string;
  sector: string;
  prescriptions: Omit<Prescription, "id" | "patience" | "maxPatience">[];
  timeLimit: number;
  description: string;
}

const shifts: Shift[] = [
  {
    id: 1, name: "Turno 1: Ambulatório", sector: "Ambulatório Geral", timeLimit: 120,
    description: "Prescrições simples de rotina. Verifique doses e interações básicas.",
    prescriptions: [
      {
        patientName: "Maria Silva", age: 52, sector: "Clínica Médica",
        medications: [
          { name: "Losartana", dose: "50mg", route: "VO", frequency: "12/12h" },
          { name: "Metformina", dose: "850mg", route: "VO", frequency: "8/8h" },
        ],
        hasError: false, explanation: "Prescrição correta. Losartana e Metformina são seguros juntos.", urgency: "normal",
        orientationNeeded: "Tomar Metformina durante as refeições para reduzir desconforto GI.",
        reference: "Diretrizes SBD 2024",
      },
      {
        patientName: "João Santos", age: 68, sector: "Clínica Médica",
        medications: [
          { name: "Varfarina", dose: "5mg", route: "VO", frequency: "1x/dia" },
          { name: "AAS", dose: "100mg", route: "VO", frequency: "1x/dia" },
          { name: "Ibuprofeno", dose: "600mg", route: "VO", frequency: "8/8h" },
        ],
        hasError: true, errorType: "interaction", errorDescription: "Varfarina + Ibuprofeno: risco hemorrágico grave!",
        errorMed: "Ibuprofeno", correctAction: "Devolver ao prescritor sugerindo Paracetamol 500mg como alternativa analgésica.",
        explanation: "AINEs aumentam risco de sangramento GI e potencializam efeito da varfarina via deslocamento proteico e inibição de COX-1 plaquetária.", urgency: "urgent",
        reference: "UpToDate — Drug interactions: Warfarin",
      },
      {
        patientName: "Ana Costa", age: 34, sector: "Ambulatório",
        medications: [
          { name: "Fluoxetina", dose: "20mg", route: "VO", frequency: "manhã" },
          { name: "Tramadol", dose: "100mg", route: "VO", frequency: "6/6h" },
        ],
        hasError: true, errorType: "interaction", errorDescription: "Fluoxetina + Tramadol: risco de Síndrome Serotoninérgica!",
        errorMed: "Tramadol", correctAction: "Alertar prescritor. Sugerir Codeína + Paracetamol como alternativa.",
        explanation: "Ambos aumentam serotonina central. Tramadol inibe recaptação de 5-HT e Fluoxetina é ISRS. Risco de febre, mioclonia, agitação, coma.", urgency: "critical",
        reference: "Boyer EW, Shannon M. NEJM 2005;352:1112-20",
      },
    ],
  },
  {
    id: 2, name: "Turno 2: Pediatria", sector: "Pediatria", timeLimit: 100,
    description: "Prescrições pediátricas — cuidado redobrado com doses por peso!",
    prescriptions: [
      {
        patientName: "Lucas (8 anos, 25kg)", age: 8, sector: "Pediatria",
        medications: [
          { name: "Amoxicilina Susp.", dose: "500mg", route: "VO", frequency: "8/8h" },
        ],
        hasError: true, errorType: "dose", errorDescription: "Dose excessiva! 500mg para 25kg = 20mg/kg/dose. Máx recomendado: 80-90mg/kg/dia em otite, mas dose única alta.",
        errorMed: "Amoxicilina Susp.", correctAction: "Confirmar indicação. Se otite média: 45mg/kg/dia dividido 12/12h = ~560mg 12/12h.",
        explanation: "Em pediatria, toda dose deve ser calculada por kg. Amoxicilina em dose padrão: 25-50mg/kg/dia. Em otite: 80-90mg/kg/dia.", urgency: "urgent",
        reference: "Nelson Textbook of Pediatrics, 21st ed",
      },
      {
        patientName: "Sofia (3 anos, 14kg)", age: 3, sector: "Pediatria",
        medications: [
          { name: "Dipirona gotas", dose: "15 gotas", route: "VO", frequency: "6/6h" },
          { name: "Ibuprofeno Susp.", dose: "5mL (100mg)", route: "VO", frequency: "8/8h" },
        ],
        hasError: false, explanation: "Doses corretas para o peso. Dipirona: ~1 gota/kg. Ibuprofeno: ~7mg/kg/dose.", urgency: "normal",
        orientationNeeded: "Alternar antitérmicos a cada 4h se febre persistente. Manter hidratação.",
        reference: "SBP — Febre na criança 2023",
      },
      {
        patientName: "Pedro (12 anos, 45kg)", age: 12, sector: "Pediatria",
        medications: [
          { name: "Metoclopramida", dose: "10mg", route: "IV", frequency: "8/8h" },
        ],
        hasError: true, errorType: "contraindication", errorDescription: "Metoclopramida em < 18 anos: risco de reação extrapiramidal!",
        errorMed: "Metoclopramida", correctAction: "Devolver ao prescritor. Sugerir Ondansetrona 4mg IV como alternativa antiemética.",
        explanation: "Metoclopramida é contraindicada em crianças pelo alto risco de distonia aguda e síndrome neuroléptica maligna. Ondansetrona é mais segura.", urgency: "critical",
        reference: "ANVISA — RDC Metoclopramida em pediatria",
      },
    ],
  },
  {
    id: 3, name: "Turno 3: UTI", sector: "UTI Adulto", timeLimit: 80,
    description: "Pacientes críticos. Erros aqui podem ser fatais. Máxima atenção.",
    prescriptions: [
      {
        patientName: "Sr. Roberto, 72a", age: 72, sector: "UTI",
        medications: [
          { name: "Vancomicina", dose: "1g", route: "IV", frequency: "12/12h" },
          { name: "Piperacilina/Tazo", dose: "4.5g", route: "IV", frequency: "6/6h" },
          { name: "Fluconazol", dose: "400mg", route: "IV", frequency: "1x/dia" },
        ],
        hasError: true, errorType: "interaction", errorDescription: "Vancomicina + Piperacilina/Tazobactam: risco aumentado de nefrotoxicidade!",
        errorMed: "Piperacilina/Tazo", correctAction: "Alertar equipe. Monitorar creatinina a cada 24h. Considerar Cefepime como alternativa se função renal deteriorar.",
        explanation: "Meta-análises recentes demonstram aumento de 2-3x na incidência de IRA com esta combinação vs. vancomicina + cefepime. Mecanismo: toxicidade tubular sinérgica.", urgency: "critical",
        reference: "Luther MK et al. Clin Infect Dis 2018;66:721-8",
      },
      {
        patientName: "Dona Tereza, 65a", age: 65, sector: "UTI",
        medications: [
          { name: "Noradrenalina", dose: "0.1mcg/kg/min", route: "IV BIC", frequency: "contínua" },
          { name: "Midazolam", dose: "5mg/h", route: "IV BIC", frequency: "contínua" },
          { name: "Fentanil", dose: "100mcg/h", route: "IV BIC", frequency: "contínua" },
        ],
        hasError: false, explanation: "Esquema padrão de sedoanalgesia em VM com vasopressor. Doses dentro da faixa terapêutica.", urgency: "normal",
        orientationNeeded: "Monitorar RASS a cada 4h. Alvo: RASS -2 a 0. Despertar diário programado.",
        reference: "Diretrizes AMIB 2023 — Sedação em UTI",
      },
      {
        patientName: "Carlos, 58a, 120kg", age: 58, sector: "UTI",
        medications: [
          { name: "Enoxaparina", dose: "40mg", route: "SC", frequency: "1x/dia" },
        ],
        hasError: true, errorType: "dose", errorDescription: "Dose profilática insuficiente para paciente obeso (120kg)!",
        errorMed: "Enoxaparina", correctAction: "Ajustar para 40mg SC 12/12h OU 0.5mg/kg 1x/dia (60mg) conforme protocolo institucional para obesos.",
        explanation: "Em obesos (IMC>40 ou peso>100kg), a dose profilática padrão de 40mg/dia é subótima. Recomenda-se ajuste baseado no peso para prevenção adequada de TEV.", urgency: "urgent",
        reference: "CHEST Guidelines — VTE Prophylaxis 2021",
      },
    ],
  },
];

const difficultyConfig: Record<GameDifficulty, { timeMult: number; patienceMult: number }> = {
  academic: { timeMult: 1.5, patienceMult: 1.5 },
  clinical: { timeMult: 1, patienceMult: 1 },
  specialist: { timeMult: 0.7, patienceMult: 0.6 },
};

type GamePhase = "narrative" | "difficulty" | "shiftIntro" | "playing" | "feedback" | "result";
type Action = "dispense" | "return" | "orient";

export default function FarmaciaPlantaoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<GamePhase>("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [currentShift, setCurrentShift] = useState(0);
  const [currentPrescIdx, setCurrentPrescIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correctActions, setCorrectActions] = useState(0);
  const [dispensed, setDispensed] = useState(0);
  const [returned, setReturned] = useState(0);
  const [oriented, setOriented] = useState(0);
  const [patientsLost, setPatientsLost] = useState(0);
  const [adverseEvents, setAdverseEvents] = useState<string[]>([]);
  const [showOrientation, setShowOrientation] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [shiftsCompleted, setShiftsCompleted] = useState(0);

  const timerRef = useRef<number | null>(null);
  const config = difficultyConfig[difficulty];

  const currentShiftData = shifts[currentShift];
  const currentPresc = currentShiftData?.prescriptions[currentPrescIdx];
  const totalPrescriptions = shifts.reduce((sum, s) => sum + s.prescriptions.length, 0);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPatientsLost(p => p + 1);
          advancePrescription();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentPrescIdx, currentShift]);

  const advancePrescription = useCallback(() => {
    const shift = shifts[currentShift];
    if (currentPrescIdx + 1 < shift.prescriptions.length) {
      setCurrentPrescIdx(prev => prev + 1);
      setShowOrientation(false);
      setTimeLeft(Math.round(shift.timeLimit * config.timeMult / shift.prescriptions.length));
    } else {
      setShiftsCompleted(s => s + 1);
      const nextShift = currentShift + 1;
      if (nextShift >= shifts.length) {
        setPhase("result");
      } else {
        setCurrentShift(nextShift);
        setCurrentPrescIdx(0);
        setShowOrientation(false);
        setPhase("shiftIntro");
      }
    }
  }, [currentShift, currentPrescIdx, config]);

  const handleAction = (action: Action) => {
    if (!currentPresc) return;

    let isCorrect = false;
    let title = "";
    let explanation = currentPresc.explanation;

    if (action === "dispense") {
      if (!currentPresc.hasError) {
        isCorrect = true;
        title = "✅ Dispensação Correta!";
        setDispensed(d => d + 1);
        setScore(s => s + 100);
      } else {
        isCorrect = false;
        title = `❌ Erro de Dispensação! ${currentPresc.errorDescription}`;
        explanation = `${currentPresc.explanation}\n\n🔧 Ação correta: ${currentPresc.correctAction}`;
        setErrors(e => e + 1);
        setAdverseEvents(ae => [...ae, `${currentPresc.patientName}: ${currentPresc.errorDescription}`]);
      }
    } else if (action === "return") {
      if (currentPresc.hasError) {
        isCorrect = true;
        title = `✅ Excelente! Intervenção farmacêutica correta.`;
        explanation = `${currentPresc.explanation}\n\n🔧 ${currentPresc.correctAction}`;
        setReturned(r => r + 1);
        setScore(s => s + 150);
      } else {
        isCorrect = false;
        title = "❌ Prescrição correta! Não deveria ter sido devolvida.";
        setErrors(e => e + 1);
        setScore(s => Math.max(0, s - 50));
      }
    } else if (action === "orient") {
      if (currentPresc.orientationNeeded) {
        setOriented(o => o + 1);
        setScore(s => s + 50);
        setShowOrientation(true);
        return;
      } else {
        toast("Este paciente não requer orientação especial neste momento.");
        return;
      }
    }

    setCorrectActions(c => c + (isCorrect ? 1 : 0));
    setFeedback({ isCorrect, title, explanation, reference: currentPresc.reference });
    setPhase("feedback");
  };

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Farmácia de Plantão"
        setting="Hospital Universitário — Farmácia Central"
        briefing="Você é o farmacêutico do plantão de 12 horas. Prescrições chegam em fila crescente. Verifique doses, identifique interações perigosas, oriente pacientes e devolva prescrições com erro ao prescritor — com justificativa."
        patientName="Equipe de Plantão"
        patientAge="3 turnos, 9 prescrições"
        patientHistory="Ambulatório simples, Pediatria com doses por peso, UTI com pacientes críticos. Cada erro pode causar evento adverso visível."
        onStart={() => setPhase("difficulty")}
        icon={<Pill className="h-10 w-10 text-primary" />}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-xl font-bold">Selecione a dificuldade</h2>
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <Button size="lg" onClick={() => {
          setTimeLeft(Math.round(shifts[0].timeLimit * config.timeMult / shifts[0].prescriptions.length));
          setPhase("shiftIntro");
        }}>
          Começar Plantão
        </Button>
      </div>
    );
  }

  if (phase === "shiftIntro") {
    const shift = shifts[currentShift];
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
        <div className="rounded-full bg-primary/10 p-6">
          <Clock className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{shift.name}</h2>
        <Badge variant="outline">{shift.sector}</Badge>
        <p className="text-muted-foreground max-w-md text-center">{shift.description}</p>
        <p className="text-sm text-muted-foreground">{shift.prescriptions.length} prescrições na fila</p>
        <Button size="lg" onClick={() => {
          setTimeLeft(Math.round(shift.timeLimit * config.timeMult / shift.prescriptions.length));
          setPhase("playing");
        }} className="gap-2">
          <FileText className="h-4 w-4" /> Iniciar Turno
        </Button>
      </div>
    );
  }

  if (phase === "feedback") {
    return feedback ? (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={() => {
          setFeedback(null);
          advancePrescription();
          setPhase("playing");
        }}
      />
    ) : null;
  }

  if (phase === "result") {
    const maxScore = totalPrescriptions * 150;
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={errors === 0 ? "Plantão Perfeito!" : errors <= 2 ? "Bom Plantão!" : "Plantão Difícil"}
        subtitle={errors === 0 ? "Nenhum evento adverso. Farmacêutico exemplar!" : `${adverseEvents.length} evento(s) adverso(s) ocorreram.`}
        onRestart={() => {
          setPhase("narrative");
          setScore(0);
          setErrors(0);
          setCorrectActions(0);
          setDispensed(0);
          setReturned(0);
          setOriented(0);
          setPatientsLost(0);
          setAdverseEvents([]);
          setCurrentShift(0);
          setCurrentPrescIdx(0);
          setShiftsCompleted(0);
        }}
        details={[
          { label: "Turnos completados", value: `${shiftsCompleted}/${shifts.length}` },
          { label: "Dispensadas corretamente", value: String(dispensed) },
          { label: "Intervenções farmacêuticas", value: String(returned) },
          { label: "Orientações realizadas", value: String(oriented) },
          { label: "Eventos adversos", value: String(adverseEvents.length) },
        ]}
      />
    );
  }

  // Playing phase
  if (!currentPresc) return null;

  const urgencyColors = { normal: "bg-green-500", urgent: "bg-yellow-500", critical: "bg-red-500" };
  const urgencyLabels = { normal: "Normal", urgent: "Urgente", critical: "Crítica" };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={timeLeft < 15 ? "destructive" : "outline"} className="gap-1">
          <Clock className="h-3 w-3" /> {timeLeft}s
        </Badge>
        <Badge variant="outline" className="gap-1">📋 {currentPrescIdx + 1}/{currentShiftData.prescriptions.length}</Badge>
        <Badge variant="secondary">{score} pts</Badge>
        {errors > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {errors} erros</Badge>}
        <Badge variant="outline">Turno {currentShift + 1}/{shifts.length}</Badge>
      </div>

      <Progress value={(timeLeft / (currentShiftData.timeLimit * config.timeMult / currentShiftData.prescriptions.length)) * 100} className="h-2" />

      {/* Prescription card */}
      <Card className="border-2 border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {currentPresc.patientName[0]}
              </div>
              <div>
                <h3 className="font-bold">{currentPresc.patientName}</h3>
                <p className="text-xs text-muted-foreground">{currentPresc.sector} • {currentPresc.age} anos</p>
              </div>
            </div>
            <Badge className={`${urgencyColors[currentPresc.urgency]} text-white`}>
              {urgencyLabels[currentPresc.urgency]}
            </Badge>
          </div>

          {/* Medications list */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1"><Pill className="h-3.5 w-3.5" /> Prescrição:</p>
            {currentPresc.medications.map((med, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{med.name}</span>
                  <Badge variant="outline" className="text-xs">{med.route}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{med.dose} — {med.frequency}</p>
              </div>
            ))}
          </div>

          {showOrientation && currentPresc.orientationNeeded && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 animate-fade-in">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">📢 Orientação ao paciente:</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{currentPresc.orientationNeeded}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button onClick={() => handleAction("dispense")} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="h-4 w-4" /> Dispensar
            </Button>
            <Button onClick={() => handleAction("return")} variant="destructive" className="gap-1.5">
              <ArrowRight className="h-4 w-4" /> Devolver
            </Button>
            <Button onClick={() => handleAction("orient")} variant="outline" className="gap-1.5">
              <User className="h-4 w-4" /> Orientar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adverse events log */}
      {adverseEvents.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3">
            <p className="text-sm font-medium text-destructive flex items-center gap-1 mb-2">
              <ShieldAlert className="h-4 w-4" /> Eventos Adversos ({adverseEvents.length})
            </p>
            {adverseEvents.map((ae, i) => (
              <p key={i} className="text-xs text-destructive/80 ml-5">• {ae}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
