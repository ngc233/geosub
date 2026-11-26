"use client";
import "../app/public-tokens.css";
import "../app/public-base.css";
import "../app/public-components.css";
import "../app/public-motion.css";
import "../public/styles/v7-auxiliary-states.css";
import Link from "next/link";
import PublicSearch from "./PublicSearch";

const stateCopy = {
  zh: {
    title: "这个页面不存在",
    description: "可能是链接写错了，或者这个套餐已经下架。搜一下你要找的产品：",
    navLabel: "继续查看价格",
    links: [
      ["/zh/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/zh/streaming-pricing/netflix", "Netflix"],
      ["/zh/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/zh", "返回首页"],
    ] as const,
  },
  en: {
    title: "Page not found",
    description:
      "The link may be mistyped, or this subscription plan is no longer listed. Search for a product or region:",
    navLabel: "Continue exploring prices",
    links: [
      ["/en/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/en/streaming-pricing/netflix", "Netflix"],
      ["/en/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/en", "Back to home"],
    ] as const,
  },
} as const;

export default function AuxiliaryNotFound({ locale = "zh" }: { locale?: "zh" | "en" }) {
  const copy = stateCopy[locale];
  return (
    <div className="gs-public-unified gs-state-page">
      <section className="gs-state-panel">
        <div className="gs-state-globe" aria-hidden="true" />
        <p className="gs-state-code">404</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <PublicSearch variant="state" locale={locale} />
        <nav aria-label={copy.navLabel}>
          {copy.links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
