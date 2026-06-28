import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "工具测评 - GeoSub",
  description: "这里将整理 AI 工具、软件工具、效率工具和数字服务的测评内容，帮助用户选择更适合自己的工具。",
};

export default function GuideCategoryPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Tool Review
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            工具测评
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里将整理 AI 工具、软件工具、效率工具和数字服务的测评内容，帮助用户选择更适合自己的工具。
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            内容建设中
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            当前页面用于承接导航入口，避免已发布菜单指向 404。后续可以从后台文章系统读取该分类下的内容列表。
          </p>
        </div>
      </section>
    </main>
  );
}