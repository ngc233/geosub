"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { usesUnifiedPublicStyle } from "../lib/public-style-rollout";

// Existing local flag assets; unknown codes use a badge without a failed request.
const flags = new Set("AE AR AT AU BE BR CA CH CL CN CO DE DK EG ES FI FR GB HK ID IE IL IN IT JP KE KR MX MY NG NL NO NZ PE PH PK PL PT SA SE SG TH TR TW US VN ZA".split(" "));
const legacyIdentityFlags = new Set(["TR", "IN", "PH", "JP"]);
export default function CountryFlag({ code, identity = false }: { code: string; identity?: boolean }) {
  const unified = usesUnifiedPublicStyle(usePathname());
  const countryCode = code.trim().toUpperCase();
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const legacyIdentity = identity && !unified;
  const available = legacyIdentity ? legacyIdentityFlags.has(countryCode) : flags.has(countryCode);
  const image = available && failedCode !== countryCode ? <Image
    src={`/${legacyIdentity ? "country-flags" : "flags"}/${countryCode.toLowerCase()}.svg`} alt=""
    width={legacyIdentity ? 32 : 28} height={legacyIdentity ? 24 : 20} unoptimized
    onError={() => setFailedCode(countryCode)}
    className={legacyIdentity ? "h-6 w-8 object-contain ring-1 ring-[var(--color-border-default)]" : "h-5 w-7 rounded-[4px] object-cover shadow-[0_0_0_1px_rgba(24,24,27,0.08)]"}
  /> : countryCode;
  if (legacyIdentity) return <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-sm font-semibold tracking-wide text-[var(--color-text-secondary)]">{image}</span>;
  if (!unified && available && failedCode !== countryCode) return image;
  return <span aria-hidden="true" data-gs-flag={countryCode} data-flag-fallback={!available || failedCode === countryCode ? "" : undefined} className="flex h-5 w-7 items-center justify-center rounded-[4px] bg-zinc-100 text-[10px] font-semibold text-zinc-500 shadow-[0_0_0_1px_rgba(24,24,27,0.08)] dark:bg-zinc-800 dark:text-zinc-300">{image}</span>;
}
