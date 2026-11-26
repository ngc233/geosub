"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepageProductMark from "./HomepageProductMark";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import { savingsLabel } from "../lib/homepage-display";
import { parseCarouselDuration } from "../lib/carousel-duration";
import { homepageMapHeight, homepageMapWidth, spaceHomepageMapDots } from "../lib/homepage-map-spacing";
import { getDisplayCurrencyFractionDigits, isSupportedDisplayCurrency } from "../lib/display-currency";
import { getLocalizedRegionName } from "../lib/locale-format";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";

const mapUiCopy: Record<
  CanvasLocale,
  {
    heading: string;
    viewAllRegions: string;
    svgAria: (active: HomepageRepresentative) => string;
    bubbleLabel: (isLowest: boolean, isUs: boolean) => string;
    viewRegion: string;
    mapRegionAria: string;
    mapProductsAria: string;
    noteReduced: string;
    notePaused: string;
    noteRunning: string;
  }
> = {
  zh: {
    heading: "各地区价格 · App Store · 每月",
    viewAllRegions: "查看全部地区",
    svgAria: (active) => `${active.name} ${active.plan} 各地区价格地图`,
    bubbleLabel: (isLowest) => `${isLowest ? "全球最低" : "地区价格"} ·`,
    viewRegion: "查看地区",
    mapRegionAria: "地图查看地区",
    mapProductsAria: "地图产品",
    noteReduced: "已按系统设置关闭自动轮换",
    notePaused: "自动轮换已暂停",
    noteRunning: "每 4.5 秒轮换一个产品；悬停或聚焦预览，点击查看详情",
  },
  "zh-tw": {
    heading: "各地區價格 · App Store · 每月",
    viewAllRegions: "查看全部地區",
    svgAria: (active) => `${active.name} ${active.plan} 各地區價格地圖`,
    bubbleLabel: (isLowest, isUs) => `${isLowest ? "全球最低" : isUs ? "美國基準" : "地區價格"} ·`,
    viewRegion: "查看地區",
    mapRegionAria: "地圖查看地區",
    mapProductsAria: "地圖產品",
    noteReduced: "已依系統設定關閉自動輪播",
    notePaused: "自動輪播已暫停",
    noteRunning: "每 4.5 秒輪播一個產品；懸停或聚焦預覽，點擊查看詳情",
  },
  en: {
    heading: "Regional prices · App Store · Monthly",
    viewAllRegions: "View all regions",
    svgAria: (active) => `${active.planDisplayName} regional prices`,
    bubbleLabel: (isLowest, isUs) =>
      isLowest ? "Global lowest ·" : isUs ? "US baseline ·" : "Regional price ·",
    viewRegion: "View region",
    mapRegionAria: "Map region",
    mapProductsAria: "Map products",
    noteReduced: "Autoplay is off with reduced motion.",
    notePaused: "Autoplay paused · Hover or focus a product pill to preview, click to open details",
    noteRunning: "Rotates every 4.5s · Hover or focus to preview, click to open plan details",
  },
  ja: {
    heading: "地域別価格 · App Store · 月額",
    viewAllRegions: "すべての地域を見る",
    svgAria: (active) => `${active.planDisplayName} の地域別価格マップ`,
    bubbleLabel: (isLowest, isUs) =>
      `${isLowest ? "世界最安" : isUs ? "米国基準" : "地域別価格"} ·`,
    viewRegion: "地域を選択",
    mapRegionAria: "地図の表示地域",
    mapProductsAria: "対象サービス",
    noteReduced: "視差効果を減らす設定により自動切り替えはオフです",
    notePaused: "自動切り替え一時停止中 · ホバーやフォーカスでプレビュー、クリックで詳細へ",
    noteRunning: "4.5秒ごとに切り替え · ホバーでプレビュー、クリックでプラン詳細へ",
  },
  ko: {
    heading: "국가별 가격 · App Store · 월간",
    viewAllRegions: "전체 지역 보기",
    svgAria: (active) => `${active.planDisplayName} 국가별 가격 지도`,
    bubbleLabel: (isLowest, isUs) =>
      `${isLowest ? "전 세계 최저" : isUs ? "미국 기준" : "국가별 가격"} ·`,
    viewRegion: "지역 선택",
    mapRegionAria: "지도 표시 지역",
    mapProductsAria: "지도 서비스",
    noteReduced: "동작 줄이기 설정에 따라 자동 전환이 꺼져 있습니다",
    notePaused: "자동 전환 일시정지됨 · 호버·포커스로 미리보기, 클릭하여 상세 보기",
    noteRunning: "4.5초마다 자동 전환 · 호버하여 미리보기, 클릭하여 요금제 상세 보기",
  },
  es: {
    heading: "Precios regionales · App Store · Mensual",
    viewAllRegions: "Ver todas las regiones",
    svgAria: (active) => `Mapa de precios regionales de ${active.planDisplayName}`,
    bubbleLabel: (isLowest, isUs) =>
      `${isLowest ? "Mínimo global" : isUs ? "Base EE. UU." : "Precio regional"} ·`,
    viewRegion: "Ver región",
    mapRegionAria: "Región del mapa",
    mapProductsAria: "Servicios en el mapa",
    noteReduced: "La rotación automática está desactivada por reducción de movimiento.",
    notePaused: "Rotación en pausa · Pasa el cursor o enfoca para previsualizar, haz clic para abrir",
    noteRunning: "Rota cada 4,5 s · Pasa el cursor para previsualizar, haz clic para ver detalles",
  },
};

export default function HomepageMap({
  products,
  map,
  currency,
  rate,
  controls,
  locale = "zh",
  englishRegionNames,
}: {
  products: HomepageRepresentative[];
  map: { land: string; points: Record<string, number[]> };
  currency: string;
  rate: number;
  controls?: ReactNode;
  locale?: CanvasLocale;
  englishRegionNames?: Readonly<Record<string, string>>;
}) {
  const effectiveLocale: CanvasLocale = englishRegionNames ? "en" : locale;
  const spacedMap = effectiveLocale !== "zh" || Boolean(englishRegionNames);
  const copy = mapUiCopy[effectiveLocale];
  const usName = canvasUiCopy[effectiveLocale].plan.usName;
  const regionName = (code: string) =>
    englishRegionNames
      ? englishRegionNames[code] ?? code
      : getLocalizedRegionName(code, effectiveLocale) ?? code;
  const numberLocale = canvasIntlLocale(effectiveLocale);
  const fractionDigits = isSupportedDisplayCurrency(currency)
    ? getDisplayCurrencyFractionDigits(currency)
    : undefined;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const landDot = useRef<SVGCircleElement>(null);
  const id = useId();
  const active = products[index % products.length];
  const pills = useRef<HTMLElement>(null);
  const touchPoint = useRef<{ x: number; y: number } | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0, dot: 0, lowest: 0 });

  const positions = useMemo(() => {
    if (!spacedMap || !bounds.width || !bounds.height) return map.points;
    const dots = active.prices.flatMap((row) => {
      const point = map.points[row.code];
      return point
        ? [
            {
              code: row.code,
              x: (point[0] / homepageMapWidth) * bounds.width,
              y: (point[1] / homepageMapHeight) * bounds.height,
              radius: (row.code === active.lowest.code ? bounds.lowest : bounds.dot) / 2,
            },
          ]
        : [];
    });
    return Object.fromEntries(spaceHomepageMapDots(dots, bounds.width, bounds.height, active.lowest.code));
  }, [active, bounds, spacedMap, map.points]);

  const [jelly, setJelly] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    product: string;
    cycle: number;
    changed: boolean;
    origin: string;
  } | null>(null);

  useLayoutEffect(() => {
    const container = pills.current;
    if (!container) return;
    const measure = () => {
      const target = container.querySelector<HTMLElement>('.gs-home-product-pill[data-active="true"]');
      if (!target) return;
      const outer = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const box = {
        x: rect.left - outer.left + container.scrollLeft - container.clientLeft,
        y: rect.top - outer.top + container.scrollTop - container.clientTop,
        width: rect.width,
        height: rect.height,
      };
      setJelly((previous) => {
        const changed = !!previous && previous.product !== active.slug;
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
          product: active.slug,
          cycle: changed ? 1 - previous!.cycle : (previous?.cycle ?? 0),
          changed: changed || previous?.changed || false,
        };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll(".gs-home-product-pill").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [active.slug, products.length]);

  useLayoutEffect(() => {
    if (!pills.current) return;
    const container = pills.current;
    if (!container.scrollWidth || container.scrollWidth <= container.clientWidth) return;
    const target = container.querySelector<HTMLElement>('.gs-home-product-pill[data-active="true"]');
    if (!target) return;
    const box = target.getBoundingClientRect();
    const outer = container.getBoundingClientRect();
    const left = outer.left + container.clientLeft;
    const right = left + container.clientWidth;
    const offset = box.left < left - 1 ? box.left - left : box.right > right + 1 ? box.right - right : 0;
    if (offset) container.scrollBy({ left: offset, behavior: reduced ? "instant" : "smooth" });
  }, [active.slug, reduced]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduced || products.length < 2) return;
    const duration = parseCarouselDuration(getComputedStyle(root.current!).getPropertyValue("--gs-motion-carousel"));
    if (duration === null) return;
    const timer = setInterval(() => {
      if (!document.hidden) {
        setIndex((old) => (old + 1) % products.length);
        setSelected(null);
      }
    }, duration);
    return () => clearInterval(timer);
  }, [paused, reduced, products.length]);

  useEffect(() => {
    const element = bubble.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.style.setProperty("--gs-bubble-half-width", `${element.offsetWidth / 2}px`);
      element.style.setProperty("--gs-bubble-height", `${element.offsetHeight}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = stage.current;
    const dot = landDot.current;
    if (!element || !dot) return;
    const observer = new ResizeObserver(() => {
      const width = element.getBoundingClientRect().width;
      const diameter = parseFloat(getComputedStyle(element).getPropertyValue("--gs-map-land-dot"));
      if (width > 0) dot.setAttribute("r", String((diameter * 600) / width / 2));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!spacedMap || !stage.current) return;
    const element = stage.current;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const dot = element.querySelector(".gs-home-point > span")?.getBoundingClientRect().width ?? 0;
      const lowest = element.querySelector(".gs-home-low-marker")?.getBoundingClientRect().width ?? dot;
      setBounds((old) =>
        old.width === width && old.height === height && old.dot === dot && old.lowest === lowest
          ? old
          : { width, height, dot, lowest },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active.slug, spacedMap]);

  const choose = (next: number) => {
    setPaused(true);
    setIndex(next);
    setSelected(null);
  };
  const selectRegion = (code: string) => {
    setPaused(true);
    setSelected(code);
  };
  const shown = active.prices.find((row) => row.code === selected) ?? active.lowest;
  const point = positions[shown.code];
  const us = positions.US;
  const low = positions[active.lowest.code];
  const tone =
    shown.code === "US"
      ? "baseline"
      : shown.usd > active.usPrice
        ? "high"
        : shown.usd < active.usPrice
          ? "low"
          : "baseline";
  const label = copy.bubbleLabel(shown.code === active.lowest.code, shown.code === "US");

  const choosePoint = (event: MouseEvent<HTMLButtonElement>, code: string) => {
    const pointer = touchPoint.current ?? { x: event.clientX, y: event.clientY };
    touchPoint.current = null;
    if (!spacedMap || !event.detail || !stage.current) return selectRegion(code);
    let closest = event.currentTarget;
    let distance = Infinity;
    for (const button of stage.current.querySelectorAll<HTMLButtonElement>("[data-map-region]")) {
      const box = button.getBoundingClientRect();
      const candidate =
        (pointer.x - box.left - box.width / 2) ** 2 + (pointer.y - box.top - box.height / 2) ** 2;
      if (candidate < distance) {
        distance = candidate;
        closest = button;
      }
    }
    if (closest !== event.currentTarget && document.activeElement === event.currentTarget) {
      closest.focus({ preventScroll: true });
    }
    selectRegion(closest.dataset.mapRegion ?? code);
  };

  return (
    <div
      ref={root}
      className="gs-home-map"
      onMouseEnter={() => setPaused(true)}
      onFocusCapture={() => setPaused(true)}
    >
      <div className="gs-home-map-heading">
        <div>
          <strong>{copy.heading}</strong>
          <div className="gs-home-map-caption">
            <Link href={active.productHref}>{active.planDisplayName}</Link>
            <Link href={active.href} data-map-link={spacedMap || undefined}>
              {copy.viewAllRegions} <PublicIcon name="ArrowRight" size={16} />
            </Link>
          </div>
        </div>
        {controls}
      </div>
      <div className="gs-home-map-visual">
        <div ref={stage} className="gs-home-map-stage">
          <svg
            viewBox="0 0 600 220"
            role="img"
            aria-label={copy.svgAria(active)}
          >
            <defs>
              <pattern id={`${id}-dots`} width="10" height="10" patternUnits="userSpaceOnUse">
                <circle ref={landDot} cx="5" cy="5" r="1.3" fill="currentColor" className="gs-home-land" />
              </pattern>
              <clipPath id={`${id}-land`}>
                <path d={map.land} />
              </clipPath>
            </defs>
            <rect width="600" height="220" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-land)`} className="gs-home-land" />
            {us && low && (
              <path
                key={active.slug}
                className="gs-home-arc"
                pathLength={600}
                d={`M${us[0]},${us[1]} Q${(us[0] + low[0]) / 2},${Math.min(us[1], low[1]) - 70} ${low[0]},${low[1]}`}
              />
            )}
            {spacedMap && (
              <g className="gs-en-map-leaders" aria-hidden="true">
                {active.prices.map(({ code }) => {
                  const original = map.points[code];
                  const adjusted = positions[code];
                  return original &&
                    adjusted &&
                    Math.hypot(original[0] - adjusted[0], original[1] - adjusted[1]) > 0.01 ? (
                    <line
                      key={code}
                      x1={original[0]}
                      y1={original[1]}
                      x2={adjusted[0]}
                      y2={adjusted[1]}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null;
                })}
              </g>
            )}
          </svg>
          {active.prices.map((row) => {
            const xy = positions[row.code];
            if (!xy) return null;
            const tone =
              row.code === "US" || (spacedMap && row.usd === active.usPrice)
                ? "baseline"
                : row.usd >= active.usPrice
                  ? "high"
                  : row.usd <= active.usPrice / 2
                    ? "deep-low"
                    : "low";
            const difference = (row.usd / active.usPrice - 1) * 100;
            const pointAria =
              effectiveLocale === "en"
                ? `${regionName(row.code)} ${Math.round(difference)}% vs US`
                : `${regionName(row.code)} ${savingsLabel(1 - row.usd / active.usPrice, effectiveLocale)}`;
            return (
              <button
                key={row.code}
                type="button"
                className="gs-home-point"
                data-map-region={spacedMap ? row.code : undefined}
                style={{ left: `${xy[0] / 6}%`, top: `${xy[1] / 2.2}%` }}
                aria-label={pointAria}
                aria-pressed={shown.code === row.code}
                onClick={(event) => choosePoint(event, row.code)}
                onPointerDown={spacedMap ? () => { touchPoint.current = null; } : undefined}
                onPointerCancel={spacedMap ? () => { touchPoint.current = null; } : undefined}
                onPointerUp={
                  spacedMap
                    ? (event) => {
                        if (event.pointerType === "touch" && event.isPrimary) {
                          touchPoint.current = { x: event.clientX, y: event.clientY };
                        }
                      }
                    : undefined
                }
              >
                {row.code !== active.lowest.code && <span data-tone={tone} />}
              </button>
            );
          })}
          {low && (
            <span
              className="gs-home-low-marker"
              aria-hidden="true"
              style={{ left: `${low[0] / 6}%`, top: `${low[1] / 2.2}%` }}
            >
              <span className="gs-home-low-ring" data-gs-pulse={index % 2 ? "b" : "a"} />
              <span data-lowest="true" />
            </span>
          )}
          {us && (
            <span className="gs-home-us" style={{ left: `${us[0] / 6}%`, top: `${us[1] / 2.2}%` }}>
              <HomepageCountryFlag code="US" />
              {usName}{" "}
              <PublicPriceNumber
                value={active.usPrice * rate}
                currency={currency}
                locale={numberLocale}
                fractionDigits={fractionDigits}
                cycle="monthly"
                changeKey={`${index}-${currency}`}
                countIn
              />
            </span>
          )}
        </div>
        <div
          ref={bubble}
          className="gs-home-bubble"
          data-unmapped={!point}
          data-tone={tone}
          style={{ "--gs-bubble-x": (point?.[0] ?? 300) / 6, "--gs-bubble-y": (point?.[1] ?? 110) / 2.2 } as CSSProperties}
        >
          <small>
            {label} <HomepageCountryFlag code={shown.code} />
            {regionName(shown.code)}
          </small>
          <div className="gs-home-bubble-values">
            <strong>
              <PublicPriceNumber
                value={shown.usd * rate}
                currency={currency}
                locale={numberLocale}
                fractionDigits={fractionDigits}
                cycle="monthly"
                changeKey={`${index}-${currency}-${shown.code}`}
                countIn
              />
            </strong>
            <span>
              {shown.usd < active.usPrice ? "−" : shown.usd > active.usPrice ? "+" : ""}
              {Math.round(Math.abs(1 - shown.usd / active.usPrice) * 100)}%
            </span>
          </div>
        </div>
      </div>
      <label className="gs-home-region-picker">
        {copy.viewRegion}
        <select
          aria-label={copy.mapRegionAria}
          value={shown.code}
          onChange={(event) => selectRegion(event.target.value)}
        >
          {active.prices.map((row) => (
            <option key={row.code} value={row.code}>
              {regionName(row.code)}
            </option>
          ))}
        </select>
      </label>
      <nav
        ref={pills}
        className="gs-home-products"
        aria-label={copy.mapProductsAria}
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
        {products.map((product, i) => {
          const common = {
            className: "gs-home-product-pill",
            "data-active": i === index,
            onMouseEnter: () => choose(i),
            onFocus: () => choose(i),
          };
          const content = (
            <>
              <HomepageProductMark product={product} className="gs-home-product-pill-mark" />
              {product.name}
              <span className="gs-home-carousel-progress" data-running={!paused && !reduced && i === index} data-cycle={index % 2} />
            </>
          );
          return englishRegionNames ? (
            <button key={product.slug} type="button" {...common} data-product={product.slug} aria-pressed={i === index} onClick={() => choose(i)}>
              {content}
            </button>
          ) : (
            <Link key={product.slug} {...common} href={product.href} prefetch={false}>
              {content}
            </Link>
          );
        })}
      </nav>
      <p className="gs-home-carousel-note">
        {reduced ? copy.noteReduced : paused ? copy.notePaused : copy.noteRunning}
      </p>
    </div>
  );
}
