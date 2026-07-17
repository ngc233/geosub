import type { Metadata } from "next";

import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "软件订阅价格对比 - Microsoft 365、Adobe、Canva、Notion 等",
  description:
    "比较 Microsoft 365、Adobe、Canva、Notion、Dropbox、Grammarly、Cursor、JetBrains 等软件订阅在不同国家和地区的价格差异。",
  robots: {
    index: false,
    follow: false,
  },
};

const softwareItems = [
  {
    name: "Microsoft 365",
    description: "个人版、家庭版和企业订阅在不同地区的价格差异。",
  },
  {
    name: "Adobe",
    description: "Creative Cloud、Photoshop、Premiere Pro 等订阅价格。",
  },
  {
    name: "Canva",
    description: "Canva Pro、团队版和地区定价对比。",
  },
  {
    name: "Notion",
    description: "个人、团队和 AI 附加订阅价格对比。",
  },
  {
    name: "Cursor / JetBrains",
    description: "开发者工具订阅价格、地区差异和学生优惠。",
  },
  {
    name: "Dropbox / Grammarly",
    description: "效率工具、云存储和写作工具订阅价格。",
  },
];

export default function SoftwareSubscriptionsPage() {
  guardUnreleasedPublicPage();

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Software Subscriptions
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            软件订阅价格对比
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里将整理 Microsoft 365、Adobe、Canva、Notion、Dropbox、Grammarly、Cursor、JetBrains 等软件订阅在不同国家和地区的价格差异。
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {softwareItems.map((item) => (
            <article
              key={item.name}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] transition hover:border-lime-200 hover:bg-lime-50/40"
            >
              <h2 className="text-lg font-black text-zinc-950">{item.name}</h2>
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
