"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { normalizeAggregatePagePath } from "../../lib/aggregate-page-views";
import { getBrowserPageViewPopulation, PAGE_VIEW_MEASUREMENT_VERSION } from "../../lib/page-view-measurement";

export default function AggregatePageViewProvider() {
  const pathname = usePathname();
  const lastPathRef = useRef("");

  useEffect(() => {
    const pagePath = normalizeAggregatePagePath(pathname);
    if (!pagePath || lastPathRef.current === pagePath) return;

    lastPathRef.current = pagePath;
    fetch("/api/page-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pagePath,
        measurementVersion: PAGE_VIEW_MEASUREMENT_VERSION,
        population: getBrowserPageViewPopulation(),
      }),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      // Aggregate counting must never interrupt public navigation.
    });
  }, [pathname]);

  return null;
}
