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
} from '../lib/public-pricing-model';
import { getPlanDisplayName } from '../lib/pricing-labels';
import type { SiteLocale } from '../lib/site-locale';

type SharePriceModalProps = {
  product: SubscriptionProduct;
  plan: ProductPlan;
  stats: PlanStats;
  locale?: SiteLocale;
};

type ShareCopy = {
  button: string;
  dialogLabel: string;
  close: string;
  global: string;
  cardTitle: (productName: string) => string;
  planBadge: (planName: string, referencePrice: string) => string;
  cheapestRegion: string;
  cheaper: string;
  usBase: string;
  moreExpensive: string;
  cheapestList: string;
  expensiveList: string;
  verifiedAt: (date: string) => string;
  download: string;
  downloading: string;
  copyLink: string;
  copied: string;
  copyFailed: string;
  shareText: (planName: string, low: string, high: string, spread: number) => string;
  mapAria: (planName: string) => string;
  shareTo: (platform: string) => string;
  diffAbove: (percent: number) => string;
  diffBelow: (percent: number) => string;
  diffSame: string;
  comparisonLead: (lowest: string, highest: string) => string;
  comparisonTrail: string;
  monthlySuffix: string;
};

const shareCopy = {
  zh: {
    button: '分享价格图',
    dialogLabel: '分享价格图',
    close: '关闭弹窗',
    global: '全球',
    cardTitle: (productName) => `${productName} 各地区价格`,
    planBadge: (planName, referencePrice) => `${planName} 套餐 · 美国基准 ${referencePrice}`,
    cheapestRegion: '最低价地区',
    cheaper: '更便宜',
    usBase: '美国基准',
    moreExpensive: '更贵',
    cheapestList: '↓ 最便宜',
    expensiveList: '↑ 最贵',
    verifiedAt: (date) => `GeoSub · 数据校验于 ${date} · geosub.org`,
    download: '下载 PNG',
    downloading: '正在生成...',
    copyLink: '复制链接',
    copied: '已复制',
    copyFailed: '复制失败',
    shareText: (planName, low, high, spread) =>
      `${planName} 全球订阅价格对比：最低 ${low}，最高 ${high}，价差 ${spread}%。`,
    mapAria: (planName) => `${planName} 分享地图`,
    shareTo: (platform) => `分享到 ${platform}`,
    diffAbove: (percent) => `比美国贵 ${percent}%`,
    diffBelow: (percent) => `比美国便宜 ${percent}%`,
    diffSame: '与美国价格相同',
    comparisonLead: (lowest, highest) => `${lowest} 与 ${highest} 的价格差约 `,
    comparisonTrail: '。',
    monthlySuffix: '/月',
  },
  en: {
    button: 'Share price card',
    dialogLabel: 'Share price card',
    close: 'Close dialog',
    global: 'Global',
    cardTitle: (productName) => `${productName} regional prices`,
    planBadge: (planName, referencePrice) => `${planName} plan · US base ${referencePrice}`,
    cheapestRegion: 'Lowest-price region',
    cheaper: 'Cheaper',
    usBase: 'US base',
    moreExpensive: 'More expensive',
    cheapestList: '↓ Cheapest',
    expensiveList: '↑ Most expensive',
    verifiedAt: (date) => `GeoSub · Data verified ${date} · geosub.org`,
    download: 'Download PNG',
    downloading: 'Generating...',
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    shareText: (planName, low, high, spread) =>
      `${planName} global subscription price comparison: lowest ${low}, highest ${high}, spread ${spread}%.`,
    mapAria: (planName) => `${planName} share map`,
    shareTo: (platform) => `Share to ${platform}`,
    diffAbove: (percent) => `${percent}% more than the US`,
    diffBelow: (percent) => `${percent}% cheaper than the US`,
    diffSame: 'Same as the US',
    comparisonLead: (lowest, highest) =>
      `The price gap between ${lowest} and ${highest} is about `,
    comparisonTrail: '.',
    monthlySuffix: '/mo',
  },
} satisfies Record<SiteLocale, ShareCopy>;

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

function getReadableDiffByLocale(diffPercent: number, locale: SiteLocale) {
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

function ShareMiniMap({
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
          <span>{text.usBase}</span>
          <span>{text.moreExpensive}</span>
        </div>
      </div>
    </div>
  );
}

export default function SharePriceModal({
  product,
  plan,
  stats,
  locale = 'zh',
}: SharePriceModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const text = shareCopy[locale];
  const [copyText, setCopyText] = useState(text.copyLink);
  const [downloading, setDownloading] = useState(false);
  const planDisplayName = getPlanDisplayName(product.name, plan.name);

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
      setCopyText(text.copied);
      window.setTimeout(() => setCopyText(text.copyLink), 1600);
    } catch {
      setCopyText(text.copyFailed);
      window.setTimeout(() => setCopyText(text.copyLink), 1600);
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
      shareCopy[locale].shareText(
        planDisplayName,
        formatUsd(stats.minRegion.priceUsd),
        formatUsd(stats.maxRegion.priceUsd),
        stats.spreadPercent
      )
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
        data-track-event="open_share_modal"
        data-track-name="Open price share modal"
        data-track-button={`${product.slug}:${plan.slug}`}
        data-track-placement="share_modal"
        className="group inline-flex items-center justify-center gap-2 rounded-xl border border-lime-300 bg-lime-50 px-3.5 py-2 text-sm font-semibold text-lime-900 transition-colors hover:border-lime-400 hover:bg-lime-100 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200 dark:hover:bg-lime-500/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-lime-800 transition-colors dark:bg-lime-950/30 dark:text-lime-200">
          <Share2 className="h-4 w-4" strokeWidth={2.2} />
        </span>

        <span>{text.button}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-zinc-950/25"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={text.dialogLabel}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm ring-1 ring-zinc-200/80 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={text.close}
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

            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-3 pt-12 [scrollbar-width:none] sm:p-4 sm:pt-12 [&::-webkit-scrollbar]:hidden">
              <div
                ref={cardRef}
                className="w-full rounded-2xl border border-zinc-200 bg-[#fffaf3] p-4 text-zinc-950 shadow-sm sm:p-5"
              >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">
                        <span className="h-[3px] w-10 rounded-full bg-blue-500" />
                        {product.brand} · {text.global} · {plan.freshness?.pageUpdatedAt || product.updatedAt}
                      </div>

                      <h2 className="mt-3 text-[32px] font-black leading-[0.95] tracking-tight text-zinc-950">
                        {text.cardTitle(product.name)}
                      </h2>

                      <div className="mt-3 inline-flex max-w-full items-center rounded-md bg-zinc-950 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] text-white">
                        {text.planBadge(planDisplayName, formatUsd(referenceRegion.priceUsd))}
                      </div>
                    </div>

                  <ShareMiniMap
                    plan={plan}
                    referenceRegion={referenceRegion}
                    locale={locale}
                  />

                  <div className="mt-4 rounded-[22px] border border-lime-100 bg-gradient-to-r from-lime-100 to-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wide text-lime-700">
                          {text.cheapestRegion}
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
                              {getReadableDiffByLocale(cheapDiff, locale)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[34px] font-black leading-none text-lime-700">
                          {formatUsd(stats.minRegion.priceUsd)}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-zinc-500">
                          {text.monthlySuffix}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="my-4 text-center text-sm font-bold italic text-zinc-600">
                    “{text.comparisonLead(
                      stats.minRegion.country,
                      stats.maxRegion.country,
                    )}
                    <span className="text-rose-500">
                      {stats.spreadPercent}%
                    </span>
                    {text.comparisonTrail}”
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-lime-100 bg-lime-50 p-3">
                      <div className="mb-2 text-[10px] font-black tracking-wide text-lime-700">
                        {text.cheapestList}
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
                        {text.expensiveList}
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
                      {text.verifiedAt(plan.freshness?.pageUpdatedAt || product.updatedAt)}
                    </span>
                  </div>
                </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                data-track-event="download_share_image"
                data-track-name="Download price share image"
                data-track-button={`${product.slug}:${plan.slug}`}
                data-track-placement="share_modal"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-4 text-base font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
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

                {downloading ? text.downloading : text.download}
              </button>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialShare('x')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to X"
                  data-track-button={`${product.slug}:${plan.slug}:x`}
                  data-track-placement="share_modal"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label={text.shareTo('X')}
                >
                  <span className="text-xl font-black">𝕏</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('facebook')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Facebook"
                  data-track-button={`${product.slug}:${plan.slug}:facebook`}
                  data-track-placement="share_modal"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label={text.shareTo('Facebook')}
                >
                  <span className="text-xl font-black">f</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('telegram')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Telegram"
                  data-track-button={`${product.slug}:${plan.slug}:telegram`}
                  data-track-placement="share_modal"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label={text.shareTo('Telegram')}
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
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Reddit"
                  data-track-button={`${product.slug}:${plan.slug}:reddit`}
                  data-track-placement="share_modal"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 transition-colors hover:bg-zinc-950 hover:text-white"
                  aria-label={text.shareTo('Reddit')}
                >
                  <span className="text-lg font-black">r</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  data-track-event="copy_share_link"
                  data-track-name="Copy price page link"
                  data-track-button={`${product.slug}:${plan.slug}`}
                  data-track-placement="share_modal"
                  className="ml-auto min-w-[86px] rounded-lg border border-zinc-200 px-3 py-2 text-sm font-black text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
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
