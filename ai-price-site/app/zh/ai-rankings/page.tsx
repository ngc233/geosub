import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 工具排行榜测试中 - GeoSub",
  description: "GeoSub AI 工具排行榜正在补充模型覆盖、评分依据和人工审核，暂不作为正式页面展示。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AiRankingsPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-20">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          GeoSub Beta
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
          AI 工具排行榜正在审核
        </h1>
        <p className="mt-5 text-base leading-8 text-zinc-500 dark:text-zinc-400">
          这套榜单需要覆盖更多主流模型，并完成评分依据、价格数据、产品定位和人工复核后再正式开放。当前版本先隐藏展示，避免给用户造成不准确的选择暗示。
        </p>
      </div>
    </main>
  );
}
