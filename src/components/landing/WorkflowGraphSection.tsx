import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Reveal } from "./Reveal";
import type { LandingCopy } from "./landingCopy";

interface WorkflowGraphSectionProps {
  copy: LandingCopy["workflow"];
}

const NODE_POSITIONS = [
  { x: 110, y: 120 },
  { x: 345, y: 78 },
  { x: 585, y: 146 },
  { x: 825, y: 102 },
];

export function WorkflowGraphSection({ copy }: WorkflowGraphSectionProps) {
  const [selectedId, setSelectedId] = useState(copy.nodes[0]?.id || "input");
  const activeNode = copy.nodes.find((n) => n.id === selectedId) || copy.nodes[0];

  const curves = [
    "M 110 120 C 200 120, 245 78, 345 78",
    "M 345 78 C 445 78, 485 146, 585 146",
    "M 585 146 C 685 146, 730 102, 825 102",
  ];

  const accentStroke: Record<string, string> = {
    amber: "#fbbf24",
    teal: "#2dd4bf",
    violet: "#a78bfa",
    sky: "#38bdf8",
  };

  return (
    <section id="arquitetura" className="lp-section lp-section-alt" aria-labelledby="lp-workflow-title">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-workflow-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="lp-graph-shell">
            {/* Interactive SVG Bézier Node Graph */}
            <div className="lp-graph-canvas">
              <svg
                viewBox="0 0 940 230"
                className="lp-graph-svg"
                role="img"
                aria-label={copy.title}
              >
                <defs>
                  <linearGradient id="lpGraphBeam" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
                    <stop offset="38%" stopColor="#2dd4bf" stopOpacity="0.85" />
                    <stop offset="70%" stopColor="#a78bfa" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Base and animated dashed Bézier connectors */}
                {curves.map((d, idx) => (
                  <g key={d}>
                    <path
                      d={d}
                      fill="none"
                      stroke="rgba(148, 224, 214, 0.16)"
                      strokeWidth="2.5"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="url(#lpGraphBeam)"
                      strokeWidth="2.5"
                      strokeDasharray="7 9"
                      className="lp-graph-flow"
                      style={{ animationDelay: `${idx * 0.4}s` }}
                    />
                  </g>
                ))}

                {/* Interactive nodes */}
                {copy.nodes.map((node, i) => {
                  const pos = NODE_POSITIONS[i] || { x: 120 + i * 220, y: 115 };
                  const isActive = node.id === activeNode.id;
                  const stroke = accentStroke[node.accent] || "#2dd4bf";
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className={`lp-graph-node ${isActive ? "is-active" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onClick={() => setSelectedId(node.id)}
                      onMouseEnter={() => setSelectedId(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(node.id);
                        }
                      }}
                    >
                      <circle
                        r={isActive ? 34 : 26}
                        fill="rgba(10, 20, 32, 0.94)"
                        stroke={stroke}
                        strokeWidth={isActive ? 2.5 : 1.4}
                      />
                      {isActive && (
                        <circle
                          r="44"
                          fill="none"
                          stroke={stroke}
                          strokeOpacity="0.26"
                          strokeWidth="1.2"
                        />
                      )}
                      <text
                        y="-2"
                        textAnchor="middle"
                        fill={stroke}
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        0{i + 1}
                      </text>
                      <text
                        y="13"
                        textAnchor="middle"
                        fill="#e2f4f2"
                        fontSize="9.5"
                        fontWeight="600"
                      >
                        {node.stage.split("·")[1]?.trim() || node.stage}
                      </text>
                      <text
                        y="56"
                        textAnchor="middle"
                        fill="#f0f9f8"
                        fontSize="12.5"
                        fontWeight="700"
                      >
                        {node.label}
                      </text>
                      <text
                        y="73"
                        textAnchor="middle"
                        fill="#8fa8b5"
                        fontSize="10.5"
                      >
                        {node.sublabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Mobile-friendly pill selector + Live Inspector Panel */}
            <div className="lp-graph-pills" role="tablist">
              {copy.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  role="tab"
                  aria-selected={node.id === activeNode.id}
                  onClick={() => setSelectedId(node.id)}
                  className={`lp-graph-pill ${node.id === activeNode.id ? "is-active" : ""}`}
                >
                  <span>{node.stage}</span>
                  <strong>{node.label}</strong>
                </button>
              ))}
            </div>

            <div className={`lp-graph-inspector lp-accent-${activeNode.accent}`}>
              <div className="lp-inspector-left">
                <span className="lp-inspector-stage">{activeNode.stage}</span>
                <h3>{activeNode.label}</h3>
                <p>{activeNode.detail}</p>
              </div>
              <div className="lp-inspector-right">
                {activeNode.metrics.map((m) => (
                  <div key={m} className="lp-inspector-metric">
                    <CheckCircle2 size={15} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
