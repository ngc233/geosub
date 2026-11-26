"use client";

import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import { useLayoutEffect, useMemo, useRef } from "react";
import { countInStartValue, numberMotionProgress, parseNumberMotion } from "../lib/public-number-motion";

/** Display only: callers supply the already-converted value. No rates or fallback data.
 * Hero/KPI numbers gently count in on mount; dense row cells stay static until changeKey updates. */
export default function PublicPriceNumber({ value, changeKey, prefix = "", suffix = "",
  locale = "zh-CN", fractionDigits = 2, size = "row", label, initialValue, currency, cycle, countIn }: {
  value: number; changeKey?: string | number; prefix?: string; suffix?: string;
  locale?: string; fractionDigits?: number; size?: "row" | "hero"; label?: string; initialValue?: number; currency?: string; cycle?: string; countIn?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const visible = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  const shouldCountIn = countIn ?? size === "hero";
  const mountStart = initialValue !== undefined
    ? initialValue
    : shouldCountIn && Number.isFinite(value)
      ? countInStartValue(value, fractionDigits)
      : value;
  const effectiveKey = changeKey ?? (shouldCountIn || initialValue !== undefined ? "gs-count-in" : undefined);
  const last = useRef({ value: mountStart, key: mountStart !== value ? undefined : effectiveKey });
  const format = useMemo(() => {
    if (currency) return (amount: number) => formatPublicPrice(amount, currency, locale, fractionDigits);
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
    return (amount: number) => `${prefix}${number.format(amount)}${suffix}`;
  }, [currency, locale, fractionDigits, prefix, suffix]);
  const valid = Number.isFinite(value);
  const finalText = valid ? format(value) : "";
  useLayoutEffect(() => {
    const element = visible.current;
    const container = root.current;
    const isInitialMount = !mounted.current;
    const previous = last.current;
    last.current = { value, key: effectiveKey };
    if (!element || !container || !valid) return;
    // SSR already contains the final value. Avoid interleaving a style read
    // with a text write for every matrix cell when no animation is requested.
    if (effectiveKey === undefined || previous.key === effectiveKey || !Number.isFinite(previous.value)) {
      mounted.current = true;
      if (element.textContent !== finalText) element.textContent = finalText;
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const style = getComputedStyle(container);
    const motion = parseNumberMotion(style.getPropertyValue("--gs-motion-slow").trim(), style.getPropertyValue("--gs-motion-ease").trim());
    if (reduced.matches || !motion) {
      mounted.current = true;
      element.textContent = finalText;
      return;
    }
    const durationMs = isInitialMount ? Math.max(motion.ms, 640) : motion.ms;
    let frame = 0;
    let start = 0;
    let finished = false;
    last.current = { value: previous.value, key: effectiveKey };
    const finish = () => {
      finished = true;
      mounted.current = true;
      cancelAnimationFrame(frame);
      element.textContent = finalText;
      last.current = { value, key: effectiveKey };
    };
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const current = previous.value + (value - previous.value) * numberMotionProgress(progress, motion.curve);
      last.current.value = current;
      element.textContent = format(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    element.textContent = format(previous.value);
    frame = requestAnimationFrame(tick);
    const onPreference = () => { if (reduced.matches) finish(); };
    reduced.addEventListener("change", onPreference);
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", onPreference);
      if (!finished) last.current = { value: last.current.value, key: undefined };
    };
  }, [value, effectiveKey, finalText, prefix, suffix, format, valid]);
  if (!valid) return null;
  const cycleLabel = cycle ? publicBillingLabel(cycle, locale) : null;
  return <span ref={root} data-gs-number data-gs-price data-size={size} data-gs-price-cycle={cycle ? "true" : undefined}>
    <span className="gs-sr-only">{label ? `${label}：` : ""}{finalText}{cycleLabel ? ` / ${cycleLabel}` : ""}</span>
    <span ref={visible} aria-hidden="true">{finalText}</span>
    {cycleLabel && <small data-gs-cycle aria-hidden="true"> / {cycleLabel}</small>}
  </span>;
}
