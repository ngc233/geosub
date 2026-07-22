import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "本页面说明 GeoSub 如何处理访问数据、基础统计信息和用户在使用网站时可能产生的非敏感数据。",
};

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Privacy Policy
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          隐私政策
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          本页面说明 GeoSub 如何处理访问数据、基础统计信息和用户在使用网站时可能产生的非敏感数据。
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            页面说明
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            GeoSub 主要用于展示公开价格数据和订阅信息。我们不会主动要求用户提交敏感身份信息。网站可能使用基础访问统计、点击统计和性能分析数据，用于改进页面体验和内容质量。
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            GeoSub 可能使用 Google Analytics 或 Tag Manager 统计页面访问和点击，以改进内容与性能。统计用途会在本页说明，并避免收集与价格比较无关的敏感身份信息。
          </p>
        </div>
      </section>
    </main>
  );
}
