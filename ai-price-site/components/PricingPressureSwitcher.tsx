"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BarChart3, CircleDollarSign, ScatterChart } from "lucide-react";
import { getPricingPressureCopy } from "../lib/pricing-pressure-copy";
import type { SiteLocale } from "../lib/site-locale";

type PressureView = "price" | "burden" | "matrix";

type Props = {
  locale: SiteLocale;
  productName: string;
  priceView: ReactNode;
  burdenView?: ReactNode;
  matrixView?: ReactNode;
  defaultView?: PressureView;
  unavailableReason?: string;
};

export default function PricingPressureSwitcher({
  locale,
  productName,
  priceView,
  burdenView,
  matrixView,
  defaultView = "price",
  unavailableReason,
}: Props) {
  const copy = getPricingPressureCopy(locale);
  const views = [
    { key: "price" as const, label: copy.tabs.price, Icon: CircleDollarSign },
    { key: "burden" as const, label: copy.tabs.burden, Icon: BarChart3 },
    { key: "matrix" as const, label: copy.tabs.matrix, Icon: ScatterChart },
  ];
  const [activeView, setActiveView] = useState<PressureView>(defaultView);
  const availability: Record<PressureView, boolean> = {
    price: true,
    burden: Boolean(burdenView),
    matrix: Boolean(matrixView),
  };

  const content =
    activeView === "burden"
      ? burdenView
      : activeView === "matrix"
        ? matrixView
        : priceView;

  return (
    <section aria-labelledby="pricing-pressure-title" className="space-y-3">
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 px-1">
            <h2 id="pricing-pressure-title" className="text-base font-semibold text-zinc-950 dark:text-white">
              {copy.title(productName)}
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {copy.description}
            </p>
          </div>

          <div
            className="grid grid-cols-3 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950"
            role="tablist"
            aria-label={copy.title(productName)}
          >
            {views.map(({ key, label, Icon }) => {
              const available = availability[key];
              const active = activeView === key;

              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-disabled={!available}
                  disabled={!available}
                  className={[
                    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition",
                    active
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                    !available ? "cursor-not-allowed opacity-40" : "",
                  ].join(" ")}
                  onClick={() => available && setActiveView(key)}
                  title={available ? undefined : unavailableReason || copy.pending.generic}
                >
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!burdenView ? (
          <p className="mt-2 border-t border-zinc-100 px-1 pt-2 text-[11px] leading-5 text-zinc-400 dark:border-zinc-800">
            {unavailableReason || copy.pending.generic}
          </p>
        ) : null}
      </div>

      <div role="tabpanel">{content}</div>
    </section>
  );
}
