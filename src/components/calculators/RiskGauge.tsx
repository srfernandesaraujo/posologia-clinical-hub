import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface RiskGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit?: string;
  segments?: { min: number; max: number; color: string; label: string }[];
}

const DEFAULT_SEGMENTS = [
  { min: 0, max: 25, color: "hsl(142 71% 45%)", label: "Baixo" },
  { min: 25, max: 50, color: "hsl(60 70% 45%)", label: "Moderado" },
  { min: 50, max: 75, color: "hsl(38 92% 50%)", label: "Alto" },
  { min: 75, max: 100, color: "hsl(0 72% 51%)", label: "Muito Alto" },
];

export function RiskGauge({ value, maxValue, label, unit = "%", segments = DEFAULT_SEGMENTS }: RiskGaugeProps) {
  const pct = Math.min((value / maxValue) * 100, 100);

  // Create gauge data: colored arc + grey remaining
  const gaugeData = segments.map((seg) => ({
    value: seg.max - seg.min,
    color: seg.color,
  }));

  // Needle position (angle in the semicircle)
  const needleAngle = 180 - (pct / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const cx = 150;
  const cy = 130;
  const r = 90;
  const nx = cx + r * Math.cos(needleRad);
  const ny = cy - r * Math.sin(needleRad);

  // Find current segment color
  const currentColor = segments.find((s) => pct >= s.min && pct <= s.max)?.color || segments[segments.length - 1].color;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={85}
            dataKey="value"
            stroke="none"
          >
            {gaugeData.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.85} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="-mt-16 text-center">
        <p className="text-3xl font-bold" style={{ color: currentColor }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
          <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        <p className="text-sm font-medium mt-0.5" style={{ color: currentColor }}>{label}</p>
      </div>
    </div>
  );
}
