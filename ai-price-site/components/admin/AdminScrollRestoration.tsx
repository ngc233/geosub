"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const STORAGE_KEY = "geosub_admin_pending_scroll";
const MAX_AGE_MS = 15_000;

type PendingScroll = {
  pathname: string;
  scrollY: number;
  savedAt: number;
};

function readPendingScroll(): PendingScroll | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<PendingScroll>;
    if (
      typeof parsed.pathname !== "string" ||
      typeof parsed.scrollY !== "number" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed as PendingScroll;
  } catch {
    return null;
  }
}

export default function AdminScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const pending = readPendingScroll();
    if (pending?.pathname === pathname && pending.scrollY > 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, pending.scrollY));
      });
    }

    const rememberScroll = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || window.scrollY <= 0) return;

      try {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            pathname: window.location.pathname,
            scrollY: window.scrollY,
            savedAt: Date.now(),
          } satisfies PendingScroll),
        );
      } catch {
        // Scroll preservation must never interrupt an admin action.
      }
    };

    document.addEventListener("submit", rememberScroll, true);
    return () => document.removeEventListener("submit", rememberScroll, true);
  }, [pathname, routeKey]);

  return null;
}
