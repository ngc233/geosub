'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Share2 } from 'lucide-react';

import { formatUsd, type PlanStats, type ProductPlan, type SubscriptionProduct } from '../lib/public-pricing-model';
import { getPlanDisplayName } from '../lib/pricing-labels';
import type { SiteLocale } from '../lib/site-locale';
import { shareCopy } from './SharePriceCopy';
import ShareMiniMap, { getDiffPercent, getReadableDiffByLocale, getShortDiff } from './SharePriceMap';

type SharePriceModalProps = {
  product: SubscriptionProduct;
  plan: ProductPlan;
  stats: PlanStats;
  locale?: SiteLocale;
};

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
                        {referenceRegion.code.toUpperCase() === 'US'
                          ? text.planBadge(
                              planDisplayName,
                              formatUsd(referenceRegion.priceUsd),
                            )
                          : `${planDisplayName} · ${referenceRegion.country} ${formatUsd(referenceRegion.priceUsd)}`}
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
