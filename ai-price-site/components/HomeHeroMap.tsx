"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import {
  GEO_PRICING_MAP_COLORS,
  getGeoPriceDifference,
  getGeoPriceFill,
} from "../lib/geo-pricing-map";
import { getHomepageCopy, type HomepageCopy } from "../lib/homepage-copy";
import type { SiteLocale } from "../lib/site-locale";

export type HomeMapRegion = {
  code: string;
  countryName: string;
  priceUsd: number;
  localPrice: string;
  tax: string;
};

type HomeHeroMapProps = {
  locale?: SiteLocale;
  regions: HomeMapRegion[];
  productName: string;
  planName: string;
  href: string;
};

type MapFeature = {
  id?: number | string;
  properties: { name?: string };
  geometry: unknown;
};

type WorldAtlasTopology = {
  objects: { countries: unknown };
};

type MapSelection = {
  name: string;
  region?: HomeMapRegion;
  diffPercent?: number;
  locked: boolean;
};

type MapMarker = {
  kind: "lowest" | "reference" | "highest";
  region: HomeMapRegion;
  x: number;
  y: number;
};

const WIDTH = 900;
const HEIGHT = 420;

const ISO2_TO_NUMERIC: Record<string, number> = {
  US: 840, CA: 124, MX: 484, BR: 76, AR: 32, CL: 152, CO: 170, PE: 604,
  GB: 826, IE: 372, FR: 250, DE: 276, ES: 724, IT: 380, NL: 528, BE: 56,
  CH: 756, AT: 40, DK: 208, SE: 752, NO: 578, FI: 246, PL: 616, PT: 620,
  TR: 792, JP: 392, KR: 410, CN: 156, TW: 158, HK: 344, SG: 702, MY: 458,
  TH: 764, VN: 704, ID: 360, PH: 608, IN: 356, PK: 586, AU: 36, NZ: 554,
  EG: 818, ZA: 710, NG: 566, KE: 404, SA: 682, AE: 784, IL: 376,
};

function isAntarctica(item: MapFeature) {
  const id = Number(item.id);
  return id === 10 || item.properties?.name?.toLowerCase() === "antarctica";
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function diffLabel(diffPercent: number, locale: SiteLocale, copy: HomepageCopy["map"]) {
  if (diffPercent === 0) return copy.same;
  const value = `${Math.abs(diffPercent)}%`;
  const label = diffPercent < 0 ? copy.lower : copy.higher;
  return ["en", "es", "tr", "fr", "it", "de", "pt"].includes(locale)
    ? `${value} ${label}`
    : `${label} ${value}`;
}

function selectionLabel(
  region: HomeMapRegion,
  lowest?: HomeMapRegion,
  highest?: HomeMapRegion,
  reference?: HomeMapRegion,
  copy?: HomepageCopy["map"],
) {
  const code = region.code.toUpperCase();
  if (lowest && code === lowest.code.toUpperCase()) return copy?.lowest || "全球最低价";
  if (highest && code === highest.code.toUpperCase()) return copy?.highest || "当前最高价";
  if (reference && code === reference.code.toUpperCase()) return copy?.reference || "美国基准";
  return copy?.recorded || "已收录地区";
}

function diffTextColor(diffPercent?: number) {
  if (typeof diffPercent !== "number") return "text-zinc-400";
  if (diffPercent > 0) return "text-[#a24b3a]";
  if (diffPercent < 0) return "text-[#4f7f2a]";
  return "text-zinc-600";
}

export default function HomeHeroMap({
  locale = "zh",
  regions,
  productName,
  planName,
  href,
}: HomeHeroMapProps) {
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const homepageCopy = getHomepageCopy(locale);
  const copy = homepageCopy.map;

  const mapData = useMemo(() => {
    const atlas = worldAtlas as unknown as WorldAtlasTopology;
    const countries = feature(
      worldAtlas as never,
      atlas.objects.countries as never,
    ) as unknown as GeoPermissibleObjects & { features: MapFeature[] };
    const features = countries.features.filter((item) => !isAntarctica(item));
    const collection = { ...countries, features } as typeof countries;
    const projection = geoNaturalEarth1().fitExtent(
      [[18, 14], [WIDTH - 18, HEIGHT - 14]],
      collection,
    );
    return { features, path: geoPath(projection) };
  }, []);

  const pricing = useMemo(() => {
    const sorted = [...regions]
      .filter((item) => item.priceUsd > 0)
      .sort((a, b) => a.priceUsd - b.priceUsd);
    const lowest = sorted[0];
    const highest = sorted.at(-1);
    const reference = sorted.find((item) => item.code.toUpperCase() === "US") || lowest;
    const regionByNumericCode = new Map<number, HomeMapRegion>();
    sorted.forEach((region) => {
      const numericCode = ISO2_TO_NUMERIC[region.code.toUpperCase()];
      if (numericCode) regionByNumericCode.set(numericCode, region);
    });
    return { sorted, lowest, highest, reference, regionByNumericCode };
  }, [regions]);

  const markers = useMemo(() => {
    const selected = [
      pricing.lowest ? { kind: "lowest" as const, region: pricing.lowest } : null,
      pricing.reference && pricing.reference.code !== pricing.lowest?.code
        ? { kind: "reference" as const, region: pricing.reference }
        : null,
      pricing.highest
      && pricing.highest.code !== pricing.lowest?.code
      && pricing.highest.code !== pricing.reference?.code
        ? { kind: "highest" as const, region: pricing.highest }
        : null,
    ].filter(Boolean) as Array<Pick<MapMarker, "kind" | "region">>;

    return selected.flatMap<MapMarker>(({ kind, region }) => {
      const numeric = ISO2_TO_NUMERIC[region.code.toUpperCase()];
      const country = mapData.features.find((item) => Number(item.id) === numeric);
      if (!country) return [];
      const [x, y] = mapData.path.centroid(country as unknown as GeoPermissibleObjects);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ kind, region, x, y }] : [];
    });
  }, [mapData, pricing.highest, pricing.lowest, pricing.reference]);

  const lowestDifference = pricing.lowest && pricing.reference
    ? getGeoPriceDifference(pricing.lowest.priceUsd, pricing.reference.priceUsd)
    : 0;
  const maximumSaving = Math.max(0, Math.abs(Math.min(0, lowestDifference)));
  const crossRegionSpread = pricing.lowest && pricing.highest
    ? Math.round(((pricing.highest.priceUsd - pricing.lowest.priceUsd) / pricing.lowest.priceUsd) * 100)
    : 0;
  return (
    <div
      data-home-geo-pricing
      className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] lg:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div className="relative min-w-0 overflow-hidden bg-[#fafbfa]">
        <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`${productName} ${planName} ${copy.mapLabel}`}
          onClick={() => setSelection(null)}
        >
          <g>
            {mapData.features.map((country, index) => {
              const numericCode = Number(country.id);
              const region = pricing.regionByNumericCode.get(numericCode);
              const diffPercent = region && pricing.reference
                ? getGeoPriceDifference(region.priceUsd, pricing.reference.priceUsd)
                : undefined;
              const path = mapData.path(country as unknown as GeoPermissibleObjects);
              if (!path) return null;
              const name = region?.countryName || country.properties?.name || copy.unknown;

              return (
                <path
                  key={`${country.id}-${index}`}
                  data-home-map-country={region?.code || "no-data"}
                  d={path}
                  fill={getGeoPriceFill(diffPercent)}
                  stroke={GEO_PRICING_MAP_COLORS.outline}
                  strokeWidth="0.85"
                  className={region
                    ? "cursor-pointer transition-opacity duration-200 hover:opacity-75"
                    : "cursor-default"}
                  onMouseEnter={() => setSelection({ name, region, diffPercent, locked: false })}
                  onMouseLeave={() => setSelection((current) => current?.locked ? current : null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelection({ name, region, diffPercent, locked: true });
                  }}
                >
                  <title>{region
                    ? `${name} · ${formatUsd(region.priceUsd)} · ${diffLabel(diffPercent || 0, locale, copy)}`
                    : `${name} · ${copy.noData}`}</title>
                </path>
              );
            })}
          </g>

          {markers.map((marker) => {
            const pinColor = marker.kind === "lowest"
              ? GEO_PRICING_MAP_COLORS.savingPin
              : marker.kind === "highest"
                ? GEO_PRICING_MAP_COLORS.highestPremium
                : GEO_PRICING_MAP_COLORS.benchmarkPin;
            const diffPercent = pricing.reference
              ? getGeoPriceDifference(marker.region.priceUsd, pricing.reference.priceUsd)
              : 0;
            const markerLabel = marker.kind === "lowest"
              ? copy.lowest
              : marker.kind === "highest"
                ? copy.highest
                : copy.reference;
            return (
              <g
                key={`${marker.kind}-${marker.region.code}`}
                data-home-map-pin={marker.kind}
                data-home-map-touch-target
                transform={`translate(${marker.x} ${marker.y})`}
                className={marker.kind === "highest"
                  ? "hidden"
                  : "hidden cursor-pointer outline-none sm:block"}
                role="button"
                tabIndex={0}
                aria-label={`${markerLabel} ${marker.region.countryName}, ${formatUsd(marker.region.priceUsd)}, ${diffLabel(diffPercent, locale, copy)}`}
                onMouseEnter={() => setSelection({
                  name: marker.region.countryName,
                  region: marker.region,
                  diffPercent,
                  locked: false,
                })}
                onMouseLeave={() => setSelection((current) => current?.locked ? current : null)}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelection({
                    name: marker.region.countryName,
                    region: marker.region,
                    diffPercent,
                    locked: true,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelection({
                    name: marker.region.countryName,
                    region: marker.region,
                    diffPercent,
                    locked: true,
                  });
                }}
              >
                <circle r="30" fill="transparent" pointerEvents="all" />
                <circle r="8" fill={pinColor} stroke="#ffffff" strokeWidth="3" pointerEvents="none" />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 sm:hidden" aria-label={copy.keyRegions}>
          {markers.map((marker) => {
            const pinColor = marker.kind === "lowest"
              ? GEO_PRICING_MAP_COLORS.savingPin
              : marker.kind === "highest"
                ? GEO_PRICING_MAP_COLORS.highestPremium
                : GEO_PRICING_MAP_COLORS.benchmarkPin;
            const diffPercent = pricing.reference
              ? getGeoPriceDifference(marker.region.priceUsd, pricing.reference.priceUsd)
              : 0;
            const markerLabel = marker.kind === "lowest"
              ? copy.lowest
              : marker.kind === "highest"
                ? copy.highest
                : copy.reference;

            return (
              <button
                key={`mobile-${marker.kind}-${marker.region.code}`}
                type="button"
                data-home-mobile-map-pin={marker.kind}
                className="pointer-events-auto absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-zinc-500 focus-visible:[&>span]:ring-offset-1"
                style={{
                  left: `${(marker.x / WIDTH) * 100}%`,
                  top: `${(marker.y / HEIGHT) * 100}%`,
                }}
                aria-label={`${markerLabel} ${marker.region.countryName}, ${formatUsd(marker.region.priceUsd)}, ${diffLabel(diffPercent, locale, copy)}`}
                onClick={() => setSelection({
                  name: marker.region.countryName,
                  region: marker.region,
                  diffPercent,
                  locked: true,
                })}
              >
                <span
                  className="size-5 rounded-full border-[3px] border-white shadow-[0_2px_7px_rgba(15,23,42,0.22)]"
                  style={{ backgroundColor: pinColor }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
        </div>

        {selection ? (
          <div
            data-home-map-selection
            className={`${selection.locked ? "pointer-events-auto" : "pointer-events-none"} fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] w-auto overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-900/10 sm:absolute sm:inset-x-auto sm:bottom-3 sm:start-3 sm:max-h-none sm:w-64 sm:max-w-[calc(100%-1.5rem)] sm:overflow-visible`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-zinc-900">{selection.region?.countryName || selection.name}</div>
                {selection.region ? (
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    {selectionLabel(selection.region, pricing.lowest, pricing.highest, pricing.reference, copy)}
                  </div>
                ) : null}
              </div>
              {selection.locked ? (
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                  aria-label={copy.close}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>
            {selection.region ? (
              <>
                <div className="mt-3 text-2xl font-black text-zinc-900">
                  {formatUsd(selection.region.priceUsd)}
                  <span className="ms-1 text-xs font-bold text-zinc-400">{copy.perMonth}</span>
                </div>
                <div className={`mt-2 text-sm font-black ${diffTextColor(selection.diffPercent)}`}>
                  {diffLabel(selection.diffPercent || 0, locale, copy)}
                </div>
                <div className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-5 text-zinc-500">
                  <div>{copy.localPrice}: {selection.region.localPrice}</div>
                  <div>{copy.tax}: {selection.region.tax}</div>
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-zinc-500">{copy.noData}</div>
            )}
          </div>
        ) : null}
      </div>

      <aside className="flex flex-col border-t border-zinc-200 bg-white p-4 sm:p-5 lg:border-s lg:border-t-0">
        <div className="border-b border-zinc-100 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{copy.currentComparison}</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">{productName}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{planName} · {copy.convertedMonthly}</p>
        </div>

        <div className="py-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-lime-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#84cc16]" aria-hidden="true" />
            {copy.lowest}
          </p>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
            <div>
              <div className="text-[15px] font-semibold text-lime-600">{pricing.lowest?.countryName || copy.noData}</div>
              <div className="mt-0.5 text-xs font-medium text-lime-700">{maximumSaving ? diffLabel(-maximumSaving, locale, copy) : copy.same}</div>
            </div>
            <div className="text-end text-2xl font-semibold leading-none tabular-nums text-lime-600">{pricing.lowest ? formatUsd(pricing.lowest.priceUsd) : "—"}</div>
          </div>
        </div>

        <dl className="divide-y divide-zinc-100 border-y border-zinc-100 text-xs">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-500">{copy.reference}</dt>
            <dd className="font-semibold text-zinc-900">{pricing.reference ? `${pricing.reference.countryName} · ${formatUsd(pricing.reference.priceUsd)}` : "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="flex items-center gap-1.5 text-[#a24b3a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c56550]" aria-hidden="true" />
              {copy.highest}
            </dt>
            <dd className="font-semibold text-[#a24b3a]">{pricing.highest ? `${pricing.highest.countryName} · ${formatUsd(pricing.highest.priceUsd)}` : "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-500">{homepageCopy.maxSpread}</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">{crossRegionSpread}%</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-500">{copy.verifiedRegions}</dt>
            <dd className="font-semibold text-zinc-900">{pricing.sorted.length}{copy.regionsSuffix ? ` ${copy.regionsSuffix}` : ""}</dd>
          </div>
        </dl>

        <Link
          href={href}
          className="mt-4 inline-flex min-h-10 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-800 transition-[background-color,border-color,color] hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          {locale === "zh" || locale === "zh-tw"
            ? `查看 ${productName} ${copy.viewDetails}`
            : locale === "ja"
              ? `${productName}の${copy.viewDetails}`
              : locale === "ar"
                ? `${copy.viewDetails} ${productName}`
                : `${productName} ${copy.viewDetails}`} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
