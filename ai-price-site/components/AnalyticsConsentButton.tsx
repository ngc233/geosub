"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  getAnalyticsConsentCopy,
  openAnalyticsConsentPreferences,
} from "../lib/analytics-consent";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function AnalyticsConsentButton({
  locale = "zh",
  variant = "secondary",
}: {
  locale?: CanvasLocale;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      data-gs-ui="button"
      className={variant === "primary" ? "gs-aux-primary-btn" : "gs-aux-secondary-btn"}
      onClick={openAnalyticsConsentPreferences}
    >
      <SlidersHorizontal size={15} aria-hidden="true" />
      <span>{getAnalyticsConsentCopy(locale).settings}</span>
    </button>
  );
}
