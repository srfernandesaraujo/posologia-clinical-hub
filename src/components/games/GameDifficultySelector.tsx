import { GraduationCap, Stethoscope, Award } from "lucide-react";

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
      <div role="radiogroup" aria-label="Dificuldade" className="grid w-full max-w-xl gap-2 sm:grid-cols-3">
        {difficulties.map((d) => {
          const Icon = d.icon;
          const isActive = selected === d.key;
          return (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(d.key)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              <span className="text-sm font-semibold">{d.label}</span>
              <span className="text-[11px] leading-tight opacity-80">{d.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
