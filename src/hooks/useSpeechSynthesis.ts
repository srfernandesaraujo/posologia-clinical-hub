import { useCallback, useEffect, useRef } from "react";

/** Thin wrapper over the browser's native SpeechSynthesis API — zero AI cost, non-blocking enhancement. */
export function useSpeechSynthesis() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, lang = "pt-BR") => {
      if (!isSupported || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        const ptVoice = voicesRef.current.find((v) => v.lang.startsWith("pt"));
        if (ptVoice) utterance.voice = ptVoice;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Non-blocking: the text is already rendered in the UI regardless of TTS success.
      }
    },
    [isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { isSupported, speak, cancel };
}
