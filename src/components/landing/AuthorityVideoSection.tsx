import { useState } from "react";
import { Award, BookCheck, Play, ShieldCheck, Smartphone } from "lucide-react";
import { LANDING_MEDIA, LANDING_MEDIA_PATHS } from "./mediaConfig";
import { Reveal } from "./Reveal";
import type { LandingCopy } from "./landingCopy";

interface AuthorityVideoSectionProps {
  copy: LandingCopy["authority"];
}

const PROOF_ICONS = [BookCheck, ShieldCheck, Award, Smartphone];

export function AuthorityVideoSection({ copy }: AuthorityVideoSectionProps) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [playingVideo, setPlayingVideo] = useState(false);

  const currentChapter = copy.chapters[activeChapter] || copy.chapters[0];

  return (
    <section id="rigor" className="lp-section" aria-labelledby="lp-authority-title">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-authority-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>
        </Reveal>

        <div className="lp-authority-grid">
          {/* 4 Credibility Pillars */}
          <div className="lp-proof-list">
            {copy.pillars.map((pillar, idx) => {
              const Icon = PROOF_ICONS[idx % PROOF_ICONS.length];
              return (
                <Reveal key={pillar.title} delay={idx * 65}>
                  <div className="lp-proof-card">
                    <div className="lp-proof-icon">
                      <Icon size={19} />
                    </div>
                    <div>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* 16:9 Founder / Platform Video Player with Bespoke Editorial Poster */}
          <Reveal delay={100}>
            <div className="lp-video-panel">
              <div className="lp-video-frame">
                {LANDING_MEDIA.founderStory && playingVideo ? (
                  <video
                    src={LANDING_MEDIA_PATHS.founderStory}
                    poster={LANDING_MEDIA.posters.authority}
                    controls
                    autoPlay
                    playsInline
                    className="lp-founder-video"
                  />
                ) : (
                  <>
                    <img
                      src={LANDING_MEDIA.posters.authority}
                      alt={copy.videoTitle}
                      className="lp-video-poster"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="lp-video-scrim" />
                    <div className="lp-video-overlay">
                      <div className="lp-video-top-row">
                        <span className="lp-video-badge">{copy.videoBadge}</span>
                        <span className="lp-mono lp-video-dur">{copy.videoDuration}</span>
                      </div>

                      {LANDING_MEDIA.founderStory ? (
                        <button
                          type="button"
                          onClick={() => setPlayingVideo(true)}
                          className="lp-video-play-btn"
                          aria-label={copy.videoTitle}
                        >
                          <Play size={24} fill="currentColor" />
                        </button>
                      ) : (
                        <div className="lp-chapter-preview">
                          <span className="lp-mono">{currentChapter.time}</span>
                          <h4>{currentChapter.title}</h4>
                          <p>{currentChapter.summary}</p>
                        </div>
                      )}

                      <div className="lp-video-bottom-title">{copy.videoTitle}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Clickable Chapter Storyboard Bar */}
              <div className="lp-chapters-box">
                <span className="lp-chapters-label">{copy.chaptersLabel}</span>
                <div className="lp-chapters-grid" role="tablist">
                  {copy.chapters.map((ch, idx) => (
                    <button
                      key={ch.time}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeChapter}
                      onClick={() => setActiveChapter(idx)}
                      className={`lp-chapter-btn ${idx === activeChapter ? "is-active" : ""}`}
                    >
                      <span className="lp-mono">{ch.time}</span>
                      <strong>{ch.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
