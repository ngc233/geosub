"use client";

import type { ReactNode } from "react";
import { getPublicPricingCopy } from "../lib/public-pricing-copy";
import type { SiteLocale } from "../lib/site-locale";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";

type Props = {
  hiddenCount: number;
  locale?: SiteLocale;
  children: ReactNode;
};

export default function ExpandableAffordabilityRows({
  hiddenCount,
  locale = "zh",
  children,
}: Props) {
  const copy = getPublicPricingCopy(locale).table;

  return (
    <AppleStyleExpandableRows
      hiddenCount={hiddenCount}
      showLabel={copy.showMore(hiddenCount)}
      hideLabel={copy.collapse}
    >
      {children}
    </AppleStyleExpandableRows>
  );
}
