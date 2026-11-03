"use client";

import { useLayoutEffect, useRef } from "react";

type Position = { x: number; y: number; width: number; parentWidth: number };
let planPosition: { identity: string; position: Position } | null = null;

/** A shared transform marker for plan navigation and price filters, including route remounts. */
export default function SlidingSelection({ value, kind, identity }: { value: string; kind: "plan" | "filter"; identity?: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const previous = useRef<Position | null>(null);
  useLayoutEffect(() => {
    const node = marker.current, parent = node?.parentElement;
    if (!node || !parent) return;
    const selected = parent.querySelector<HTMLElement>(kind === "plan" ? '[aria-selected="true"]' : '[aria-pressed="true"]');
    if (!selected) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    function measure(animate: boolean) {
      const item = selected!, element = node!, root = parent!;
      const css = getComputedStyle(element);
      const inset = Number.parseFloat(css.getPropertyValue("--gs-marker-inset")) || 0;
      const rootWidth = root.getBoundingClientRect().width;
      const lineHeight = Number.parseFloat(css.height) || 0;
      const current = { x: item.offsetLeft + inset, y: kind === "filter" ? item.offsetTop + item.offsetHeight - lineHeight : 0, width: Math.max(0, item.offsetWidth - inset * 2), parentWidth: rootWidth };
      const prior = previous.current ?? (identity && planPosition?.identity === identity ? planPosition.position : null);
      element.style.width = `${current.width}px`;
      element.style.transform = `translate(${current.x}px, ${current.y}px)`;
      root.dataset.gsIndicatorReady = "true";
      if (animate && prior && !reduced.matches && rootWidth > 0 && current.width > 0) {
        const duration = Number.parseFloat(css.getPropertyValue(kind === "plan" ? "--gs-motion-slow" : "--gs-motion-base"));
        const easing = css.getPropertyValue("--gs-motion-ease-out").trim();
        const ratio = prior.parentWidth > 0 ? rootWidth / prior.parentWidth : 1;
        if (duration > 0 && easing) animation = element.animate([
          { transform: `translate(${prior.x * ratio}px, ${prior.y || 0}px) scaleX(${prior.width * ratio / current.width})` },
          { transform: `translate(${current.x}px, ${current.y}px) scaleX(1)` },
        ], { duration, easing });
        if (animation) animation.onfinish = () => measure(false);
      }
      previous.current = current;
      if (identity) planPosition = { identity, position: current };
    }
    measure(true);
    const resize = new ResizeObserver(() => { if (!animation || animation.playState !== "running") measure(false); });
    resize.observe(parent);
    const stop = () => { if (reduced.matches) animation?.finish(); };
    reduced.addEventListener("change", stop);
    return () => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      const position = { x: matrix.m41, y: matrix.m42, width: node.getBoundingClientRect().width, parentWidth: parent.getBoundingClientRect().width };
      previous.current = position;
      if (identity) planPosition = { identity, position };
      if (animation) animation.onfinish = null;
      animation?.cancel(); resize.disconnect(); reduced.removeEventListener("change", stop);
    };
  }, [value, kind, identity]);
  return <span ref={marker} aria-hidden="true" style={{display:"none"}} data-gs-sliding-marker={kind} />;
}
