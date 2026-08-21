"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type SVGProps } from "react";
import {
  siAnthropic,
  siApplemusic,
  siClaude,
  siCrunchyroll,
  siDeepseek,
  siDeezer,
  siElevenlabs,
  siGooglegemini,
  siHbomax,
  siMax,
  siMeta,
  siMistralai,
  siNetflix,
  siPerplexity,
  siPoe,
  siSpotify,
  siSuno,
  siYoutube,
} from "simple-icons";
import {
  getApprovedLocalBrandAsset,
  getOptimizedBrandAssetPath,
  getSimpleIconCandidates,
} from "../lib/product-brand-assets";

type BrandIconProps = {
  product: {
    slug: string;
    name?: string;
    logoUrl?: string | null;
    officialUrl?: string | null;
    icon?: string | null;
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
};

type SimpleIcon = {
  title: string;
  slug: string;
  hex: string;
  path: string;
};

const sizeMap = {
  sm: { box: "h-8 w-8", svg: "h-5 w-5", text: "text-[10px]" },
  md: { box: "h-12 w-12", svg: "h-7 w-7", text: "text-sm" },
  lg: { box: "h-14 w-14", svg: "h-8 w-8", text: "text-base" },
  xl: { box: "h-16 w-16", svg: "h-10 w-10", text: "text-lg" },
};

const simpleIconRegistry: Record<string, SimpleIcon> = {
  siAnthropic,
  siApplemusic,
  siClaude,
  siCrunchyroll,
  siDeepseek,
  siDeezer,
  siElevenlabs,
  siGooglegemini,
  siHbomax,
  siMax,
  siMeta,
  siMistralai,
  siNetflix,
  siPerplexity,
  siPoe,
  siSpotify,
  siSuno,
  siYoutube,
};

function getSimpleIcon(productSlug: string): SimpleIcon | null {
  for (const name of getSimpleIconCandidates(productSlug)) {
    const icon = simpleIconRegistry[name];
    if (icon?.path) return icon;
  }

  return null;
}

function getInitials(name: string | undefined, slug: string) {
  const words = (name || slug)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "G";
  if (words.length === 1) return Array.from(words[0])[0]?.toUpperCase() || "G";
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() || "")
    .join("");
}

function SvgIcon({
  icon,
  className,
}: {
  icon: SimpleIcon;
  className: string;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={icon.title}
      fill={`#${icon.hex}`}
    >
      <path d={icon.path} />
    </svg>
  );
}

export default function BrandIcon({
  product,
  size = "md",
  className = "",
  priority = false,
}: BrandIconProps) {
  const [localAssetFailed, setLocalAssetFailed] = useState(false);
  const approvedLocalAsset = getApprovedLocalBrandAsset(product.slug);
  const icon = getSimpleIcon(product.slug);
  const sizeClass = sizeMap[size];
  const initials = getInitials(product.name, product.slug);

  return (
    <span
      className={`relative inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-[22%] border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${sizeClass.box} ${className}`}
      title={product.name || product.slug}
    >
      {approvedLocalAsset && !localAssetFailed ? (
        <img
          src={getOptimizedBrandAssetPath(approvedLocalAsset)}
          alt={product.name ? `${product.name} logo` : ""}
          width={96}
          height={96}
          className={
            approvedLocalAsset.displayMode === "app-icon"
              ? "h-full w-full object-cover"
              : "h-[72%] w-[72%] object-contain"
          }
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setLocalAssetFailed(true)}
        />
      ) : icon ? (
        <SvgIcon icon={icon} className={sizeClass.svg} />
      ) : (
        <span
          aria-hidden="true"
          className={`font-black tracking-normal text-zinc-700 dark:text-zinc-200 ${sizeClass.text}`}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
