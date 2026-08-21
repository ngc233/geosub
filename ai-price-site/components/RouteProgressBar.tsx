"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROUTE_PROGRESS_START_EVENT } from "../lib/route-progress";

const START_DELAY_MS = 120;
const FINISH_DELAY_MS = 180;
const SAFETY_TIMEOUT_MS = 12_000;

function getInternalNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (
    !anchor ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    anchor.dataset.routeProgress === "off"
  ) {
    return null;
  }

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return null;

  const current = new URL(window.location.href);
  const sameDocument =
    destination.pathname === current.pathname &&
    destination.search === current.search;

  if (sameDocument) return null;

  return {
    preserveScroll:
      current.pathname.startsWith("/admin") &&
      destination.pathname === current.pathname,
  };
}

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteKeyRef = useRef(routeKey);
  const resetScrollOnCompleteRef = useRef(false);
  const visibleRef = useRef(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const clearProgressTimers = useCallback(() => {
    progressTimersRef.current.forEach(clearTimeout);
    progressTimersRef.current = [];
  }, []);

  const complete = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    clearProgressTimers();

    if (!visibleRef.current) {
      setProgress(0);
      return;
    }

    setProgress(100);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setProgress(0);
      finishTimerRef.current = null;
    }, FINISH_DELAY_MS);
  }, [clearProgressTimers]);

  const start = useCallback(() => {
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    clearProgressTimers();

    const showProgress = () => {
      visibleRef.current = true;
      setVisible(true);
      setProgress(14);
      progressTimersRef.current = [
        setTimeout(() => setProgress(42), 180),
        setTimeout(() => setProgress(68), 520),
        setTimeout(() => setProgress(82), 1_100),
        setTimeout(() => setProgress(90), 2_400),
      ];
    };

    if (visibleRef.current) {
      showProgress();
    } else {
      setProgress(0);
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null;
        showProgress();
      }, START_DELAY_MS);
    }

    safetyTimerRef.current = setTimeout(complete, SAFETY_TIMEOUT_MS);
  }, [clearProgressTimers, complete]);

  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) return;
    previousRouteKeyRef.current = routeKey;
    complete();
    if (resetScrollOnCompleteRef.current) {
      resetScrollOnCompleteRef.current = false;
      window.scrollTo(0, 0);
    }
  }, [complete, routeKey]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const navigation = getInternalNavigation(event);
      if (!navigation) return;

      resetScrollOnCompleteRef.current = !navigation.preserveScroll;
      start();
    };
    const handlePopState = () => {
      resetScrollOnCompleteRef.current = false;
      start();
    };
    const handleStart = () => {
      resetScrollOnCompleteRef.current = false;
      start();
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener(ROUTE_PROGRESS_START_EVENT, handleStart);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(ROUTE_PROGRESS_START_EVENT, handleStart);
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      clearProgressTimers();
    };
  }, [clearProgressTimers, start]);

  return (
    <div
      aria-hidden="true"
      data-route-progress
      className={`pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 transition-opacity duration-150 motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full origin-left bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.5)] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
