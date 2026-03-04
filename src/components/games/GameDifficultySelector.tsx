import { GraduationCap, Stethoscope, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameDifficulty = "academic" | "clinical" | "specialist";

interface GameDifficultySelectorProps {
  selected: GameDifficulty;
  onChange: (d: GameDifficulty) => void;
}

const difficulties = [
  { key: "academic" as const, label: "Acadêmico", icon: GraduationCap, desc: "Conceitos fundamentais" },
  { key: "clinical" as const, label: "Clínico", icon: Stethoscope, desc: "Cenários reais" },
  { key: "specialist" as const, label: "Especialista", icon: Award, desc: "Alta complexidade" },
];

export default function GameDifficultySelector({ selected, onChange }: GameDifficultySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-muted-foreground">Selecione a dificuldade:</p>
      <div className="flex gap-2">
        {difficulties.map((d) => {
          const Icon = d.icon;
          const isActive = selected === d.key;
          return (
            <Button
              key={d.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onChange(d.key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {d.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
