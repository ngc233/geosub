import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "支付与账号",
  description: "这里将整理数字订阅相关的支付方式、账号注册、地区切换、订阅限制和常见问题。",
};

export default function GuideCategoryPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Payment & Account
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            支付与账号
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里将整理数字订阅相关的支付方式、账号注册、地区切换、订阅限制和常见问题。
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            暂无已发布内容
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            该分类目前还没有已发布文章。订阅可用地区、付款方式和账号限制请以对应平台的官方说明为准。
          </p>
        </div>
      </section>
    </main>
  );
}
