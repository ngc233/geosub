import Link from "next/link";

const sections = [
  {
    title: "AI 订阅",
    desc: "比较 ChatGPT、Claude、Gemini、Grok 等 AI 订阅在不同国家和地区的价格差异。",
    href: "/zh/ai-pricing/",
    tag: "AI",
  },
  {
    title: "流媒体",
    desc: "比较 Netflix、YouTube Premium、Spotify、Disney+ 等流媒体服务的地区订阅价格。",
    href: "/zh/streaming-pricing/",
    tag: "Streaming",
  },
  {
    title: "数据来源",
    desc: "查看 GeoSub 当前正式数据口径、App Store 来源、汇率、税费和审核说明。",
    href: "/zh/data-sources/",
    tag: "Data",
  },
  {
    title: "订阅指南",
    desc: "查看地区价格、支付账号、价格方法论和订阅决策相关内容。",
    href: "/zh/guides/",
    tag: "Guides",
  },
];

export default function ZhHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-600">
            Global Digital Subscription Pricing
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            全球数字订阅价格对比
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            当前优先整理 AI 订阅和流媒体订阅的 App Store 地区价格，并提供美元折算、人民币估算、税费说明和购买力视角。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
            >
              <div className="mb-5 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 transition duration-200 ease-out group-hover:bg-lime-100 group-hover:text-lime-700">
                {item.tag}
              </div>

              <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                {item.title}
              </h2>

              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {item.desc}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600 transition duration-200 ease-out group-hover:gap-3">
                查看更多
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
