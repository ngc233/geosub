"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  readAnalyticsConsent,
  type AnalyticsConsent,
} from "../../lib/analytics-consent";

export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setConsent(readAnalyticsConsent());
      setReady(true);
    };

    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);
    };
  }, []);

  return { consent, ready };
}
