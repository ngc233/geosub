"use client";

import type { ComponentProps } from "react";
import type PublicSegmentedControl from "../ui/SegmentedControl";
import AdminLink from "./AdminLink";

// Admin controls share one token palette. Keep the public control's item/API
// contract so its public-site appearance and tracking behavior remain separate.
type Props = ComponentProps<typeof PublicSegmentedControl>;

export default function AdminSegmentedControl({ items, value, ariaLabel, size = "md", className = "", onChange }: Props) {
  if (!items.length) return null;
  return (
    <div data-admin-segmented="" role="tablist" aria-label={ariaLabel}
      className={`admin-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-admin-surface-subtle p-1 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        const classes = `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40 motion-reduce:transition-none ${size === "sm" ? "h-8 px-3 text-xs" : "h-11 px-4 text-sm"} ${active ? "bg-admin-primary text-white shadow-sm" : "text-admin-text-secondary hover:bg-admin-chip-hover hover:text-admin-text"} ${item.disabled ? "cursor-not-allowed opacity-40" : ""}`;
        const content = <>{item.icon ? <span aria-hidden="true" className="shrink-0">{item.icon}</span> : null}{item.shortLabel ? <><span className="sm:hidden">{item.shortLabel}</span><span className="hidden sm:inline">{item.label}</span></> : item.label}</>;
        const tracking = item.tracking ? {
          "data-track-event": item.tracking.event, "data-track-name": item.tracking.name,
          "data-track-button": item.tracking.button, "data-track-placement": item.tracking.placement,
          "data-track-source": item.tracking.source || "segmented_control",
        } : {};
        return item.href && !item.disabled ? (
          <AdminLink key={item.value} href={item.href} scroll={item.href.includes("#") ? true : undefined} {...tracking} role="tab" aria-selected={active} aria-current={active ? "page" : undefined} className={classes}>{content}</AdminLink>
        ) : (
          <button key={item.value} type="button" {...tracking} role="tab" aria-selected={active} disabled={item.disabled} onClick={() => onChange?.(item.value)} className={classes}>{content}</button>
        );
      })}
    </div>
  );
}
