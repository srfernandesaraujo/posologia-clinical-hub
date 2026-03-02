import { useState } from "react";
import { Activity, Syringe, AlertTriangle, Calendar, ChevronRight, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const labResults = [
  { day: 1, creatinina: 0.9, tfg: 95, alert: "Função Renal Normal" },
  { day: 2, creatinina: 1.1, tfg: 80, alert: "Ligeira Queda" },
  { day: 3, creatinina: 1.8, tfg: 45, alert: "Atenção: Lesão Renal Aguda!" },
  { day: 4, creatinina: 2.2, tfg: 30, alert: "Risco Elevado" },
  { day: 5, creatinina: 2.5, tfg: 25, alert: "Ajuste Urgente Necessário" },
  { day: 6, creatinina: 1.9, tfg: 40, alert: "Recuperação Lenta" },
  { day: 7, creatinina: 1.2, tfg: 75, alert: "Estável" },
];

const doses = ["1000mg a cada 12h", "500mg a cada 12h", "500mg a cada 24h", "Suspender"];

export default function GestorClearanceGame({ customData }: { customData?: any }) {
  const labData = customData?.labResults || labResults;
  const doseOptions = customData?.doses || doses;
  const patientLabel = customData?.patientInfo ? `${customData.patientInfo.name} | ${customData.patientInfo.age} anos | ${customData.patientInfo.drug}` : "João Silva | 68 anos | Vancomicina IV";
  const [currentDay, setCurrentDay] = useState(1);
  const [toxicity, setToxicity] = useState(0);
  const [efficacy, setEfficacy] = useState(50);
  const [currentDose, setCurrentDose] = useState(doses[0]);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost_tox" | "lost_eff">("playing");

  const lab = labResults[currentDay - 1];

  const advanceDay = () => {
    const tfg = lab.tfg;
    let newTox = toxicity;
    let newEff = efficacy;

    if (currentDose === "Suspender") {
      newTox = Math.max(0, newTox - 20);
      newEff = Math.max(0, newEff - 25);
    } else if (tfg < 50 && currentDose === "1000mg a cada 12h") {
      newTox = Math.min(100, newTox + 35);
    } else if (tfg < 50 && currentDose === "500mg a cada 24h") {
      newTox = Math.max(0, newTox - 10);
    } else if (tfg < 50 && currentDose === "500mg a cada 12h") {
      newTox = Math.min(100, newTox + 15);
    } else if (tfg >= 50) {
      newEff = Math.min(100, newEff + 5);
    }

    if (newTox >= 100) { setToxicity(100); setGameStatus("lost_tox"); return; }
    if (newEff <= 0) { setEfficacy(0); setGameStatus("lost_eff"); return; }

    setToxicity(newTox);
    setEfficacy(newEff);

    if (currentDay >= 7) { setGameStatus("won"); return; }
    setCurrentDay((d) => d + 1);
  };

  const restart = () => { setCurrentDay(1); setToxicity(0); setEfficacy(50); setCurrentDose(doses[0]); setGameStatus("playing"); };

  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5">
        <div className={`rounded-full p-5 ${won ? "bg-green-100" : "bg-red-100"}`}>
          {won ? <Trophy className="h-14 w-14 text-green-600" /> : <XCircle className="h-14 w-14 text-red-600" />}
        </div>
        <h2 className={`text-xl font-bold ${won ? "text-green-700" : "text-red-700"}`}>
          {won ? "Alta Hospitalar Concedida!" : gameStatus === "lost_tox" ? "Nefrotoxicidade Severa!" : "Falha Terapêutica!"}
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {won ? "Excelente gestão de clearance farmacológico." : gameStatus === "lost_tox" ? "Ausência de ajuste de dose causou dano renal irreversível." : "A infeção generalizou por falta de tratamento eficaz."}
        </p>
        <Button onClick={restart} variant="outline">Reiniciar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Paciente: João Silva | 68 anos | Vancomicina IV</p>
        <Badge variant="secondary" className="text-sm">Dia {currentDay} de 7</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Labs */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Activity className="h-4 w-4" /> Exames do Dia</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Creatinina Sérica</p>
              <p className={`text-2xl font-bold ${lab.creatinina > 1.2 ? "text-red-600" : "text-green-600"}`}>{lab.creatinina} mg/dL</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TFG</p>
              <p className={`text-2xl font-bold ${lab.tfg < 50 ? "text-orange-600" : "text-green-600"}`}>{lab.tfg} mL/min</p>
            </div>
            <Badge variant={lab.tfg < 50 ? "destructive" : "secondary"}>{lab.alert}</Badge>
          </CardContent>
        </Card>

        {/* Dose */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Syringe className="h-4 w-4" /> Dose Atual</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {doses.map((d) => (
              <Button key={d} variant={currentDose === d ? "default" : "outline"} size="sm" className="w-full justify-start text-xs" onClick={() => setCurrentDose(d)}>
                {d}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Bars */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estado do Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Toxicidade</span>
                <span className={toxicity > 80 ? "text-red-600 font-bold" : ""}>{toxicity}%</span>
              </div>
              <Progress value={toxicity} className="h-3 [&>div]:bg-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Eficácia</span>
                <span className={efficacy < 30 ? "text-orange-600 font-bold" : ""}>{efficacy}%</span>
              </div>
              <Progress value={efficacy} className="h-3 [&>div]:bg-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={advanceDay} className="w-full" size="lg">
        Confirmar Dose e Avançar para o Dia {currentDay + 1} <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
