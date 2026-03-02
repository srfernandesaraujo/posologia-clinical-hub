import { useState } from "react";
import { Search, Syringe, FileWarning, Activity, DollarSign, Pill, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const patientInfo = { name: "Sr. Carlos", age: 65, symptoms: "Dor muscular intensa, fraqueza severa nas pernas e urina muito escura nas últimas 48h." };
const currentMeds = [{ id: 1, name: "Losartana 50mg" }, { id: 2, name: "Sinvastatina 40mg" }, { id: 3, name: "Omeprazol 20mg" }];
const availableTests = [
  { id: "T1", name: "Hemograma Completo", cost: 20, result: "Leucócitos normais. Sem anemia.", isKey: false },
  { id: "T2", name: "AST e ALT (Enzimas Hepáticas)", cost: 30, result: "Levemente elevadas (AST 50, ALT 45). Inespecífico.", isKey: false },
  { id: "T3", name: "CPK (Creatinofosfoquinase)", cost: 40, result: "ALERTA: 6.500 U/L (Valor normal até 170). Destruição muscular maciça!", isKey: true },
  { id: "T4", name: "EAS (Urina Tipo 1)", cost: 15, result: "Mioglobinúria Positiva. Coloração escura confirmada.", isKey: true },
];

export default function AlertaVermelhoGame() {
  const [budget, setBudget] = useState(100);
  const [health, setHealth] = useState(100);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [selectedMed, setSelectedMed] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");

  const orderTest = (test: typeof availableTests[0]) => {
    if (budget < test.cost) { toast.error("Orçamento insuficiente!"); return; }
    setBudget((b) => b - test.cost);
    const newHealth = health - 15;
    setHealth(Math.max(0, newHealth));
    setOrdered((o) => [...o, test.id]);
    if (newHealth <= 0) setGameStatus("lost");
  };

  const confirm = () => {
    if (selectedMed === null) return;
    const hasKeyTest = ordered.some((id) => availableTests.find((t) => t.id === id)?.isKey);
    if (selectedMed === 2 && hasKeyTest) {
      setGameStatus("won");
    } else {
      setGameStatus("lost");
    }
  };

  const restart = () => { setBudget(100); setHealth(100); setOrdered([]); setSelectedMed(null); setGameStatus("playing"); };

  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5">
        <div className={`rounded-full p-5 ${won ? "bg-green-900/40" : "bg-red-900/40"}`}>
          {won ? <Trophy className="h-14 w-14 text-green-400" /> : <XCircle className="h-14 w-14 text-red-400" />}
        </div>
        <h2 className={`text-xl font-bold ${won ? "text-green-400" : "text-red-400"}`}>
          {won ? "Diagnóstico Correto!" : "Erro Médico!"}
        </h2>
        <p className="text-zinc-400 max-w-md text-sm">
          {won ? "Identificou a Rabdomiólise por Estatinas provada por exames. O paciente foi salvo." : "Suspendeu o fármaco errado ou tomou decisão sem base laboratorial."}
        </p>
        <Button onClick={restart} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">Reiniciar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-xs"><span className="text-muted-foreground">Saúde:</span> <span className={health < 40 ? "text-red-500 font-bold" : ""}>{health}%</span></div>
          <Progress value={health} className="w-24 h-2 [&>div]:bg-red-500" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${budget < 30 ? "text-red-500 animate-pulse" : "text-green-500"}`}>
          <DollarSign className="h-4 w-4" />{budget}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case */}
        <div className="space-y-3">
          <Card className="border-red-900/30 bg-red-950/10">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">{patientInfo.name}, {patientInfo.age} anos</p>
              <p className="text-sm font-medium flex items-start gap-2"><FileWarning className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />{patientInfo.symptoms}</p>
            </CardContent>
          </Card>
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Medicamentos Suspeitos</p>
            {currentMeds.map((m) => (
              <Button key={m.id} variant={selectedMed === m.id ? "default" : "outline"} size="sm" className="w-full mb-1.5 justify-start text-xs" onClick={() => setSelectedMed(m.id)}>
                <Pill className="h-3 w-3 mr-2" />{m.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Lab */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Solicitar Exames</p>
          {availableTests.filter((t) => !ordered.includes(t.id)).map((t) => (
            <Button key={t.id} variant="outline" size="sm" className="w-full justify-between text-xs" onClick={() => orderTest(t)}>
              {t.name} <Badge variant="secondary" className="text-[10px]">${t.cost}</Badge>
            </Button>
          ))}
          {ordered.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Resultados</p>
              {ordered.map((id) => {
                const t = availableTests.find((x) => x.id === id)!;
                return (
                  <Card key={id} className={t.isKey ? "border-yellow-500/30" : ""}>
                    <CardContent className="py-2">
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className={`text-xs mt-0.5 ${t.isKey ? "text-yellow-500 font-medium" : "text-muted-foreground"}`}>{t.result}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Button onClick={confirm} disabled={selectedMed === null} className="w-full" size="lg">
        Confirmar Diagnóstico e Suspender Fármaco
      </Button>
    </div>
  );
}
