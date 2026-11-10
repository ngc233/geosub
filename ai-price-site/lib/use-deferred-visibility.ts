"use client";
import { useEffect, useRef, useState } from "react";

/** Opt-in image loading near the viewport, rather than the browser's much wider
 * native lazy-image margin. Callers keep their original fixed-size container. */
export function useDeferredVisibility(defer: boolean) {
  const root = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(!defer);
  useEffect(() => {
    if (!defer || visible) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "100px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [defer, visible]);
  return { root, visible: !defer || visible };
}
