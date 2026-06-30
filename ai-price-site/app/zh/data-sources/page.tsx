import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "数据来源 - GeoSub",
  description: "GeoSub V1 正式价格榜优先使用 App Store 各地区公开订阅价格，其他来源暂作为后台诊断和辅助线索。",
};

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Data Sources
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          数据来源
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub V1 正式价格榜优先使用 App Store 各地区公开订阅价格。这样可以让国家和地区之间的比较更稳定、更容易解释。
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            页面说明
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            Web 官网、Google Play、公开价格页和其他来源会先进入后台采集诊断或审核线索，不会默认混入正式榜单。
            当某个来源的解析、税费和审核规则足够稳定时，我们会在产品页中单独标注。
          </p>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            由于平台价格、汇率、税费和地区政策可能随时变化，GeoSub 会尽量保持数据更新，但最终价格仍应以官方页面和实际支付页面为准。
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            当前页面为基础版本，后续可以根据网站实际数据源、统计工具、广告合作、联盟链接和公司主体信息继续完善。
          </p>
        </div>
      </section>
    </main>
  );
}
