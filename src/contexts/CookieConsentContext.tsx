import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface CookieConsent {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  consent: CookieConsent;
  hasConsented: boolean;
  updateConsent: (consent: CookieConsent) => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  isAllowed: (category: keyof CookieConsent) => boolean;
  openPreferences: () => void;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
}

const STORAGE_KEY = "cookie-consent";

const defaultConsent: CookieConsent = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

const allAccepted: CookieConsent = {
  essential: true,
  preferences: true,
  analytics: true,
  marketing: true,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent>(defaultConsent);
  const [hasConsented, setHasConsented] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConsent({ ...defaultConsent, ...parsed });
        setHasConsented(true);
      }
    } catch {}
  }, []);

  const persist = useCallback((c: CookieConsent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setConsent(c);
    setHasConsented(true);
  }, []);

  const updateConsent = useCallback((c: CookieConsent) => {
    persist({ ...c, essential: true });
  }, [persist]);

  const acceptAll = useCallback(() => persist(allAccepted), [persist]);

  const rejectOptional = useCallback(() => persist(defaultConsent), [persist]);

  const isAllowed = useCallback((category: keyof CookieConsent) => consent[category], [consent]);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);

  return (
    <CookieConsentContext.Provider
      value={{ consent, hasConsented, updateConsent, acceptAll, rejectOptional, isAllowed, openPreferences, preferencesOpen, setPreferencesOpen }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
}
