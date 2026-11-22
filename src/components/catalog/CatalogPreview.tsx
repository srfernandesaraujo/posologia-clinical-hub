import { memo } from "react";
import type { AreaTone, PreviewKind } from "@/data/catalogAreas";

export const TONE_COLOR: Record<AreaTone, string> = {
  primary: "hsl(var(--primary))",
  highlight: "hsl(var(--highlight))",
  warn: "hsl(var(--status-warn))",
  accent: "hsl(var(--accent))",
  ok: "hsl(var(--status-ok))",
  muted: "hsl(var(--muted-foreground))",
};

/** Pseudoaleatório determinístico a partir do id, para cada cartão ter um desenho próprio e estável. */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const W = 240;
const H = 72;

function Curve({ rnd, color }: { rnd: () => number; color: string }) {
  const k = 0.6 + rnd() * 1.4;
  const peakX = 40 + rnd() * 50;
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 6) {
    const t = x / peakX;
    const y = x < peakX ? t * t * (3 - 2 * t) : Math.exp(-((x - peakX) / (60 * k)));
    pts.push(`${x},${(H - 10 - y * (H - 22)).toFixed(1)}`);
  }
  const line = `M${pts.join(" L")}`;
  return (
    <>
      <rect x="0" y={18 + rnd() * 8} width={W} height="16" fill={color} opacity="0.08" />
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
    </>
  );
}

function Bars({ rnd, color }: { rnd: () => number; color: string }) {
  const n = 7;
  const bw = W / n - 10;
  return (
    <>
      <line x1="0" x2={W} y1={H * 0.38} y2={H * 0.38} stroke={color} strokeDasharray="3 4" opacity="0.4" />
      {Array.from({ length: n }, (_, i) => {
        const h = 12 + rnd() * (H - 22);
        const out = h > H * 0.62;
        return (
          <rect
            key={i}
            x={i * (bw + 10) + 5}
            y={H - 6 - h}
            width={bw}
            height={h}
            rx="2"
            fill={out ? "hsl(var(--status-crit))" : color}
            opacity={out ? 0.75 : 0.55}
          />
        );
      })}
    </>
  );
}

function Cycle({ rnd, color }: { rnd: () => number; color: string }) {
  const nodes = 5 + Math.floor(rnd() * 3);
  const cx = W / 2;
  const cy = H / 2;
  const r = 24;
  const pts = Array.from({ length: nodes }, (_, i) => {
    const a = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r * 2.1, cy + Math.sin(a) * r];
  });
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={r * 2.1} ry={r} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 5 : 3.5} fill={i === 0 ? color : "hsl(var(--card))"} stroke={color} strokeWidth="1.5" />
      ))}
    </>
  );
}

function Molecule({ rnd, color }: { rnd: () => number; color: string }) {
  const cx = W / 2 - 20 + rnd() * 40;
  const cy = H / 2;
  const hex = (ox: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return `${(ox + Math.cos(a) * 16).toFixed(1)},${(cy + Math.sin(a) * 16).toFixed(1)}`;
    }).join(" ");
  return (
    <>
      <polygon points={hex(cx - 14)} fill="none" stroke={color} strokeWidth="1.8" />
      <polygon points={hex(cx + 14)} fill="none" stroke={color} strokeWidth="1.8" opacity="0.7" />
      <line x1={cx + 30} y1={cy} x2={cx + 58} y2={cy - 14} stroke={color} strokeWidth="1.8" />
      <circle cx={cx + 62} cy={cy - 16} r="4" fill={color} />
      <line x1={cx - 30} y1={cy} x2={cx - 56} y2={cy + 12} stroke={color} strokeWidth="1.8" opacity="0.7" />
      <circle cx={cx - 60} cy={cy + 14} r="3.5" fill="hsl(var(--accent))" />
    </>
  );
}

function Helix({ rnd, color }: { rnd: () => number; color: string }) {
  const phase = rnd() * Math.PI;
  const a: string[] = [];
  const b: string[] = [];
  const rungs: JSX.Element[] = [];
  for (let x = 0; x <= W; x += 4) {
    const s = Math.sin(x / 18 + phase);
    a.push(`${x},${(H / 2 + s * 20).toFixed(1)}`);
    b.push(`${x},${(H / 2 - s * 20).toFixed(1)}`);
    if (x % 16 === 0) {
      rungs.push(<line key={x} x1={x} x2={x} y1={H / 2 + s * 20} y2={H / 2 - s * 20} stroke={color} opacity="0.35" />);
    }
  }
  return (
    <>
      {rungs}
      <path d={`M${a.join(" L")}`} fill="none" stroke={color} strokeWidth="2" />
      <path d={`M${b.join(" L")}`} fill="none" stroke="hsl(var(--accent))" strokeWidth="2" opacity="0.8" />
    </>
  );
}

function Ecg({ rnd, color }: { rnd: () => number; color: string }) {
  const period = 70 + rnd() * 30;
  const base = H * 0.62;
  let d = `M0,${base}`;
  for (let x0 = 0; x0 < W; x0 += period) {
    d += ` L${x0 + period * 0.35},${base} L${x0 + period * 0.42},${base - 6} L${x0 + period * 0.48},${base}`;
    d += ` L${x0 + period * 0.55},${base + 6} L${x0 + period * 0.6},${base - 38} L${x0 + period * 0.66},${base + 10}`;
    d += ` L${x0 + period * 0.72},${base} L${x0 + period * 0.86},${base - 8} L${x0 + period},${base}`;
  }
  return <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />;
}

function Record({ rnd, color }: { rnd: () => number; color: string }) {
  const rows = 4;
  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const y = 12 + i * 15;
        const w = 70 + rnd() * 110;
        return (
          <g key={i}>
            <circle cx="14" cy={y} r="3.5" fill={i === 1 ? "hsl(var(--status-warn))" : color} opacity={i === 1 ? 0.9 : 0.6} />
            <rect x="26" y={y - 3} width={w} height="6" rx="3" fill={color} opacity="0.3" />
            <rect x={36 + w} y={y - 3} width={24 + rnd() * 20} height="6" rx="3" fill={color} opacity="0.12" />
          </g>
        );
      })}
    </>
  );
}

function Gauge({ rnd, color }: { rnd: () => number; color: string }) {
  const v = 0.15 + rnd() * 0.7;
  const cx = W / 2;
  const cy = H - 8;
  const r = 50;
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    return `M${cx + Math.cos(a0) * r},${cy - Math.sin(a0) * r} A${r},${r} 0 0 1 ${cx + Math.cos(a1) * r},${cy - Math.sin(a1) * r}`;
  };
  const a = Math.PI * (1 - v);
  return (
    <>
      <path d={arc(0, 0.33)} fill="none" stroke="hsl(var(--status-ok))" strokeWidth="6" opacity="0.55" />
      <path d={arc(0.34, 0.66)} fill="none" stroke="hsl(var(--status-warn))" strokeWidth="6" opacity="0.55" />
      <path d={arc(0.67, 1)} fill="none" stroke="hsl(var(--status-crit))" strokeWidth="6" opacity="0.55" />
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * (r - 10)} y2={cy - Math.sin(a) * (r - 10)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill={color} />
    </>
  );
}

const RENDERERS: Record<PreviewKind, (p: { rnd: () => number; color: string }) => JSX.Element> = {
  curve: Curve,
  bars: Bars,
  cycle: Cycle,
  molecule: Molecule,
  helix: Helix,
  ecg: Ecg,
  record: Record,
  gauge: Gauge,
};

// Linhas e barras podem esticar; círculos e anéis precisam manter a proporção.
const STRETCHABLE = new Set<PreviewKind>(["curve", "bars", "ecg", "helix", "record"]);

export const CatalogPreview = memo(function CatalogPreview({ id, kind, tone }: { id: string; kind: PreviewKind; tone: AreaTone }) {
  const Renderer = RENDERERS[kind];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={STRETCHABLE.has(kind) ? "none" : "xMidYMid meet"}
      className="h-full w-full [&_*]:[vector-effect:non-scaling-stroke]"
      aria-hidden
    >
      <Renderer rnd={seeded(id)} color={TONE_COLOR[tone]} />
    </svg>
  );
});
