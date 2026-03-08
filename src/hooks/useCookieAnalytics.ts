import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  let sid = sessionStorage.getItem("analytics_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", sid);
  }
  return sid;
}

export function useCookieAnalytics() {
  const { isAllowed } = useCookieConsent();
  const location = useLocation();
  const lastPath = useRef("");
  const pageEnteredAt = useRef<number>(Date.now());

  // Track page views
  useEffect(() => {
    if (!isAllowed("analytics")) return;
    const path = location.pathname;
    if (path === lastPath.current) return;

    // Record time spent on previous page
    if (lastPath.current) {
      const timeSpent = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (timeSpent > 1) {
        sendEvent("page_time", lastPath.current, undefined, { seconds: timeSpent });
      }
    }

    lastPath.current = path;
    pageEnteredAt.current = Date.now();
    sendEvent("page_view", path, undefined, { referrer: document.referrer || undefined });
  }, [location.pathname, isAllowed]);

  const trackToolUse = useCallback(
    (toolSlug: string) => {
      if (!isAllowed("analytics")) return;
      sendEvent("tool_use", location.pathname, toolSlug);
    },
    [isAllowed, location.pathname]
  );

  const trackCtaClick = useCallback(
    (ctaName: string) => {
      if (!isAllowed("analytics")) return;
      sendEvent("cta_click", location.pathname, undefined, { cta: ctaName });
    },
    [isAllowed, location.pathname]
  );

  return { trackToolUse, trackCtaClick };
}

async function sendEvent(
  eventType: string,
  pagePath: string,
  toolSlug?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("analytics_events" as any).insert({
      session_id: sessionId,
      event_type: eventType,
      page_path: pagePath,
      tool_slug: toolSlug || null,
      metadata: metadata || {},
      user_id: user?.id || null,
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
