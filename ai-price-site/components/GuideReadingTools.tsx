"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Link as LinkIcon } from "lucide-react";
import { getGuideArticleUiCopy } from "../lib/guide-hub-copy";
import { guideProgress } from "../lib/guide-presentation";
import { resolveCanvasLocale, type CanvasLocale } from "../lib/canvas-ui-copy";

function resolveReadingLocale(locale: CanvasLocale | undefined, pathname: string | null): CanvasLocale {
  if (locale) return locale;
  const segment = pathname?.split("/")[1]?.toLowerCase();
  return resolveCanvasLocale(segment);
}

export function GuideContents({
  enabled = true,
  includeH3 = true,
  summaryTitle,
  locale,
}: {
  enabled?: boolean;
  includeH3?: boolean;
  summaryTitle?: string;
  locale?: CanvasLocale;
}) {
  const pathname = usePathname();
  const resolvedLocale = resolveReadingLocale(locale, pathname);
  const uiCopy = getGuideArticleUiCopy(resolvedLocale);
  const tocLabel = uiCopy.tocLabel;
  const summaryLabel = summaryTitle ?? uiCopy.summaryLabel;
  const tableAria = uiCopy.tableAria;

  const root = useRef<HTMLDivElement>(null);
  const mobileDetails = useRef<HTMLDetailsElement>(null);
  const [headings, setHeadings] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scope = root.current?.closest(".gs-guide-article-layout");
    const article = scope?.querySelector<HTMLElement>("article");
    if (!article) return;
    const desktopToc = scope?.closest(".gs-guide-scope")
      ? root.current?.querySelector<HTMLElement>(".gs-guide-toc-desktop")
      : null;
    const desktopTocItems = desktopToc?.querySelector(".gs-guide-toc-items");
    const tables = [...article.querySelectorAll<HTMLTableElement>("[data-guide-body] table")]
      .filter(
        (table) =>
          !table.hasAttribute("tabindex") &&
          !table.querySelector("a[href], button, input, select, textarea, summary, [tabindex]"),
      )
      .map((table) => ({
        table,
        needsLabel:
          !table.caption?.textContent?.trim() &&
          !table.hasAttribute("aria-label") &&
          !table.hasAttribute("aria-labelledby"),
      }));
    const setTableFocus = (scrollable: boolean, table: HTMLTableElement, needsLabel: boolean) => {
      if (scrollable) {
        table.tabIndex = 0;
        if (needsLabel) table.setAttribute("aria-label", tableAria);
      } else {
        table.removeAttribute("tabindex");
        if (needsLabel) table.removeAttribute("aria-label");
      }
    };
    const updateOverflowControls = () => {
      if (desktopToc) {
        desktopToc.toggleAttribute("data-scrollable", desktopToc.scrollHeight > desktopToc.clientHeight);
      }
      for (const { table, needsLabel } of tables) {
        setTableFocus(table.scrollWidth > table.clientWidth, table, needsLabel);
      }
    };
    const scrollFocusedTable = (event: KeyboardEvent) => {
      const table = event.currentTarget as HTMLTableElement;
      if (
        event.target !== table ||
        table.tabIndex !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      table.scrollBy({ left: event.key === "ArrowRight" ? 40 : -40, behavior: "instant" });
    };
    const selector = includeH3
      ? "[data-guide-summary], .gs-guide-prose h2, .gs-guide-prose h3"
      : "[data-guide-summary], .gs-guide-prose h2";
    const items = [
      ...article.querySelectorAll<HTMLElement>(selector),
    ];
    items.forEach((item, index) => {
      if (!item.id) item.id = `gs-guide-section-${index}`;
    });
    setHeadings(
      items.map((item) => ({
        id: item.id,
        title: item.matches("[data-guide-summary]") ? summaryLabel : item.textContent || "",
      })),
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      let index = 0;
      items.forEach((item, i) => {
        if (item.getBoundingClientRect().top <= 150) index = i;
      });
      const lastIndex = items.length - 1;
      if (index < lastIndex) {
        const end = document.documentElement.scrollHeight - innerHeight;
        if (end > 0 && scrollY >= end - 1 && items[lastIndex].getBoundingClientRect().top < innerHeight) {
          index = lastIndex;
        }
      }
      setActive(index);
      const rect = article.getBoundingClientRect();
      const progress = scope?.querySelector<HTMLElement>(".gs-guide-progress");
      const value = guideProgress(rect.top, rect.height, innerHeight);
      progress?.style.setProperty("width", `${value}%`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(() => {
      updateOverflowControls();
      schedule();
    });
    observer.observe(article);
    if (desktopToc) observer.observe(desktopToc);
    if (desktopTocItems) observer.observe(desktopTocItems);
    for (const { table } of tables) {
      observer.observe(table);
      table.addEventListener("keydown", scrollFocusedTable);
      for (const section of table.children) observer.observe(section);
    }
    updateOverflowControls();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      desktopToc?.removeAttribute("data-scrollable");
      for (const { table, needsLabel } of tables) {
        table.removeEventListener("keydown", scrollFocusedTable);
        setTableFocus(false, table, needsLabel);
      }
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [includeH3, summaryLabel, tableAria]);

  const content = (
    <>
      <span className="gs-guide-toc-title gs-guide-caption pl-3.5 mb-2 hidden md:block">
        {tocLabel}
      </span>
      <div className="gs-guide-toc-items">
        {headings.map((heading, index) => (
          <button
            className="block text-left py-2 pr-1 pl-3.5 -ml-0.5"
            key={heading.id}
            type="button"
            aria-current={index === active ? "location" : undefined}
            onClick={() => {
              const node = document.getElementById(heading.id);
              if (!node) return;
              if (mobileDetails.current?.open) {
                mobileDetails.current.open = false;
              }
              node.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                block: "start",
              });
              node.tabIndex = -1;
              node.focus({ preventScroll: true });
            }}
          >
            {heading.title}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div ref={root} className="gs-guide-toc min-w-0 w-full md:sticky md:top-22">
      <div className="gs-guide-progress fixed top-0 left-0 w-0 z-70 h-0.5" aria-hidden="true" />
      {enabled && (
        <>
          <nav className="gs-guide-toc-desktop hidden md:block" aria-label={tocLabel}>
            {content}
          </nav>
          <details ref={mobileDetails} className="gs-guide-toc-mobile block md:hidden">
            <summary className="gs-guide-toc-summary flex items-center justify-between py-2.5">
              <span>{tocLabel}</span>
              <ChevronDown size={16} className="gs-guide-toc-chevron shrink-0" aria-hidden="true" />
            </summary>
            <noscript>
              <p>{uiCopy.scrollHint}</p>
            </noscript>
            {content}
          </details>
        </>
      )}
    </div>
  );
}

export function GuideCopyLink({ locale }: { locale?: CanvasLocale }) {
  const pathname = usePathname();
  const resolvedLocale = resolveReadingLocale(locale, pathname);
  const uiCopy = getGuideArticleUiCopy(resolvedLocale);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const label = status === "copied" ? uiCopy.copyLinkCopied : uiCopy.copyLinkIdle;
  const errorText = uiCopy.copyLinkError;

  return (
    <div className="gs-guide-copy">
      <button
        className="gs-guide-copy-btn w-full justify-center"
        type="button"
        data-gs-ui="button"
        data-copied={status === "copied" ? "true" : undefined}
        onClick={async () => {
          try {
            const url = new URL(location.href);
            url.hash = "";
            url.search = "";
            await navigator.clipboard.writeText(url.href);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        {status === "copied" ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <LinkIcon size={16} aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>
      <span className={status === "error" ? "gs-guide-caption block mt-1.5" : "gs-sr-only"} role="status">
        {status === "copied" ? label : status === "error" ? errorText : ""}
      </span>
    </div>
  );
}
