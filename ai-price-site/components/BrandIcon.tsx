'use client';

import type { SVGProps } from 'react';
import type { SubscriptionProduct } from '../lib/ai-pricing-model';
import * as icons from 'simple-icons/icons';

type BrandIconProps = {
  product: SubscriptionProduct;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

type SimpleIcon = {
  title: string;
  slug: string;
  hex: string;
  path: string;
};

const iconMap: Record<string, string[]> = {
  chatgpt: ['siOpenai'],
  claude: ['siClaude', 'siAnthropic'],
  gemini: ['siGooglegemini', 'siGoogle'],
  grok: ['siX'],
  perplexity: ['siPerplexity'],
  deepseek: ['siDeepseek'],
  'microsoft-copilot': ['siMicrosoftcopilot', 'siMicrosoft'],
  poe: ['siPoe'],
  'character-ai': ['siCharacterai'],
  midjourney: ['siMidjourney'],
  runway: ['siRunway'],
  suno: ['siSuno'],
  'kling-ai': ['siKlingai'],
  sora: ['siOpenai'],

  netflix: ['siNetflix'],
  'youtube-premium': ['siYoutube'],
  spotify: ['siSpotify'],
  'apple-music': ['siApplemusic', 'siApple'],
  'disney-plus': ['siDisneyplus', 'siDisney'],
  max: ['siMax', 'siHbo'],
  'prime-video': ['siPrimevideo', 'siAmazonprime', 'siAmazon'],
  'apple-tv-plus': ['siAppletv', 'siApple'],
  hulu: ['siHulu'],
  crunchyroll: ['siCrunchyroll'],
};

const brandColorMap: Record<string, string> = {
  chatgpt: '#111827',
  claude: '#D97757',
  gemini: '#4285F4',
  grok: '#111827',
  perplexity: '#111827',
  deepseek: '#4F7CFF',
  'microsoft-copilot': '#111827',
  poe: '#111827',
  'character-ai': '#111827',
  midjourney: '#111827',
  runway: '#111827',
  suno: '#FF7A00',
  'kling-ai': '#111827',
  sora: '#111827',

  netflix: '#E50914',
  'youtube-premium': '#FF0000',
  spotify: '#1DB954',
  'apple-music': '#FA243C',
  'disney-plus': '#113CCF',
  max: '#002BE7',
  'prime-video': '#00A8E1',
  'apple-tv-plus': '#111827',
  hulu: '#1CE783',
  crunchyroll: '#F47521',
};

const bgMap: Record<string, string> = {
  chatgpt: 'bg-white',
  claude: 'bg-orange-50',
  gemini: 'bg-blue-50',
  grok: 'bg-white',
  perplexity: 'bg-white',
  deepseek: 'bg-blue-50',
  'microsoft-copilot': 'bg-white',
  poe: 'bg-white',
  'character-ai': 'bg-zinc-950',
  midjourney: 'bg-white',
  runway: 'bg-white',
  suno: 'bg-orange-50',
  'kling-ai': 'bg-white',
  sora: 'bg-white',

  netflix: 'bg-red-50',
  'youtube-premium': 'bg-red-50',
  spotify: 'bg-green-50',
  'apple-music': 'bg-rose-50',
  'disney-plus': 'bg-blue-50',
  max: 'bg-blue-50',
  'prime-video': 'bg-sky-50',
  'apple-tv-plus': 'bg-white',
  hulu: 'bg-green-50',
  crunchyroll: 'bg-orange-50',
};

const sizeMap = {
  sm: {
    box: 'h-8 w-8 rounded-xl',
    svg: 'h-5 w-5',
    text: 'text-[10px]',
  },
  md: {
    box: 'h-12 w-12 rounded-2xl',
    svg: 'h-7 w-7',
    text: 'text-sm',
  },
  lg: {
    box: 'h-14 w-14 rounded-2xl',
    svg: 'h-8 w-8',
    text: 'text-base',
  },
  xl: {
    box: 'h-16 w-16 rounded-3xl',
    svg: 'h-10 w-10',
    text: 'text-lg',
  },
};

function getSimpleIcon(productSlug: string): SimpleIcon | null {
  const candidates = iconMap[productSlug] || [];
  const iconPack = icons as unknown as Record<string, SimpleIcon | undefined>;

  for (const name of candidates) {
    const icon = iconPack[name];

    if (icon?.path) {
      return icon;
    }
  }

  return null;
}

function SvgIcon({
  icon,
  color,
  className,
}: {
  icon: SimpleIcon;
  color: string;
  className: string;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={icon.title}
      fill={color}
    >
      <path d={icon.path} />
    </svg>
  );
}

function CustomBrandMark({
  slug,
  className,
}: {
  slug: string;
  className: string;
}) {
  if (slug === 'microsoft-copilot') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2" fill="#7FBA00" />
        <rect x="13" y="3" width="8" height="8" rx="2" fill="#00A4EF" />
        <rect x="3" y="13" width="8" height="8" rx="2" fill="#FFB900" />
        <rect x="13" y="13" width="8" height="8" rx="2" fill="#F25022" />
      </svg>
    );
  }

  if (slug === 'poe') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="4" fill="#111827" />
        <circle cx="9" cy="12" r="1.3" fill="white" />
        <circle cx="15" cy="12" r="1.3" fill="white" />
        <path
          d="M8.5 18.5 7 21l4-2.5"
          fill="#111827"
          stroke="#111827"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (slug === 'character-ai') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#050505" />
        <text
          x="12"
          y="14"
          textAnchor="middle"
          fontSize="6.2"
          fontWeight="900"
          fill="white"
          fontFamily="Arial, sans-serif"
        >
          c.ai
        </text>
      </svg>
    );
  }

  if (slug === 'midjourney') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#111827" opacity="0.08" />
        <path
          d="M5.5 16.5 9 7.5l3 6 3-6 3.5 9"
          fill="none"
          stroke="#111827"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 16.5h7.6"
          stroke="#111827"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (slug === 'runway') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M5 5h7.6c3.8 0 6.4 2.2 6.4 5.4 0 2.2-1.2 4-3.2 4.8L20 21h-5.1l-3.5-5.1H9.3V21H5V5Z"
          fill="#111827"
        />
        <path
          d="M9.3 8.7v3.8h3.1c1.4 0 2.3-.7 2.3-1.9s-.9-1.9-2.3-1.9H9.3Z"
          fill="white"
        />
      </svg>
    );
  }

  if (slug === 'kling-ai') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#111827" />
        <path
          d="M8 6.5v11M16.5 6.5 9 12l7.5 5.5M10.5 12h6"
          fill="none"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (slug === 'sora') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#111827" opacity="0.08" />
        <path
          d="M7.2 9.2c1.4-2 4.5-2.7 6.9-1.5 1.4.7 2.3 1.8 2.7 3.1M16.8 14.8c-1.4 2-4.5 2.7-6.9 1.5-1.4-.7-2.3-1.8-2.7-3.1"
          fill="none"
          stroke="#111827"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.3" fill="#111827" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#f4f4f5" />
      <path
        d="M8 12h8M12 8v8"
        stroke="#111827"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BrandIcon({
  product,
  size = 'md',
  className = '',
}: BrandIconProps) {
  const icon = getSimpleIcon(product.slug);
  const sizeClass = sizeMap[size];
  const color = brandColorMap[product.slug] || '#18181B';
  const bg = bgMap[product.slug] || 'bg-white';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200/80 shadow-sm ${sizeClass.box} ${bg} ${className}`}
    >
      {icon ? (
        <SvgIcon icon={icon} color={color} className={sizeClass.svg} />
      ) : (
        <CustomBrandMark slug={product.slug} className={sizeClass.svg} />
      )}
    </span>
  );
}