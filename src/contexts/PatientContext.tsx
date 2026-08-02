import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import { createEmptyPatient, PatientState, PatientVitals, PatientVitalKey } from "@/lib/patientEngine";

const STORAGE_KEY = "continuousPatient";

interface PatientContextType {
  patient: PatientState | null;
  ensurePatient: () => void;
  updateFromModule: (slug: string, patch: Partial<PatientVitals>, caseTitle?: string) => void;
  resetPatient: () => void;
}

const PatientContext = createContext<PatientContextType>({
  patient: null,
  ensurePatient: () => {},
  updateFromModule: () => {},
  resetPatient: () => {},
});

export const usePatientState = () => useContext(PatientContext);

function readStoredPatient(): PatientState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PatientState) : null;
  } catch {
    return null;
  }
}

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<PatientState | null>(() => readStoredPatient());

  useEffect(() => {
    try {
      if (patient) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(patient));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [patient]);

  const ensurePatient = useCallback(() => {
    setPatient((prev) => prev ?? createEmptyPatient());
  }, []);

  const updateFromModule = useCallback(
    (slug: string, patch: Partial<PatientVitals>, caseTitle?: string) => {
      setPatient((prev) => {
        const base = prev ?? createEmptyPatient();
        const now = Date.now();
        const provenance = { ...base.provenance };
        (Object.keys(patch) as PatientVitalKey[]).forEach((key) => {
          provenance[key] = { sourceSlug: slug, sourceCaseTitle: caseTitle, updatedAt: now };
        });
        return {
          ...base,
          vitals: { ...base.vitals, ...patch },
          provenance,
          touchedModules: base.touchedModules.includes(slug) ? base.touchedModules : [...base.touchedModules, slug],
        };
      });
    },
    []
  );

  const resetPatient = useCallback(() => {
    setPatient(null);
  }, []);

  return (
    <PatientContext.Provider value={{ patient, ensurePatient, updateFromModule, resetPatient }}>
      {children}
    </PatientContext.Provider>
  );
}
