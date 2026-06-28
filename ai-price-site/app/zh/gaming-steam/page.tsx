import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "游戏与 Steam 区域价格对比 - Steam、Xbox、PlayStation、Nintendo",
  description:
    "比较 Steam、Xbox、PlayStation、Nintendo、游戏订阅和充值卡在不同国家和地区的价格差异。",
};

const gamingItems = [
  {
    name: "Steam 区域价格",
    description: "热门游戏在不同国家和地区的标价、汇率和低价区变化。",
  },
  {
    name: "Xbox Game Pass",
    description: "Game Pass 不同地区订阅价格、可用性和购买方式。",
  },
  {
    name: "PlayStation Plus",
    description: "PS Plus 各地区订阅档位和价格差异。",
  },
  {
    name: "Nintendo",
    description: "Switch Online、任天堂点卡和地区价格对比。",
  },
  {
    name: "游戏充值卡",
    description: "Steam、Xbox、PlayStation、Nintendo 礼品卡价格和渠道。",
  },
  {
    name: "游戏订阅",
    description: "EA Play、Ubisoft+、GeForce NOW 等游戏服务价格。",
  },
];

export default function GamingSteamPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Gaming / Steam
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            游戏与 Steam 区域价格对比
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            这里将整理 Steam、Xbox、PlayStation、Nintendo、游戏订阅和充值卡在不同国家和地区的价格差异。
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gamingItems.map((item) => (
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
