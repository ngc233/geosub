import type { Metadata } from "next";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "礼品卡比价",
  description: "GeoSub 礼品卡价格数据仍在建设中，暂不作为正式页面展示。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GiftCardsPage() {
  guardUnreleasedPublicPage();

  return (
    <main className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        礼品卡比价
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        这里后面会放 Apple、Google、Steam 等礼品卡渠道价格对比。
      </p>
    </main>
  );
}
