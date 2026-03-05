interface ScoreBarSegment {
  min: number;
  max: number;
  color: string;
  label: string;
}

interface ScoreBarProps {
  value: number;
  minValue: number;
  maxValue: number;
  segments: ScoreBarSegment[];
  unit?: string;
}

export function ScoreBar({ value, minValue, maxValue, segments, unit }: ScoreBarProps) {
  const range = maxValue - minValue;
  const pct = Math.max(0, Math.min(((value - minValue) / range) * 100, 100));

  return (
    <div className="w-full space-y-2">
      {/* Segmented bar */}
      <div className="relative h-6 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => {
          const segWidth = ((seg.max - seg.min) / range) * 100;
          return (
            <div
              key={i}
              className="h-full relative"
              style={{ width: `${segWidth}%`, backgroundColor: seg.color }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap overflow-hidden">
                {segWidth > 15 ? seg.label : ""}
              </span>
            </div>
          );
        })}
        {/* Needle marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground shadow-lg z-10"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-foreground rotate-45 rounded-sm" />
        </div>
      </div>

      {/* Labels below */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{minValue}{unit && ` ${unit}`}</span>
        <span className="font-semibold text-foreground">
          {value}{unit && ` ${unit}`}
        </span>
        <span>{maxValue}{unit && ` ${unit}`}</span>
      </div>
    </div>
  );
}
