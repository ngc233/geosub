"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import GuideIcon from "./GuideIcon";
import {
  filterGuideCards,
  guideCategories,
  inferGuideIcon,
  type GuideCard,
} from "../lib/guide-presentation";
import { getGuideHubCopy } from "../lib/guide-hub-copy";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function GuideCards({
  cards,
  emptyText,
  locale = "zh",
  heading,
}: {
  cards: GuideCard[];
  emptyText: string;
  locale?: CanvasLocale;
  heading?: string;
}) {
  const copy = getGuideHubCopy(locale);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);

  const categories = guideCategories(cards);
  const activeCategory = category === "all" || categories.includes(category) ? category : "all";
  const selected = filterGuideCards(cards, activeCategory, query);

  useLayoutEffect(() => {
    const inner = grid.current;
    const outer = viewport.current;
    if (!inner || !outer) return;
    let frame = 0;
    const settle = () => {
      if (Math.abs(outer.getBoundingClientRect().height - inner.getBoundingClientRect().height) < 1) {
        outer.removeAttribute("data-resizing");
        frame = 0;
      } else {
        frame = requestAnimationFrame(settle);
      }
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      outer.setAttribute("data-resizing", "");
      outer.style.setProperty("--gs-guide-grid-height", `${inner.getBoundingClientRect().height}px`);
      frame = requestAnimationFrame(settle);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(inner);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      outer.removeAttribute("data-resizing");
    };
  }, [activeCategory, query, selected.length]);

  const options = [
    { value: "all", label: copy.allFilter, count: cards.length },
    ...categories.map((value) => ({
      value,
      label: value,
      count: cards.filter((card) => card.category === value).length,
    })),
  ];

  const showSearch = cards.length >= 4;
  const gridColsClass =
    selected.length <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  const resolvedHeading = heading ?? copy.editorialTitle;

  return (
    <section className="gs-guide-collection" aria-label={resolvedHeading}>
      <div className="gs-guide-collection-toolbar mb-4.5 flex flex-col gap-3.5">
        <div className="gs-guide-collection-heading flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="shrink-0">{resolvedHeading}</h2>
            {cards.length > 0 && (
              <span className="gs-guide-caption">{copy.articlesCountLabel(selected.length)}</span>
            )}
          </div>
          {showSearch && (
            <div className="gs-field gs-guide-search-field">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCycle((old) => old + 1);
                }}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchPlaceholder}
              />
              {query && (
                <button
                  type="button"
                  className="gs-search-clear"
                  aria-label={copy.clearSearchLabel}
                  onClick={() => {
                    setQuery("");
                    setCycle((old) => old + 1);
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {options.length > 2 && (
          <div
            className="gs-guide-filter-pills flex flex-wrap items-center gap-2"
            role="group"
            aria-label={copy.filterGroupLabel}
          >
            {options.map((option) => {
              const active = activeCategory === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="gs-guide-filter-pill"
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(option.value);
                    setCycle((old) => old + 1);
                  }}
                >
                  <span>{option.label}</span>
                  <span className="gs-guide-filter-count" aria-hidden="true">
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 ? (
        <div ref={viewport} className="gs-guide-grid-viewport">
          <div
            ref={grid}
            className={`gs-guide-card-grid grid ${gridColsClass} gap-4`}
            aria-live="polite"
          >
            {selected.map((card, index) => {
              const iconKey = inferGuideIcon(card);
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="gs-guide-card p-5.5 flex flex-col gap-3"
                  data-gs-motion-card
                  data-gs-enter={cycle ? (cycle % 2 ? "a" : "b") : undefined}
                  style={
                    {
                      "--gs-stagger": `calc(${Math.min(index, 8)} * var(--gs-motion-stagger))`,
                    } as CSSProperties
                  }
                >
                  <span className="gs-guide-card-category gs-guide-caption flex items-center gap-2.5">
                    <span className="gs-guide-card-icon w-9 h-9 grid place-items-center shrink-0">
                      <GuideIcon icon={iconKey} size={18} />
                    </span>
                    <span className="gs-guide-card-pill">{card.category}</span>
                  </span>
                  <h3 className="font-bold">{card.title}</h3>
                  {card.description && <p>{card.description}</p>}
                  <span className="gs-guide-card-meta gs-guide-caption flex items-center gap-2.5 justify-between mt-auto pt-2">
                    <span>
                      {card.minutes ? (
                        <>
                          {copy.minutesLabel(card.minutes)}
                          {card.date ? " · " : ""}
                        </>
                      ) : null}
                      {card.date && <time>{card.date}</time>}
                    </span>
                    <span className="gs-guide-card-cta inline-flex items-center gap-1">
                      <span>{copy.readArticleCta}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="gs-guide-empty p-8 text-center" role="status">
          {cards.length > 0 ? copy.noFilterMatch : emptyText}
        </p>
      )}
    </section>
  );
}
