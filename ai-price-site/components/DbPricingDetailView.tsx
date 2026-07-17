import Link from "next/link";
import type {
  DbPricingDetailLocale,
  DbPricingDetailPlan,
  DbPricingDetailProduct,
  DbPricingDetailRegion,
} from "../lib/db-pricing-detail";

type DbPricingDetailViewProps = {
  product: DbPricingDetailProduct;
  locale: DbPricingDetailLocale;
};

const markerPositionMap: Record<string, { left: number; top: number }> = {
  US: { left: 20, top: 43 },
  CA: { left: 18, top: 29 },
  MX: { left: 20, top: 55 },
  BR: { left: 35, top: 72 },
  AR: { left: 33, top: 84 },
  GB: { left: 48, top: 34 },
  FR: { left: 50, top: 40 },
  DE: { left: 53, top: 37 },
  DK: { left: 53, top: 30 },
  ES: { left: 48, top: 45 },
  IT: { left: 53, top: 46 },
  NL: { left: 51, top: 35 },
  CH: { left: 52, top: 42 },
  TR: { left: 59, top: 48 },
  IN: { left: 68, top: 57 },
  SG: { left: 74, top: 68 },
  PH: { left: 78, top: 61 },
  JP: { left: 84, top: 44 },
  KR: { left: 81, top: 43 },
  AU: { left: 84, top: 78 },
  NZ: { left: 91, top: 84 },
  AE: { left: 62, top: 53 },
  ZA: { left: 55, top: 79 },
};

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDiff(value: number | null, locale: DbPricingDetailLocale) {
  if (value === null) return "—";

  if (value === 0) {
    return locale === "en" ? "Same as US" : "与美国相同";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value}%`;
}

function billingText(locale: DbPricingDetailLocale, billingCycle: string) {
  if (billingCycle === "MONTHLY") return locale === "en" ? "Monthly" : "月付";
  if (billingCycle === "YEARLY") return locale === "en" ? "Yearly" : "年付";
  if (billingCycle === "WEEKLY") return locale === "en" ? "Weekly" : "周付";
  if (billingCycle === "QUARTERLY") return locale === "en" ? "Quarterly" : "季度";
  if (billingCycle === "ONE_TIME") return locale === "en" ? "One-time" : "一次性";
  return locale === "en" ? "Subscription" : "订阅";
}

function qualityLabel(locale: DbPricingDetailLocale, value: string) {
  if (locale === "en") {
    if (value === "VERIFIED") return "Verified";
    if (value === "ESTIMATED") return "Estimated";
    if (value === "STALE") return "Stale";
    if (value === "PENDING_REVIEW") return "Pending";
    return value;
  }

  if (value === "VERIFIED") return "已验证";
  if (value === "ESTIMATED") return "估算";
  if (value === "STALE") return "过期";
  if (value === "PENDING_REVIEW") return "待审核";
  return value;
}

function markerClassName(region: DbPricingDetailRegion) {
  if (region.isReference) {
    return "border-zinc-400 bg-zinc-900 text-white shadow-zinc-900/20";
  }

  if (region.isExpensive) {
    return "border-rose-300 bg-rose-500 text-white shadow-rose-500/25";
  }

  if (region.isCheap) {
    return "border-lime-300 bg-lime-500 text-lime-950 shadow-lime-500/25";
  }

  return "border-zinc-300 bg-white text-zinc-700 shadow-zinc-900/10";
}

function priceBadgeClassName(region: DbPricingDetailRegion) {
  if (region.isExpensive) {
    return "bg-rose-100 text-rose-600";
  }

  if (region.isReference) {
    return "bg-zinc-100 text-zinc-700";
  }

  return "bg-lime-100 text-lime-700";
}

function diffClassName(value: number | null) {
  if (value === null || value === 0) {
    return "text-zinc-600";
  }

  if (value < 0) {
    return "text-emerald-700";
  }

  return "text-rose-600";
}

function getRecommendation(plan: DbPricingDetailPlan, locale: DbPricingDetailLocale) {
  const minDiff = plan.minRegion.diffVsUsPercent;
  const maxDiff = plan.maxRegion.diffVsUsPercent;

  if (locale === "en") {
    if (minDiff !== null && minDiff < 0) {
      return `${plan.minRegion.countryName} is currently the lowest USD-equivalent region for this plan, about ${Math.abs(minDiff)}% below the US base price.`;
    }

    if (maxDiff !== null && maxDiff > 0) {
      return `${plan.maxRegion.countryName} is currently the highest region, about ${maxDiff}% above the US base price.`;
    }

    return "The current regional spread is limited. Use the table below to compare local prices, USD equivalents and source quality.";
  }

  if (minDiff !== null && minDiff < 0) {
    return `${plan.minRegion.countryName}目前是该套餐美元折算价最低的地区，约比美国基准低 ${Math.abs(minDiff)}%。`;
  }

  if (maxDiff !== null && maxDiff > 0) {
    return `${plan.maxRegion.countryName}目前是该套餐价格最高的地区，约比美国基准高 ${maxDiff}%。`;
  }

  return "当前地区价差不算明显，可以继续结合本地价格、税费和来源质量一起判断。";
}

function getMapPosition(region: DbPricingDetailRegion, index: number) {
  const known = markerPositionMap[region.code.toUpperCase()];

  if (known) {
    return known;
  }

  return {
    left: 16 + ((index * 11) % 70),
    top: 28 + ((index * 17) % 48),
  };
}

function getCopy(locale: DbPricingDetailLocale) {
  if (locale === "en") {
    return {
      back: "Back to pricing",
      official: "Official website",
      dataNote: "Data note",
      plans: "Plans",
      regions: "Regions",
      updated: "Updated",
      lowest: "Lowest",
      highest: "Highest",
      usBase: "US base",
      spread: "Spread",
      overview: "Overview",
      globalMap: "Global price map",
      globalMapDesc: "A visual distribution of currently tracked regions. Green means lower prices, dark means the US base, and red means higher prices.",
      purchasing: "Purchasing power view",
      purchasingDesc: "Current version uses relative USD price difference versus the US base as the comparison layer. Real PPP and income-based purchasing power can be connected later.",
      bestRegions: "Best-value regions",
      expensiveRegions: "High-price regions",
      tableTitle: "Full regional price table",
      tableDesc: "Includes local prices, USD equivalents, US comparison, data quality, source and last checked time.",
      tableRegion: "Region",
      tableLocal: "Local price",
      tableUsd: "USD",
      tableDiff: "vs US",
      tableTax: "Tax",
      tableQuality: "Quality",
      tableSource: "Source",
      tableChecked: "Checked",
      base: "Base",
      explanationTitle: "How to read this page",
      explanationItems: [
        "USD prices are normalized for easier cross-country comparison.",
        "Local checkout prices may vary because of taxes, exchange rates and platform billing rules.",
        "Purchasing power analysis is not the same as absolute price. A region can be cheaper in USD but still expensive relative to local income.",
      ],
    };
  }

  return {
    back: "返回价格列表",
    official: "官方网站",
    dataNote: "数据说明",
    plans: "套餐",
    regions: "地区",
    updated: "更新时间",
    lowest: "最低价",
    highest: "最高价",
    usBase: "美国基准",
    spread: "价差",
    overview: "总览",
    globalMap: "全球价格地图",
    globalMapDesc: "根据当前已收录地区做价格分布可视化：绿色代表低价地区，黑色代表美国基准，红色代表高价地区。",
    purchasing: "购买力对比",
    purchasingDesc: "当前先用“较美国基准价差”作为购买力观察层。后续可以继续接入 PPP、当地收入和实际购买力指数。",
    bestRegions: "更划算地区",
    expensiveRegions: "高价地区",
    tableTitle: "完整地区价格表",
    tableDesc: "包含本地价格、美元折算、较美国差异、税费、数据质量、来源和检查时间。",
    tableRegion: "地区",
    tableLocal: "本地价格",
    tableUsd: "美元",
    tableDiff: "较美国",
    tableTax: "税费",
    tableQuality: "质量",
    tableSource: "来源",
    tableChecked: "检查时间",
    base: "基准",
    explanationTitle: "如何理解本页价格",
    explanationItems: [
      "美元价格用于跨地区统一比较，方便快速看出哪里更便宜、哪里更贵。",
      "最终结算价格可能受到税费、汇率、平台计费规则和地区政策影响。",
      "购买力不等于绝对价格。一个地区美元价更低，但结合当地收入后，实际负担可能仍然不低。",
    ],
  };
}

function SummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "green" | "red";
}) {
  const valueClassName =
    tone === "green"
      ? "text-lime-700"
      : tone === "red"
        ? "text-rose-600"
        : "text-zinc-950";

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.02]">
      <div className="text-xs font-black text-zinc-400">{label}</div>
      <div className={`mt-2 text-2xl font-black ${valueClassName}`}>
        {value}
      </div>
      <div className="mt-1 text-sm font-bold text-zinc-500">{helper}</div>
    </div>
  );
}

function PriceMap({
  plan,
  locale,
}: {
  plan: DbPricingDetailPlan;
  locale: DbPricingDetailLocale;
}) {
  const copy = getCopy(locale);

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-black text-zinc-950">
            {copy.globalMap}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            {copy.globalMapDesc}
          </p>
        </div>

        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
          {plan.regionCount} {copy.regions}
        </div>
      </div>

      <div className="relative h-[320px] overflow-hidden rounded-[1.75rem] border border-lime-100 bg-[radial-gradient(circle_at_20%_20%,rgba(190,242,100,0.28),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(132,204,22,0.16),transparent_24%),linear-gradient(135deg,#f7fee7,#ffffff_48%,#f8fafc)]">
        <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="absolute left-[8%] top-[20%] h-[34%] w-[28%] rounded-[50%] bg-white/70 blur-[1px]" />
        <div className="absolute left-[44%] top-[22%] h-[30%] w-[22%] rounded-[48%] bg-white/70 blur-[1px]" />
        <div className="absolute left-[65%] top-[34%] h-[38%] w-[24%] rounded-[48%] bg-white/70 blur-[1px]" />
        <div className="absolute left-[75%] top-[70%] h-[18%] w-[18%] rounded-[48%] bg-white/70 blur-[1px]" />

        {plan.regions.map((region, index) => {
          const position = getMapPosition(region, index);

          return (
            <div
              key={`${plan.slug}-map-${region.code}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
              title={`${region.countryName} ${formatUsd(region.priceUsd)}`}
            >
              <div
                className={[
                  "flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-[11px] font-black shadow-lg",
                  markerClassName(region),
                ].join(" ")}
              >
                {region.code}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-lime-500" />
          {locale === "en" ? "Lower price" : "低价地区"}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
          {locale === "en" ? "US base" : "美国基准"}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          {locale === "en" ? "Higher price" : "高价地区"}
        </span>
      </div>
    </div>
  );
}

function PurchasingPanel({
  plan,
  locale,
}: {
  plan: DbPricingDetailPlan;
  locale: DbPricingDetailLocale;
}) {
  const copy = getCopy(locale);
  const cheapRegions = plan.regions.slice(0, 3);
  const expensiveRegions = [...plan.regions].slice(-3).reverse();

  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]">
        <h3 className="text-xl font-black text-zinc-950">
          {copy.purchasing}
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {copy.purchasingDesc}
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-3xl bg-lime-50 p-4 ring-1 ring-lime-100">
            <div className="text-xs font-black text-lime-700">
              {copy.lowest}
            </div>
            <div className="mt-1 text-2xl font-black text-lime-800">
              {formatUsd(plan.minRegion.priceUsd)}
            </div>
            <div className="mt-1 text-sm font-bold text-lime-900/70">
              {plan.minRegion.countryName} · {formatDiff(plan.minRegion.diffVsUsPercent, locale)}
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="text-xs font-black text-zinc-400">
              {copy.usBase}
            </div>
            <div className="mt-1 text-2xl font-black text-zinc-950">
              {formatUsd(plan.referenceRegion.priceUsd)}
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-500">
              {plan.referenceRegion.countryName}
            </div>
          </div>

          <div className="rounded-3xl bg-rose-50 p-4 ring-1 ring-rose-100">
            <div className="text-xs font-black text-rose-600">
              {copy.highest}
            </div>
            <div className="mt-1 text-2xl font-black text-rose-600">
              {formatUsd(plan.maxRegion.priceUsd)}
            </div>
            <div className="mt-1 text-sm font-bold text-rose-900/60">
              {plan.maxRegion.countryName} · {formatDiff(plan.maxRegion.diffVsUsPercent, locale)}
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-3xl bg-zinc-950 px-5 py-4 text-sm font-bold leading-7 text-white">
          {getRecommendation(plan, locale)}
        </p>
      </div>

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]">
        <h3 className="text-base font-black text-zinc-950">
          {copy.bestRegions}
        </h3>

        <div className="mt-4 space-y-2">
          {cheapRegions.map((region) => (
            <div
              key={`${plan.slug}-cheap-${region.code}`}
              className="flex items-center justify-between rounded-2xl bg-lime-50 px-4 py-3 ring-1 ring-lime-100"
            >
              <div>
                <div className="text-sm font-black text-zinc-950">
                  {region.countryName}
                </div>
                <div className="mt-0.5 text-xs font-bold text-zinc-500">
                  {region.code} · {formatDiff(region.diffVsUsPercent, locale)}
                </div>
              </div>

              <div className="text-sm font-black text-lime-700">
                {formatUsd(region.priceUsd)}
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-base font-black text-zinc-950">
          {copy.expensiveRegions}
        </h3>

        <div className="mt-4 space-y-2">
          {expensiveRegions.map((region) => (
            <div
              key={`${plan.slug}-expensive-${region.code}`}
              className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100"
            >
              <div>
                <div className="text-sm font-black text-zinc-950">
                  {region.countryName}
                </div>
                <div className="mt-0.5 text-xs font-bold text-zinc-500">
                  {region.code} · {formatDiff(region.diffVsUsPercent, locale)}
                </div>
              </div>

              <div className="text-sm font-black text-rose-600">
                {formatUsd(region.priceUsd)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function PlanSection({
  product,
  plan,
  locale,
}: {
  product: DbPricingDetailProduct;
  plan: DbPricingDetailPlan;
  locale: DbPricingDetailLocale;
}) {
  const copy = getCopy(locale);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-950">
                {product.name} {plan.name}
              </h2>

              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-black text-lime-700">
                {billingText(locale, plan.billingCycle)}
              </span>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-500">
                {plan.regionCount} {copy.regions}
              </span>
            </div>

            {plan.description && plan.description !== "—" ? (
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {plan.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-full bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 ring-1 ring-rose-100">
            ↕ {plan.spreadPercent}% {copy.spread}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard
            label={copy.lowest}
            value={formatUsd(plan.minRegion.priceUsd)}
            helper={plan.minRegion.countryName}
            tone="green"
          />
          <SummaryCard
            label={copy.highest}
            value={formatUsd(plan.maxRegion.priceUsd)}
            helper={plan.maxRegion.countryName}
            tone="red"
          />
          <SummaryCard
            label={copy.usBase}
            value={formatUsd(plan.referenceRegion.priceUsd)}
            helper={plan.referenceRegion.countryName}
          />
          <SummaryCard
            label={copy.spread}
            value={`${plan.spreadPercent}%`}
            helper={`${formatUsd(plan.minRegion.priceUsd)} - ${formatUsd(plan.maxRegion.priceUsd)}`}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <PriceMap plan={plan} locale={locale} />
        <PurchasingPanel plan={plan} locale={locale} />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm shadow-zinc-950/[0.03]">
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
          <h3 className="text-xl font-black text-zinc-950">
            {copy.tableTitle}
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {copy.tableDesc}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-white text-xs font-black uppercase tracking-wide text-zinc-400">
                <th className="w-16 px-6 py-4">#</th>
                <th className="min-w-[140px] px-6 py-4">{copy.tableRegion}</th>
                <th className="min-w-[150px] px-6 py-4">{copy.tableLocal}</th>
                <th className="min-w-[110px] px-6 py-4">{copy.tableUsd}</th>
                <th className="min-w-[110px] px-6 py-4">{copy.tableDiff}</th>
                <th className="min-w-[160px] px-6 py-4">{copy.tableTax}</th>
                <th className="min-w-[110px] px-6 py-4">{copy.tableQuality}</th>
                <th className="min-w-[140px] px-6 py-4">{copy.tableSource}</th>
                <th className="min-w-[120px] px-6 py-4">{copy.tableChecked}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {plan.regions.map((region) => (
                <tr
                  key={`${plan.slug}-${region.code}`}
                  className={region.isReference ? "bg-zinc-50/70" : "bg-white"}
                >
                  <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                    {region.rank}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">
                        {region.code}
                      </span>

                      <span className="font-black text-zinc-900">
                        {region.countryName}
                      </span>

                      {region.isReference ? (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                          {copy.base}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-6 py-4 font-bold text-zinc-700">
                    {region.localPrice}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-black",
                        priceBadgeClassName(region),
                      ].join(" ")}
                    >
                      {formatUsd(region.priceUsd)}
                    </span>
                  </td>

                  <td className={`px-6 py-4 text-sm font-black ${diffClassName(region.diffVsUsPercent)}`}>
                    {formatDiff(region.diffVsUsPercent, locale)}
                  </td>

                  <td className="px-6 py-4 text-xs font-bold leading-5 text-zinc-500">
                    {region.taxNote}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                      {qualityLabel(locale, region.dataQuality)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs font-bold text-zinc-500">
                    {region.sourceName}
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                    {region.lastCheckedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function DbPricingDetailView({
  product,
  locale,
}: DbPricingDetailViewProps) {
  const copy = getCopy(locale);
  const totalRegionCount = new Set(
    product.plans.flatMap((plan) => plan.regions.map((region) => region.code))
  ).size;

  const firstPlan = product.plans[0];

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-8">
        <Link
          href={`/${locale}/ai-pricing/`}
          className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700"
        >
          ← {copy.back}
        </Link>
      </div>

      <section className="mb-8 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm shadow-zinc-950/[0.03]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-700 ring-1 ring-lime-200">
                {product.categoryLabel}
              </span>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 ring-1 ring-zinc-200">
                {product.brand}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
              {product.name}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
              {product.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {product.officialUrl ? (
                <a
                  href={product.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-track-event="click_official"
                  data-track-name="Open official website"
                  data-track-button={product.slug}
                  data-track-placement="product_hero"
                  className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
                >
                  {copy.official} →
                </a>
              ) : null}

              <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-500">
                {copy.plans}: {product.plans.length}
              </span>

              <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-500">
                {copy.regions}: {totalRegionCount}
              </span>

              <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-500">
                {copy.updated}: {product.updatedAt}
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-100 bg-lime-50/70 p-8 ring-inset ring-lime-100 lg:border-l lg:border-t-0">
            <div className="text-sm font-black text-lime-800">
              {copy.overview}
            </div>

            {firstPlan ? (
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-lime-100">
                  <div className="text-xs font-black text-zinc-400">
                    {copy.lowest}
                  </div>
                  <div className="mt-1 text-2xl font-black text-lime-700">
                    {formatUsd(firstPlan.minRegion.priceUsd)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-zinc-500">
                    {firstPlan.minRegion.countryName}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-lime-100">
                    <div className="text-xs font-black text-zinc-400">
                      {copy.usBase}
                    </div>
                    <div className="mt-1 text-xl font-black text-zinc-950">
                      {formatUsd(firstPlan.referenceRegion.priceUsd)}
                    </div>
                    <div className="mt-1 text-sm font-bold text-zinc-500">
                      {firstPlan.referenceRegion.countryName}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-lime-100">
                    <div className="text-xs font-black text-zinc-400">
                      {copy.spread}
                    </div>
                    <div className="mt-1 text-xl font-black text-rose-600">
                      {firstPlan.spreadPercent}%
                    </div>
                    <div className="mt-1 text-sm font-bold text-zinc-500">
                      {firstPlan.name}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-3xl bg-white/80 p-5 text-sm leading-7 text-lime-900/80 ring-1 ring-lime-100">
              <div className="mb-1 font-black text-lime-800">
                {copy.dataNote}
              </div>
              {product.sourceNote}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-10">
        {product.plans.map((plan) => (
          <PlanSection
            key={plan.slug}
            product={product}
            plan={plan}
            locale={locale}
          />
        ))}
      </div>

      <section className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
        <h2 className="text-2xl font-black text-zinc-950">
          {copy.explanationTitle}
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {copy.explanationItems.map((item, index) => (
            <div
              key={item}
              className="rounded-3xl bg-zinc-50 p-5 text-sm font-bold leading-7 text-zinc-600 ring-1 ring-zinc-100"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-lime-100 text-xs font-black text-lime-700">
                {index + 1}
              </div>
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
