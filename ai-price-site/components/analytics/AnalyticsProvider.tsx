"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_CONSENT_GRANTED,
  ANALYTICS_CONSENT_CHANGE_EVENT,
  readAnalyticsConsent,
  hasAnalyticsConsent,
} from "../../lib/analytics-consent";
import { getAnalyticsSessionId } from "../../lib/client-analytics-session";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

import {
  enrollWithPlusVisitorLock,
  PLUS_BASELINE_PATH,
  PLUS_REGION_EXPERIMENT,
  setPlusVariant,
  variantForVisitor,
} from "../../lib/plus-region-experiment";
import { startPlusBaseline } from "../../lib/plus-region-baseline";
import { version as buildVersion } from "../../package.json";

type TrackPayload = {
  eventId?: string;
  eventKey: string;
  eventName?: string;
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;
  locale?: string;
  buttonKey?: string;
  placement?: string;
  source?: string;
  productId?: string;
  planId?: string;
  countryId?: string;
  articleId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

function shouldSkipPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-login") ||
    pathname.startsWith("/api")
  );
}

function getLocaleFromPath(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (!firstSegment) {
    return "zh";
  }

  if (
    [
      "zh",
      "zh-tw",
      "en",
      "ja",
      "ko",
      "es",
      "tr",
      "ar",
      "fr",
      "it",
      "de",
      "pt",
    ].includes(firstSegment)
  ) {
    return firstSegment;
  }

  return "zh";
}

function sendEvent(payload: TrackPayload) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  try {
    const body = JSON.stringify({
      ...payload,
      sessionId: payload.sessionId || getAnalyticsSessionId(),
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      // The endpoint parses JSON from the request body. A string keeps Plus
      // beacons inline when WebKit queues multiple events during a lookup.
      const beaconBody = payload.pagePath === PLUS_BASELINE_PATH
        ? body
        : new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/events", beaconBody);

      if (sent) {
        return;
      }
    }

    fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break user experience
  }
}

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useAnalyticsConsent();
  const lastPathRef = useRef("");
  const initialDocument = useRef(true);

  useEffect(() => {
    if (pathname !== PLUS_BASELINE_PATH) {
      initialDocument.current = false;
      return;
    }
    let cancelled = false;
    let stop: ((record: boolean) => void) | undefined;
    let reported = false;
    let withdrawn = false;
    const eligible = readAnalyticsConsent() === ANALYTICS_CONSENT_GRANTED;
    const readVisitor = () => document.cookie.split("; ").find(c => c.startsWith("geosub_anon_id="))?.slice("geosub_anon_id=".length);
    function sync() {
      if (cancelled) return;
      if (!hasAnalyticsConsent() || readAnalyticsConsent() !== ANALYTICS_CONSENT_GRANTED) {
        if (eligible) withdrawn = true;
        setPlusVariant(null);
        stop?.(false);
        stop = undefined;
      }
      if (reported || !hasAnalyticsConsent()) return;
      reported = true;
      const base = { pagePath: PLUS_BASELINE_PATH, pageTitle: document.title, locale: "zh", referrer: document.referrer };
      if (!eligible || !crypto.randomUUID) {
        sendEvent({ ...base, eventKey: "page_view", eventName: "Page View", source: "frontend_auto",
          metadata: { path: PLUS_BASELINE_PATH, eligible_at_entry: false } });
        return;
      }
      function enroll(allowAssignment: boolean) {
        if (cancelled || withdrawn || readAnalyticsConsent() !== ANALYTICS_CONSENT_GRANTED) return;
        if (allowAssignment && !readVisitor()) {
          const secure = location.protocol === "https:" ? "; Secure" : "";
          document.cookie = "geosub_anon_id=" + crypto.randomUUID() + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
        }
        const visitorId = readVisitor();
        const variant = allowAssignment ? variantForVisitor(visitorId) : null;
        const sessionId = getAnalyticsSessionId();
        stop = startPlusBaseline((eventKey, fields, eventId) => {
          sendEvent({ ...base, eventId, eventKey, sessionId,
            eventName: eventKey === "page_view" ? "Page View" : eventKey,
            source: eventKey === "page_view" ? "frontend_auto" : "plus_region_baseline",
            metadata: { ...fields, path: PLUS_BASELINE_PATH, visitor_id: visitorId, build_version: buildVersion,
              ...(variant ? { experiment_id: PLUS_REGION_EXPERIMENT, variant } : {}) } });
        }, initialDocument.current);
        setPlusVariant(variant);
        initialDocument.current = false;
      }
      // Serialize first entry across tabs where Web Locks are available.
      if (readVisitor()) {
        enroll(true);
      } else {
        void enrollWithPlusVisitorLock(navigator.locks, enroll);
      }
    }
    const onVisible = () => { if (!document.hidden) sync(); };
    queueMicrotask(sync);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", sync);
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, sync);
    return () => {
      cancelled = true;
      setPlusVariant(null);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, sync);
      stop?.(hasAnalyticsConsent());
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === PLUS_BASELINE_PATH) { lastPathRef.current = ""; return; }
    if (
      consent !== ANALYTICS_CONSENT_GRANTED ||
      !pathname ||
      shouldSkipPath(pathname)
    ) {
      return;
    }

    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    if (lastPathRef.current === fullPath) {
      return;
    }

    lastPathRef.current = fullPath;

    sendEvent({
      eventKey: "page_view",
      eventName: "Page View",
      pagePath: fullPath,
      pageTitle: typeof document !== "undefined" ? document.title : undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      locale: getLocaleFromPath(pathname),
      source: "frontend_auto",
      metadata: {
        path: pathname,
        search: search || "",
      },
    });
  }, [consent, pathname, searchParams]);

  useEffect(() => {
    if (consent !== ANALYTICS_CONSENT_GRANTED) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      const element = target.closest<HTMLElement>("[data-track-event]");

      if (!element) {
        return;
      }

      const pathnameNow = window.location.pathname;

      if (shouldSkipPath(pathnameNow)) {
        return;
      }

      sendEvent({
        eventKey: element.dataset.trackEvent || "click",
        eventName: element.dataset.trackName || "Click",
        pagePath: window.location.pathname + window.location.search,
        pageTitle: document.title,
        referrer: document.referrer,
        locale: getLocaleFromPath(pathnameNow),
        buttonKey: element.dataset.trackButton,
        placement: element.dataset.trackPlacement,
        source: element.dataset.trackSource || "frontend_click",
        productId: element.dataset.trackProductId,
        planId: element.dataset.trackPlanId,
        countryId: element.dataset.trackCountryId,
        articleId: element.dataset.trackArticleId,
        metadata: {
          text: element.innerText?.trim().slice(0, 120) || "",
          href:
            element instanceof HTMLAnchorElement
              ? element.href
              : element.getAttribute("href") || "",
        },
      });
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [consent]);

  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
