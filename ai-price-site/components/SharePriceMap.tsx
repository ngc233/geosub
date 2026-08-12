import { useMemo } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';

import { formatUsd, type ProductPlan, type RegionPrice } from '../lib/public-pricing-model';
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

function getMapColor(region?: RegionPrice, referencePrice?: number) {
  if (!region || !referencePrice) {
    return '#ebe8df';
  }

  const diff = getDiffPercent(region.priceUsd, referencePrice);

  if (diff <= -25) return '#22c55e';
  if (diff <= -8) return '#86efac';
  if (diff < 8) return '#facc15';
  if (diff < 25) return '#fb923c';
  return '#f43f5e';
}

function getLabelTheme(diffPercent: number) {
  if (diffPercent < -5) {
    return {
      bg: '#ecfdf3',
      border: '#22c55e',
      text: '#15803d',
      price: '#166534',
    };
  }

  if (diffPercent > 5) {
    return {
      bg: '#fff1f2',
      border: '#fb7185',
      text: '#e11d48',
      price: '#be123c',
    };
  }

  return {
    bg: '#fffbeb',
    border: '#f59e0b',
    text: '#b45309',
    price: '#92400e',
  };
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

  const labelItems = useMemo(() => {
    const importantCodes = ['US', 'PH', 'PK', 'CA', 'JP', 'GB', 'DE', 'DK'];

    return mapData.features
      .map((geo, index) => {
        const numericCode =
          typeof geo.id === 'number' || typeof geo.id === 'string'
            ? Number(geo.id)
            : undefined;

        const region =
          typeof numericCode === 'number' && !Number.isNaN(numericCode)
            ? regionByNumericCode.get(numericCode)
            : undefined;

        if (!region || !importantCodes.includes(region.code.toUpperCase())) {
          return null;
        }

        const centroid = mapData.pathGenerator.centroid(
          geo as unknown as GeoPermissibleObjects
        );

        if (!centroid || Number.isNaN(centroid[0]) || Number.isNaN(centroid[1])) {
          return null;
        }

        const diffPercent = getDiffPercent(
          region.priceUsd,
          referenceRegion.priceUsd
        );

        const offsetMap: Record<string, { x: number; y: number }> = {
          US: { x: -12, y: -20 },
          PH: { x: 28, y: 18 },
          PK: { x: -12, y: -20 },
          CA: { x: -12, y: -20 },
          JP: { x: 28, y: 0 },
          GB: { x: -8, y: -23 },
          DE: { x: 22, y: 0 },
          DK: { x: 14, y: -22 },
        };

        const offset = offsetMap[region.code.toUpperCase()] || {
          x: 0,
          y: -18,
        };

        return {
          key: `share-label-${index}-${region.code}`,
          region,
          diffPercent,
          x: centroid[0] + offset.x,
          y: centroid[1] + offset.y,
        };
      })
      .filter(Boolean) as {
      key: string;
      region: RegionPrice;
      diffPercent: number;
      x: number;
      y: number;
    }[];
  }, [mapData.features, mapData.pathGenerator, referenceRegion.priceUsd, regionByNumericCode]);

  return (
    <div className="mt-5 overflow-hidden rounded-[22px] border border-zinc-200 bg-[#fbfaf7]">
      <div className="relative">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdf8_0%,#fbfaf7_100%)]" />

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
                fill={getMapColor(region, referenceRegion.priceUsd)}
                stroke="#ffffff"
                strokeWidth={region ? 0.7 : 0.38}
                vectorEffect="non-scaling-stroke"
                opacity={region ? 1 : 0.82}
              />
            );
          })}

          {labelItems.map((item) => {
            const theme = getLabelTheme(item.diffPercent);
            const labelWidth = 62;
            const labelHeight = 26;
            const x = item.x - labelWidth / 2;
            const y = item.y - labelHeight / 2;

            return (
              <g key={item.key}>
                <rect
                  x={x}
                  y={y}
                  width={labelWidth}
                  height={labelHeight}
                  rx={7}
                  fill={theme.bg}
                  stroke={theme.border}
                  strokeWidth={0.8}
                />

                <text
                  x={item.x}
                  y={item.y - 3}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={900}
                  fill={theme.text}
                >
                  {item.region.code} · {getShortDiff(item.diffPercent)}
                </text>

                <text
                  x={item.x}
                  y={item.y + 8}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight={900}
                  fill={theme.price}
                >
                  {formatUsd(item.region.priceUsd)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="px-4 pb-4">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-green-500 via-amber-300 to-rose-500" />
        <div className="mt-1.5 flex justify-between text-[9px] font-black text-zinc-400">
          <span>{text.cheaper}</span>
          <span>
            {referenceRegion.code.toUpperCase() === 'US'
              ? text.usBase
              : referenceRegion.country}
          </span>
          <span>{text.moreExpensive}</span>
        </div>
      </div>
    </div>
  );
}
