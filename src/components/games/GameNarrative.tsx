import { useState } from "react";
import { BookOpen, Play, Stethoscope, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GameNarrativeProps {
  title: string;
  setting: string;
  patientName?: string;
  patientAge?: string;
  patientHistory?: string;
  briefing: string;
  onStart: () => void;
  difficulty?: string;
  icon?: React.ReactNode;
}

export default function GameNarrative({
  title,
  setting,
  patientName,
  patientAge,
  patientHistory,
  briefing,
  onStart,
  difficulty,
  icon,
}: GameNarrativeProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <Card className="max-w-lg w-full border-primary/20 shadow-xl bg-card/95 backdrop-blur-sm">
        <CardContent className="p-8 space-y-6">
          {step === 0 && (
            <div className="space-y-5 text-center animate-fade-in">
              <div className="inline-flex rounded-full bg-primary/10 p-5 mx-auto">
                {icon || <BookOpen className="h-10 w-10 text-primary" />}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{setting}</span>
                {difficulty && (
                  <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                    {difficulty}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">{briefing}</p>
              {patientName && (
                <Button onClick={() => setStep(1)} className="gap-2 w-full" size="lg">
                  <Stethoscope className="h-4 w-4" /> Conhecer o Paciente
                </Button>
              )}
              {!patientName && (
                <Button onClick={onStart} className="gap-2 w-full" size="lg">
                  <Play className="h-4 w-4" /> Iniciar
                </Button>
              )}
            </div>
          )}

          {step === 1 && patientName && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {patientName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{patientName}</h3>
                  {patientAge && <p className="text-sm text-muted-foreground">{patientAge}</p>}
                </div>
              </div>
              {patientHistory && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{patientHistory}</p>
                </div>
              )}
              <Button onClick={onStart} className="gap-2 w-full" size="lg">
                <Play className="h-4 w-4" /> Começar a Atividade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
