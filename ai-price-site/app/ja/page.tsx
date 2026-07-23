import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "世界のデジタルサブスクリプション価格",
  description:
    "AIやストリーミングのサブスクリプション料金を国・地域別に比較できます。現地価格、選択した表示通貨への換算、税情報、購買力の目安を掲載しています。",
};

const sections = [
  {
    title: "AI サブスクリプション",
    description:
      "ChatGPT、Claude、Gemini、Grokなどの料金を国・地域別に比較します。",
    href: "/ja/ai-pricing/",
    tag: "AI",
  },
  {
    title: "ストリーミング",
    description:
      "Netflix、Disney+などのストリーミング料金を国・地域別に比較します。",
    href: "/ja/streaming-pricing/",
    tag: "動画配信",
  },
  {
    title: "データソース",
    description:
      "価格情報の取得元、為替レート、税情報、確認方法について説明します。",
    href: "/ja/data-sources/",
    tag: "データ",
  },
  {
    title: "ガイド",
    description:
      "地域別価格、支払い、アカウント、データの読み方をわかりやすく解説します。",
    href: "/ja/guides/",
    tag: "ガイド",
  },
];

export default function JapaneseHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
            Global Digital Subscription Pricing
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            世界のサブスクリプション料金を、わかりやすく
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSubは、AIやストリーミングの料金を国・地域別に比較できる価格データサイトです。現地価格、選択した表示通貨への換算、税情報、購買力の目安をまとめて確認できます。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
            >
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 group-hover:bg-lime-100 group-hover:text-lime-700">
                {section.tag}
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">
                {section.title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {section.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">
                詳しく見る <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
