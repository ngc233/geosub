import type { Metadata } from "next";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";

export const metadata: Metadata = {
  title: "全球数字订阅价格对比 - GeoSub",
  description:
    "比较 AI 工具和流媒体服务在不同国家和地区的价格，查看最低价地区、高价地区、价格差距和区域价格覆盖。",
};

export default async function AiPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "zh",
  });

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          全球数字订阅价格对比
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          比较 AI 工具和流媒体服务在不同地区的价格，查看最低价地区、高价地区和价格差距。
        </p>
      </div>

      <DbAiPricingClient products={products} locale="zh" />
    </main>
  );
}