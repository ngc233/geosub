"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import {
  formatUsd,
  type ProductPlan,
  type RegionPrice,
} from "../lib/public-pricing-model";
import {
  getDetailMapCopy,
  getDetailModuleCopy,
  type DetailLocale,
} from "../lib/detail-page-copy";
import {
  GEO_PRICING_MAP_COLORS,
  getGeoPriceDifference,
  getGeoPriceFill,
} from "../lib/geo-pricing-map";

type PriceWorldMapProps = {
  plan: ProductPlan;
  locale?: DetailLocale;
  compact?: boolean;
  formatPrice?: (value: number) => string;
};

type MapFeature = {
  id?: number | string;
  properties: {
    name?: string;
  };
  geometry: unknown;
};

type WorldAtlasTopology = {
  objects: {
    countries: unknown;
  };
};

function isAntarcticaFeature(featureItem: MapFeature) {
  const id =
    typeof featureItem.id === "number" || typeof featureItem.id === "string"
      ? Number(featureItem.id)
      : undefined;
  const name = featureItem.properties?.name?.toLowerCase();

  return id === 10 || name === "antarctica";
}

type HoverInfo = {
  x: number;
  y: number;
  name: string;
  region?: RegionPrice;
  diffPercent?: number;
  locked?: boolean;
};

type ViewState = {
  scale: number;
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  viewX: number;
  viewY: number;
};

type KeyMarker = {
  key: string;
  kind: "min" | "reference";
  region: RegionPrice;
  x: number;
  y: number;
  diffPercent: number;
};

const WIDTH = 900;
const HEIGHT = 430;

function getInitialViewState(): ViewState {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  const scale = mobile ? 1.35 : 1;
  return {
    scale,
    x: (WIDTH * (1 - scale)) / 2,
    y: (HEIGHT * (1 - scale)) / 2,
  };
}

const ISO2_TO_NUMERIC: Record<string, number> = {
  US: 840,
  CA: 124,
  MX: 484,
  BR: 76,
  AR: 32,
  CL: 152,
  CO: 170,
  PE: 604,

  GB: 826,
  IE: 372,
  FR: 250,
  DE: 276,
  ES: 724,
  IT: 380,
  NL: 528,
  BE: 56,
  CH: 756,
  AT: 40,
  DK: 208,
  SE: 752,
  NO: 578,
  FI: 246,
  PL: 616,
  PT: 620,
  TR: 792,

  JP: 392,
  KR: 410,
  CN: 156,
  TW: 158,
  HK: 344,
  SG: 702,
  MY: 458,
  TH: 764,
  VN: 704,
  ID: 360,
  PH: 608,
  IN: 356,
  PK: 586,

  AU: 36,
  NZ: 554,

  EG: 818,
  ZA: 710,
  NG: 566,
  KE: 404,

  SA: 682,
  AE: 784,
  IL: 376,
};

function getCountryNumericCode(code: string) {
  return ISO2_TO_NUMERIC[code.toUpperCase()];
}

function getCountryColor(region?: RegionPrice, referencePrice?: number) {
  if (!region || !referencePrice) return getGeoPriceFill();
  return getGeoPriceFill(getGeoPriceDifference(region.priceUsd, referencePrice));
}

function getDiffLabel(
  diffPercent: number | undefined,
  copy: ReturnType<typeof getDetailMapCopy>
) {
  if (typeof diffPercent !== "number") return copy.noPriceData;
  if (diffPercent === 0) return copy.sameAsBenchmark;
  if (diffPercent > 0) return copy.moreExpensive(diffPercent);
  return copy.cheaper(diffPercent);
}

function getDiffTextColor(diffPercent?: number) {
  if (typeof diffPercent !== "number") return "text-zinc-400";
  if (diffPercent > 0) return "text-[#a24b3a] dark:text-[#f0a08f]";
  if (diffPercent < 0) return "text-[#4f7f2a] dark:text-[#bef264]";
  return "text-zinc-600 dark:text-zinc-300";
}

function getSummaryLabel({
  region,
  minRegion,
  maxRegion,
  referenceRegion,
  copy,
}: {
  region: RegionPrice;
  minRegion?: RegionPrice;
  maxRegion?: RegionPrice;
  referenceRegion?: RegionPrice;
  copy: ReturnType<typeof getDetailMapCopy>;
}) {
  const code = region.code.toUpperCase();

  if (minRegion && code === minRegion.code.toUpperCase()) {
    return copy.lowest;
  }

  if (maxRegion && code === maxRegion.code.toUpperCase()) {
    return copy.highest;
  }

  if (referenceRegion && code === referenceRegion.code.toUpperCase()) {
    return copy.reference;
  }

  return copy.recorded;
}

export default function PriceWorldMap({
  plan,
  locale = "zh",
  compact = false,
  formatPrice = formatUsd,
}: PriceWorldMapProps) {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [view, setView] = useState<ViewState>(getInitialViewState);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const mapCopy = getDetailMapCopy(locale);
  const heatmapCopy = getDetailModuleCopy(locale, "priceHeatmap", {
    planName: plan.name,
  });

  const mapData = useMemo(() => {
    const atlas = worldAtlas as unknown as WorldAtlasTopology;
    const countries = feature(
      worldAtlas as never,
      atlas.objects.countries as never
    ) as unknown as GeoPermissibleObjects & { features: MapFeature[] };

    const features = countries.features.filter(
      (featureItem) => !isAntarcticaFeature(featureItem)
    );
    const filteredCountries = {
      ...countries,
      features,
    } as typeof countries;
    const projection = geoNaturalEarth1().fitSize(
      [WIDTH, HEIGHT],
      filteredCountries
    );
    const pathGenerator = geoPath(projection);

    return {
      countries: filteredCountries,
      features,
      projection,
      pathGenerator,
    };
  }, []);

  const regionByNumericCode = useMemo(() => {
    const map = new Map<number, RegionPrice>();

    plan.regions.forEach((region) => {
      const numericCode = getCountryNumericCode(region.code);

      if (numericCode) {
        map.set(numericCode, region);
      }
    });

    return map;
  }, [plan.regions]);

  const sortedRegions = useMemo(
    () => [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd),
    [plan.regions]
  );

  const usRegion = plan.regions.find(
    (region) => region.code.toUpperCase() === "US"
  );

  const referenceRegion = usRegion || sortedRegions[0];
  const referencePrice = referenceRegion?.priceUsd;
  const minRegion = sortedRegions[0];
  const maxRegion = sortedRegions[sortedRegions.length - 1];

  const keyMarkers = useMemo(() => {
    if (!referencePrice) return [];

    const selected = [
      minRegion ? { kind: "min" as const, region: minRegion } : null,
      referenceRegion &&
      (!minRegion ||
        referenceRegion.code.toUpperCase() !== minRegion.code.toUpperCase())
        ? { kind: "reference" as const, region: referenceRegion }
        : null,
    ].filter(Boolean) as Array<{
      kind: KeyMarker["kind"];
      region: RegionPrice;
    }>;

    return selected
      .map(({ kind, region }) => {
        const numericCode = getCountryNumericCode(region.code);
        const geo = mapData.features.find((featureItem) => {
          const id =
            typeof featureItem.id === "number" ||
            typeof featureItem.id === "string"
              ? Number(featureItem.id)
              : undefined;

          return id === numericCode;
        });

        if (!geo) return null;

        const centroid = mapData.pathGenerator.centroid(
          geo as unknown as GeoPermissibleObjects
        );

        if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) {
          return null;
        }

        return {
          key: `${kind}-${region.code}`,
          kind,
          region,
          x: centroid[0],
          y: centroid[1],
          diffPercent: getGeoPriceDifference(region.priceUsd, referencePrice),
        };
      })
      .filter(Boolean) as KeyMarker[];
  }, [mapData.features, mapData.pathGenerator, minRegion, referencePrice, referenceRegion]);

  const markersAreClose = keyMarkers.length === 2
    && Math.hypot(
      keyMarkers[0].x - keyMarkers[1].x,
      keyMarkers[0].y - keyMarkers[1].y,
    ) < 130;
  const maximumSaving = minRegion && referenceRegion
    ? Math.max(0, -getGeoPriceDifference(minRegion.priceUsd, referenceRegion.priceUsd))
    : 0;
  const highestDifference = maxRegion && referenceRegion
    ? getGeoPriceDifference(maxRegion.priceUsd, referenceRegion.priceUsd)
    : 0;

  const zoomIn = () => {
    setView((current) => ({
      ...current,
      scale: Math.min(current.scale + 0.35, 3),
    }));
  };

  const zoomOut = () => {
    setView((current) => ({
      ...current,
      scale: Math.max(current.scale - 0.35, 1),
    }));
  };

  const resetView = () => {
    setView(getInitialViewState());
  };

  return (
    <section
      className={
        compact
          ? "overflow-hidden rounded-xl bg-white dark:bg-zinc-900/50"
          : "overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
      }
    >
      {!compact ? (
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h2 className="text-lg font-semibold leading-tight text-zinc-950 md:text-[20px] dark:text-white">
            {heatmapCopy.title}
          </h2>

          {heatmapCopy.description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {heatmapCopy.description}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="text-[11px] font-black text-zinc-400">
              {mapCopy.currentBenchmark}
            </div>

            <div className="mt-0.5 font-black text-zinc-900 dark:text-white">
              {referenceRegion?.country || mapCopy.none}
              {referencePrice ? ` · ${formatPrice(referencePrice)}${mapCopy.perMonth}` : ""}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="text-[11px] font-black text-zinc-400">
              {mapCopy.covered}
            </div>

            <div className="mt-0.5 font-black text-zinc-900 dark:text-white">
              {plan.regions.length} {mapCopy.regionsSuffix}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {!usRegion ? (
        <div className="mx-5 mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 md:mx-6">
          {mapCopy.noUsBenchmarkNotice}
        </div>
      ) : null}

      <div
        data-detail-geo-pricing
        className={
          compact
            ? "grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-900/70 lg:grid-cols-[minmax(0,1fr)_280px]"
            : "mx-4 mt-5 grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-900/70 lg:grid-cols-[minmax(0,1fr)_280px] md:mx-6"
        }
      >
      <div className="relative min-w-0 overflow-hidden bg-[#fafbfa] dark:bg-zinc-950/40">
        <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white/85 p-0.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 md:right-4 md:top-4 md:gap-1 md:p-1">
          <button
            type="button"
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white md:h-9 md:w-9"
            aria-label={mapCopy.zoomOutAria}
          >
            <Minus size={15} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            onClick={resetView}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white md:h-9 md:w-9"
            aria-label={mapCopy.resetAria}
          >
            <RotateCcw size={15} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white md:h-9 md:w-9"
            aria-label={mapCopy.zoomInAria}
          >
            <Plus size={15} strokeWidth={2.4} />
          </button>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={`w-full select-none ${
            compact ? "h-[320px] sm:h-[400px]" : "h-[300px] md:h-auto"
          } ${
            dragState ? "cursor-grabbing" : "cursor-grab"
          }`}
          role="img"
          aria-label={mapCopy.mapAria(plan.name)}
          onPointerDown={(event) => {
            setDragState({
              startX: event.clientX,
              startY: event.clientY,
              viewX: view.x,
              viewY: view.y,
            });

            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragState) return;

            setView((current) => ({
              ...current,
              x: dragState.viewX + event.clientX - dragState.startX,
              y: dragState.viewY + event.clientY - dragState.startY,
            }));
          }}
          onPointerUp={(event) => {
            setDragState(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            setDragState(null);
          }}
        >
          <rect
            width={WIDTH}
            height={HEIGHT}
            fill="transparent"
            onClick={() => setHoverInfo(null)}
          />

          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {mapData.features.map((geo, index) => {
              const numericCode =
                typeof geo.id === "number" || typeof geo.id === "string"
                  ? Number(geo.id)
                  : undefined;

              const region =
                typeof numericCode === "number" && !Number.isNaN(numericCode)
                  ? regionByNumericCode.get(numericCode)
                  : undefined;

              const diffPercent =
                region && referencePrice
                  ? getGeoPriceDifference(region.priceUsd, referencePrice)
                  : undefined;

              const path = mapData.pathGenerator(
                geo as unknown as GeoPermissibleObjects
              );

              if (!path) return null;

              const uniqueKey = `country-${index}-${String(
                geo.id ?? geo.properties?.name ?? "unknown"
              )}`;

              return (
                <path
                  key={uniqueKey}
                  data-detail-map-country={region?.code || "no-data"}
                  d={path}
                  fill={getCountryColor(region, referencePrice)}
                  stroke={GEO_PRICING_MAP_COLORS.outline}
                  strokeWidth={region ? 0.9 : 0.55}
                  vectorEffect="non-scaling-stroke"
                  className={[
                    "transition-all duration-200 ease-out",
                    region
                      ? "cursor-pointer hover:opacity-85"
                      : "cursor-default",
                  ].join(" ")}
                  onMouseEnter={(event) => {
                    setHoverInfo({
                      x: event.clientX,
                      y: event.clientY,
                      name: geo.properties?.name || "Unknown",
                      region,
                      diffPercent,
                      locked: false,
                    });
                  }}
                  onMouseMove={(event) => {
                    setHoverInfo((current) => {
                      if (!current || current.locked) return current;

                      return {
                        ...current,
                        x: event.clientX,
                        y: event.clientY,
                      };
                    });
                  }}
                  onMouseLeave={() => {
                    setHoverInfo((current) => {
                      if (current?.locked) return current;
                      return null;
                    });
                  }}
                  onClick={(event) => {
                    event.stopPropagation();

                    setHoverInfo({
                      x: event.clientX,
                      y: event.clientY,
                      name: geo.properties?.name || "Unknown",
                      region,
                      diffPercent,
                      locked: true,
                    });
                  }}
                />
              );
            })}

            {keyMarkers.map((marker) => {
              const forceLeft = markersAreClose && marker.kind === "min";
              const labelOnLeft = forceLeft || (!markersAreClose && marker.x > WIDTH * 0.72);
              const labelX = labelOnLeft ? -89 : 13;
              const pinColor = marker.kind === "min"
                ? GEO_PRICING_MAP_COLORS.savingPin
                : GEO_PRICING_MAP_COLORS.benchmarkPin;

              return (
                <g
                  key={marker.key}
                  data-detail-map-pin={marker.kind}
                  transform={`translate(${marker.x} ${marker.y})`}
                  pointerEvents="none"
                >
                  <line
                    x1={labelOnLeft ? -7 : 7}
                    y1="0"
                    x2={labelOnLeft ? -10 : 10}
                    y2="0"
                    stroke={pinColor}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="7"
                    fill="#ffffff"
                    stroke={pinColor}
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                  <g transform={`translate(${labelX} -13)`}>
                    <rect
                      width="76"
                      height="26"
                      rx="8"
                      fill="#ffffff"
                      stroke="#d7dcd7"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x="38"
                      y="17"
                      textAnchor="middle"
                      fill="#3f4742"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {marker.kind === "min" ? mapCopy.lowest : mapCopy.reference} · {marker.region.code.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {hoverInfo ? (
          <div
            data-detail-map-selection
            className={hoverInfo.locked
              ? "pointer-events-auto absolute bottom-3 left-3 right-3 z-50 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30 sm:right-auto sm:w-64"
              : "pointer-events-none fixed z-50 hidden w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30 md:block"}
            style={hoverInfo.locked ? undefined : {
              left: typeof window !== "undefined"
                ? Math.min(hoverInfo.x + 16, window.innerWidth - 280)
                : hoverInfo.x + 16,
              top: typeof window !== "undefined"
                ? Math.min(hoverInfo.y + 16, window.innerHeight - 190)
                : hoverInfo.y + 16,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-zinc-900 dark:text-white">
                  {hoverInfo.region?.country || hoverInfo.name}
                </div>

                {hoverInfo.region ? (
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    {getSummaryLabel({
                      region: hoverInfo.region,
                      minRegion,
                      maxRegion,
                      referenceRegion,
                      copy: mapCopy,
                    })}
                  </div>
                ) : null}
              </div>

              {hoverInfo.locked ? (
                <button
                  type="button"
                  onClick={() => setHoverInfo(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                  aria-label={mapCopy.closeDetail}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>

            {hoverInfo.region ? (
              <>
                <div className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
                  {formatPrice(hoverInfo.region.priceUsd)}
                  <span className="ml-1 text-xs font-bold text-zinc-400">
                    {mapCopy.perMonth}
                  </span>
                </div>

                <div
                  className={`mt-2 text-sm font-black ${getDiffTextColor(
                    hoverInfo.diffPercent
                  )}`}
                >
                  {getDiffLabel(hoverInfo.diffPercent, mapCopy)}
                </div>

                <div className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div>
                    {mapCopy.localPrice}：{hoverInfo.region.localPrice}
                  </div>
                  <div>
                    {mapCopy.tax}：{hoverInfo.region.tax}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {mapCopy.noRegionPrice}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <aside className="flex flex-col border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5 lg:border-l lg:border-t-0">
        <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{mapCopy.covered}</p>
          <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">
            {plan.regions.length} {mapCopy.regionsSuffix}
          </div>
        </div>

        <div className="py-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-lime-600 dark:text-lime-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#84cc16]" aria-hidden="true" />
            {mapCopy.lowest}
          </p>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
            <div>
              <div className="text-[15px] font-semibold text-lime-600 dark:text-lime-400">{minRegion?.country || mapCopy.none}</div>
              <div className="mt-0.5 text-xs font-medium text-lime-700 dark:text-lime-300">
                {maximumSaving ? getDiffLabel(-maximumSaving, mapCopy) : mapCopy.sameAsBenchmark}
              </div>
            </div>
            <div className="text-right text-2xl font-semibold leading-none tabular-nums text-lime-600 dark:text-lime-400">
              {minRegion ? formatPrice(minRegion.priceUsd) : "—"}
            </div>
          </div>
        </div>

        <dl className="divide-y divide-zinc-100 border-y border-zinc-100 text-xs dark:divide-zinc-800 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-500 dark:text-zinc-400">{mapCopy.reference}</dt>
            <dd className="font-semibold text-zinc-900 dark:text-white">{referenceRegion ? `${referenceRegion.country} · ${formatPrice(referenceRegion.priceUsd)}` : "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="flex items-center gap-1.5 text-[#a24b3a] dark:text-[#f0a08f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c56550]" aria-hidden="true" />
              {mapCopy.highest}
            </dt>
            <dd className="text-right font-semibold text-[#a24b3a] dark:text-[#f0a08f]">
              {maxRegion ? `${maxRegion.country} · ${formatPrice(maxRegion.priceUsd)}` : "—"}
              {highestDifference > 0 ? <span className="mt-0.5 block text-[10px] font-medium text-[#a24b3a] dark:text-[#f0a08f]">{getDiffLabel(highestDifference, mapCopy)}</span> : null}
            </dd>
          </div>
        </dl>

        <p className="mt-auto pt-4 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
          {heatmapCopy.description}
        </p>
      </aside>
      </div>

      <div className={compact ? "px-1 pb-1 pt-4" : "px-5 pb-6 pt-5 md:px-6"}>
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>{mapCopy.cheaperLegend}</span>
          <span>{mapCopy.benchmarkLegend}</span>
          <span>{mapCopy.expensiveLegend}</span>
        </div>

        <div className="grid h-3 grid-cols-5 overflow-hidden rounded-full" aria-hidden="true">
          <span style={{ backgroundColor: GEO_PRICING_MAP_COLORS.deepestSaving }} />
          <span style={{ backgroundColor: GEO_PRICING_MAP_COLORS.saving }} />
          <span style={{ backgroundColor: GEO_PRICING_MAP_COLORS.nearBenchmark }} />
          <span style={{ backgroundColor: GEO_PRICING_MAP_COLORS.aboveBenchmark }} />
          <span style={{ backgroundColor: GEO_PRICING_MAP_COLORS.highestPremium }} />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-zinc-400">
          <span>-40%</span>
          <span>-20%</span>
          <span>0%</span>
          <span>+20%</span>
          <span>+40%</span>
        </div>
      </div>
    </section>
  );
}
