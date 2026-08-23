'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share, X } from 'lucide-react';
import { siFacebook, siReddit, siTelegram, siX } from 'simple-icons';

import { formatUsd, type PlanStats, type ProductPlan } from '../lib/public-pricing-model';
import { getPlanDisplayName } from '../lib/pricing-labels';
import type { SiteLocale } from '../lib/site-locale';
import { shareCopy } from './SharePriceCopy';
import ShareMiniMap, { getDiffPercent, getReadableDiffByLocale } from './SharePriceMap';

export type SharePriceProduct = {
  name: string;
  slug: string;
  brand: string;
  updatedAt: string;
};

type SharePriceModalProps = {
  product: SharePriceProduct;
  plan: ProductPlan;
  stats: PlanStats;
  locale?: SiteLocale;
};

function SocialBrandIcon({ icon }: { icon: { path: string } }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <path d={icon.path} />
    </svg>
  );
}

export default function SharePriceModal({
  product,
  plan,
  stats,
  locale = 'zh',
}: SharePriceModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const text = shareCopy[locale];
  const [copyText, setCopyText] = useState(text.copyLink);
  const [downloading, setDownloading] = useState(false);
  const planDisplayName = getPlanDisplayName(product.name, plan.name);

  const sortedRegions = useMemo(
    () => [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd),
    [plan.regions]
  );

  const lowestRegions = sortedRegions.filter(
    (region) => Math.abs(region.priceUsd - stats.minRegion.priceUsd) < 0.005,
  );
  const highestRegions = sortedRegions.filter(
    (region) => Math.abs(region.priceUsd - stats.maxRegion.priceUsd) < 0.005,
  );

  const referenceRegion =
    plan.regions.find((region) => region.code.toUpperCase() === 'US') ||
    stats.referenceRegion;

  const cheapDiff = getDiffPercent(
    stats.minRegion.priceUsd,
    referenceRegion.priceUsd
  );
  const regionSeparator = locale === 'zh' || locale === 'zh-tw' || locale === 'ja'
    ? '、'
    : ', ';
  const lowestRegionNames = lowestRegions.map((region) => region.country).join(regionSeparator);
  const highestRegionNames = highestRegions.map((region) => region.country).join(regionSeparator);
  const verifiedDate = plan.freshness?.pageUpdatedAt || product.updatedAt;
  const sourceLabel = plan.freshness?.sourceLabel || referenceRegion.sourceName || 'App Store';
  const fxRateDate = plan.freshness?.fxRateDate || referenceRegion.fxRateDate;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocusedElement = document.activeElement;
    const triggerElement = triggerRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('hidden'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      } else {
        triggerElement?.focus();
      }
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
        backgroundColor: '#f7f8fa',
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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        data-track-event="open_share_modal"
        data-track-name="Open price share modal"
        data-track-button={`${product.slug}:${plan.slug}`}
        data-track-placement="share_modal"
        data-share-price-trigger
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
      >
        <Share aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
        <span>{text.button}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-8"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-2xl shadow-zinc-950/25"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={text.dialogLabel}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950"
              aria-label={text.close}
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </button>

            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-3 pt-12 [scrollbar-width:none] sm:p-4 sm:pt-12 [&::-webkit-scrollbar]:hidden">
              <div
                ref={cardRef}
                data-share-price-card
                className="w-full rounded-xl border border-zinc-200 bg-[#f7f8fa] p-4 text-zinc-950 shadow-sm sm:p-5"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  <span className="h-0.5 w-7 rounded-full bg-lime-500" />
                  {product.brand} · {text.global}
                </div>

                <h2 className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.025em] text-zinc-950">
                  {text.cardTitle(product.name)}
                </h2>

                <div className="mt-3 inline-flex max-w-full items-center rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-zinc-700">
                  {referenceRegion.code.toUpperCase() === 'US'
                    ? text.planBadge(planDisplayName, formatUsd(referenceRegion.priceUsd))
                    : `${planDisplayName} · ${referenceRegion.country} ${formatUsd(referenceRegion.priceUsd)}`}
                </div>

                <ShareMiniMap
                  plan={plan}
                  referenceRegion={referenceRegion}
                  locale={locale}
                />

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-lime-200 bg-lime-50 p-3">
                    <div className="text-[9px] font-semibold text-lime-700">
                      {lowestRegions.length > 1
                        ? text.tiedCheapestRegion(lowestRegions.length)
                        : text.cheapestRegion}
                    </div>
                    <div className="mt-2 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-zinc-950">
                      {lowestRegionNames}
                    </div>
                    <div className="mt-2 text-lg font-semibold leading-none text-lime-700">
                      {formatUsd(stats.minRegion.priceUsd)}
                    </div>
                    <div className="mt-1 text-[9px] text-zinc-500">
                      {getReadableDiffByLocale(cheapDiff, locale)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="text-[9px] font-semibold text-zinc-500">
                      {referenceRegion.code.toUpperCase() === 'US' ? text.usBase : referenceRegion.country}
                    </div>
                    <div className="mt-2 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-zinc-950">
                      {referenceRegion.country}
                    </div>
                    <div className="mt-2 text-lg font-semibold leading-none text-zinc-950">
                      {formatUsd(referenceRegion.priceUsd)}
                    </div>
                    <div className="mt-1 text-[9px] text-zinc-500">{text.monthlySuffix}</div>
                  </div>

                  <div className="rounded-lg border border-[#e6c4bc] bg-[#f8eeeb] p-3">
                    <div className="text-[9px] font-semibold text-[#a24b3a]">
                      {text.highestRegion}
                    </div>
                    <div className="mt-2 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-zinc-950">
                      {highestRegionNames}
                    </div>
                    <div className="mt-2 text-lg font-semibold leading-none text-[#a24b3a]">
                      {formatUsd(stats.maxRegion.priceUsd)}
                    </div>
                    <div className="mt-1 text-[9px] text-zinc-500">{text.monthlySuffix}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                  <span className="text-[10px] font-medium text-zinc-500">{text.maxSpread}</span>
                  <span className="text-base font-semibold text-zinc-950">{stats.spreadPercent}%</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-200 pt-3 text-[9px] leading-4 text-zinc-500">
                  <span>{text.priceSource}: <strong className="font-semibold text-zinc-700">{sourceLabel}</strong></span>
                  <span>{text.coverage(plan.regions.length)}</span>
                  {fxRateDate ? <span>{text.fxDate}: <strong className="font-semibold text-zinc-700">{fxRateDate}</strong></span> : <span />}
                  <span>GeoSub · {text.verifiedAt(verifiedDate).replace(/^GeoSub\s*[·・]\s*/, '')}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  data-track-event="download_share_image"
                  data-track-name="Download price share image"
                  data-track-button={`${product.slug}:${plan.slug}`}
                  data-track-placement="share_modal"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  {downloading ? text.downloading : text.download}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  data-track-event="copy_share_link"
                  data-track-name="Copy price page link"
                  data-track-button={`${product.slug}:${plan.slug}`}
                  data-track-placement="share_modal"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
                >
                  {copyText}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialShare('x')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to X"
                  data-track-button={`${product.slug}:${plan.slug}:x`}
                  data-track-placement="share_modal"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label={text.shareTo('X')}
                >
                  <SocialBrandIcon icon={siX} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('facebook')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Facebook"
                  data-track-button={`${product.slug}:${plan.slug}:facebook`}
                  data-track-placement="share_modal"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label={text.shareTo('Facebook')}
                >
                  <SocialBrandIcon icon={siFacebook} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('telegram')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Telegram"
                  data-track-button={`${product.slug}:${plan.slug}:telegram`}
                  data-track-placement="share_modal"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label={text.shareTo('Telegram')}
                >
                  <SocialBrandIcon icon={siTelegram} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialShare('reddit')}
                  data-track-event="share_to_social"
                  data-track-name="Share price card to Reddit"
                  data-track-button={`${product.slug}:${plan.slug}:reddit`}
                  data-track-placement="share_modal"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label={text.shareTo('Reddit')}
                >
                  <SocialBrandIcon icon={siReddit} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
