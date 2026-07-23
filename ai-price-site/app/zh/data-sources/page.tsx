import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "数据来源与价格口径",
  description:
    "GeoSub 使用经过核验的 App Store 地区订阅价格，并同时标注汇率日期、税费说明和数据可信状态。",
};

const sourceLayers = [
  {
    title: "价格数据",
    badge: "App Store",
    items: [
      "App Store 各地区公开订阅价格",
      "产品、套餐、国家和币种的结构化价格记录",
      "通过异常检测和审核后进入前台榜单",
    ],
  },
  {
    title: "换算与比较",
    badge: "定期更新",
    items: [
      "按所选显示币种换算地区价格",
      "国家与地区税务说明和数据可信状态",
      "相对美国基准价、价格差距和风险提示",
    ],
  },
  {
    title: "阅读提示",
    badge: "结算页为准",
    items: [
      "本地标价与换算价格分别展示",
      "价格采集、汇率和套餐复核日期分别标注",
      "账号地区、付款方式和税费可能影响最终金额",
    ],
  },
];

const qualityRules = [
  "同一套餐会按原始币种价格、周期、地区和美元折算价做一致性检查。",
  "明显偏离同套餐常见范围、币种疑似错误或周期不一致的价格会暂缓展示并重新检查。",
  "地区排行只使用已通过检查、能够与同一套餐直接比较的价格。",
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
          GeoSub 按相同套餐和计费周期比较 App Store 各地区公开订阅价格，并保留本地币种、采集日期和汇率基准。
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
          <h2 className="text-xl font-black text-zinc-950">如何阅读这些数据</h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 text-sm leading-8 text-zinc-600">
              <p>
                地区排行只比较同一 App Store 套餐和计费周期。页面同时保留本地标价与换算价格，避免把汇率变化误认为平台调价。
              </p>

              <p>
                汇率用于把各地区本地价格换算为用户所选的显示币种，方便横向比较。参考汇率通常每 12 小时同步一次；页面会标出使用的汇率日期，过期或缺失时暂停对应换算。
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
