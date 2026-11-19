import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Beaker,
  Box,
  Calculator,
  DoorOpen,
  FlaskConical,
  Gamepad2,
} from "lucide-react";
import { Reveal } from "./Reveal";
import type { LandingCopy } from "./landingCopy";

interface DomainPillarsSectionProps {
  copy: LandingCopy["pillars"];
}

const PILLAR_ICONS: Record<string, typeof FlaskConical> = {
  simulators: FlaskConical,
  calculators: Calculator,
  labs: Beaker,
  rooms: DoorOpen,
  "ai-3d": Box,
  gamification: Gamepad2,
};

/**
 * Real 1-compartment Vancomycin steady-state PK approximation (IDSA 2020 educational model)
 * Matching the domain model used in VancomicinaAUC.tsx:
 * CL_vanco (L/h) = 0.0417 * ClCr + 0.35 (Matzke/Sawchuk-Zaske clinical scaling)
 * Vd (L) = 0.7 * weightKg
 */
function computeVancomycinPK(doseMg: number, intervalH: number, clcr: number, weightKg: number) {
  const clLh = Math.max(0.9, 0.0417 * clcr + 0.35);
  const vdL = Math.max(30, 0.7 * weightKg);
  const ke = clLh / vdL; // h^-1
  const halfLifeH = Math.LN2 / ke;
  const dailyDoseMg = doseMg * (24 / intervalH);
  const auc24 = dailyDoseMg / clLh; // mg·h/L (assuming MIC = 1 mg/L -> AUC/MIC = auc24)
  const tInf = 1.5; // 1.5h infusion
  const denom = Math.max(0.05, 1 - Math.exp(-ke * intervalH));
  const cmax = ((doseMg / tInf) / (clLh)) * ((1 - Math.exp(-ke * tInf)) / denom);
  const cmin = cmax * Math.exp(-ke * (intervalH - tInf));

  // Generate 36h steady-state plasma concentration curve points
  const points: { t: number; cp: number }[] = [];
  for (let t = 0; t <= 36; t += 0.5) {
    const cycleT = t % intervalH;
    let cp: number;
    if (cycleT <= tInf) {
      const startCp = cmin;
      const frac = cycleT / tInf;
      cp = startCp + (cmax - startCp) * Math.pow(frac, 0.85);
    } else {
      cp = cmax * Math.exp(-ke * (cycleT - tInf));
    }
    points.push({ t, cp });
  }

  return {
    clLh,
    vdL,
    halfLifeH,
    auc24,
    cmax,
    cmin,
    points,
    zone: auc24 < 400 ? ("sub" as const) : auc24 <= 600 ? ("target" as const) : ("toxic" as const),
  };
}

export function DomainPillarsSection({ copy }: DomainPillarsSectionProps) {
  const defaultPreset = copy.spotlight.presets[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [doseMg, setDoseMg] = useState(defaultPreset.doseMg);
  const [intervalH, setIntervalH] = useState(defaultPreset.intervalH);
  const [clcr, setClcr] = useState(defaultPreset.clcr);
  const [weightKg, setWeightKg] = useState(defaultPreset.weightKg);

  const applyPreset = (p: typeof defaultPreset) => {
    setSelectedPresetId(p.id);
    setDoseMg(p.doseMg);
    setIntervalH(p.intervalH);
    setClcr(p.clcr);
    setWeightKg(p.weightKg);
  };

  const pk = useMemo(
    () => computeVancomycinPK(doseMg, intervalH, clcr, weightKg),
    [doseMg, intervalH, clcr, weightKg]
  );

  // Build SVG path (viewBox 0 0 420 170; y maps Cp 0..55 mg/L)
  const { linePath, areaPath, strokeColor } = useMemo(() => {
    const maxCp = 55;
    const toX = (t: number) => (t / 36) * 420;
    const toY = (cp: number) => 158 - Math.min(1, cp / maxCp) * 142;

    const d = pk.points
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${toX(pt.t).toFixed(1)} ${toY(pt.cp).toFixed(1)}`)
      .join(" ");

    const color =
      pk.zone === "target" ? "#2dd4bf" : pk.zone === "sub" ? "#fbbf24" : "#f87171";

    return {
      linePath: d,
      areaPath: `${d} L 420 165 L 0 165 Z`,
      strokeColor: color,
    };
  }, [pk]);

  const statusInfo = copy.spotlight.status[pk.zone];

  return (
    <section id="ecossistema" className="lp-section" aria-labelledby="lp-pillars-title">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-pillars-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>
        </Reveal>

        {/* 6 Semantic Domain Pillars */}
        <div className="lp-pillars-grid">
          {copy.items.map((item, idx) => {
            const Icon = PILLAR_ICONS[item.id] || FlaskConical;
            return (
              <Reveal key={item.id} delay={idx * 60}>
                <Link to={item.to} className={`lp-pillar-card lp-accent-${item.accent}`}>
                  <div className="lp-pillar-top">
                    <div className="lp-pillar-icon">
                      <Icon size={20} />
                    </div>
                    <div className="lp-pillar-stat">
                      <strong className="lp-tabular">{item.count}</strong>
                      <span>{item.badge}</span>
                    </div>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <div className="lp-pillar-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        {/* Signature Feature Spotlight: Live Real-Equation Vancomycin TDM Engine */}
        <Reveal delay={120}>
          <div className="lp-spotlight-workbench">
            <div className="lp-workbench-info">
              <span className="lp-section-eyebrow">{copy.spotlight.eyebrow}</span>
              <h3>{copy.spotlight.title}</h3>
              <p>{copy.spotlight.subtitle}</p>

              {/* Clinical Presets */}
              <div className="lp-preset-group">
                <span className="lp-control-label">{copy.spotlight.presetsLabel}</span>
                <div className="lp-preset-pills">
                  {copy.spotlight.presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`lp-preset-btn ${selectedPresetId === p.id ? "is-active" : ""}`}
                    >
                      <strong>{p.label}</strong>
                      <small>{p.summary}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Sliders */}
              <div className="lp-sliders">
                <div className="lp-slider-field">
                  <div className="lp-slider-head">
                    <label htmlFor="lp-vanco-dose">{copy.spotlight.doseLabel}</label>
                    <strong className="lp-tabular">{doseMg} mg</strong>
                  </div>
                  <input
                    id="lp-vanco-dose"
                    type="range"
                    min={500}
                    max={2000}
                    step={250}
                    value={doseMg}
                    onChange={(e) => {
                      setSelectedPresetId("custom");
                      setDoseMg(Number(e.target.value));
                    }}
                  />
                </div>

                <div className="lp-slider-field">
                  <div className="lp-slider-head">
                    <label htmlFor="lp-vanco-tau">{copy.spotlight.intervalLabel}</label>
                    <strong className="lp-tabular">q{intervalH}h</strong>
                  </div>
                  <input
                    id="lp-vanco-tau"
                    type="range"
                    min={8}
                    max={24}
                    step={4}
                    value={intervalH}
                    onChange={(e) => {
                      setSelectedPresetId("custom");
                      setIntervalH(Number(e.target.value));
                    }}
                  />
                </div>

                <div className="lp-slider-field">
                  <div className="lp-slider-head">
                    <label htmlFor="lp-vanco-clcr">{copy.spotlight.clcrLabel}</label>
                    <strong className="lp-tabular">{clcr} mL/min</strong>
                  </div>
                  <input
                    id="lp-vanco-clcr"
                    type="range"
                    min={20}
                    max={150}
                    step={5}
                    value={clcr}
                    onChange={(e) => {
                      setSelectedPresetId("custom");
                      setClcr(Number(e.target.value));
                    }}
                  />
                </div>
              </div>

              <Link to="/cadastro" className="lp-workbench-cta">
                <span>{copy.spotlight.ctaText}</span>
                <ArrowRight size={15} />
              </Link>
              <p className="lp-workbench-disclaimer">{copy.spotlight.disclaimer}</p>
            </div>

            {/* Live Chart & Readout Panel */}
            <div className="lp-workbench-monitor">
              <div className="lp-monitor-top">
                <span className="lp-monitor-title">
                  <Activity size={15} /> Cp(t) · 36h Steady-State
                </span>
                <span className={`lp-status-pill is-${pk.zone}`}>{statusInfo.label}</span>
              </div>

              <div className="lp-monitor-chart">
                <svg viewBox="0 0 420 170" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="lpVancoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {/* Reference therapeutic band (~10–25 mg/L visual reference) */}
                  <rect
                    x="0"
                    y="93"
                    width="420"
                    height="39"
                    fill="rgba(45, 212, 191, 0.08)"
                  />
                  <line
                    x1="0"
                    y1="93"
                    x2="420"
                    y2="93"
                    stroke="rgba(45, 212, 191, 0.25)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="0"
                    y1="132"
                    x2="420"
                    y2="132"
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeDasharray="4 4"
                  />
                  <path d={areaPath} fill="url(#lpVancoFill)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="lp-monitor-axis">
                  <span>0h</span>
                  <span>12h</span>
                  <span>24h</span>
                  <span>36h</span>
                </div>
              </div>

              <div className="lp-monitor-metrics">
                <div className="lp-metric-box">
                  <span>AUC₂₄ / MIC</span>
                  <strong className={`lp-tabular is-${pk.zone}`}>
                    {Math.round(pk.auc24)} <small>mg·h/L</small>
                  </strong>
                </div>
                <div className="lp-metric-box">
                  <span>Cmax (Pico)</span>
                  <strong className="lp-tabular">
                    {pk.cmax.toFixed(1)} <small>mg/L</small>
                  </strong>
                </div>
                <div className="lp-metric-box">
                  <span>Cmin (Vale)</span>
                  <strong className="lp-tabular">
                    {pk.cmin.toFixed(1)} <small>mg/L</small>
                  </strong>
                </div>
                <div className="lp-metric-box">
                  <span>t½ eliminação</span>
                  <strong className="lp-tabular">
                    {pk.halfLifeH.toFixed(1)} <small>h</small>
                  </strong>
                </div>
              </div>

              <div className={`lp-monitor-feedback is-${pk.zone}`}>
                <strong>{copy.spotlight.targetLegend}</strong>
                <p>{statusInfo.action}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
