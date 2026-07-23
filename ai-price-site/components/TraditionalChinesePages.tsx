import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type InfoKey =
  | "about"
  | "data-sources"
  | "privacy"
  | "terms"
  | "guides"
  | "guides/price-guide"
  | "guides/payment-account"
  | "guides/methodology";

type PageText = {
  eyebrow: string;
  title: string;
  description: string;
  heading: string;
  paragraphs: string[];
};

const homeSections = [
  {
    title: "AI 訂閱",
    description:
      "比較 ChatGPT、Claude、Gemini、Grok 等服務在不同國家與地區的訂閱價格。",
    href: "/zh-tw/ai-pricing/",
    tag: "AI",
  },
  {
    title: "串流媒體",
    description:
      "查看 Netflix、Disney+ 等串流服務的地區價格差異與稅費資訊。",
    href: "/zh-tw/streaming-pricing/",
    tag: "串流",
  },
  {
    title: "資料來源",
    description:
      "瞭解價格、匯率、稅務資料的來源，以及 GeoSub 如何檢查資料品質。",
    href: "/zh-tw/data-sources/",
    tag: "資料",
  },
  {
    title: "訂閱指南",
    description:
      "閱讀地區定價、付款帳號、稅費與資料方法的實用說明。",
    href: "/zh-tw/guides/",
    tag: "指南",
  },
];

const pageCopy: Record<InfoKey, PageText> = {
  about: {
    eyebrow: "關於 GeoSub",
    title: "讓全球訂閱價格更容易理解",
    description:
      "GeoSub 整理數位訂閱在不同國家與地區的公開價格，協助使用者看懂實際差異。",
    heading: "我們在做什麼",
    paragraphs: [
      "同一項服務可能因國家、幣別、稅費與平台而有不同價格。GeoSub 以一致的方法整理經過檢查的地區價格，並標示採集日期、匯率基準與資料可信度。",
      "GeoSub 提供的是價格資訊與比較工具，不保證跨區訂閱資格。實際價格與可用性仍應以官方結帳頁面為準。",
    ],
  },
  "data-sources": {
    eyebrow: "資料來源",
    title: "GeoSub 的價格從哪裡來？",
    description:
      "瞭解公開榜單使用的價格來源、匯率更新方式與資料檢查流程。",
    heading: "可追溯的價格資料",
    paragraphs: [
      "目前公開榜單使用經過檢查的 App Store 地區訂閱價格，並保留原始幣別、採集日期與套餐對應關係。",
      "匯率僅用於跨地區比較，不會改變平台顯示的當地價格。稅務說明提供結帳情境，最終金額仍以 App Store 結帳頁面為準。",
    ],
  },
  privacy: {
    eyebrow: "隱私權",
    title: "隱私權政策",
    description: "GeoSub 如何處理網站運作與統計所需的資料。",
    heading: "有限且必要的資料收集",
    paragraphs: [
      "GeoSub 可能記錄維持網站運作、安全與改善體驗所需的技術及統計資料。",
      "我們避免收集不必要的個人資料。網站啟用的分析服務會由管理後台統一設定與管理。",
    ],
  },
  terms: {
    eyebrow: "服務條款",
    title: "GeoSub 使用條款",
    description: "使用 GeoSub 價格資料與比較結果時應瞭解的原則。",
    heading: "資訊服務的使用範圍",
    paragraphs: [
      "GeoSub 提供的價格、稅費、匯率與可用性資訊僅供參考，相關資料可能隨平台政策而變動。",
      "GeoSub 不保證使用者可以從其他地區訂閱服務，也不鼓勵規避平台、帳號或付款規則。",
    ],
  },
  guides: {
    eyebrow: "訂閱指南",
    title: "看懂地區訂閱價格",
    description: "從價格、付款、帳號與資料方法理解全球訂閱差異。",
    heading: "選擇你需要的指南",
    paragraphs: [
      "價格指南說明如何閱讀當地價格、換算價格與美國基準；付款與帳號指南整理常見限制；方法論則說明採集與審核流程。",
      "指南用來協助理解資料，不會取代服務商的官方條款與結帳資訊。",
    ],
  },
  "guides/price-guide": {
    eyebrow: "價格指南",
    title: "如何閱讀地區價格比較",
    description: "看懂當地價格、顯示幣別、匯率日期與基準差異。",
    heading: "先比較一致的資料",
    paragraphs: [
      "先查看當地價格及採集日期，再確認顯示幣別的匯率基準日期，避免用不同時間的資料直接比較。",
      "價格較低不代表一定可以購買。帳號地區、付款方式、稅費與平台限制仍會影響最終結果。",
    ],
  },
  "guides/payment-account": {
    eyebrow: "付款與帳號",
    title: "訂閱前應檢查哪些條件？",
    description: "帳號地區、付款方式與帳單資料可能限制地區訂閱。",
    heading: "付款前的必要確認",
    paragraphs: [
      "請確認服務是否在當地提供、帳號所屬地區、支援的付款方式，以及結帳頁要求的帳單資料。",
      "不要提供不實資訊。最終價格與訂閱資格應以官方結帳頁面顯示為準。",
    ],
  },
  "guides/methodology": {
    eyebrow: "方法論",
    title: "GeoSub 如何檢查價格",
    description: "從地區採集、套餐辨識到正式發布的完整資料流程。",
    heading: "採集、檢查、發布",
    paragraphs: [
      "系統會把採集結果對應到標準套餐，檢查幣別、計費週期與價格範圍，並與先前記錄及其他地區樣本比較。",
      "不一致或無法確認的價格會先被隔離。只有達到穩定性與可信度條件的資料才會進入公開頁面。",
    ],
  },
};

export const traditionalChineseHomeMetadata: Metadata = {
  title: "全球數位訂閱價格比較",
  description:
    "比較 AI 與串流服務在不同國家和地區的訂閱價格、匯率、稅費與購買力。",
};

export function getTraditionalChineseInfoMetadata(
  segments: string[],
): Metadata {
  const page = pageCopy[segments.join("/") as InfoKey];
  return page ? { title: page.title, description: page.description } : {};
}

export function TraditionalChineseHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
            全球數位訂閱價格
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            在同一個地方，看懂全球訂閱價格
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSub 比較 AI 與串流服務在不同國家和地區的公開訂閱價格，並整理匯率、稅費與購買力資訊。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {homeSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40"
            >
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
                {section.tag}
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">
                {section.title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {section.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">
                查看內容 <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function TraditionalChineseInfoPage({
  segments,
}: {
  segments: string[];
}) {
  const page = pageCopy[segments.join("/") as InfoKey];

  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-600">
          {page.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          {page.description}
        </p>
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">{page.heading}</h2>
          {page.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 text-sm leading-8 text-zinc-600"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
