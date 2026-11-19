import { useEffect, useRef } from "react";
import { Activity, Beaker, CheckCircle2, Code2, ShieldCheck } from "lucide-react";
import { LANDING_MEDIA, LANDING_MEDIA_PATHS } from "./mediaConfig";
import { Reveal } from "./Reveal";
import type { LandingCopy } from "./landingCopy";

interface ProductShowcaseBentoProps {
  copy: LandingCopy["bento"];
}

function AutoPauseVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      className="lp-bento-video"
    />
  );
}

function BentoMicroPreview({ id }: { id: LandingCopy["bento"]["cards"][number]["id"] }) {
  if (id === "sim-engine") {
    return (
      <div className="lp-micro lp-micro-continuous" aria-hidden="true">
        <div className="lp-micro-node is-active">
          <Activity size={13} />
          <span>SNA · Simpático ↑</span>
        </div>
        <span className="lp-micro-arrow">→</span>
        <div className="lp-micro-node">
          <span>Renal · TFG -24%</span>
        </div>
        <span className="lp-micro-arrow">→</span>
        <div className="lp-micro-node">
          <span>Ácido-Base · pH 7,31</span>
        </div>
      </div>
    );
  }

  if (id === "virtual-room") {
    return (
      <div className="lp-micro lp-micro-room" aria-hidden="true">
        <div className="lp-micro-room-row">
          <span className="lp-mono">PIN 482910</span>
          <span className="lp-micro-badge-ok">
            <ShieldCheck size={12} /> OSCE-8F4A
          </span>
        </div>
        <div className="lp-micro-bars">
          <div>
            <span>Farmácia Clínica</span>
            <i style={{ width: "92%" }} />
          </div>
          <div>
            <span>Fisiologia</span>
            <i style={{ width: "84%" }} />
          </div>
          <div>
            <span>Sinal de Risco</span>
            <b className="lp-micro-alert">2 alunos · Observar</b>
          </div>
        </div>
      </div>
    );
  }

  if (id === "lab-bench") {
    return (
      <div className="lp-micro lp-micro-lab" aria-hidden="true">
        {["M1 · Preparo", "M2 · Ensaio", "M3 · Curva", "M4 · PDF"].map((step, i) => (
          <div key={step} className={`lp-micro-step ${i < 3 ? "is-done" : "is-next"}`}>
            {i < 3 ? <CheckCircle2 size={13} /> : <Beaker size={13} />}
            <span>{step}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="lp-micro lp-micro-fhir" aria-hidden="true">
      <div className="lp-micro-code-head">
        <Code2 size={13} />
        <span>AI Skill: Stewardship + FHIR R4</span>
      </div>
      <div className="lp-micro-code-lines lp-mono">
        <span>"resourceType": "Observation",</span>
        <span>"code": "Vancomycin AUC24/MIC",</span>
        <span className="is-hl">"valueQuantity": 492 // IDSA OK</span>
      </div>
    </div>
  );
}

export function ProductShowcaseBento({ copy }: ProductShowcaseBentoProps) {
  return (
    <section id="fluxos" className="lp-section" aria-labelledby="lp-bento-title">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-bento-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>
        </Reveal>

        <div className="lp-bento-grid">
          {copy.cards.map((card, idx) => {
            const clipEnabled = Boolean(LANDING_MEDIA.bentoClips[card.id]);
            const clipSrc = LANDING_MEDIA_PATHS.bentoClips[card.id];
            return (
              <Reveal key={card.id} delay={idx * 70}>
                <article className={`lp-bento-card lp-accent-${card.accent}`}>
                  <div className="lp-bento-media">
                    {clipEnabled && clipSrc ? (
                      <AutoPauseVideo src={clipSrc} />
                    ) : (
                      <BentoMicroPreview id={card.id} />
                    )}
                  </div>
                  <div className="lp-bento-body">
                    <span className="lp-bento-eyebrow">{card.eyebrow}</span>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                    <div className="lp-bento-metric">{card.metric}</div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
