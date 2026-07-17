"use client";

import type { ReactNode } from "react";
import type { DetailLocale } from "../lib/detail-page-copy";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";

type Props = {
  hiddenCount: number;
  locale?: DetailLocale;
  children: ReactNode;
};

export default function ExpandableAffordabilityRows({
  hiddenCount,
  locale = "zh",
  children,
}: Props) {
  const english = locale !== "zh";

  return (
    <AppleStyleExpandableRows
      hiddenCount={hiddenCount}
      showLabel={
        english
          ? `Show ${hiddenCount} more regions`
          : `显示更多 ${hiddenCount} 个地区`
      }
      hideLabel={english ? "Collapse region list" : "收起地区列表"}
    >
      {children}
    </AppleStyleExpandableRows>
  );
}
