"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type SegmentedControlItem = {
  label: string;
  shortLabel?: string;
  value: string;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  ariaLabel: string;
  size?: "sm" | "md";
  tone?: "green" | "blue";
  className?: string;
  onChange?: (value: string) => void;
};

function getToneClasses(tone: "green" | "blue") {
  if (tone === "blue") {
    return {
      activeText: "text-blue-700 dark:text-blue-300",
      hover:
        "hover:bg-blue-50/70 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
      focus:
        "focus-visible:ring-blue-500/30",
      thumb:
        "bg-white shadow-sm shadow-blue-900/[0.10] ring-2 ring-blue-200 dark:bg-zinc-800 dark:ring-blue-500/30",
    };
  }

  return {
    activeText: "text-zinc-950 dark:text-white",
    hover:
      "hover:bg-lime-50/70 hover:text-zinc-950 dark:hover:bg-lime-500/10 dark:hover:text-white",
    focus:
      "focus-visible:ring-lime-500/30",
    thumb:
      "bg-white shadow-sm shadow-zinc-950/[0.08] ring-1 ring-zinc-950/[0.04] dark:bg-zinc-800 dark:ring-white/[0.06]",
  };
}

export default function SegmentedControl({
  items,
  value,
  ariaLabel,
  size = "md",
  tone = "green",
  className = "",
  onChange,
}: SegmentedControlProps) {
  const toneClasses = getToneClasses(tone);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );

  const sizeClasses =
    size === "sm"
      ? "h-8 px-2.5 text-xs sm:px-3"
      : "h-10 px-2.5 text-sm sm:px-4";

  const thumbRadius = size === "sm" ? "rounded-lg" : "rounded-lg";

  const sharedClassName = (active: boolean, disabled?: boolean) =>
    [
      "relative z-10 inline-flex min-w-0 items-center justify-center gap-2 rounded-lg font-bold outline-none transition-colors duration-200 ease-out",
      sizeClasses,
      active
        ? toneClasses.activeText
        : "text-zinc-500 dark:text-zinc-400",
      !active && !disabled ? toneClasses.hover : "",
      disabled ? "cursor-not-allowed opacity-40" : "",
      "focus-visible:ring-4",
      toneClasses.focus,
    ].join(" ");

  const content = (item: SegmentedControlItem) => (
    <>
      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
      {item.shortLabel ? (
        <>
          <span className="truncate sm:hidden">{item.shortLabel}</span>
          <span className="hidden truncate sm:inline">{item.label}</span>
        </>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
    </>
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={[
        "relative inline-grid rounded-xl bg-zinc-100/85 p-1 text-sm shadow-inner shadow-white/80 ring-1 ring-zinc-950/[0.04] backdrop-blur dark:bg-zinc-900/80 dark:shadow-black/20 dark:ring-white/[0.06]",
        className,
      ].join(" ")}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
      role="tablist"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute left-1 top-1 bottom-1 transition-transform duration-200 ease-out",
          toneClasses.thumb,
          thumbRadius,
        ].join(" ")}
        style={{
          width: `calc((100% - 0.5rem) / ${items.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {items.map((item) => {
        const active = item.value === value;
        const className = sharedClassName(active, item.disabled);

        if (item.href && !item.disabled) {
          return (
            <Link
              key={item.value}
              href={item.href}
              className={className}
              role="tab"
              aria-selected={active}
            >
              {content(item)}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            className={className}
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange?.(item.value)}
          >
            {content(item)}
          </button>
        );
      })}
    </div>
  );
}
