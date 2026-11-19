import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  DoorOpen,
  FileCheck2,
  Sliders,
} from "lucide-react";
import type { LandingCopy } from "./landingCopy";

interface StorySectionProps {
  copy: LandingCopy["story"];
}

export function StorySection({ copy }: StorySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeAct, setActiveAct] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 960px) and (min-height: 660px) and (prefers-reduced-motion: no-preference)"
    );

    let raf = 0;
    const updateFromScroll = () => {
      raf = 0;
      if (!mq.matches || manualOverride) return;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      const idx = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
      setActiveAct(idx);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(updateFromScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [manualOverride]);

  const handleSelectAct = (index: number) => {
    setManualOverride(true);
    setActiveAct(index);
    // Allow scroll to re-engage gently after user finishes inspecting
    window.setTimeout(() => setManualOverride(false), 4500);
  };

  const current = copy.acts[activeAct] || copy.acts[0];

  return (
    <section
      id="como-funciona"
      ref={sectionRef}
      className="lp-story-section"
      aria-labelledby="lp-story-title"
    >
      <div className="lp-story-sticky">
        <div className="lp-wrap lp-story-inner">
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-story-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>

          <div className="lp-story-grid">
            {/* Clickable 3-Act Tabs (works on desktop, mobile & reduced motion) */}
            <div className="lp-story-tabs" role="tablist" aria-label={copy.eyebrow}>
              {copy.acts.map((act, idx) => {
                const isActive = idx === activeAct;
                return (
                  <button
                    key={act.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectAct(idx)}
                    className={`lp-story-tab ${isActive ? "is-active" : ""}`}
                  >
                    <div className="lp-story-tab-head">
                      <span className="lp-story-idx">{act.index}</span>
                      <span className="lp-story-tag">{act.tag}</span>
                    </div>
                    <h3>{act.title}</h3>
                    <p>{act.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Live X-Ray Stage for Current Act */}
            <div className="lp-story-stage" role="tabpanel">
              <div className="lp-stage-header">
                <span className="lp-stage-pill">{current.tag}</span>
                <span className="lp-stage-metric">
                  <small>{current.metricLabel}</small>
                  <strong className="lp-tabular">{current.metricValue}</strong>
                </span>
              </div>

              {/* Dynamic Visual Metaphor per Act */}
              <div className="lp-stage-visual">
                {activeAct === 0 && (
                  <div className="lp-xray-card">
                    <div className="lp-xray-row">
                      <div className="lp-xray-icon is-amber">
                        <DoorOpen size={18} />
                      </div>
                      <div>
                        <small>SALA VIRTUAL · PIN ATIVO</small>
                        <strong className="lp-mono">4 8 2 9 1 0</strong>
                      </div>
                      <span className="lp-chip-ok">28 alunos online</span>
                    </div>
                    <div className="lp-xray-kv-grid">
                      <div>
                        <span>Paciente</span>
                        <strong>M, 64a · 78 kg</strong>
                      </div>
                      <div>
                        <span>Creatinina</span>
                        <strong>1,7 mg/dL</strong>
                      </div>
                      <div>
                        <span>Lactato</span>
                        <strong className="is-warn">3,8 mmol/L</strong>
                      </div>
                      <div>
                        <span>Modo</span>
                        <strong>TBL + FHIR R4</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeAct === 1 && (
                  <div className="lp-xray-card">
                    <div className="lp-xray-row">
                      <div className="lp-xray-icon is-teal">
                        <Sliders size={18} />
                      </div>
                      <div>
                        <small>PACIENTE DIGITAL CONTÍNUO</small>
                        <strong>Herança fisiológica em tempo real</strong>
                      </div>
                      <span className="lp-chip-ok">5 módulos</span>
                    </div>
                    <div className="lp-cascade-bars">
                      <div className="lp-cascade-item">
                        <span>SNA · Tônus Simpático</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill is-teal" style={{ width: "78%" }} />
                        </div>
                        <strong className="lp-tabular">FC 112 bpm</strong>
                      </div>
                      <div className="lp-cascade-item">
                        <span>Depuração Renal · TFG herdada</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill is-sky" style={{ width: "44%" }} />
                        </div>
                        <strong className="lp-tabular">46 mL/min</strong>
                      </div>
                      <div className="lp-cascade-item">
                        <span>Ácido-Base · Compensação</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill is-violet" style={{ width: "62%" }} />
                        </div>
                        <strong className="lp-tabular">pH 7,31</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeAct === 2 && (
                  <div className="lp-xray-card">
                    <div className="lp-xray-row">
                      <div className="lp-xray-icon is-sky">
                        <FileCheck2 size={18} />
                      </div>
                      <div>
                        <small>CERTIFICADO OSCE & TRILHA EXPLICÁVEL</small>
                        <strong>Instrumento: Pendleton + Mini-CEX</strong>
                      </div>
                      <span className="lp-chip-ok">Verificado</span>
                    </div>
                    <div className="lp-audit-list">
                      <div className="lp-audit-row">
                        <Activity size={14} />
                        <span>Critério: Ajuste posológico renal (KDIGO)</span>
                        <strong className="is-ok">Atingido · 94%</strong>
                      </div>
                      <div className="lp-audit-row">
                        <Activity size={14} />
                        <span>Código público: OSCE-2026-8F4A</span>
                        <strong className="lp-mono">/verificar-certificado/</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <ul className="lp-stage-bullets">
                {current.bullets.map((b) => (
                  <li key={b}>
                    <CheckCircle2 size={16} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Step progress bar */}
              <div className="lp-story-progress" aria-hidden="true">
                {copy.acts.map((act, idx) => (
                  <span
                    key={act.id}
                    className={idx === activeAct ? "is-active" : idx < activeAct ? "is-done" : ""}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
