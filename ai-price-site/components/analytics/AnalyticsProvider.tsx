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

  if (["zh", "en", "es", "ja", "ko", "de"].includes(firstSegment)) {
    return firstSegment;
  }

  return "zh";
}

function sendEvent(payload: TrackPayload) {
  try {
    const body = JSON.stringify(payload);

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
