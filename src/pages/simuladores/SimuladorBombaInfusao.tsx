import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Volume2, VolumeX, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";

// ─── Drug Library ───
interface Drug {
  name: string;
  unit: string;
  concentration: { mg: number; ml: number };
  hardLimitMax: number;
  hardLimitMin: number;
  bolusMax: number;
  description: string;
}

const DRUG_LIBRARY: Drug[] = [
  { name: "Noradrenalina", unit: "mcg/kg/min", concentration: { mg: 8, ml: 80 }, hardLimitMax: 2, hardLimitMin: 0.01, bolusMax: 0, description: "Vasopressor α-adrenérgico. Doses > 2 mcg/kg/min causam vasoconstrição excessiva com risco de isquemia periférica e mesentérica." },
  { name: "Dopamina", unit: "mcg/kg/min", concentration: { mg: 200, ml: 250 }, hardLimitMax: 20, hardLimitMin: 0.5, bolusMax: 0, description: "Catecolamina dose-dependente. Acima de 20 mcg/kg/min predomina efeito α, risco de taquiarritmias e isquemia." },
  { name: "Fentanil", unit: "mcg/kg/min", concentration: { mg: 2.5, ml: 50 }, hardLimitMax: 0.1, hardLimitMin: 0.001, bolusMax: 5, description: "Opioide potente. Doses > 0.1 mcg/kg/min: depressão respiratória grave, rigidez torácica e bradicardia." },
  { name: "Dobutamina", unit: "mcg/kg/min", concentration: { mg: 250, ml: 250 }, hardLimitMax: 20, hardLimitMin: 2.5, bolusMax: 0, description: "Inotrópico β1-seletivo. Acima de 20 mcg/kg/min: taquicardia, arritmias e aumento do consumo de O₂ miocárdico." },
  { name: "Midazolam", unit: "mcg/kg/min", concentration: { mg: 50, ml: 100 }, hardLimitMax: 6, hardLimitMin: 0.5, bolusMax: 5, description: "Benzodiazepínico. Doses elevadas: depressão respiratória, hipotensão e sedação prolongada." },
];

// ─── Built-in cases ───
interface InfusionCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; diagnosis: string; clinicalContext: string };
  scenario: string;
  drugName: string;
  mode: "simple" | "dose_weight" | "bolus";
  targetRate?: number;
  targetDose?: number;
  targetBolus?: number | null;
  totalVolume: number;
  expectedActions: string[];
  clinicalTip: string;
}

const BUILT_IN_CASES: InfusionCase[] = [
  {
    title: "Caso 1: Choque Séptico – Noradrenalina",
    difficulty: "Médio",
    patient: { name: "Maria Conceição", age: 68, weight: 72, sex: "Feminino", diagnosis: "Choque séptico por foco pulmonar", clinicalContext: "Paciente em UTI, intubada, com hipotensão refratária a volume." },
    scenario: "Paciente séptica necessitando de vasopressor. Iniciar Noradrenalina em modo Dose/Peso para manter PAM ≥ 65 mmHg.",
    drugName: "Noradrenalina",
    mode: "dose_weight",
    targetDose: 0.1,
    totalVolume: 80,
    expectedActions: [
      "Selecionar modo Dose/Peso",
      "Escolher Noradrenalina na biblioteca",
      "Inserir peso: 72 kg",
      "Inserir dose: 0.1 mcg/kg/min",
      "Verificar taxa calculada em mL/h",
      "Definir volume total: 80 mL",
    ],
    clinicalTip: "A Noradrenalina é o vasopressor de primeira escolha no choque séptico (Surviving Sepsis Campaign). Iniciar com 0.05-0.1 mcg/kg/min e titular conforme PAM.",
  },
  {
    title: "Caso 2: Sedação em UTI – Midazolam",
    difficulty: "Fácil",
    patient: { name: "João Pedro Silva", age: 45, weight: 80, sex: "Masculino", diagnosis: "SDRA moderada", clinicalContext: "Paciente intubado em ventilação mecânica, necessitando sedação contínua." },
    scenario: "Iniciar sedação contínua com Midazolam em modo simples (mL/h) para RASS -2 a -3.",
    drugName: "Midazolam",
    mode: "simple",
    targetRate: 5,
    totalVolume: 100,
    expectedActions: [
      "Selecionar modo Simples",
      "Inserir taxa: 5 mL/h",
      "Definir volume total: 100 mL",
      "Monitorar volume residual",
    ],
    clinicalTip: "Midazolam em infusão contínua acumula em obesos e insuficientes renais. Preferir propofol quando possível para sedação de curta duração.",
  },
  {
    title: "Caso 3: Dose de Ataque – Fentanil",
    difficulty: "Difícil",
    patient: { name: "Ana Beatriz Rocha", age: 32, weight: 55, sex: "Feminino", diagnosis: "Pós-operatório de laparotomia", clinicalContext: "Paciente com dor intensa EVA 9/10, necessitando analgesia rápida antes de manutenção." },
    scenario: "Administrar dose de ataque (bolus) de Fentanil seguido de manutenção. Atenção aos limites de segurança.",
    drugName: "Fentanil",
    mode: "bolus",
    targetBolus: 3,
    totalVolume: 50,
    expectedActions: [
      "Selecionar modo Dose de Ataque",
      "Escolher Fentanil na biblioteca",
      "Inserir volume do bolus: 3 mL",
      "Respeitar limite máximo de 5 mL",
      "Monitorar sinais vitais durante bolus",
    ],
    clinicalTip: "Bolus de Fentanil IV deve ser administrado lentamente (1-2 min) para evitar rigidez torácica. O limite de bolus de 5 mL protege contra depressão respiratória aguda.",
  },
];

// ─── Types ───
type PumpMode = "menu" | "simple" | "dose_weight" | "bolus";
type PumpState = "stopped" | "infusing" | "paused" | "alarm" | "error";
type AlarmType = "occlusion" | "air" | "dose_limit" | null;

export default function SimuladorBombaInfusao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala");

  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("bomba-infusao", BUILT_IN_CASES);
  const { virtualRoomCase, isVirtualRoom: isVR, loading: loadingVR, goBack, submitResults: submitVRResults } = useVirtualRoomCase("bomba-infusao");

  const [screen, setScreen] = useState<"dashboard" | "sim">("dashboard");
  const [activeCase, setActiveCase] = useState<InfusionCase | null>(null);

  // ─── Pump State ───
  const [mode, setMode] = useState<PumpMode>("menu");
  const [pumpState, setPumpState] = useState<PumpState>("stopped");
  const [alarmType, setAlarmType] = useState<AlarmType>(null);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [drugDialogOpen, setDrugDialogOpen] = useState(false);
  const [errorExplanation, setErrorExplanation] = useState<string | null>(null);

  const [lcdInput, setLcdInput] = useState("");
  const [lcdLine1, setLcdLine1] = useState("BOMBA DE INFUSÃO");
  const [lcdLine2, setLcdLine2] = useState("Selecione o modo");
  const [lcdLine3, setLcdLine3] = useState("");
  const [lcdLine4, setLcdLine4] = useState("");

  const [rateMLH, setRateMLH] = useState(0);
  const [weight, setWeight] = useState(0);
  const [doseValue, setDoseValue] = useState(0);
  const [totalVolume, setTotalVolume] = useState(50);
  const [remainingVolume, setRemainingVolume] = useState(50);
  const [configStep, setConfigStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infusingBlink, setInfusingBlink] = useState(false);
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  // Auto-start for virtual rooms
  if (isVR && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    setActiveCase(virtualRoomCase as InfusionCase);
    setScreen("sim");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (pumpState === "infusing") {
      const b = setInterval(() => setInfusingBlink(p => !p), 600);
      return () => clearInterval(b);
    } else {
      setInfusingBlink(false);
    }
  }, [pumpState]);

  const updateLCD = useCallback((l1: string, l2: string, l3 = "", l4 = "") => {
    setLcdLine1(l1); setLcdLine2(l2); setLcdLine3(l3); setLcdLine4(l4);
  }, []);

  const calcRateFromDose = (drug: Drug, wt: number, dose: number) => {
    const concMcgPerMl = (drug.concentration.mg * 1000) / drug.concentration.ml;
    const dosePerMin = dose * wt;
    const mlPerMin = dosePerMin / concMcgPerMl;
    return Math.round(mlPerMin * 60 * 100) / 100;
  };

  const checkHardLimit = (drug: Drug, dose: number): boolean => dose > drug.hardLimitMax;

  const triggerAlarm = (type: "occlusion" | "air") => {
    setPumpState("alarm");
    setAlarmType(type);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    updateLCD("⚠ ALARME ⚠", type === "occlusion" ? "OCLUSÃO NA LINHA" : "AR NO EQUIPO", "Resolva e pressione", "SILENCIAR → START");
  };

  const startInfusion = (rate: number, vol: number) => {
    setRateMLH(rate);
    setTotalVolume(vol);
    setRemainingVolume(vol);
    setPumpState("infusing");
    setAlarmType(null);
    setErrorExplanation(null);
    updateLCD(`Taxa: ${rate} mL/h`, `Vol. restante: ${vol.toFixed(1)} mL`, selectedDrug ? `Droga: ${selectedDrug.name}` : "", "INFUNDINDO ▶");

    if (timerRef.current) clearInterval(timerRef.current);
    const speedFactor = 50;
    let remaining = vol;
    timerRef.current = setInterval(() => {
      const consumed = (rate / 3600) * speedFactor;
      remaining -= consumed;
      if (remaining <= 0) {
        remaining = 0;
        setRemainingVolume(0);
        setPumpState("alarm");
        setAlarmType(null);
        updateLCD("INFUSÃO COMPLETA", "Volume esgotado", "Pressione CLEAR", "para reiniciar");
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      } else {
        setRemainingVolume(remaining);
        setLcdLine2(`Vol. restante: ${remaining.toFixed(1)} mL`);
      }
    }, 1000);

    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    const delay = 12000 + Math.random() * 25000;
    alarmTimerRef.current = setTimeout(() => {
      const type: "occlusion" | "air" = Math.random() > 0.5 ? "occlusion" : "air";
      triggerAlarm(type);
    }, delay);
  };

  // ─── Keypad handler ───
  const handleKeyPress = (key: string) => {
    if (key === "clear") {
      setLcdInput("");
      if (pumpState === "alarm" && alarmType === null) resetPump();
      return;
    }
    if (key === "start") {
      if (pumpState === "alarm" && alarmType) return;
      if (pumpState === "paused") { startInfusion(rateMLH, remainingVolume); return; }
      if (mode === "menu") return;
      if (mode === "simple") handleSimpleMode();
      else if (mode === "dose_weight") handleDoseWeightMode();
      else if (mode === "bolus") handleBolusMode();
      return;
    }
    if (key === "stop") {
      if (pumpState === "infusing") {
        setPumpState("paused");
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (alarmTimerRef.current) { clearTimeout(alarmTimerRef.current); alarmTimerRef.current = null; }
        updateLCD("⏸ PAUSADO", `Taxa: ${rateMLH} mL/h`, `Restante: ${remainingVolume.toFixed(1)} mL`, "START para retomar");
      }
      return;
    }
    if (key === "bolus") {
      if (pumpState === "infusing" && selectedDrug && selectedDrug.bolusMax > 0) {
        updateLCD("BOLUS MANUAL", "Infundindo bolus...", `${selectedDrug.name}`, "Aguarde...");
      }
      return;
    }
    if (key === "silence") {
      if (pumpState === "alarm" && alarmType) {
        updateLCD("ALARME SILENCIADO", alarmType === "occlusion" ? "Resolva a oclusão" : "Remova o ar", "Clique na LINHA", "depois pressione START");
        setPumpState("error");
      }
      return;
    }
    if (key === "resolve") {
      if (pumpState === "error") {
        setPumpState("paused");
        setAlarmType(null);
        updateLCD("PROBLEMA RESOLVIDO", "Pressione START", "para retomar infusão", `Restante: ${remainingVolume.toFixed(1)} mL`);
      }
      return;
    }
    if (key === ".") {
      if (lcdInput.includes(".")) return;
      setLcdInput(p => p + ".");
    } else {
      setLcdInput(p => p + key);
    }
  };

  const handleSimpleMode = () => {
    if (configStep === 0) {
      const rate = parseFloat(lcdInput);
      if (!rate || rate <= 0) { updateLCD("ERRO", "Taxa inválida", "Pressione CLEAR", ""); setLcdInput(""); return; }
      setRateMLH(rate); setConfigStep(1); setLcdInput("");
      updateLCD("MODO SIMPLES", `Taxa: ${rate} mL/h`, "Volume total (mL):", "Digite e START");
    } else if (configStep === 1) {
      const vol = parseFloat(lcdInput);
      if (!vol || vol <= 0) { updateLCD("ERRO", "Volume inválido", "Pressione CLEAR", ""); setLcdInput(""); return; }
      setLcdInput(""); startInfusion(rateMLH, vol);
    }
  };

  const handleDoseWeightMode = () => {
    if (!selectedDrug) { setDrugDialogOpen(true); return; }
    if (configStep === 0) {
      const wt = parseFloat(lcdInput);
      if (!wt || wt <= 0) { updateLCD("ERRO", "Peso inválido", "Pressione CLEAR", ""); setLcdInput(""); return; }
      setWeight(wt); setConfigStep(1); setLcdInput("");
      updateLCD(`DOSE/PESO - ${selectedDrug.name}`, `Peso: ${wt} kg`, `Dose (${selectedDrug.unit}):`, "Digite e START");
    } else if (configStep === 1) {
      const dose = parseFloat(lcdInput);
      if (!dose || dose <= 0) { updateLCD("ERRO", "Dose inválida", "Pressione CLEAR", ""); setLcdInput(""); return; }
      if (checkHardLimit(selectedDrug, dose)) {
        setPumpState("alarm"); setAlarmType("dose_limit"); setDoseValue(dose);
        updateLCD("🚫 ERRO CRÍTICO 🚫", "DOSE ACIMA DO LIMITE", "DE SEGURANÇA", `Máx: ${selectedDrug.hardLimitMax} ${selectedDrug.unit}`);
        setLcdInput(""); return;
      }
      setDoseValue(dose);
      const rate = calcRateFromDose(selectedDrug, weight, dose);
      setConfigStep(2); setLcdInput("");
      updateLCD(`${selectedDrug.name}`, `Dose: ${dose} ${selectedDrug.unit}`, `Calculado: ${rate} mL/h`, "Volume total? → START");
    } else if (configStep === 2) {
      const vol = parseFloat(lcdInput);
      if (!vol || vol <= 0) { updateLCD("ERRO", "Volume inválido", "Pressione CLEAR", ""); setLcdInput(""); return; }
      const rate = calcRateFromDose(selectedDrug, weight, doseValue);
      setLcdInput(""); startInfusion(rate, vol);
    }
  };

  const handleBolusMode = () => {
    if (!selectedDrug) { setDrugDialogOpen(true); return; }
    if (configStep === 0) {
      const vol = parseFloat(lcdInput);
      if (!vol || vol <= 0) { updateLCD("ERRO", "Volume inválido", "Pressione CLEAR", ""); setLcdInput(""); return; }
      if (selectedDrug.bolusMax > 0 && vol > selectedDrug.bolusMax) {
        updateLCD("🚫 ERRO", `Bolus máx: ${selectedDrug.bolusMax} mL`, "para " + selectedDrug.name, "Pressione CLEAR");
        setLcdInput(""); return;
      }
      setLcdInput(""); startInfusion(999, vol);
      updateLCD("BOLUS", `Infundindo ${vol} mL`, selectedDrug.name, "Dose de ataque ▶");
    }
  };

  const resetPump = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (alarmTimerRef.current) { clearTimeout(alarmTimerRef.current); alarmTimerRef.current = null; }
    setPumpState("stopped"); setMode("menu"); setAlarmType(null); setConfigStep(0);
    setLcdInput(""); setSelectedDrug(null); setRateMLH(0); setWeight(0); setDoseValue(0);
    setRemainingVolume(50); setTotalVolume(50); setErrorExplanation(null);
    updateLCD("BOMBA DE INFUSÃO", "Selecione o modo", "", "");
  };

  const selectMode = (m: PumpMode) => {
    setMode(m); setConfigStep(0); setLcdInput("");
    if (m === "simple") updateLCD("MODO SIMPLES", "Taxa de fluxo (mL/h):", "Digite e pressione START", "");
    else if (m === "dose_weight") setDrugDialogOpen(true);
    else if (m === "bolus") setDrugDialogOpen(true);
  };

  const selectDrug = (drug: Drug) => {
    setSelectedDrug(drug); setDrugDialogOpen(false); setConfigStep(0); setLcdInput("");
    if (mode === "dose_weight") updateLCD(`DOSE/PESO - ${drug.name}`, `Conc: ${drug.concentration.mg}mg/${drug.concentration.ml}mL`, "Peso do paciente (kg):", "Digite e START");
    else if (mode === "bolus") updateLCD(`BOLUS - ${drug.name}`, `Máx: ${drug.bolusMax > 0 ? drug.bolusMax + " mL" : "N/A"}`, "Volume do bolus (mL):", "Digite e START");
  };

  const showErrorExplanation = () => {
    if (selectedDrug && alarmType === "dose_limit") setErrorExplanation(selectedDrug.description);
  };

  const startCase = (idx: number) => {
    const c = allCases[idx] as InfusionCase;
    setActiveCase(c);
    resetPump();
    setScreen("sim");
  };

  const backToDashboard = () => {
    resetPump();
    setActiveCase(null);
    setScreen("dashboard");
  };

  const isAlarm = pumpState === "alarm";
  const isInfusing = pumpState === "infusing";

  if (loadingVR) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isVR && screen === "dashboard") return null;

  // ═══ DASHBOARD ═══
  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/simuladores")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Simulador de Bomba de Infusão</h1>
          <p className="text-muted-foreground">Treinamento de programação de bombas de seringa/equipo – Segurança do paciente</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((cs: any, i: number) => (
            <Card key={cs.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => startCase(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={cs.difficulty === "Fácil" ? "secondary" : cs.difficulty === "Difícil" ? "destructive" : "default"}>{cs.difficulty}</Badge>
                  <div className="flex items-center gap-1">
                    {cs.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                    <AdminCaseActions caseItem={cs} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{cs.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{cs.patient?.name} · {cs.drugName || cs.scenario?.substring(0, 50)}</p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ═══ SIMULATOR SCREEN ═══
  return (
    <div className="max-w-5xl mx-auto">
      <Button variant="ghost" onClick={isVR ? goBack : backToDashboard} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />{isVR ? "Voltar à Home" : "Voltar aos Casos"}
      </Button>
      <h1 className="text-2xl font-bold mb-2">Simulador de Bomba de Infusão</h1>

      {/* Case context card */}
      {activeCase && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">{activeCase.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight}kg
                </p>
                <p className="text-xs text-muted-foreground">{activeCase.scenario}</p>
              </div>
              <Badge variant={activeCase.difficulty === "Fácil" ? "secondary" : activeCase.difficulty === "Difícil" ? "destructive" : "default"}>
                {activeCase.difficulty}
              </Badge>
            </div>
            {activeCase.expectedActions && activeCase.expectedActions.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-primary cursor-pointer font-medium">Ver ações esperadas</summary>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4 list-disc">
                  {activeCase.expectedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </details>
            )}
            {activeCase.clinicalTip && (
              <details className="mt-1">
                <summary className="text-xs text-primary cursor-pointer font-medium">Dica clínica</summary>
                <p className="text-xs text-muted-foreground mt-1">{activeCase.clinicalTip}</p>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drug Selection Dialog */}
      <Dialog open={drugDialogOpen} onOpenChange={setDrugDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Biblioteca de Drogas</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            {DRUG_LIBRARY.map(drug => (
              <button key={drug.name} onClick={() => selectDrug(drug)} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                <p className="font-medium text-sm">{drug.name}</p>
                <p className="text-xs text-muted-foreground">{drug.concentration.mg}mg/{drug.concentration.ml}mL · Limite: {drug.hardLimitMax} {drug.unit}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Explanation Dialog */}
      <Dialog open={!!errorExplanation} onOpenChange={() => setErrorExplanation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Explicação Farmacológica</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorExplanation}</p>
          {selectedDrug && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs font-medium text-destructive">Limite Hard: {selectedDrug.hardLimitMax} {selectedDrug.unit}</p>
              <p className="text-xs text-destructive/80 mt-1">Dose inserida: {doseValue} {selectedDrug.unit}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ PUMP BODY ═══ */}
      <div className="rounded-2xl border-2 border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(220,15%,18%)] to-[hsl(220,15%,12%)] p-4 md:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">MedPump 3000</span>
          </div>
          <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground hover:text-foreground transition-colors">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          {/* LCD Screen */}
          <div className={`relative rounded-xl p-1 transition-all duration-300 ${isAlarm ? "ring-2 ring-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.4)]" : isInfusing ? "ring-1 ring-primary/50" : ""}`}>
            <div className={`rounded-lg p-4 md:p-5 font-mono text-sm transition-colors duration-300 ${isAlarm ? "bg-[hsl(0,80%,8%)] text-red-400" : "bg-[hsl(160,60%,6%)] text-[hsl(160,100%,70%)]"}`}
              style={{ textShadow: isAlarm ? "0 0 8px hsl(0 80% 50% / 0.5)" : "0 0 8px hsl(160 100% 50% / 0.3)" }}
            >
              <div className="space-y-1 min-h-[96px]">
                <p className="text-xs opacity-60 font-bold tracking-wider">{lcdLine1}</p>
                <p className="text-base md:text-lg font-bold">{lcdLine2}</p>
                <p className="text-xs">{lcdLine3}</p>
                <p className="text-xs opacity-80">{lcdLine4}</p>
              </div>
              {(mode !== "menu" && pumpState !== "infusing" && pumpState !== "alarm" && pumpState !== "error") && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-60">▶</span>
                    <span className="text-lg font-bold tracking-wider">{lcdInput || "_"}</span>
                  </div>
                </div>
              )}
              {isInfusing && totalVolume > 0 && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <div className="w-full h-2 rounded-full bg-current/10 overflow-hidden">
                    <div className="h-full rounded-full bg-current/60 transition-all duration-1000" style={{ width: `${((totalVolume - remainingVolume) / totalVolume) * 100}%` }} />
                  </div>
                  <p className="text-[10px] mt-1 opacity-60">{remainingVolume.toFixed(1)} / {totalVolume.toFixed(1)} mL</p>
                </div>
              )}
            </div>

            {/* Indicator lights */}
            <div className="flex items-center gap-4 mt-3 px-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full border transition-all duration-300 ${isInfusing && infusingBlink ? "bg-green-500 border-green-400 shadow-[0_0_8px_hsl(120,60%,50%/0.6)]" : "bg-green-900/30 border-green-800/50"}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Infundindo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full border transition-all duration-300 ${isAlarm ? "bg-red-500 border-red-400 shadow-[0_0_8px_hsl(0,60%,50%/0.6)] animate-pulse" : "bg-red-900/30 border-red-800/50"}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Alarme</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full border transition-all duration-300 ${pumpState === "paused" || pumpState === "error" ? "bg-yellow-500 border-yellow-400 shadow-[0_0_8px_hsl(50,60%,50%/0.6)]" : "bg-yellow-900/30 border-yellow-800/50"}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Pausa</span>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1.5">
              {["7","8","9","4","5","6","1","2","3",".","0",""].map((k, i) => (
                k !== "" ? (
                  <button key={i} onClick={() => handleKeyPress(k)} className="w-12 h-10 md:w-14 md:h-11 rounded-lg bg-[hsl(220,15%,22%)] hover:bg-[hsl(220,15%,28%)] active:bg-[hsl(220,15%,16%)] text-foreground font-mono text-sm font-bold border border-[hsl(220,15%,26%)] transition-colors shadow-sm active:shadow-none">
                    {k}
                  </button>
                ) : <div key={i} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <button onClick={() => handleKeyPress("start")} className="h-10 rounded-lg bg-green-700 hover:bg-green-600 active:bg-green-800 text-white text-xs font-bold font-mono border border-green-600 transition-colors shadow-sm">START</button>
              <button onClick={() => handleKeyPress("stop")} className="h-10 rounded-lg bg-yellow-700 hover:bg-yellow-600 active:bg-yellow-800 text-white text-xs font-bold font-mono border border-yellow-600 transition-colors shadow-sm">STOP</button>
              <button onClick={() => handleKeyPress("bolus")} className="h-10 rounded-lg bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-bold font-mono border border-blue-600 transition-colors shadow-sm">BOLUS</button>
              <button onClick={() => handleKeyPress("clear")} className="h-10 rounded-lg bg-[hsl(220,15%,25%)] hover:bg-[hsl(220,15%,30%)] text-muted-foreground text-xs font-bold font-mono border border-[hsl(220,15%,28%)] transition-colors shadow-sm">CLEAR</button>
            </div>
            {(pumpState === "alarm" && alarmType) && (
              <button onClick={() => handleKeyPress("silence")} className="h-10 rounded-lg bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs font-bold font-mono transition-colors animate-pulse">🔇 SILENCIAR</button>
            )}
            {pumpState === "error" && (
              <button onClick={() => handleKeyPress("resolve")} className="h-10 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground text-xs font-bold font-mono transition-colors">🔧 RESOLVER LINHA</button>
            )}
            {isAlarm && alarmType === "dose_limit" && (
              <button onClick={showErrorExplanation} className="h-10 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-bold font-mono border border-destructive/30 transition-colors">⚠ Verificar Erro</button>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        {mode === "menu" && pumpState === "stopped" && (
          <div className="mt-5 pt-4 border-t border-[hsl(220,15%,20%)]">
            <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">Selecione o modo de operação:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={() => selectMode("simple")} className="p-3 rounded-xl bg-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,20%)] border border-[hsl(220,15%,22%)] text-left transition-colors">
                <p className="font-mono text-sm font-bold text-foreground">Modo Simples</p>
                <p className="text-xs text-muted-foreground mt-1">Definir taxa em mL/h</p>
              </button>
              <button onClick={() => selectMode("dose_weight")} className="p-3 rounded-xl bg-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,20%)] border border-[hsl(220,15%,22%)] text-left transition-colors">
                <p className="font-mono text-sm font-bold text-foreground">Dose/Peso</p>
                <p className="text-xs text-muted-foreground mt-1">mcg/kg/min → mL/h</p>
              </button>
              <button onClick={() => selectMode("bolus")} className="p-3 rounded-xl bg-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,20%)] border border-[hsl(220,15%,22%)] text-left transition-colors">
                <p className="font-mono text-sm font-bold text-foreground">Dose de Ataque</p>
                <p className="text-xs text-muted-foreground mt-1">Bolus rápido</p>
              </button>
            </div>
          </div>
        )}

        {mode !== "menu" && (
          <div className="mt-4 pt-3 border-t border-[hsl(220,15%,20%)] flex justify-end">
            <button onClick={resetPump} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors underline">Reiniciar Bomba</button>
          </div>
        )}
      </div>

      {/* Educational Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">📐 Programação Mental</h3>
          <p className="text-xs text-muted-foreground">Diferença entre infundir em mL/h (volume) vs. mcg/kg/min (concentração/dose). O modo Dose/Peso calcula automaticamente.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">⚠️ Atenção aos Detalhes</h3>
          <p className="text-xs text-muted-foreground">O perigo de errar uma vírgula (1.0 vs 10) em drogas vasoativas. Hard limits protegem contra doses tóxicas.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2">🔔 Gestão de Alarmes</h3>
          <p className="text-xs text-muted-foreground">Priorize resolver o problema técnico (oclusão, ar) antes de reiniciar a droga. Silencie → resolva → retome.</p>
        </div>
      </div>
    </div>
  );
}
