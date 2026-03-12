import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Wind, Thermometer, Brain } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import type { PatientVitals } from "./PatientRecordPanel";

interface VitalSnapshot {
  stage: string;
  fc: number;
  pas: number;
  spo2: number;
  fr: number;
}

interface Props {
  vitalsHistory: VitalSnapshot[];
  currentVitals: PatientVitals | null;
}

export function PatientMonitorPanel({ vitalsHistory, currentVitals }: Props) {
  if (!currentVitals) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> 3. Monitor do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent><div className="h-48 bg-muted/30 rounded" /></CardContent>
      </Card>
    );
  }

  const statusColor = (val: number, min: number, max: number) =>
    val < min || val > max ? "text-destructive" : "text-green-400";

  const vitalCards: { icon: React.ReactNode; label: string; value: string; status: string }[] = [
    { icon: <Heart className="h-4 w-4" />, label: "FC", value: `${currentVitals.fc} bpm`, status: statusColor(currentVitals.fc, 60, 100) },
    { icon: <Activity className="h-4 w-4" />, label: "PA", value: `${currentVitals.pas}/${currentVitals.pad}`, status: statusColor(currentVitals.pas, 90, 140) },
    { icon: <Wind className="h-4 w-4" />, label: "SpO₂", value: `${currentVitals.spo2}%`, status: statusColor(currentVitals.spo2, 94, 100) },
    { icon: <Thermometer className="h-4 w-4" />, label: "Temp", value: `${currentVitals.temp}°C`, status: statusColor(currentVitals.temp, 36, 37.8) },
    { icon: <Wind className="h-4 w-4" />, label: "FR", value: `${currentVitals.fr} irpm`, status: statusColor(currentVitals.fr, 12, 20) },
    { icon: <Brain className="h-4 w-4" />, label: "Glasgow", value: `${currentVitals.glasgow}/15`, status: statusColor(currentVitals.glasgow, 13, 15) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> 3. Monitor do Paciente
          <Badge variant="outline" className="ml-auto text-[10px] animate-pulse">● LIVE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current vitals grid */}
        <div className="grid grid-cols-3 gap-2">
          {vitalCards.map((v) => (
            <div key={v.label} className="bg-muted/50 rounded-lg p-2 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">{v.icon}<span className="text-[10px]">{v.label}</span></div>
              <p className={`text-sm font-mono font-bold ${v.status}`}>{v.value}</p>
            </div>
          ))}
        </div>

        {/* Vitals chart */}
        {vitalsHistory.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Evolução dos Sinais Vitais</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalsHistory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Line type="monotone" dataKey="fc" name="FC" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pas" name="PAS" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fr" name="FR" stroke="hsl(168 80% 60%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-destructive inline-block" /> FC</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-primary inline-block" /> PAS</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-accent inline-block" /> SpO₂</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: "hsl(168 80% 60%)" }} /> FR</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
