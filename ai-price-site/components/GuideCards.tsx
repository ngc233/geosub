"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { PublicSegments } from "./PublicControls";
import { filterGuideCards, guideCategories, type GuideCard } from "../lib/guide-presentation";
export default function GuideCards({ cards, emptyText }: { cards: GuideCard[]; emptyText: string }) {
  const [category, setCategory] = useState("all");
  const viewport = useRef<HTMLDivElement>(null), grid = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);
  useLayoutEffect(() => { const inner = grid.current, outer = viewport.current; if (!inner || !outer) return;
    let frame = 0;
    const settle = () => {
      // Compare rendered heights rather than a timer: rapid changes, resize and
      // reduced motion can cancel or bypass the CSS transition.
      if (Math.abs(outer.getBoundingClientRect().height - inner.getBoundingClientRect().height) < 1) {
        outer.removeAttribute("data-resizing"); frame = 0;
      } else frame = requestAnimationFrame(settle);
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      // ResizeObserver runs before paint, so new cards cannot escape the old height.
      outer.setAttribute("data-resizing", "");
      outer.style.setProperty("--gs-guide-grid-height", `${inner.getBoundingClientRect().height}px`);
      frame = requestAnimationFrame(settle);
    };
    // Set the new height and clipping in the same commit, before the first paint.
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(inner);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); outer.removeAttribute("data-resizing"); };
  }, [category]);
  const options = [{ value: "all", label: "全部" }, ...guideCategories(cards).map(value => ({ value, label: value }))];
  const selected = filterGuideCards(cards, category);
  return <section className="gs-guide-collection" aria-label="全部指南">
    <div className="gs-guide-collection-heading mb-4.5 flex items-center justify-between gap-3"><h2 className="shrink-0">全部指南</h2>{options.length > 1 && <div className="gs-guide-tabs p-1.25 -m-1.25 max-w-full overflow-x-auto"><PublicSegments label="指南分类" options={options} value={category} onChange={value => { setCategory(value); setCycle(cycle + 1); }}/></div>}</div>
    <div ref={viewport} className="gs-guide-grid-viewport"><div ref={grid} className="gs-guide-card-grid grid grid-cols-1 md:grid-cols-3 gap-4" aria-live="polite">
      {selected.map((card, index) => <Link key={card.href} href={card.href} className="gs-guide-card p-5.5 flex flex-col gap-2.5" data-gs-motion-card data-gs-enter={cycle ? (cycle % 2 ? "a" : "b") : undefined} style={{ "--gs-stagger": `calc(${Math.min(index, 8)} * var(--gs-motion-stagger))` } as CSSProperties}>
        <span className="gs-guide-card-category gs-guide-caption flex items-center gap-2.5"><span className="gs-guide-card-icon w-9 h-9 grid place-items-center"><BookOpen size={20} aria-hidden="true"/></span>{card.category}</span>
        <h3 className="font-bold">{card.title}</h3>{card.description && <p>{card.description}</p>}
        <span className="gs-guide-card-meta gs-guide-caption flex items-center gap-2.5 justify-between mt-auto"><span>{card.minutes ? <>{card.minutes} 分钟{card.date ? " · " : ""}</> : null}{card.date && <time>{card.date}</time>}</span><ArrowRight size={16} aria-hidden="true"/></span>
      </Link>)}
    </div></div>
    {!selected.length && <p className="gs-guide-empty p-8 text-center" role="status">{emptyText}</p>}
  </section>;
}
