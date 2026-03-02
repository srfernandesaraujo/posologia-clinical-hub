import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Award, Activity, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Biomarker {
  id: string; name: string; currentValue: number; previousValue: number; target: string; unit: string; isHigherBetter: boolean;
}

const initialBiomarkers: Biomarker[] = [
  { id: "HbA1c", name: "Hemoglobina Glicada", currentValue: 6.5, previousValue: 7.2, target: "< 7.0", unit: "%", isHigherBetter: false },
  { id: "LDL", name: "Colesterol LDL (Mau)", currentValue: 110, previousValue: 135, target: "< 100", unit: "mg/dL", isHigherBetter: false },
  { id: "HDL", name: "Colesterol HDL (Bom)", currentValue: 48, previousValue: 42, target: "> 40", unit: "mg/dL", isHigherBetter: true },
];

const initialHistory = [
  { semester: "S1 2024", HbA1c: 7.8, LDL: 150, HDL: 38 },
  { semester: "S2 2024", HbA1c: 7.5, LDL: 140, HDL: 40 },
  { semester: "S1 2025", HbA1c: 7.2, LDL: 135, HDL: 42 },
  { semester: "S2 2025", HbA1c: 6.5, LDL: 110, HDL: 48 },
];

const targetLines: Record<string, number> = { HbA1c: 7.0, LDL: 100, HDL: 40 };

export default function BolsaMetabolicaGame({ customData }: { customData?: any }) {
  const [healthCoins, setHealthCoins] = useState(1500);
  const [selectedBio, setSelectedBio] = useState("HbA1c");
  const [biomarkers, setBiomarkers] = useState(initialBiomarkers);
  const [historyData, setHistoryData] = useState(initialHistory);
  const [showDialog, setShowDialog] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handleNewExams = () => {
    if (updated) { toast.info("Já atualizou os exames nesta sessão."); setShowDialog(false); return; }
    setBiomarkers((prev) => prev.map((b) => {
      if (b.id === "HbA1c") return { ...b, previousValue: b.currentValue, currentValue: 6.1 };
      if (b.id === "LDL") return { ...b, previousValue: b.currentValue, currentValue: 95 };
      return b;
    }));
    setHistoryData((h) => [...h, { semester: "S1 2026", HbA1c: 6.1, LDL: 95, HDL: 50 }]);
    setHealthCoins((c) => c + 500);
    setUpdated(true);
    setShowDialog(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    toast.success("Parabéns! Recebeu 500 moedas de saúde em dividendos!");
  };

  const getChange = (b: Biomarker) => {
    const diff = b.currentValue - b.previousValue;
    const favorable = b.isHigherBetter ? diff > 0 : diff < 0;
    return { diff, favorable };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Património Líquido de Saúde</p>
          <p className="text-3xl font-bold font-mono">🪙 {healthCoins.toLocaleString()}</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Registar Novos Exames
        </Button>
      </div>

      {/* Ticker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {biomarkers.map((b) => {
          const { diff, favorable } = getChange(b);
          return (
            <Card key={b.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedBio === b.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedBio(b.id)}>
              <CardContent className="py-3 space-y-1">
                <p className="text-xs text-muted-foreground">{b.name}</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold font-mono">{b.currentValue}{b.unit}</span>
                  <div className="flex items-center gap-1">
                    {favorable ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    <Badge variant={favorable ? "secondary" : "destructive"} className="text-[10px]">
                      {favorable ? "LUCRO" : "PREJUÍZO"}
                    </Badge>
                  </div>
                </div>
                <p className={`text-xs font-mono ${favorable ? "text-green-500" : "text-red-500"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)} {b.unit}
                </p>
                <p className="text-[10px] text-muted-foreground">Meta: {b.target}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-0 pt-3">
          <CardTitle className="text-sm">{biomarkers.find((b) => b.id === selectedBio)?.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={targetLines[selectedBio]} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Meta", fill: "#ef4444", fontSize: 10 }} />
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey={selectedBio} stroke="#34d399" strokeWidth={3} fill="url(#colorGrad)" dot={{ r: 5, fill: "#34d399" }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novos Resultados do Laboratório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Simulação: Os seus novos exames chegaram do laboratório!</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleNewExams}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
