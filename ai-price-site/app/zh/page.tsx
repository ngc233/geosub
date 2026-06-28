import Link from "next/link";

const sections = [
  {
    title: "AI 定价",
    desc: "比较 ChatGPT、Claude、Gemini、Grok 等 AI 订阅在不同国家和地区的价格差异。",
    href: "/zh/ai-pricing/",
    tag: "AI Pricing",
  },
  {
    title: "软件订阅",
    desc: "比较 Microsoft 365、Adobe、Canva、Notion、Cursor、JetBrains 等软件订阅价格。",
    href: "/zh/software-subscriptions/",
    tag: "Software",
  },
  {
    title: "游戏 / Steam",
    desc: "整理 Steam、Xbox、PlayStation、Nintendo、游戏订阅和充值卡的区域价格。",
    href: "/zh/gaming-steam/",
    tag: "Gaming",
  },
  {
    title: "礼品卡",
    desc: "比较 Apple、Google、Steam 等礼品卡在不同地区的购买渠道、面值和溢价。",
    href: "/zh/gift-cards/",
    tag: "Gift Cards",
  },
  {
    title: "AI 工具",
    desc: "按免费 AI、编程 AI、图片生成、视频生成、搜索工具等分类对比工具能力。",
    href: "/zh/ai-rankings/",
    tag: "AI Tools",
  },
  {
    title: "指南",
    desc: "查看订阅省钱、地区价格、礼品卡、支付方式、账号注册和工具测评内容。",
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
            比较 AI 订阅、软件订阅、游戏服务、礼品卡和数字工具在不同国家与地区的价格差异，帮助用户发现更合适的订阅方案。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
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
