import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Heart, Pill, TestTubes, AlertTriangle } from "lucide-react";

export interface PatientVitals {
  fc: number;
  pas: number;
  pad: number;
  fr: number;
  temp: number;
  spo2: number;
  glasgow: number;
}

export interface PatientData {
  name: string;
  age: number;
  sex: string;
  weight: number;
  height: number;
  chiefComplaint: string;
  history: string;
  medications: string[];
  allergies: string[];
  vitals: PatientVitals;
  labs: Record<string, string>;
}

interface Props {
  patient: PatientData | null;
  alerts?: string[];
}

export function PatientRecordPanel({ patient, alerts }: Props) {
  if (!patient) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> 1. Prontuário do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent><div className="h-48 bg-muted/30 rounded" /></CardContent>
      </Card>
    );
  }

  const vitalColor = (label: string, value: number) => {
    const ranges: Record<string, [number, number]> = {
      fc: [60, 100], pas: [90, 140], pad: [60, 90], fr: [12, 20],
      temp: [36, 37.8], spo2: [94, 100], glasgow: [13, 15],
    };
    const r = ranges[label];
    if (!r) return "text-foreground";
    return value < r[0] || value > r[1] ? "text-destructive font-bold" : "text-green-400";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> 1. Prontuário do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Demographics */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{patient.name}</Badge>
          <Badge variant="secondary">{patient.age} anos</Badge>
          <Badge variant="secondary">{patient.sex}</Badge>
          <Badge variant="secondary">{patient.weight}kg / {patient.height}cm</Badge>
        </div>

        {/* Chief complaint */}
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs font-semibold text-destructive mb-1">Queixa Principal</p>
          <p className="text-sm">{patient.chiefComplaint}</p>
        </div>

        {/* History */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Histórico</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{patient.history}</p>
        </div>

        {/* Vitals */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Heart className="h-3 w-3" /> Sinais Vitais
          </p>
          <div className="grid grid-cols-4 gap-2">
            {([
              ["fc", "FC", `${patient.vitals.fc} bpm`],
              ["pas", "PA", `${patient.vitals.pas}/${patient.vitals.pad}`],
              ["fr", "FR", `${patient.vitals.fr} irpm`],
              ["temp", "Temp", `${patient.vitals.temp}°C`],
              ["spo2", "SpO₂", `${patient.vitals.spo2}%`],
              ["glasgow", "Glasgow", `${patient.vitals.glasgow}/15`],
            ] as [string, string, string][]).map(([key, label, display]) => (
              <div key={key} className="bg-muted/50 rounded px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={`text-xs font-mono font-semibold ${vitalColor(key, patient.vitals[key as keyof PatientVitals])}`}>
                  {display}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        {patient.medications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Pill className="h-3 w-3" /> Medicações em Uso
            </p>
            <div className="flex flex-wrap gap-1">
              {patient.medications.map((med, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{med}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Labs */}
        {Object.keys(patient.labs).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <TestTubes className="h-3 w-3" /> Exames Laboratoriais
            </p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(patient.labs).map(([key, val]) => (
                <div key={key} className="flex justify-between bg-muted/30 rounded px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-1">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
