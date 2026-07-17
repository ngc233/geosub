"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type TrackPayload = {
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

const SESSION_STORAGE_KEY = "geosub_session_id";
const SESSION_ACTIVITY_STORAGE_KEY = "geosub_session_activity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let memorySessionId = "";
let memorySessionActivity = 0;

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getSessionId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const now = Date.now();
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = Number(
      window.sessionStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY) || 0,
    );

    if (stored && lastActivity > 0 && now - lastActivity <= SESSION_TIMEOUT_MS) {
      memorySessionId = stored;
      memorySessionActivity = now;
      window.sessionStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
      return stored;
    }

    const sessionId = createSessionId();
    memorySessionId = sessionId;
    memorySessionActivity = now;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    window.sessionStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
    return sessionId;
  } catch {
    const now = Date.now();

    if (
      !memorySessionId ||
      !memorySessionActivity ||
      now - memorySessionActivity > SESSION_TIMEOUT_MS
    ) {
      memorySessionId = createSessionId();
    }

    memorySessionActivity = now;
    return memorySessionId;
  }
}

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

  if (["zh", "en", "es", "ja", "ko", "de"].includes(firstSegment)) {
    return firstSegment;
  }

  return "zh";
}

function sendEvent(payload: TrackPayload) {
  try {
    const body = JSON.stringify({
      ...payload,
      sessionId: payload.sessionId || getSessionId(),
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], {
        type: "application/json",
      });

      const sent = navigator.sendBeacon("/api/events", blob);

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
  const lastPathRef = useRef("");

  useEffect(() => {
    if (!pathname || shouldSkipPath(pathname)) {
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
  }, [pathname, searchParams]);

  useEffect(() => {
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
  }, []);

  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
