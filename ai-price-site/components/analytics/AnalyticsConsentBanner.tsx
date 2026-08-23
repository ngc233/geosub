"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  ANALYTICS_CONSENT_OPEN_EVENT,
  clearAnalyticsCookie,
  getAnalyticsConsentCopy,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "../../lib/analytics-consent";
import { clearAnalyticsSession } from "../../lib/client-analytics-session";
import {
  getSiteLocaleFromPath,
  withSiteLocale,
} from "../../lib/site-locale";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

function shouldHideOnPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api");
}

export default function AnalyticsConsentBanner({
  consentRequired,
}: {
  consentRequired: boolean;
}) {
  const pathname = usePathname();
  const { consent, ready } = useAnalyticsConsent();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const locale = getSiteLocaleFromPath(pathname);
  const copy = getAnalyticsConsentCopy(locale);

  useEffect(() => {
    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openPreferences);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openPreferences);
    };
  }, []);

  useEffect(() => {
    if (ready && consent !== ANALYTICS_CONSENT_GRANTED) {
      clearAnalyticsCookie();
      clearAnalyticsSession();
    }
  }, [consent, ready]);

  if (
    !ready ||
    !consentRequired ||
    shouldHideOnPath(pathname) ||
    (consent !== null && !preferencesOpen)
  ) {
    return null;
  }

  function chooseConsent(value: AnalyticsConsent) {
    setAnalyticsConsent(value);

    if (value === ANALYTICS_CONSENT_DENIED) {
      clearAnalyticsCookie();
      clearAnalyticsSession();
    }

    setPreferencesOpen(false);
  }

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white/95 p-3.5 text-zinc-950 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur md:bottom-4 md:p-4 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-white"
      role="dialog"
      aria-live="polite"
      aria-label={copy.title}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{copy.title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">
              {copy.description}{" "}
              <Link
                href={withSiteLocale("/privacy", locale)}
                className="font-semibold text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 dark:text-white dark:decoration-zinc-600"
              >
                {copy.privacy}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 pl-11 md:pl-0">
          <button
            type="button"
            onClick={() => chooseConsent(ANALYTICS_CONSENT_GRANTED)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-3.5 text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/20 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <span className="text-xs font-semibold">{copy.accept}</span>
          </button>
          <button
            type="button"
            onClick={() => chooseConsent(ANALYTICS_CONSENT_DENIED)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3.5 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <span className="text-xs font-semibold">{copy.reject}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
