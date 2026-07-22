import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "数据方法",
  description:
    "了解 GeoSub 如何整理全球数字订阅、AI 工具、软件订阅、游戏服务和礼品卡的价格数据。",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Methodology
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          数据方法
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub 会从公开价格页面、官方订阅页、应用商店展示价格、地区价格页和人工整理记录中提取价格信息，并按国家、地区、币种、套餐和服务类型进行结构化整理。
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            {
              title: "公开来源优先",
              text: "优先整理官方页面、公开价格页和可验证的价格信息，避免使用无法追溯的数据。",
            },
            {
              title: "按地区归档",
              text: "同一产品会尽量按国家、地区、币种和套餐维度归类，方便用户比较价格差异。",
            },
            {
              title: "保留更新时间",
              text: "价格数据会标注采集时间和更新时间，帮助用户识别数据新鲜度。",
            },
            {
              title: "官方价格为准",
              text: "由于价格、税费、汇率和平台政策可能变化，最终价格仍应以官方结算页面为准。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]"
            >
              <h2 className="text-lg font-black text-zinc-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
