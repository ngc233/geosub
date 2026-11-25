"use client";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { homepageMapHeight, homepageMapWidth, spaceHomepageMapDots } from "../lib/homepage-map-spacing";

export type WorldMapDotTone = "deep-low" | "low" | "baseline" | "high" | "monitored";

export type WorldMapDot = {
  code: string;
  tone: WorldMapDotTone;
  ariaLabel: string;
  regionName: string;
  href?: string | null;
  pulseTone?: "low" | "high";
  badge?: number;
};

export type MapCapsuleItem = {
  id: string;
  href?: string | null;
  content: ReactNode;
};

// 1:110m Natural Earth omits city-state polygons; supply fixed NaturalEarth1 coordinates.
const microRegionPoints: Readonly<Record<string, number[]>> = {
  HK: [484, 88],
  MO: [480, 89],
  SG: [466, 114],
  BH: [388, 84],
  MT: [324, 66],
};

export function PublicMapCapsules({
  label,
  items,
  activeId,
  onHover,
  onSelect,
}: {
  label: string;
  items: MapCapsuleItem[];
  activeId: string | null;
  onHover?: (id: string) => void;
  onSelect?: (id: string) => void;
}) {
  const pills = useRef<HTMLElement>(null);
  const [jelly, setJelly] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    active: string;
    cycle: number;
    changed: boolean;
    origin: string;
  } | null>(null);

  const itemsKey = items.map((item) => item.id).join("|");

  useLayoutEffect(() => {
    const container = pills.current;
    if (!container || !activeId) {
      setJelly(null);
      return;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const target = container.querySelector<HTMLElement>('.gs-home-product-pill[data-active="true"]');
      if (!target) {
        setJelly(null);
        return;
      }
      const box = {
        x: target.offsetLeft,
        y: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      };
      setJelly((previous) => {
        const changed = !!previous && previous.active !== activeId;
        if (
          previous &&
          !changed &&
          previous.x === box.x &&
          previous.y === box.y &&
          previous.width === box.width &&
          previous.height === box.height
        ) {
          return previous;
        }
        return {
          ...box,
          origin: changed ? (box.x >= previous!.x ? "100%" : "0%") : (previous?.origin ?? "50%"),
          active: activeId,
          cycle: changed ? 1 - previous!.cycle : (previous?.cycle ?? 0),
          changed: changed || previous?.changed || false,
        };
      });
    };
    measure();
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready?.then(measure).catch(() => {});
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll(".gs-home-product-pill").forEach((element) => observer.observe(element));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activeId, itemsKey]);

  if (!items.length) return null;

  return (
    <nav
      ref={pills}
      className="gs-home-products"
      aria-label={label}
      data-jelly-ready={Boolean(jelly)}
      data-jelly-cycle={jelly?.changed ? jelly.cycle : undefined}
    >
      <span
        className="gs-home-product-jelly"
        aria-hidden="true"
        style={
          jelly
            ? ({
                "--gs-jelly-origin": jelly.origin,
                "--gs-jelly-x": `${jelly.x}px`,
                "--gs-jelly-y": `${jelly.y}px`,
                "--gs-jelly-width": `${jelly.width}px`,
                "--gs-jelly-height": `${jelly.height}px`,
              } as CSSProperties)
            : undefined
        }
      />
      {items.map((item) => {
        const active = item.id === activeId;
        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className="gs-home-product-pill"
              data-active={active}
              onMouseEnter={() => onHover?.(item.id)}
              onFocus={() => onHover?.(item.id)}
            >
              {item.content}
            </Link>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            className="gs-home-product-pill"
            data-active={active}
            aria-pressed={active}
            onMouseEnter={() => onHover?.(item.id)}
            onFocus={() => onHover?.(item.id)}
            onClick={() => onSelect?.(item.id)}
          >
            {item.content}
          </button>
        );
      })}
    </nav>
  );
}

export default function PublicWorldMapStage({
  map,
  dots,
  selectedCode,
  primaryCode,
  arc,
  usAnchor,
  ariaLabel,
  pickerLabel = "查看地区",
  bubbleTone = "low",
  bubble,
  onHover,
  onSelect,
}: {
  map: { land: string; points: Record<string, number[]> };
  dots: WorldMapDot[];
  selectedCode: string | null;
  primaryCode?: string | null;
  arc?: { fromCode: string; toCode: string; key: string } | null;
  usAnchor?: ReactNode;
  ariaLabel: string;
  pickerLabel?: string;
  bubbleTone?: "low" | "high" | "baseline";
  bubble?: ReactNode;
  onHover?: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const landDot = useRef<SVGCircleElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0, dot: 12, featured: 18 });

  useEffect(() => {
    const element = stage.current;
    const dot = landDot.current;
    if (!element || !dot) return;
    const observer = new ResizeObserver(() => {
      const width = element.getBoundingClientRect().width;
      const diameter = parseFloat(getComputedStyle(element).getPropertyValue("--gs-map-land-dot"));
      if (width > 0 && diameter > 0) {
        dot.setAttribute("r", String((diameter * homepageMapWidth) / width / 2));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const dot = element.querySelector(".gs-home-point > span")?.getBoundingClientRect().width || 12;
      const featured = element.querySelector(".gs-home-low-marker")?.getBoundingClientRect().width || 18;
      setBounds((old) =>
        old.width === width && old.height === height && old.dot === dot && old.featured === featured
          ? old
          : { width, height, dot, featured },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [dots.length]);

  useEffect(() => {
    const element = bubbleRef.current;
    if (!element) return;
    const sync = () => {
      element.style.setProperty("--gs-bubble-half-width", `${element.offsetWidth / 2}px`);
      element.style.setProperty("--gs-bubble-height", `${element.offsetHeight}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selectedCode, bubble]);

  const basePoints = useMemo(() => ({ ...microRegionPoints, ...map.points }), [map.points]);

  const positions = useMemo(() => {
    if (!bounds.width || !bounds.height) return basePoints;
    const rawDots = dots.flatMap((item) => {
      const point = basePoints[item.code];
      return point
        ? [
            {
              code: item.code,
              x: (point[0] / homepageMapWidth) * bounds.width,
              y: (point[1] / homepageMapHeight) * bounds.height,
              radius: (item.pulseTone ? bounds.featured : item.tone === "monitored" ? bounds.dot * 0.75 : bounds.dot) / 2,
            },
          ]
        : [];
    });
    const spaced = Object.fromEntries(spaceHomepageMapDots(rawDots, bounds.width, bounds.height, primaryCode ?? ""));
    return { ...basePoints, ...spaced };
  }, [basePoints, bounds, dots, primaryCode]);

  const arcFrom = arc ? positions[arc.fromCode] : undefined;
  const arcTo = arc ? positions[arc.toCode] : undefined;
  const usPos = positions.US;
  const selectedPos = selectedCode ? positions[selectedCode] : undefined;

  return (
    <>
      <div className="gs-home-map-visual">
        <div ref={stage} className="gs-home-map-stage">
          <svg viewBox="0 0 600 220" role="img" aria-label={ariaLabel}>
            <defs>
              <pattern id={`${id}-dots`} width="10" height="10" patternUnits="userSpaceOnUse">
                <circle ref={landDot} cx="5" cy="5" r="1.3" fill="currentColor" className="gs-home-land" />
              </pattern>
              <clipPath id={`${id}-land`}>
                <path d={map.land} />
              </clipPath>
            </defs>
            <rect width="600" height="220" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-land)`} className="gs-home-land" />
            {arc && arcFrom && arcTo && (
              <path
                key={arc.key}
                className="gs-home-arc"
                pathLength={600}
                d={`M${arcFrom[0]},${arcFrom[1]} Q${(arcFrom[0] + arcTo[0]) / 2},${Math.min(arcFrom[1], arcTo[1]) - 64} ${arcTo[0]},${arcTo[1]}`}
              />
            )}
            <g className="gs-map-leader-lines" aria-hidden="true">
              {dots.map(({ code }) => {
                const original = basePoints[code];
                const adjusted = positions[code];
                return original && adjusted && Math.hypot(original[0] - adjusted[0], original[1] - adjusted[1]) > 0.5 ? (
                  <line key={code} x1={original[0]} y1={original[1]} x2={adjusted[0]} y2={adjusted[1]} vectorEffect="non-scaling-stroke" />
                ) : null;
              })}
            </g>
          </svg>

          {dots.map((item) => {
            const xy = positions[item.code];
            if (!xy) return null;
            const inner = (
              <>
                {!item.pulseTone && <span data-tone={item.tone} />}
                {item.badge !== undefined && item.badge > 1 && (
                  <b className="gs-map-point-badge" data-tone={item.pulseTone ?? "low"} aria-hidden="true">
                    {item.badge}
                  </b>
                )}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.code}
                  href={item.href}
                  prefetch={false}
                  className="gs-home-point"
                  data-map-region={item.code}
                  style={{ left: `${xy[0] / 6}%`, top: `${xy[1] / 2.2}%` }}
                  aria-label={item.ariaLabel}
                  onMouseEnter={() => (onHover ?? onSelect)(item.code)}
                  onFocus={() => (onHover ?? onSelect)(item.code)}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.code}
                type="button"
                className="gs-home-point"
                data-map-region={item.code}
                style={{ left: `${xy[0] / 6}%`, top: `${xy[1] / 2.2}%` }}
                aria-label={item.ariaLabel}
                aria-pressed={selectedCode === item.code}
                onMouseEnter={onHover ? () => onHover(item.code) : undefined}
                onFocus={onHover ? () => onHover(item.code) : undefined}
                onClick={() => onSelect(item.code)}
              >
                {inner}
              </button>
            );
          })}

          {dots.map((item) => {
            if (!item.pulseTone) return null;
            const xy = positions[item.code];
            if (!xy) return null;
            return (
              <span
                key={`pulse-${item.code}`}
                className="gs-home-low-marker"
                data-radar-tone={item.pulseTone}
                aria-hidden="true"
                style={{ left: `${xy[0] / 6}%`, top: `${xy[1] / 2.2}%` }}
              >
                <span className="gs-home-low-ring" data-gs-pulse={selectedCode === item.code ? "b" : "a"} />
                <span data-lowest="true" />
              </span>
            );
          })}

          {usAnchor && usPos && (
            <span className="gs-home-us" style={{ left: `${usPos[0] / 6}%`, top: `${usPos[1] / 2.2}%` }}>
              {usAnchor}
            </span>
          )}
        </div>

        {bubble && (
          <div
            ref={bubbleRef}
            className="gs-home-bubble"
            data-unmapped={!selectedPos}
            data-tone={bubbleTone}
            style={
              {
                "--gs-bubble-x": (selectedPos?.[0] ?? 300) / 6,
                "--gs-bubble-y": (selectedPos?.[1] ?? 110) / 2.2,
              } as CSSProperties
            }
          >
            {bubble}
          </div>
        )}
      </div>

      {dots.length > 0 && (
        <label className="gs-home-region-picker">
          {pickerLabel}
          <select
            aria-label={`地图${pickerLabel}`}
            value={selectedCode ?? dots[0].code}
            onChange={(event) => onSelect(event.target.value)}
          >
            {dots.map((item) => (
              <option key={item.code} value={item.code}>
                {item.regionName}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
