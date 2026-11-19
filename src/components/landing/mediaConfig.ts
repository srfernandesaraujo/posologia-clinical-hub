/**
 * Central media registry for the Posologia Clinical Hub landing page.
 *
 * Flip a flag to `true` ONLY after placing the matching file in `public/media/`.
 * This prevents the SPA router from serving `index.html` (HTTP 200) or 404s
 * for optional video/audio files that haven't been produced yet.
 */
export const LANDING_MEDIA = {
  posters: {
    hero: "/media/hero-poster.jpg",
    authority: "/media/authority-poster.jpg",
  },
  heroAmbient: true,
  voicePatientDemo: false,
  founderStory: false,
  showreel: false,
  bentoClips: {
    "sim-engine": false,
    "virtual-room": false,
    "lab-bench": false,
    "ai-voice-fhir": false,
  } as Record<string, boolean>,
} as const;

export const LANDING_MEDIA_PATHS = {
  heroAmbient: "/media/hero-ambient.mp4",
  voicePatientDemo: "/media/briefing-demo.mp3",
  founderStory: "/media/founder-story.mp4",
  showreel: "/media/showreel.mp4",
  bentoClips: {
    "sim-engine": "/media/clip-sim-engine.mp4",
    "virtual-room": "/media/clip-virtual-room.mp4",
    "lab-bench": "/media/clip-lab-bench.mp4",
    "ai-voice-fhir": "/media/clip-ai-voice-fhir.mp4",
  } as Record<string, string>,
} as const;
