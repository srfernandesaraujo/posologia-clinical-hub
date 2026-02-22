import { useState, useCallback, useEffect } from "react";

export interface CalculationEntry {
  id: string;
  calculatorName: string;
  calculatorSlug: string;
  patientName?: string;
  date: string;
  summary: string; // e.g. "Risco: 12% – Moderado"
  details: Record<string, string | number>; // key-value pairs of inputs/outputs
  createdAt: string;
}

const STORAGE_KEY = "medtools_calc_history";
const CONSENT_KEY = "medtools_calc_history_consent";

function loadHistory(): CalculationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: CalculationEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useCalculationHistory() {
  const [entries, setEntries] = useState<CalculationEntry[]>(loadHistory);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === "true");

  // Sync state when localStorage changes (multi-tab)
  useEffect(() => {
    const handler = () => setEntries(loadHistory());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const grantConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
  }, []);

  const revokeConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setHasConsent(false);
    setEntries([]);
  }, []);

  const saveCalculation = useCallback(
    (entry: Omit<CalculationEntry, "id" | "createdAt">) => {
      if (!hasConsent) return;
      const newEntry: CalculationEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...entries].slice(0, 200); // max 200 entries
      setEntries(updated);
      persistHistory(updated);
    },
    [hasConsent, entries]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      persistHistory(updated);
    },
    [entries]
  );

  const clearHistory = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getByCalculator = useCallback(
    (slug: string) => entries.filter((e) => e.calculatorSlug === slug),
    [entries]
  );

  const getByPatient = useCallback(
    (name: string) =>
      entries.filter((e) => e.patientName?.toLowerCase().includes(name.toLowerCase())),
    [entries]
  );

  return {
    entries,
    hasConsent,
    grantConsent,
    revokeConsent,
    saveCalculation,
    deleteEntry,
    clearHistory,
    getByCalculator,
    getByPatient,
  };
}
