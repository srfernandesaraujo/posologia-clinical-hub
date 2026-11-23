// Degradês compartilhados pelas barras dos gráficos (ver src/styles/charts.css).
// Fica uma vez na raiz do app; as barras apontam para url(#cg-N).
export function ChartDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {[1, 2, 3, 4, 5].map((n) => (
          <linearGradient key={n} id={`cg-${n}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: `hsl(var(--chart-${n}))`, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: `hsl(var(--chart-${n}))`, stopOpacity: 0.55 }} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
