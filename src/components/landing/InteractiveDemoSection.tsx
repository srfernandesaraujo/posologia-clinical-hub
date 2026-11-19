import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Users,
  Volume2,
} from "lucide-react";
import { LANDING_MEDIA, LANDING_MEDIA_PATHS } from "./mediaConfig";
import { Reveal } from "./Reveal";
import type { LandingCopy } from "./landingCopy";

interface InteractiveDemoSectionProps {
  copy: LandingCopy["playground"];
}

const FHIR_SAMPLE_JSON = `{
  "resourceType": "MedicationRequest",
  "id": "rx-asma-step2-01",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [{
      "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
      "code": "896188",
      "display": "Budesonide / Formoterol 200/6 mcg"
    }]
  },
  "subject": { "reference": "Patient/posologia-demo-402" },
  "dosageInstruction": [{
    "text": "1 inalação a cada 12h + resgate conforme GINA Step 2"
  }]
}`;

export function InteractiveDemoSection({ copy }: InteractiveDemoSectionProps) {
  const [activeTab, setActiveTab] = useState<"pk" | "team" | "voice">("pk");

  // --- Tab 1: PK Calculator state ---
  const [presetIdx, setPresetIdx] = useState(0);
  const selectedPatient = copy.pk.presets[presetIdx] || copy.pk.presets[0];

  const pkCalc = useMemo(() => {
    const { age, weight, scr, sex, dose, tau } = selectedPatient;
    const cgBase = ((140 - age) * weight) / (72 * scr);
    const clcr = sex === "f" ? cgBase * 0.85 : cgBase;
    const clVanco = Math.max(0.9, 0.0417 * clcr + 0.35);
    const vd = 0.7 * weight;
    const ke = clVanco / vd;
    const halfLife = Math.LN2 / ke;
    const auc24 = (dose * (24 / tau)) / clVanco;
    const zone = auc24 < 400 ? "sub" : auc24 <= 600 ? "target" : "toxic";
    const gaugePct = Math.min(100, Math.max(6, (auc24 / 800) * 100));
    const conduct =
      zone === "target"
        ? "Dentro do alvo IDSA 2020 (400–600 mg·h/L). Manter esquema e monitorar função renal."
        : zone === "sub"
          ? "Abaixo do alvo (<400 mg·h/L). Risco de falha clínica — elevar dose ou encurtar intervalo."
          : "Acima do alvo (>600 mg·h/L). Alto risco nefrotóxico — reduzir dose ou estender intervalo para q18h–q24h.";
    return { clcr, halfLife, auc24, zone, gaugePct, conduct };
  }, [selectedPatient]);

  // --- Tab 2: Live Team Case playback ---
  const [teamStep, setTeamStep] = useState(1);
  const [teamPlaying, setTeamPlaying] = useState(false);

  useEffect(() => {
    if (activeTab !== "team" || !teamPlaying) return;
    if (teamStep >= copy.team.events.length) {
      setTeamPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setTeamStep((s) => Math.min(copy.team.events.length, s + 1));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [activeTab, teamPlaying, teamStep, copy.team.events.length]);

  const handleOpenTab = (tabId: "pk" | "team" | "voice") => {
    setActiveTab(tabId);
    if (tabId === "team" && teamStep === 1) {
      setTeamPlaying(true);
    }
  };

  // --- Tab 3: Voice AI Patient + FHIR R4 ---
  const [voiceView, setVoiceView] = useState<"transcript" | "fhir">("transcript");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0..100
  const [audioDuration, setAudioDuration] = useState(18); // seconds fallback
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (LANDING_MEDIA.voicePatientDemo || !audioPlaying) return;
    const interval = window.setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          setAudioPlaying(false);
          return 0;
        }
        return prev + 2.5;
      });
    }, 450);
    return () => window.clearInterval(interval);
  }, [audioPlaying]);

  const toggleVoiceAudio = () => {
    if (LANDING_MEDIA.voicePatientDemo && audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      } else {
        audioRef.current.play().catch(() => setAudioPlaying(false));
        setAudioPlaying(true);
      }
      return;
    }
    setAudioPlaying((p) => !p);
  };

  const handleSeekAudio = (pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    setAudioProgress(clamped);
    if (LANDING_MEDIA.voicePatientDemo && audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (clamped / 100) * audioRef.current.duration;
    }
  };

  const elapsedSec = Math.round((audioProgress / 100) * audioDuration);
  const fmtTime = (s: number) => `0:${String(s).padStart(2, "0")}`;

  const waveformBars = [28, 52, 74, 42, 88, 64, 38, 82, 95, 58, 46, 78, 62, 35, 70, 86, 50, 40, 68, 54, 76, 44, 60, 32];

  return (
    <section id="playground" className="lp-section lp-section-alt" aria-labelledby="lp-playground-title">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-section-header">
            <span className="lp-section-eyebrow">{copy.eyebrow}</span>
            <h2 id="lp-playground-title" className="lp-section-title">
              {copy.title}
            </h2>
            <p className="lp-section-subtitle">{copy.subtitle}</p>
          </div>
        </Reveal>

        {/* Tab switcher */}
        <div className="lp-demo-tabs" role="tablist" aria-label={copy.eyebrow}>
          {copy.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleOpenTab(tab.id)}
              className={`lp-demo-tab ${activeTab === tab.id ? "is-active" : ""}`}
            >
              <span>{tab.label}</span>
              <small>{tab.badge}</small>
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="lp-demo-shell" role="tabpanel">
          {activeTab === "pk" && (
            <div className="lp-demo-pk">
              <div className="lp-demo-col">
                <h3>{copy.pk.title}</h3>
                <p className="lp-demo-desc">{copy.pk.desc}</p>
                <div className="lp-pk-list">
                  {copy.pk.presets.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresetIdx(idx)}
                      className={`lp-pk-item ${presetIdx === idx ? "is-active" : ""}`}
                    >
                      <strong>{p.name}</strong>
                      <span>{p.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lp-demo-col lp-demo-readout">
                <div className="lp-gauge-wrap">
                  <div className="lp-gauge-head">
                    <span>{copy.pk.labels.aucMic}</span>
                    <strong className={`lp-tabular is-${pkCalc.zone}`}>
                      {Math.round(pkCalc.auc24)} mg·h/L
                    </strong>
                  </div>
                  <div className="lp-gauge-bar">
                    <div className="lp-gauge-target-zone" title="Alvo 400–600" />
                    <div
                      className={`lp-gauge-marker is-${pkCalc.zone}`}
                      style={{ left: `${pkCalc.gaugePct}%` }}
                    />
                  </div>
                  <div className="lp-gauge-ticks">
                    <span>0</span>
                    <span>400 (Alvo)</span>
                    <span>600</span>
                    <span>800+</span>
                  </div>
                </div>

                <div className="lp-kv-table">
                  <div>
                    <span>{copy.pk.labels.clcr}</span>
                    <strong className="lp-tabular">{pkCalc.clcr.toFixed(1)} mL/min</strong>
                  </div>
                  <div>
                    <span>{copy.pk.labels.halfLife}</span>
                    <strong className="lp-tabular">{pkCalc.halfLife.toFixed(1)} h</strong>
                  </div>
                  <div>
                    <span>{copy.pk.labels.status}</span>
                    <strong className={`is-${pkCalc.zone}`}>
                      {pkCalc.zone === "target"
                        ? "Alvo IDSA 2020"
                        : pkCalc.zone === "sub"
                          ? "Subterapêutico"
                          : "Supraterapêutico"}
                    </strong>
                  </div>
                </div>

                <div className={`lp-conduct-box is-${pkCalc.zone}`}>
                  <small>{copy.pk.labels.conduct}</small>
                  <p>{pkCalc.conduct}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="lp-demo-team">
              <div className="lp-team-bar">
                <div className="lp-team-title">
                  <Users size={16} />
                  <strong>{copy.team.caseTitle}</strong>
                </div>
                <div className="lp-team-controls">
                  <button
                    type="button"
                    className="lp-mini-btn"
                    onClick={() => setTeamPlaying((p) => !p)}
                  >
                    {teamPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{teamPlaying ? copy.team.pause : copy.team.play}</span>
                  </button>
                  <button
                    type="button"
                    className="lp-mini-btn"
                    onClick={() => {
                      setTeamStep(1);
                      setTeamPlaying(true);
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>{copy.team.replay}</span>
                  </button>
                </div>
              </div>

              <div className="lp-team-grid">
                <div className="lp-team-feed">
                  {copy.team.events.slice(0, teamStep).map((ev) => (
                    <div
                      key={ev.time}
                      className={`lp-team-event lp-accent-${ev.roleColor} ${
                        ev.isIntercurrence ? "is-intercurrence" : ""
                      }`}
                    >
                      <div className="lp-team-event-head">
                        <span className="lp-mono">{ev.time}</span>
                        <strong>{ev.role}</strong>
                        {ev.isIntercurrence && (
                          <span className="lp-intercurrence-pill">
                            <AlertTriangle size={12} /> {copy.team.intercurrenceBadge}
                          </span>
                        )}
                      </div>
                      <p>{ev.action}</p>
                      <small>{ev.impact}</small>
                    </div>
                  ))}
                </div>

                <div className="lp-team-rubric">
                  <h4>{copy.team.rubricTitle}</h4>
                  <div className="lp-rubric-bars">
                    {copy.team.rubric.map((r) => {
                      const val = Math.round((r.target * teamStep) / copy.team.events.length);
                      return (
                        <div key={r.label} className="lp-rubric-row">
                          <div className="lp-rubric-head">
                            <span>{r.label}</span>
                            <strong className="lp-tabular">{val}%</strong>
                          </div>
                          <div className="lp-bar-track">
                            <div className="lp-bar-fill is-teal" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="lp-team-note">
                    <CheckCircle2 size={15} />
                    <span>
                      Ao encerrar a sessão, cada aluno recebe nota individual no Analytics da sala.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "voice" && (
            <div className="lp-demo-voice">
              <div className="lp-voice-head">
                <div>
                  <h3>{copy.voice.title}</h3>
                  <p className="lp-demo-desc">{copy.voice.patientLabel}</p>
                </div>
                <div className="lp-voice-toggle">
                  <button
                    type="button"
                    className={voiceView === "transcript" ? "is-active" : ""}
                    onClick={() => setVoiceView("transcript")}
                  >
                    <Mic size={14} /> {copy.voice.viewTranscript}
                  </button>
                  <button
                    type="button"
                    className={voiceView === "fhir" ? "is-active" : ""}
                    onClick={() => setVoiceView("fhir")}
                  >
                    <Code2 size={14} /> {copy.voice.viewFhir}
                  </button>
                </div>
              </div>

              {voiceView === "transcript" ? (
                <div className="lp-voice-body">
                  <div className="lp-voice-turns">
                    {copy.voice.turns.map((turn, idx) => (
                      <div key={idx} className={`lp-turn is-${turn.speaker}`}>
                        <div className="lp-turn-meta">
                          <span>{turn.speaker === "student" ? "Estudante (Voz)" : "Paciente-IA"}</span>
                          {turn.tag && <span className="lp-turn-tag">{turn.tag}</span>}
                        </div>
                        <p>{turn.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Audio briefing player — mounts <audio> ONLY if LANDING_MEDIA.voicePatientDemo === true */}
                  <div className="lp-audio-card">
                    {LANDING_MEDIA.voicePatientDemo && (
                      <audio
                        ref={audioRef}
                        src={LANDING_MEDIA_PATHS.voicePatientDemo}
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          const dur = e.currentTarget.duration;
                          if (Number.isFinite(dur) && dur > 0) setAudioDuration(Math.round(dur));
                        }}
                        onTimeUpdate={(e) => {
                          const cur = e.currentTarget.currentTime;
                          const dur = e.currentTarget.duration || 1;
                          setAudioProgress((cur / dur) * 100);
                        }}
                        onEnded={() => setAudioPlaying(false)}
                      />
                    )}

                    <div className="lp-audio-top">
                      <span className="lp-audio-label">
                        <Volume2 size={14} /> {copy.voice.audioLabel}
                      </span>
                      <span className="lp-chip-ok">{copy.voice.rubricBadge}</span>
                    </div>

                    <div className="lp-audio-controls">
                      <button
                        type="button"
                        onClick={toggleVoiceAudio}
                        className="lp-audio-play"
                        aria-label={audioPlaying ? copy.voice.pauseAudio : copy.voice.playAudio}
                      >
                        {audioPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                      </button>

                      <div
                        className="lp-waveform"
                        role="slider"
                        tabIndex={0}
                        aria-label={copy.voice.audioLabel}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(audioProgress)}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleSeekAudio(((e.clientX - rect.left) / rect.width) * 100);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowRight") handleSeekAudio(audioProgress + 10);
                          if (e.key === "ArrowLeft") handleSeekAudio(audioProgress - 10);
                        }}
                      >
                        {waveformBars.map((h, i) => {
                          const barPct = ((i + 1) / waveformBars.length) * 100;
                          const lit = barPct <= audioProgress;
                          return (
                            <span
                              key={i}
                              className={lit ? "is-lit" : ""}
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>

                      <span className="lp-audio-time lp-mono">
                        {fmtTime(elapsedSec)} / {fmtTime(audioDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lp-fhir-box">
                  <div className="lp-fhir-head">
                    <span>FHIR R4 · application/fhir+json</span>
                    <small>{copy.voice.fhirCaption}</small>
                  </div>
                  <pre className="lp-fhir-code">
                    <code>{FHIR_SAMPLE_JSON}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
