import { useState } from "react";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Trophy, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer, ReferenceLine } from "recharts";

export default function JanelaTerapeuticaGame() {
  const [currentDay, setCurrentDay] = useState(1);
  const [currentINR, setCurrentINR] = useState(2.2);
  const [history, setHistory] = useState([{ day: 0, inr: 1.0 }, { day: 1, inr: 2.2 }]);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost_bleeding" | "lost_thrombosis">("playing");

  const applyDose = (action: string) => {
    const rand = (Math.random() - 0.5) * 0.4;
    let newINR = currentINR;
    if (action === "increase") newINR += 0.6 + rand;
    else if (action === "maintain") newINR += rand;
    else if (action === "reduce") newINR -= 0.5 + rand;
    else if (action === "suspend") newINR -= 1.2 + rand;
    newINR = Math.max(0.8, parseFloat(newINR.toFixed(1)));

    const newDay = currentDay + 1;
    setCurrentINR(newINR);
    setHistory((h) => [...h, { day: newDay, inr: newINR }]);
    setCurrentDay(newDay);

    if (newINR >= 5.0) { setGameStatus("lost_bleeding"); return; }
    if (newINR <= 1.2 && newDay > 3) { setGameStatus("lost_thrombosis"); return; }
    if (newDay >= 10) { setGameStatus("won"); }
  };

  const restart = () => { setCurrentDay(1); setCurrentINR(2.2); setHistory([{ day: 0, inr: 1.0 }, { day: 1, inr: 2.2 }]); setGameStatus("playing"); };

  const inrColor = currentINR < 2.0 ? "text-yellow-600" : currentINR <= 3.0 ? "text-green-600" : "text-red-600";

  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5">
        <div className={`rounded-full p-5 ${won ? "bg-green-100" : "bg-red-100"}`}>
          {won ? <Trophy className="h-14 w-14 text-green-600" /> : <XCircle className="h-14 w-14 text-red-600" />}
        </div>
        <h2 className={`text-xl font-bold ${won ? "text-green-700" : "text-red-700"}`}>
          {won ? "Vitória Clínica!" : gameStatus === "lost_bleeding" ? "Hemorragia Severa!" : "Trombose!"}
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {won ? "Manteve o paciente estável e seguro durante todo o período." : gameStatus === "lost_bleeding" ? "INR Tóxico. O paciente sofreu uma hemorragia severa." : "INR Subterapêutico. O paciente desenvolveu um trombo."}
        </p>
        <Button onClick={restart} variant="outline">Reiniciar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Alvo Terapêutico INR: 2.0 – 3.0</p>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Dia {currentDay} / 10</Badge>
          <span className={`text-2xl font-bold font-mono ${inrColor}`}>{currentINR.toFixed(1)}</span>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} />
              <YAxis domain={[0.5, 6]} />
              <Tooltip />
              <ReferenceArea y1={0.5} y2={2.0} fill="#fef3c7" fillOpacity={0.4} />
              <ReferenceArea y1={2.0} y2={3.0} fill="#bbf7d0" fillOpacity={0.4} />
              <ReferenceArea y1={3.0} y2={6.0} fill="#fecaca" fillOpacity={0.4} />
              <ReferenceLine y={2.0} stroke="#16a34a" strokeDasharray="3 3" />
              <ReferenceLine y={3.0} stroke="#dc2626" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="inr" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: "#2563eb" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button onClick={() => applyDose("increase")} variant="outline" className="flex-col h-auto py-3 gap-1">
          <TrendingUp className="h-4 w-4 text-red-500" />
          <span className="text-xs">Aumentar Dose</span>
        </Button>
        <Button onClick={() => applyDose("maintain")} variant="outline" className="flex-col h-auto py-3 gap-1">
          <Activity className="h-4 w-4" />
          <span className="text-xs">Manter Dose</span>
        </Button>
        <Button onClick={() => applyDose("reduce")} variant="outline" className="flex-col h-auto py-3 gap-1">
          <TrendingDown className="h-4 w-4 text-green-500" />
          <span className="text-xs">Reduzir Dose</span>
        </Button>
        <Button onClick={() => applyDose("suspend")} variant="outline" className="flex-col h-auto py-3 gap-1">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-xs">Suspender 1 Dia</span>
        </Button>
      </div>
    </div>
  );
}
