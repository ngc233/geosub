import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于 GeoSub",
  description: "GeoSub 比较 AI 与流媒体订阅在不同国家和地区的公开价格，并说明汇率、税费、更新时间与购买力差异。",
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
          GeoSub 比较 AI 与流媒体订阅在不同国家和地区的公开价格，并说明汇率、税费、更新时间与购买力差异。
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            我们解决什么问题
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            我们把分散在不同地区、不同币种里的 App Store 订阅价格整理成更容易比较的数据，帮助用户理解价格差异、区域限制、套餐变化和订阅选择。
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            每个价格都会保留本地币种、采集日期和汇率基准。页面只使用通过一致性检查的地区价格，并提醒用户核对账号地区、付款方式、税费和官方结算价。
          </p>
        </div>
      </section>
    </main>
  );
}
