import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "전 세계 디지털 구독 가격",
  description:
    "AI와 스트리밍 구독료를 국가·지역별로 비교하세요. 현지 가격, 미국 달러 환산가, 세금 정보와 구매력 지표를 함께 제공합니다.",
};

const sections = [
  {
    title: "AI 구독",
    description:
      "ChatGPT, Claude, Gemini, Grok 등의 구독료를 국가·지역별로 비교합니다.",
    href: "/ko/ai-pricing/",
    tag: "AI",
  },
  {
    title: "스트리밍",
    description:
      "Netflix, Disney+ 등 주요 스트리밍 서비스의 지역별 구독료를 비교합니다.",
    href: "/ko/streaming-pricing/",
    tag: "스트리밍",
  },
  {
    title: "데이터 출처",
    description:
      "가격 수집 출처와 환율, 세금 정보, 데이터 검토 방식을 확인합니다.",
    href: "/ko/data-sources/",
    tag: "데이터",
  },
  {
    title: "가이드",
    description:
      "지역별 가격과 결제, 계정 조건, 데이터 읽는 법을 쉽게 설명합니다.",
    href: "/ko/guides/",
    tag: "가이드",
  },
];

export default function KoreanHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
            Global Digital Subscription Pricing
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            전 세계 구독 가격을 한눈에
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSub는 AI와 스트리밍 구독료를 국가·지역별로 비교하는 가격
            데이터 사이트입니다. 현지 가격, 미국 달러 환산가, 세금 정보와
            구매력 지표를 함께 확인할 수 있습니다.
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
                자세히 보기 <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
