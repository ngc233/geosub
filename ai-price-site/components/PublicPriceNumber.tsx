"use client";

import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import { useLayoutEffect, useMemo, useRef } from "react";
import { numberMotionProgress, parseNumberMotion } from "../lib/public-number-motion";

/** Display only: callers supply the already-converted value. No rates or fallback data.
 * Changing value alone never animates; changeKey must change after a user action. */
export default function PublicPriceNumber({ value, changeKey, prefix = "", suffix = "",
  locale = "zh-CN", fractionDigits = 2, size = "row", label, initialValue, currency, cycle }: {
  value: number; changeKey?: string | number; prefix?: string; suffix?: string;
  locale?: string; fractionDigits?: number; size?: "row" | "hero"; label?: string; initialValue?: number; currency?: string; cycle?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const visible = useRef<HTMLSpanElement>(null);
  const last = useRef({ value: initialValue ?? value, key: initialValue === undefined ? changeKey : undefined });
  const format = useMemo(() => {
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
    return (amount: number) => currency ? formatPublicPrice(amount, currency, locale, fractionDigits) : `${prefix}${number.format(amount)}${suffix}`;
  }, [currency, locale, fractionDigits, prefix, suffix]);
  const valid = Number.isFinite(value);
  const finalText = valid ? format(value) : "";
  useLayoutEffect(() => {
    const element = visible.current;
    const container = root.current;
    const previous = last.current;
    last.current = { value, key: changeKey };
    if (!element || !container || !valid) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const style = getComputedStyle(container);
    const motion = parseNumberMotion(style.getPropertyValue("--gs-motion-slow").trim(), style.getPropertyValue("--gs-motion-ease").trim());
    if (changeKey === undefined || previous.key === changeKey || !Number.isFinite(previous.value) || reduced.matches || !motion) {
      element.textContent = finalText;
      return;
    }
    let frame = 0;
    const start = performance.now();
    const finish = () => { cancelAnimationFrame(frame); element.textContent = finalText; last.current.value = value; };
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / motion.ms);
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
    return () => { cancelAnimationFrame(frame); reduced.removeEventListener("change", onPreference); };
  }, [value, changeKey, finalText, prefix, suffix, format, valid]);
  if (!valid) return null;
  return <span ref={root} data-gs-number data-gs-price data-size={size} data-gs-price-cycle={cycle ? "true" : undefined}>
    <span className="gs-sr-only">{label ? `${label}：` : ""}{finalText}{cycle ? ` / ${publicBillingLabel(cycle)}` : ""}</span>
    <span ref={visible} aria-hidden="true">{finalText}</span>
    {cycle && <small data-gs-cycle aria-hidden="true"> / {publicBillingLabel(cycle)}</small>}
  </span>;
}
