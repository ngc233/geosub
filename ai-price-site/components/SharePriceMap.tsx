import { useMemo } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';

import { type ProductPlan, type RegionPrice } from '../lib/public-pricing-model';
import type { SiteLocale } from '../lib/site-locale';
import { shareCopy } from './SharePriceCopy';

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

const MAP_WIDTH = 560;
const MAP_HEIGHT = 190;

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

function isAntarcticaFeature(featureItem: MapFeature) {
  const id =
    typeof featureItem.id === 'number' || typeof featureItem.id === 'string'
      ? Number(featureItem.id)
      : undefined;
  const name = featureItem.properties?.name?.toLowerCase();

  return id === 10 || name === 'antarctica';
}

export function getDiffPercent(price: number, referencePrice: number) {
  return Math.round(((price - referencePrice) / referencePrice) * 100);
}

export function getShortDiff(diffPercent: number) {
  if (diffPercent > 0) {
    return `+${diffPercent}%`;
  }

  if (diffPercent < 0) {
    return `${diffPercent}%`;
  }

  return '0%';
}

export function getReadableDiffByLocale(diffPercent: number, locale: SiteLocale) {
  const text = shareCopy[locale];
  if (diffPercent > 0) {
    return text.diffAbove(diffPercent);
  }

  if (diffPercent < 0) {
    return text.diffBelow(Math.abs(diffPercent));
  }

  return text.diffSame;
}

function getMapColor(
  region: RegionPrice | undefined,
  referencePrice: number | undefined,
  lowestPrice: number,
  highestPrice: number,
) {
  if (!region || !referencePrice) {
    return '#eef0f2';
  }

  if (Math.abs(region.priceUsd - lowestPrice) < 0.005) return '#84cc16';
  if (Math.abs(region.priceUsd - highestPrice) < 0.005) return '#c56550';

  const diff = getDiffPercent(region.priceUsd, referencePrice);

  if (diff <= -5) return '#d9edb7';
  if (diff < 5) return '#d9dddb';
  return '#ead7d2';
}

export default function ShareMiniMap({
  plan,
  referenceRegion,
  locale,
}: {
  plan: ProductPlan;
  referenceRegion: RegionPrice;
  locale: SiteLocale;
}) {
  const text = shareCopy[locale];
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
      [MAP_WIDTH, MAP_HEIGHT],
      filteredCountries
    );

    const pathGenerator = geoPath(projection);

    return {
      features,
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

  const prices = plan.regions.map((region) => region.priceUsd);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  return (
    <div data-share-price-map className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="relative">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="relative z-10 h-auto w-full"
          role="img"
          aria-label={text.mapAria(plan.name)}
        >
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="transparent" />

          {mapData.features.map((geo, index) => {
            const numericCode =
              typeof geo.id === 'number' || typeof geo.id === 'string'
                ? Number(geo.id)
                : undefined;

            const region =
              typeof numericCode === 'number' && !Number.isNaN(numericCode)
                ? regionByNumericCode.get(numericCode)
                : undefined;

            const path = mapData.pathGenerator(
              geo as unknown as GeoPermissibleObjects
            );

            if (!path) {
              return null;
            }

            return (
              <path
                key={`share-country-${index}-${String(
                  geo.id ?? geo.properties?.name ?? 'unknown'
                )}`}
                d={path}
                fill={getMapColor(
                  region,
                  referenceRegion.priceUsd,
                  lowestPrice,
                  highestPrice,
                )}
                stroke="#ffffff"
                strokeWidth={region ? 0.7 : 0.38}
                vectorEffect="non-scaling-stroke"
                opacity={region ? 1 : 0.82}
              />
            );
          })}

        </svg>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-zinc-100 px-4 py-2.5 text-[9px] font-semibold text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#84cc16]" />
          {text.cheaper}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#d9dddb]" />
          {referenceRegion.code.toUpperCase() === 'US' ? text.usBase : referenceRegion.country}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#c56550]" />
          {text.moreExpensive}
        </span>
      </div>
    </div>
  );
}
