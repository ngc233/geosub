import type { Metadata } from "next";
import { ProductCategory } from "@prisma/client";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 订阅价格对比 - ChatGPT、Claude、Gemini 全球价格",
  description:
    "比较 ChatGPT、Claude、Gemini 等 AI 订阅在不同国家和地区的 App Store 价格、美元折算、人民币估算、税费说明和价格差异。",
  alternates: {
    canonical: "/zh/ai-pricing",
  },
};

export default async function AiPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "zh",
    categories: [ProductCategory.AI],
  });

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          AI 订阅价格对比
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          比较 ChatGPT、Claude、Gemini 等 AI 工具在不同地区的订阅价格，查看最低价地区、高价地区、税费说明和价格差距。
        </p>
      </div>

      <DbAiPricingClient products={products} locale="zh" />
    </main>
  );
}
