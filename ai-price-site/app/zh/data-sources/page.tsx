import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "数据来源与价格口径 - GeoSub",
  description:
    "GeoSub 当前正式榜单优先使用 App Store 各地区公开订阅价格，并通过汇率、税费规则、异常审核和人工复核记录控制数据质量。",
};

const sourceLayers = [
  {
    title: "正式价格源",
    badge: "当前上线",
    items: [
      "App Store 各地区公开订阅价格",
      "产品、套餐、国家和币种的结构化价格记录",
      "通过异常检测和审核后进入前台榜单",
    ],
  },
  {
    title: "辅助计算层",
    badge: "持续更新",
    items: [
      "USD 汇率折算和人民币估算",
      "国家与地区税务说明、可信度和复核状态",
      "相对美国基准价、价格差距和风险提示",
    ],
  },
  {
    title: "诊断线索",
    badge: "不混入排行",
    items: [
      "Web 官网价格、Google Play、公开价格页和人工线索",
      "仅用于后台排错、交叉验证和未来补充",
      "稳定前不会默认进入正式价格排名",
    ],
  },
];

const qualityRules = [
  "同一套餐会按原始币种价格、周期、地区和美元折算价做一致性检查。",
  "明显低到不合理、币种疑似解析错误、小数点异常或周期不一致的价格会进入审核队列。",
  "前台只展示已发布价格；待审核、忽略或拒绝的观测不会混入正式榜单。",
  "税费说明不额外加到排序价格中，最终仍以 App Store 或官方结算页为准。",
];

export default function DataSourcesPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Data Sources
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          数据来源与价格口径
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub 当前正式价格榜优先使用 App Store 各地区公开订阅价格。这样可以让国家和地区之间的比较更稳定，也更容易解释价格差异。
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {sourceLayers.map((layer) => (
            <section
              key={layer.title}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-zinc-950">{layer.title}</h2>
                <span className="rounded-full bg-lime-50 px-2.5 py-1 text-xs font-bold text-lime-700 ring-1 ring-lime-200">
                  {layer.badge}
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
                {layer.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">当前实际规则</h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 text-sm leading-8 text-zinc-600">
              <p>
                正式榜单目前不把 Web 官网价、Google Play 或其他公开页面混入排序。它们会先进入后台诊断或未来数据源计划，只有当解析、税费和审核规则足够稳定时，才会在产品页中单独标注。
              </p>

              <p>
                汇率用于把各地区本地价格折算为美元和人民币视角，方便横向比较。后台每 12 小时同步一次汇率；如果人民币汇率缺失或过期，前台会暂停人民币估算并提示最近汇率日期，不再用固定兜底数值展示。
              </p>

              <p>
                税费说明来自已整理的国家与地区税务规则。GeoSub 不会把税率额外加入采集价格里重新排序，因为 App Store 展示价通常已经包含平台地区定价逻辑；最终支付价格仍以官方结算页为准。
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-100">
              <h3 className="text-sm font-black text-zinc-950">质量控制</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                {qualityRules.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-lime-700 ring-1 ring-lime-200">
                      ✓
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <p className="mt-6 max-w-4xl text-sm leading-7 text-zinc-500">
          风险提示：GeoSub 展示公开价格差异，用于比较不同地区的订阅成本，不鼓励规避平台规则。跨地区订阅可能受到账号地区、付款方式、账单信息、税费和平台风控影响。
        </p>
      </section>
    </main>
  );
}
