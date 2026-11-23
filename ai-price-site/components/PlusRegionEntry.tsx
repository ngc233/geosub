"use client";

import { useSyncExternalStore } from "react";
import { ArrowDown, Search } from "lucide-react";
import { getPlusVariant, subscribePlusVariant } from "../lib/plus-region-experiment";

const controlSnapshot = () => null;

function jumpToPrices(search: boolean) {
  if (search) {
    const input = document.querySelector<HTMLInputElement>("[data-region-query]");
    if (!input) return;
    // Keep focus in the click handler so iOS can open the software keyboard.
    input.scrollIntoView({ behavior: "instant", block: "center" });
    input.focus({ preventScroll: true });
    return;
  }

  const target = document.getElementById("region-price-table-heading");
  if (!target) return;
  target.scrollIntoView({ behavior: "instant", block: "start" });
  target.focus({ preventScroll: true });
}

export default function PlusRegionEntry() {
  const variant = useSyncExternalStore(subscribePlusVariant, getPlusVariant, controlSnapshot);
  if (variant !== "B") return null;

  const linkStyle = "inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-200 dark:decoration-zinc-600 dark:hover:text-white";
  return (
    <div className="mt-1 flex flex-wrap gap-x-4" role="group" aria-label="地区查价">
      <button type="button" data-region-entry="browse" className={linkStyle} onClick={() => jumpToPrices(false)}>
        <ArrowDown size={15} aria-hidden="true" />查看各地区价格
      </button>
      <button type="button" data-region-entry="search" className={linkStyle} onClick={() => jumpToPrices(true)}>
        <Search size={15} aria-hidden="true" />搜国家或币种
      </button>
    </div>
  );
}
