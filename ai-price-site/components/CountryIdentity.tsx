"use client";

import Image from "next/image";
import { useState } from "react";

const availableFlags = new Set(["TR", "IN", "PH", "JP"]);

/** Decorative identity beside a visible country name; only reviewed local SVGs. */
export default function CountryIdentity({ code }: { code: string }) {
  const countryCode = code.trim().toUpperCase();
  const [failedCode, setFailedCode] = useState<string | null>(null);

  return (
    <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-sm font-semibold tracking-wide text-[var(--color-text-secondary)]">
      {availableFlags.has(countryCode) && failedCode !== countryCode ? (
        <Image
          src={`/country-flags/${countryCode.toLowerCase()}.svg`}
          alt=""
          width={32}
          height={24}
          unoptimized
          className="h-6 w-8 object-contain ring-1 ring-[var(--color-border-default)]"
          onError={() => setFailedCode(countryCode)}
        />
      ) : countryCode}
    </span>
  );
}
