import { useMemo } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { getCountryCodeForMapFeature } from '../lib/country-map-codes';

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

  const regionByCode = useMemo(
    () => new Map(plan.regions.map((region) => [region.code.toUpperCase(), region])),
    [plan.regions],
  );

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
            const countryCode = getCountryCodeForMapFeature(geo);
            const region = countryCode ? regionByCode.get(countryCode) : undefined;

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
                data-share-map-country={region?.code || "no-data"}
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
