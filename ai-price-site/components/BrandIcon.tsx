"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type SVGProps } from "react";
import * as icons from "simple-icons";
import {
  getApprovedLocalBrandAsset,
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

function getSimpleIcon(productSlug: string): SimpleIcon | null {
  const iconPack = icons as unknown as Record<string, SimpleIcon | undefined>;

  for (const name of getSimpleIconCandidates(productSlug)) {
    const icon = iconPack[name];
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
          src={approvedLocalAsset.path}
          alt={product.name ? `${product.name} logo` : ""}
          className="h-[78%] w-[78%] object-contain"
          loading="eager"
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
