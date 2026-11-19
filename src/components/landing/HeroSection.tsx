import { type FormEvent, type MouseEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  DoorOpen,
  FlaskConical,
  Play,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { ClinicalLatticeCanvas } from "./ClinicalLatticeCanvas";
import { LANDING_MEDIA, LANDING_MEDIA_PATHS } from "./mediaConfig";
import type { LandingCopy } from "./landingCopy";

interface HeroSectionProps {
  copy: LandingCopy["hero"];
  onOpenDemo: () => void;
}

export function HeroSection({ copy, onOpenDemo }: HeroSectionProps) {
  const navigate = useNavigate();
  const [roomPin, setRoomPin] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    if (roomPin.length === 6) {
      navigate(`/sala?pin=${roomPin}`);
    }
  };

  const handleCardMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <section className="lp-hero" aria-labelledby="lp-hero-heading">
      {/* Bespoke poster with gentle Ken Burns drift + seamless video crossfade */}
      <div className="lp-hero-backdrop" aria-hidden="true">
        <img
          src={LANDING_MEDIA.posters.hero}
          alt=""
          className="lp-hero-poster"
          loading="eager"
          decoding="async"
        />
        {LANDING_MEDIA.heroAmbient && !prefersReducedMotion && (
          <video
            className={`lp-hero-video ${videoReady ? "is-ready" : ""}`}
            src={LANDING_MEDIA_PATHS.heroAmbient}
            poster={LANDING_MEDIA.posters.hero}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
          />
        )}
        <div className="lp-hero-scrim" />
        <ClinicalLatticeCanvas />
      </div>

      <div className="lp-wrap lp-hero-inner">
        <div className="lp-hero-grid">
          {/* Primary typography + CTAs + PIN Entry */}
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span className="lp-live-dot" />
              <span>{copy.eyebrow}</span>
            </div>

            <h1 id="lp-hero-heading" className="lp-hero-title">
              {copy.headlineLine1}{" "}
              <span className="lp-text-accent">{copy.headlineAccent}</span>
              {copy.headlineLine2 ? ` ${copy.headlineLine2}` : ""}
            </h1>

            <p className="lp-hero-subtitle">{copy.subtitle}</p>

            {/* Primary CTAs */}
            <div className="lp-hero-actions">
              <Link to="/cadastro" className="lp-btn lp-btn-primary">
                <span>{copy.ctaPrimary}</span>
                <ArrowRight size={17} />
              </Link>
              <button
                type="button"
                onClick={onOpenDemo}
                className="lp-btn lp-btn-glass"
              >
                <span className="lp-play-pill">
                  <Play size={13} fill="currentColor" />
                </span>
                <span>{copy.ctaDemo}</span>
              </button>
              <Link to="/vitrine" className="lp-btn lp-btn-ghost">
                <span>{copy.ctaCatalog}</span>
              </Link>
            </div>

            {/* Classroom Virtual Room PIN Quick-Entry */}
            <form
              id="sala-virtual"
              className="lp-pin-card lp-spotlight-card"
              onSubmit={handleJoinRoom}
              onMouseMove={handleCardMove}
            >
              <div className="lp-pin-head">
                <div className="lp-pin-icon">
                  <DoorOpen size={18} />
                </div>
                <div className="lp-pin-meta">
                  <strong>{copy.pinTitle}</strong>
                  <span>{copy.pinSubtitle}</span>
                </div>
                <span className="lp-pin-badge">{copy.pinBadge}</span>
              </div>

              <div className="lp-pin-row">
                <label className="sr-only" htmlFor="lp-room-pin">
                  {copy.pinAria}
                </label>
                <input
                  id="lp-room-pin"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={roomPin}
                  onChange={(e) =>
                    setRoomPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={copy.pinPlaceholder}
                  className="lp-pin-input"
                />
                <button
                  type="submit"
                  disabled={roomPin.length !== 6}
                  className="lp-pin-submit"
                >
                  <span>{copy.pinSubmit}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* Right column: clinical telemetry card framing the glass helix */}
          <div className="lp-hero-aside">
            <div className="lp-telemetry-card">
              <div className="lp-telemetry-top">
                <span className="lp-telemetry-tag">
                  <Activity size={13} />
                  {copy.telemetryTag}
                </span>
                <span className="lp-telemetry-live">IDSA 2020</span>
              </div>

              <div className="lp-telemetry-curve" aria-hidden="true">
                <svg viewBox="0 0 360 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lpHeroPkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Therapeutic target band */}
                  <rect
                    x="0"
                    y="28"
                    width="360"
                    height="36"
                    fill="rgba(45, 212, 191, 0.08)"
                  />
                  <line
                    x1="0"
                    y1="28"
                    x2="360"
                    y2="28"
                    stroke="rgba(45, 212, 191, 0.35)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="64"
                    x2="360"
                    y2="64"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <path
                    d="M 0 105 C 24 102, 34 32, 64 34 C 102 36, 134 62, 178 72 C 194 75, 206 30, 238 33 C 276 37, 314 60, 360 70 L 360 120 L 0 120 Z"
                    fill="url(#lpHeroPkFill)"
                  />
                  <path
                    d="M 0 105 C 24 102, 34 32, 64 34 C 102 36, 134 62, 178 72 C 194 75, 206 30, 238 33 C 276 37, 314 60, 360 70"
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <circle cx="64" cy="34" r="4" fill="#2dd4bf" />
                  <circle cx="238" cy="33" r="4" fill="#38bdf8" />
                </svg>
                <div className="lp-telemetry-badges">
                  <span>AUC₂₄/MIC: 486 mg·h/L</span>
                  <span className="is-ok">Alvo 400–600</span>
                </div>
              </div>

              <div className="lp-telemetry-foot">
                <p className="lp-telemetry-title">{copy.telemetryTitle}</p>
                <div className="lp-telemetry-chips">
                  <span>
                    <WifiOff size={12} /> PWA Offline
                  </span>
                  <span>
                    <ShieldCheck size={12} /> OSCE Verificável
                  </span>
                  <span>
                    <Sparkles size={12} /> IA Preceptora
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Capability Strip */}
        <div className="lp-trust-strip" role="list">
          {copy.trustMetrics.map((m) => (
            <div className="lp-trust-item" role="listitem" key={m.label}>
              <strong className="lp-tabular">{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Spotlight Quick-Action Audience Entry Cards */}
        <div className="lp-quick-grid">
          {copy.quickCards.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className={`lp-quick-card lp-spotlight-card lp-accent-${card.accent}`}
              onMouseMove={handleCardMove}
            >
              <div className="lp-quick-top">
                <span className="lp-quick-badge">{card.badge}</span>
                <FlaskConical size={16} className="lp-quick-icon" />
              </div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <span className="lp-quick-link">
                {card.cta} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
