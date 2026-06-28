"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

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
  const [expanded, setExpanded] = useState(false);

  if (hiddenCount <= 0) {
    return null;
  }

  return (
    <div>
      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">{children}</div>
      </div>

      <div className="border-t border-zinc-100 bg-white px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          {expanded ? (
            <>
              {hideLabel}
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {showLabel || `显示更多 ${hiddenCount} 个地区`}
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
