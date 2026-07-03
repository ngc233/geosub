"use client";

import type { ReactNode } from "react";
import AppleStyleExpandableRows from "./AppleStyleExpandableRows";

type Props = {
  hiddenCount: number;
  children: ReactNode;
};

export default function ExpandableAffordabilityRows({
  hiddenCount,
  children,
}: Props) {
  return (
    <AppleStyleExpandableRows
      hiddenCount={hiddenCount}
      showLabel={`显示更多 ${hiddenCount} 个地区`}
      hideLabel="收起地区列表"
    >
      {children}
    </AppleStyleExpandableRows>
  );
}
