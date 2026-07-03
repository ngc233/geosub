'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import { toPng } from 'html-to-image';
import { Share2 } from 'lucide-react';
import worldAtlas from 'world-atlas/countries-110m.json';

import {
  formatUsd,
  type PlanStats,
  type ProductPlan,
  type RegionPrice,
  type SubscriptionProduct,
} from '../data/ai-pricing';

type SharePriceModalProps = {
  product: SubscriptionProduct;
  plan: ProductPlan;
  stats: PlanStats;
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

function getDiffPercent(price: number, referencePrice: number) {
  return Math.round(((price - referencePrice) / referencePrice) * 100);
}

function getShortDiff(diffPercent: number) {
  if (diffPercent > 0) {
    return `+${diffPercent}%`;
  }

  if (diffPercent < 0) {
    return `${diffPercent}%`;
  }

  return '0%';
}

function getReadableDiff(diffPercent: number) {
  if (diffPercent > 0) {
    return `比美国贵 ${diffPercent}%`;
  }

  if (diffPercent < 0) {
    return `比美国便宜 ${Math.abs(diffPercent)}%`;
  }

  return '与美国价格相同';
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

function ShareMiniMap({
  plan,
  referenceRegion,
}: {
  plan: ProductPlan;
  referenceRegion: RegionPrice;
}) {
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
          aria-label={`${plan.name} 分享地图`}
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
          <span>更便宜</span>
          <span>美国基准</span>
          <span>更贵</span>
        </div>
      </div>
    </div>
  );
}

export default function SharePriceModal({
  product,
  plan,
  stats,
}: SharePriceModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [copyText, setCopyText] = useState('复制链接');
  const [downloading, setDownloading] = useState(false);

  const sortedRegions = useMemo(
    () => [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd),
    [plan.regions]
  );

  const cheapRegions = sortedRegions.slice(0, 3);
  const expensiveRegions = [...sortedRegions].reverse().slice(0, 3);

  const referenceRegion =
    plan.regions.find((region) => region.code.toUpperCase() === 'US') ||
    stats.referenceRegion;

  const cheapDiff = getDiffPercent(
    stats.minRegion.priceUsd,
    referenceRegion.priceUsd
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyText('已复制');
      window.setTimeout(() => setCopyText('复制链接'), 1600);
    } catch {
      setCopyText('复制失败');
      window.setTimeout(() => setCopyText('复制链接'), 1600);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) {
      return;
    }

    try {
      setDownloading(true);

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#fffaf3',
      });

      const link = document.createElement('a');
      link.download = `${product.slug}-${plan.slug}-price-card.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleSocialShare = (platform: 'x' | 'facebook' | 'telegram' | 'reddit') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      `${product.name} ${plan.name} 全球订阅价格对比：最低 ${formatUsd(
        stats.minRegion.priceUsd
      )}，最高 ${formatUsd(stats.maxRegion.priceUsd)}，价差 ${stats.spreadPercent}%。`
    );

    const shareUrls = {
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    };

    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center justify-center gap-2 rounded-xl border border-lime-300 bg-lime-50 px-3.5 py-2 text-sm font-semibold text-lime-900 transition-colors hover:border-lime-400 hover:bg-lime-100 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200 dark:hover:bg-lime-500/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-lime-800 transition-colors dark:bg-lime-950/30 dark:text-lime-200">
          <Share2 className="h-4 w-4" strokeWidth={2.2} />
        </span>

        <span>分享价格图</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4 py-8 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[450px] overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-zinc-950/25"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <div className="text-lg font-black tracking-tight text-zinc-950">
                分享 {product.name} 价格
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                aria-label="关闭弹窗"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="rounded-[28px] border border-zinc-200 bg-[#fffaf3] p-2 shadow-sm">
                <div
                  className="origin-top-left"
                  style={{
                    marginBottom: '-220px',
                    transform: 'scale(0.7)',
                    width: '142.86%',
                  }}
                >
                  <div
                    ref={cardRef}
                    className="w-full rounded-[26px] bg-[#fffaf3] p-5 text-zinc-950"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">
                        <span className="h-[3px] w-10 rounded-full bg-blue-500" />
                        {product.brand} · 全球 · {product.updatedAt}
                      </div>

                      <h2 className="mt-3 text-[32px] font-black leading-[0.95] tracking-tight text-zinc-950">
                        {product.name} 各地区价格
                      </h2>

                      <div className="mt-3 inline-flex max-w-full items-center rounded-md bg-zinc-950 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] text-white">
                        {plan.name} 套餐 · 美国基准 {formatUsd(referenceRegion.priceUsd)}
                      </div>
                    </div>

                  <ShareMiniMap
                    plan={plan}
                    referenceRegion={referenceRegion}
                  />

                  <div className="mt-4 rounded-[22px] border border-lime-100 bg-gradient-to-r from-lime-100 to-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wide text-lime-700">
                          最低价地区
                        </div>

                        <div className="mt-2 flex items-end gap-3">
                          <div className="text-[42px] font-black leading-none text-zinc-950">
                            {stats.minRegion.code}
                          </div>

                          <div className="pb-1">
                            <div className="text-xl font-black leading-none text-zinc-950">
                              {stats.minRegion.country}
                            </div>
                            <div className="mt-1 text-xs font-bold text-zinc-500">
                              {getReadableDiff(cheapDiff)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[34px] font-black leading-none text-lime-700">
                          {formatUsd(stats.minRegion.priceUsd)}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-zinc-500">
                          /mo
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="my-4 text-center text-sm font-bold italic text-zinc-600">
                    “{stats.minRegion.country} 比 {stats.maxRegion.country} 便宜约{' '}
                    <span className="text-rose-500">
                      {stats.spreadPercent}%
                    </span>
                    。”
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-lime-100 bg-lime-50 p-3">
                      <div className="mb-2 text-[10px] font-black tracking-wide text-lime-700">
                        ↓ 最便宜
                      </div>

                      <div className="space-y-2">
                        {cheapRegions.map((region) => {
                          const diff = getDiffPercent(
                            region.priceUsd,
                            referenceRegion.priceUsd
                          );

                          return (
                            <div
                              key={`${region.code}-cheap-share`}
                              className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-xs"
                            >
                              <span className="min-w-0 truncate font-black text-zinc-900">
                                {region.code} · {region.country}
                              </span>
                              <span className="font-black text-lime-700">
                                {formatUsd(region.priceUsd)}
                                <span className="ml-1 text-[10px]">
                                  {getShortDiff(diff)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-rose-100 bg-rose-50 p-3">
                      <div className="mb-2 text-[10px] font-black tracking-wide text-rose-600">
                        ↑ 最贵
                      </div>

                      <div className="space-y-2">
                        {expensiveRegions.map((region) => {
                          const diff = getDiffPercent(
                            region.priceUsd,
                            referenceRegion.priceUsd
                          );

                          return (
                            <div
                              key={`${region.code}-expensive-share`}
                              className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-xs"
                            >
                              <span className="min-w-0 truncate font-black text-zinc-900">
                                {region.code} · {region.country}
                              </span>
                              <span className="font-black text-rose-600">
                                {formatUsd(region.priceUsd)}
                                <span className="ml-1 text-[10px]">
                                  {getShortDiff(diff)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 border-t border-orange-100 pt-3 text-[10px] font-bold text-zinc-400">
                    <span className="h-3 w-3 rounded bg-blue-500" />
                    <span>
                      GeoSub · 数据校验于 {product.updatedAt} · geosub.com
                    </span>
                  </div>
                </div>
              </div>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-base font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>

                {downloading ? '正在生成...' : '下载 PNG'}
              </button>

              <div className="my-5 border-t border-dashed border-zinc-200" />

              <div className="text-sm font-bold text-zinc-500">分享到</div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialShare('x')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label="分享到 X"
                >
                  <span className="text-xl font-black">𝕏</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('facebook')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label="分享到 Facebook"
                >
                  <span className="text-xl font-black">f</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('telegram')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label="分享到 Telegram"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21.7 3.3 2.9 10.6c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.8c.2.7.4.9.8.9.4 0 .6-.2.9-.5l2.6-2.5 5.3 3.9c1 .5 1.6.3 1.9-.9l3.4-15.9c.3-1.4-.5-2-1.6-1.5ZM8.2 13.2l10.6-6.7c.5-.3.9-.1.5.2l-8.6 7.8-.3 3.3-1.3-4.1Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('reddit')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label="分享到 Reddit"
                >
                  <span className="text-lg font-black">r</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ml-auto rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  {copyText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
