import { Area, Bar, Legend, Line, Pie, Radar, Tooltip } from "recharts";

// Tema global dos gráficos (recharts 2): barras e linhas mais finas e
// arredondadas, cursor suave, legenda com marcador redondo. Os padrões só
// valem onde o gráfico não define a própria propriedade, então nenhum gráfico
// existente muda de dados ou de cor. O resto do visual (grade, eixos, dica
// flutuante, gradientes) fica em src/styles/charts.css.

type WithDefaults = { defaultProps?: Record<string, unknown> };
function setDefaults(component: unknown, props: Record<string, unknown>) {
  const c = component as WithDefaults;
  c.defaultProps = { ...(c.defaultProps ?? {}), ...props };
}

let applied = false;
export function applyChartTheme() {
  if (applied) return;
  applied = true;
  setDefaults(Bar, { radius: 6, maxBarSize: 34, animationDuration: 700, animationEasing: "ease-out" });
  setDefaults(Line, { strokeWidth: 2.5, strokeLinecap: "round", animationDuration: 800, animationEasing: "ease-out", activeDot: { r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" } });
  setDefaults(Area, { strokeWidth: 2.5, fillOpacity: 0.18, animationDuration: 800, animationEasing: "ease-out", activeDot: { r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" } });
  setDefaults(Radar, { fillOpacity: 0.22, strokeWidth: 2 });
  setDefaults(Pie, { stroke: "hsl(var(--card))", strokeWidth: 2, animationDuration: 700 });
  setDefaults(Tooltip, { cursor: { fill: "hsl(var(--primary) / 0.08)", stroke: "hsl(var(--primary) / 0.35)", strokeDasharray: "3 3" }, animationDuration: 120, isAnimationActive: false });
  setDefaults(Legend, { iconType: "circle", iconSize: 8 });
}
