import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Pause, Play, X } from "lucide-react";
import { LANDING_MEDIA, LANDING_MEDIA_PATHS } from "./mediaConfig";
import type { LandingCopy } from "./landingCopy";

interface ShowreelModalProps {
  open: boolean;
  onClose: () => void;
  copy: LandingCopy["showreel"];
}

export function ShowreelModal({ open, onClose, copy }: ShowreelModalProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setChapterIdx(0);
    setProgress(0);
    setIsPlaying(true);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || LANDING_MEDIA.showreel || !isPlaying) return;
    const stepMs = 120;
    const chapterDurationMs = 5400;
    const increment = (stepMs / chapterDurationMs) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          setChapterIdx((idx) => (idx + 1) % copy.chapters.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [open, isPlaying, copy.chapters.length]);

  if (!open) return null;

  const current = copy.chapters[chapterIdx] || copy.chapters[0];

  return (
    <div
      className="lp-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-showreel-title"
      onClick={onClose}
    >
      <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lp-modal-head">
          <div>
            <h3 id="lp-showreel-title">{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lp-modal-close"
            aria-label={copy.close}
          >
            <X size={18} />
          </button>
        </div>

        {LANDING_MEDIA.showreel ? (
          <div className="lp-modal-video-wrap">
            <video
              src={LANDING_MEDIA_PATHS.showreel}
              poster={LANDING_MEDIA.posters.hero}
              controls
              autoPlay
              playsInline
              className="lp-modal-video"
            />
          </div>
        ) : (
          <div className="lp-tour-stage">
            {/* Chapter timeline progress bars */}
            <div className="lp-tour-bars" role="tablist">
              {copy.chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === chapterIdx}
                  onClick={() => {
                    setChapterIdx(idx);
                    setProgress(0);
                  }}
                  className="lp-tour-bar-btn"
                  aria-label={ch.title}
                >
                  <span className="lp-tour-bar-track">
                    <span
                      className="lp-tour-bar-fill"
                      style={{
                        width:
                          idx < chapterIdx
                            ? "100%"
                            : idx === chapterIdx
                              ? `${progress}%`
                              : "0%",
                      }}
                    />
                  </span>
                  <small>{ch.tag}</small>
                </button>
              ))}
            </div>

            {/* Active Chapter Content */}
            <div className="lp-tour-content">
              <div className="lp-tour-meta">
                <span className="lp-stage-pill">{current.tag}</span>
                <span className="lp-mono lp-tour-time">{current.time}</span>
              </div>
              <h4>{current.title}</h4>
              <p>{current.caption}</p>
              <ul className="lp-tour-highlights">
                {current.highlights.map((h) => (
                  <li key={h}>
                    <CheckCircle2 size={15} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-tour-controls">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="lp-mini-btn"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? copy.pause : copy.play}</span>
              </button>

              <Link to="/cadastro" onClick={onClose} className="lp-btn lp-btn-primary lp-btn-sm">
                <span>{copy.cta}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
