import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GeoSub 指南 - 数字订阅价格、支付与账号教程",
  description:
    "GeoSub 指南汇总数字订阅价格、地区订阅、礼品卡、支付方式、账号注册和 AI 工具测评内容。",
};

const categories = [
  {
    title: "价格指南",
    description: "了解不同数字服务在各地区的价格差异、省钱区域和价格变化。",
  },
  {
    title: "地区订阅",
    description: "整理不同国家和地区的订阅可用性、支付限制和使用注意事项。",
  },
  {
    title: "礼品卡教程",
    description: "了解 Apple、Google、流媒体和游戏平台礼品卡的购买与使用方式。",
  },
  {
    title: "支付与账号",
    description: "整理跨区支付、账号注册、账单地址和订阅风控相关内容。",
  },
  {
    title: "工具测评",
    description: "对比 AI 工具、流媒体、VPN 和其他数字服务的使用体验。",
  },
  {
    title: "政策更新",
    description: "记录平台价格、地区政策、支付规则和订阅限制的变化。",
  },
];

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Guides
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            GeoSub 指南
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里会汇总数字订阅价格、地区订阅、礼品卡、支付方式、账号注册和工具测评内容。当前先作为内容入口预留，后续会接入后台文章分类和导航管理。
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]"
            >
              <h2 className="text-lg font-black text-zinc-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
