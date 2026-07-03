"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  hiddenCount: number;
  children: ReactNode;
  showLabel?: string;
  hideLabel?: string;
};

export default function AppleStyleExpandableRows({
  hiddenCount,
  children,
  showLabel,
  hideLabel = "收起地区列表",
}: Props) {
  if (hiddenCount <= 0) {
    return null;
  }

  return (
    <details className="group">
      <summary className="block cursor-pointer list-none border-t border-zinc-100 bg-white px-4 py-3 text-center marker:hidden dark:border-zinc-800 dark:bg-zinc-950/20 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100">
          <span className="group-open:hidden">
            {showLabel || `显示更多 ${hiddenCount} 个地区`}
          </span>
          <span className="hidden group-open:inline">{hideLabel}</span>
          <ChevronDown className="h-4 w-4 group-open:hidden" />
          <ChevronUp className="hidden h-4 w-4 group-open:block" />
        </span>
      </summary>

      <div>{children}</div>
    </details>
  );
}
