"use client";
import "../app/public-tokens.css";
import "../app/public-base.css";
import "../app/public-components.css";
import "../app/public-motion.css";
import "../public/styles/v7-auxiliary-states.css";
import Link from "next/link";
import PublicSearch from "./PublicSearch";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

const stateCopy: Record<
  CanvasLocale,
  {
    title: string;
    description: string;
    navLabel: string;
    links: readonly (readonly [string, string])[];
  }
> = {
  zh: {
    title: "这个页面不存在",
    description: "可能是链接写错了，或者这个套餐已经下架。搜一下你要找的产品：",
    navLabel: "继续查看价格",
    links: [
      ["/zh/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/zh/streaming-pricing/netflix", "Netflix"],
      ["/zh/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/zh", "返回首页"],
    ],
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
    ],
  },
  "zh-tw": {
    title: "找不到這個頁面",
    description: "可能是網址輸入有誤，或這個訂閱方案已下架。搜尋你要找的產品或地區：",
    navLabel: "繼續查看價格",
    links: [
      ["/zh-tw/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/zh-tw/streaming-pricing/netflix", "Netflix"],
      ["/zh-tw/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/zh-tw", "返回首頁"],
    ],
  },
  ja: {
    title: "ページが見つかりません",
    description:
      "URL が間違っているか、このプランの掲載が終了している可能性があります。サービス名や地域で検索してみてください：",
    navLabel: "料金比較を続ける",
    links: [
      ["/ja/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/ja/streaming-pricing/netflix", "Netflix"],
      ["/ja/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/ja", "ホームに戻る"],
    ],
  },
  ko: {
    title: "페이지를 찾을 수 없습니다",
    description:
      "링크가 잘못되었거나 더 이상 제공되지 않는 구독 요금제일 수 있습니다. 서비스나 국가를 검색해 보세요:",
    navLabel: "가격 비교 계속하기",
    links: [
      ["/ko/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/ko/streaming-pricing/netflix", "Netflix"],
      ["/ko/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/ko", "홈으로 돌아가기"],
    ],
  },
  es: {
    title: "Página no encontrada",
    description:
      "Puede que el enlace esté mal escrito o que este plan de suscripción ya no esté disponible. Busca un producto o región:",
    navLabel: "Seguir explorando precios",
    links: [
      ["/es/ai-pricing/chatgpt/plus", "ChatGPT Plus"],
      ["/es/streaming-pricing/netflix", "Netflix"],
      ["/es/streaming-pricing/youtube-premium", "YouTube Premium"],
      ["/es", "Volver al inicio"],
    ],
  },
};

export default function AuxiliaryNotFound({ locale = "zh" }: { locale?: CanvasLocale }) {
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
