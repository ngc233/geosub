"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type Props = {
  hiddenCount: number;
  renderChildren: () => React.ReactNode;
  showLabel?: string;
  hideLabel?: string;
};

export default function AppleStyleExpandableRows({
  hiddenCount,
  renderChildren,
  showLabel,
  hideLabel = "收起地区列表",
}: Props) {
  const [open, setOpen] = useState(false);

  if (hiddenCount <= 0) {
    return null;
  }

  return (
    <div>
      <div className="border-t border-zinc-100 bg-white px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          aria-expanded={open}
        >
          <span>{open ? hideLabel : showLabel || `显示更多 ${hiddenCount} 个地区`}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open ? <div className="grid grid-rows-[1fr] overflow-hidden opacity-100">
        <div className="min-h-0">{renderChildren()}</div>
      </div> : null}
    </div>
  );
}
