"use client";
import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import { guideProgress } from "../lib/guide-presentation";
/** Enhances existing server-rendered headings; does not rewrite article HTML. */
export function GuideContents({ enabled = true }: { enabled?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const scope = root.current?.closest(".gs-guide-article-layout");
    const article = scope?.querySelector<HTMLElement>("article");
    if (!article) return;
    const items = [...article.querySelectorAll<HTMLElement>("[data-guide-summary], .gs-guide-prose h2, .gs-guide-prose h3")];
    items.forEach((item, index) => { if (!item.id) item.id = `gs-guide-section-${index}`; });
    setHeadings(items.map(item => ({ id: item.id, title: item.matches("[data-guide-summary]") ? "先说结论" : item.textContent || "" })));
    let frame = 0;
    const update = () => {
      frame = 0;
      let index = 0;
      items.forEach((item, i) => { if (item.getBoundingClientRect().top <= 150) index = i; });
      setActive(index);
      const rect = article.getBoundingClientRect();
      const progress = scope?.querySelector<HTMLElement>(".gs-guide-progress");
      const value = guideProgress(rect.top, rect.height, innerHeight);
      progress?.style.setProperty("width", `${value}%`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule); observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  const content = <><span className="gs-guide-toc-title gs-guide-caption pl-4 mb-2.5 hidden md:block">本文目录</span><div className="gs-guide-toc-items">{headings.map((heading, index) => <button className="block text-left py-2 pr-0 pl-3.5 -ml-0.5" key={heading.id} type="button" aria-current={index === active ? "location" : undefined} onClick={() => {
    const node = document.getElementById(heading.id); if (!node) return;
    node.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    node.tabIndex = -1; node.focus({ preventScroll: true });
  }}>{heading.title}</button>)}</div></>;
  return <div ref={root} className="gs-guide-toc min-w-0 w-full md:sticky md:top-22 md:pt-28"><div className="gs-guide-progress fixed left-0 w-0 z-70 h-0.5" aria-hidden="true"/>{enabled && <><nav className="gs-guide-toc-desktop hidden md:block" aria-label="本文目录">{content}</nav><details className="gs-guide-toc-mobile block md:hidden"><summary className="flex items-center">本文目录</summary><noscript><p>向下阅读完整正文。</p></noscript>{content}</details></>}</div>;
}
export function GuideCopyLink() {
  const [message, setMessage] = useState("");
  return <div className="gs-guide-copy"><button className="w-full justify-center" type="button" data-gs-ui="button" onClick={async () => { try { const url = new URL(location.href); url.hash = ""; url.search = ""; await navigator.clipboard.writeText(url.href); setMessage("已复制文章链接"); } catch { setMessage("复制失败，请从地址栏复制链接"); } }}><LinkIcon size={16} aria-hidden="true"/>复制文章链接</button><span className="gs-guide-caption block" role="status">{message}</span></div>;
}
