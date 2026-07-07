import type { Metadata } from "next";
import { ProductCategory } from "@prisma/client";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";

export const metadata: Metadata = {
  title: "流媒体订阅价格对比 - Netflix、YouTube Premium、Spotify 全球价格",
  description:
    "比较 Netflix、YouTube Premium、Spotify、Disney+ 等流媒体订阅在不同国家和地区的价格、税费和区域价格差异。",
  alternates: {
    canonical: "/zh/streaming-pricing",
  },
};

export default async function StreamingPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "zh",
    categories: [ProductCategory.STREAMING],
  });

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          流媒体订阅价格对比
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          比较 Netflix、YouTube Premium、Spotify、Disney+ 等流媒体服务在不同地区的订阅价格。数据覆盖完善后会逐步开放更多产品。
        </p>
      </div>

      <DbAiPricingClient products={products} locale="zh" />
    </main>
  );
}
