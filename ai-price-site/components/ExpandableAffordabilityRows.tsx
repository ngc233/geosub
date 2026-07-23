"use client";

import type { ReactNode } from "react";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";

type Props = {
  hiddenCount: number;
  showLabel: string;
  hideLabel: string;
  children: ReactNode;
};

export default function ExpandableAffordabilityRows({
  hiddenCount,
  showLabel,
  hideLabel,
  children,
}: Props) {
  return (
    <AppleStyleExpandableRows
      hiddenCount={hiddenCount}
      showLabel={showLabel}
      hideLabel={hideLabel}
    >
      {children}
    </AppleStyleExpandableRows>
  );
}
