"use client";
import "../app/public-tokens.css";
import "../app/public-base.css";
import "../app/public-components.css";
import "../app/public-motion.css";
import "../public/styles/v7-auxiliary-states.css";
import Link from "next/link";
import PublicSearch from "./PublicSearch";
export default function NotFound() {
  return <main className="gs-public-unified gs-state-page"><section className="gs-state-panel">
    <div className="gs-state-globe" aria-hidden="true"/><p className="gs-state-code">404</p>
    <h1>这个页面不存在</h1><p>可能是链接写错了，或者这个套餐已经下架。搜一下你要找的产品：</p>
    <PublicSearch variant="state"/>
    <nav aria-label="继续查看价格">{[
      ["/zh/ai-pricing/chatgpt/plus","ChatGPT Plus"],
      ["/zh/streaming-pricing/netflix","Netflix"],
      ["/zh/streaming-pricing/youtube-premium","YouTube Premium"],
      ["/zh","返回首页"],
    ].map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
  </section></main>;
}
