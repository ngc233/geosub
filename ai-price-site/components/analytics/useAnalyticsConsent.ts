"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  ANALYTICS_CONSENT_GRANTED,
  isClientAnalyticsConsentRequired,
  readAnalyticsConsent,
  type AnalyticsConsent,
} from "../../lib/analytics-consent";

export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setConsent(
        isClientAnalyticsConsentRequired()
          ? readAnalyticsConsent()
          : ANALYTICS_CONSENT_GRANTED,
      );
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
