"use client";
import { useSyncExternalStore } from "react";
function subscribe(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function desktop() { return window.matchMedia("(min-width: 768px)").matches; }
function server() { return false; }
export function useDesktopLayout() { return useSyncExternalStore(subscribe, desktop, server); }
