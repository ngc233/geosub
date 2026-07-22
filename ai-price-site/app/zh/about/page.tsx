import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于 GeoSub",
  description: "GeoSub 是一个全球数字订阅与虚拟服务价格数据平台，专注整理 AI 订阅、软件订阅、游戏服务、礼品卡和数字工具在不同国家与地区的价格差异。",
};

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          About GeoSub
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          关于 GeoSub
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub 是一个全球数字订阅与虚拟服务价格数据平台，专注整理 AI 订阅、软件订阅、游戏服务、礼品卡和数字工具在不同国家与地区的价格差异。
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            页面说明
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            我们希望把分散在不同地区、不同平台、不同币种里的订阅价格整理成更容易比较的数据，帮助用户理解价格差异、区域限制、套餐变化和订阅选择。
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            GeoSub 展示经过核验的 App Store 地区价格，并同时说明汇率日期、税费信息、价格可信度和订阅风险。不同来源的数据会分别标注和比较，不会混入同一排名。
          </p>
        </div>
      </section>
    </main>
  );
}
