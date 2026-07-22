import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "礼品卡教程",
  description: "这里将整理 Apple、Google、Steam 等礼品卡的购买渠道、面值选择、地区限制、充值方式和常见问题。",
};

export default function GuideCategoryPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Gift Card Guide
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            礼品卡教程
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里将整理 Apple、Google、Steam 等礼品卡的购买渠道、面值选择、地区限制、充值方式和常见问题。
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            暂无已发布内容
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            该分类目前还没有已发布文章。购买礼品卡前，请先核对发行地区、适用账号、币种和退款规则。
          </p>
        </div>
      </section>
    </main>
  );
}
