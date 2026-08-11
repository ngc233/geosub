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

export default function AnalyticsConsentBanner() {
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
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/15 backdrop-blur md:bottom-5 md:p-5 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-white"
      role="dialog"
      aria-live="polite"
      aria-label={copy.title}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {copy.description}{" "}
            <Link
              href={withSiteLocale("/privacy", locale)}
              className="font-bold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:text-lime-700 dark:text-white dark:decoration-zinc-600 dark:hover:text-lime-300"
            >
              {copy.privacy}
            </Link>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => chooseConsent(ANALYTICS_CONSENT_GRANTED)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-lime-600 bg-lime-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-lime-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/20"
            >
              {copy.accept}
            </button>
            <button
              type="button"
              onClick={() => chooseConsent(ANALYTICS_CONSENT_DENIED)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {copy.reject}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
