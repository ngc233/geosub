import type { DisplayCurrency } from "./display-currency.ts";
import type { SiteLocale } from "./site-locale.ts";

export type CanvasLocale = "zh" | "en";

export function resolveCanvasLocale(locale?: SiteLocale | string): CanvasLocale {
  return locale === "en" ? "en" : "zh";
}

export function canvasIntlLocale(locale: CanvasLocale): "zh-CN" | "en-US" {
  return locale === "en" ? "en-US" : "zh-CN";
}

export function canvasDefaultCurrency(
  locale: CanvasLocale,
  rates?: Readonly<Record<string, number>>,
): DisplayCurrency {
  if (locale === "en") return "USD";
  if (rates && !(rates.CNY > 0)) return "USD";
  return "CNY";
}

export function canvasSavingsText(
  value: number | null,
  locale: CanvasLocale,
  compact = false,
): { text: string; tone: "low" | "high" | "baseline" } | null {
  if (value === null || !Number.isFinite(value)) return null;
  const pct = Math.round(Math.abs(value) * 100);
  if (pct === 0) {
    return {
      text:
        locale === "en"
          ? compact
            ? "Same"
            : "Same as US"
          : compact
            ? "持平"
            : "与美国同价",
      tone: "baseline",
    };
  }
  const higher = value < 0;
  return {
    text:
      locale === "en"
        ? compact
          ? `${higher ? "+" : "−"}${pct}%`
          : `${pct}% ${higher ? "higher" : "cheaper"} than US`
        : compact
          ? `${higher ? "+" : "−"}${pct}%`
          : `比美国${higher ? "高" : "低"} ${pct}%`,
    tone: higher ? "high" : "low",
  };
}

export const canvasUiCopy = {
  zh: {
    common: {
      fxFallbackStatus: (preferred: string) =>
        `${preferred} 汇率不可用，当前显示 USD；可选择其他币种。`,
      breadcrumbAria: "面包屑",
      productNavAria: "产品导航",
      all: "全部",
      ai: "AI 订阅",
      streaming: "流媒体",
      sortAsc: "从低到高",
      sortDesc: "从高到低",
      shareButton: "分享价格图",
      notProvided: "未提供",
    },
    home: {
      fixtureBanner: "虚构测试数据 · 仅用于本地界面验收，不代表实际价格",
      heroLead: "同一个订阅，",
      heroAccent: "换个地区能省多少",
      heroDescLead: "比较 AI 与流媒体订阅在全球各地区的真实价格，",
      heroDescStrong: "每天自动核验",
      heroDescTail: "。",
      statsAria: "收录统计",
      statsProducts: "个产品",
      statsRegions: "个地区",
      statsPrices: "条已核验价格",
      statsUpdatedSuffix: "更新",
      mapRegionAria: "代表套餐地区价格",
      rankingHeading: "省钱排行榜",
      rankingDesc: "每个产品一个代表套餐，按比美国低多少排序",
      rankingSegmentLabel: "排行榜分类",
      rankingListAria: "订阅省钱排名",
      rankingCols: ["#", "订阅", "最便宜地区", "每月", "比美国低"] as const,
      rankingEmpty: "此分类没有符合代表套餐条件的产品。",
      rankingViewAll: "查看全部",
      loadMore: "加载更多",
      loadMoreHint: (remaining: number) => `还有 ${remaining} 个产品`,
      loadMoreStatus: (shown: number, total: number) =>
        `已显示 ${shown} 个，共 ${total} 个产品`,
      categoriesHeading: "按分类找",
      categoryProductsCount: (count: number) => `${count} 个产品`,
      categoryMaxSavingPrefix: "最多能省 ",
      categoryViewAll: (kind: "ai" | "streaming") =>
        `查看全部${kind === "ai" ? " AI 订阅" : "流媒体"}`,
      recentHeading: "最近变价",
      recentLink: "价格历史",
      recentSrDirection: (increase: boolean) =>
        `本币标价${increase ? "上涨" : "下降"}`,
      recentSrNote: "最近 30 天已核验的本币标价变化，不含汇率波动",
      countriesHeading: "哪些国家整体更便宜",
      countriesDesc:
        "App Store 月付套餐逐个与美国比较，按节省率中位数排序；每个套餐权重相同，进度条刻度 0–20%。",
      countriesLink: "全部国家",
      countriesSrSummary: (count: number, cheaper: number) =>
        `按 ${count} 个订阅计算 · ${cheaper} 个比美国便宜`,
      guidesHeading: "买之前先看",
      emptyHowToReadTitle: "如何阅读地区价格",
    },
    product: {
      plansCount: (count: number) => `${count} 个套餐`,
      regionsCount: (count: number) => `${count} 个地区`,
      updatedSuffix: "更新",
      conciseDesc: (planCount: number, regionCount: number) =>
        `覆盖 ${planCount} 个在售订阅套餐与最多 ${regionCount} 个国家/地区的核验价格，支持按目标币种横向对比套餐月费与地区价差。`,
      kickerLow: (name: string) => `低价结论 · ${name}`,
      kickerDefault: (name: string) => `代表套餐 · ${name}`,
      cheapestInPrefix: "在",
      cheapestInSuffix: "最便宜",
      baselineSuffix: "基准价",
      usBaselineNote: "· 同一套餐、同一渠道",
      usBaselinePrefix: "美国基准",
      usOnlyNote: "当前仅收录美区公开价格",
      sameAsUsNote: "当前最低价与美区基准一致",
      viewPlanRegions: (name: string) => `查看 ${name} 各地区价格`,
      plansSectionHeading: "套餐概览",
      planCardMeta: (channel: string, cycleLabel: string, coverage: number) =>
        `${channel} · 每${cycleLabel} · ${coverage} 个地区`,
      lowestTag: " 最低",
      baselineTag: " 基准",
      usShortPrefix: "美国 ",
      usOnlyBadge: "仅美区基准",
      sameAsUsBadge: "与美区同价",
      noUsBadge: "暂无美区基准",
      bestForDt: "适合",
      differenceDt: "区别",
      planCardCtaMulti: (name: string, coverage: number) =>
        `查看 ${name} 全部 ${coverage} 个地区与本币明细`,
      planCardCtaSingle: (name: string) => `查看 ${name} 价格与订阅说明`,
      planCardSrLink: (name: string) => `查看 ${name} 地区价格`,
      matrixHeading: "代表地区跨套餐对比",
      matrixDesc: (count: number, asc: boolean, hasUs: boolean) =>
        `精选前 ${count} 个${asc ? "低价" : "高价"}代表地区${hasUs ? "与美区基准" : ""}横向对照；点套餐列名可切换排序基准`,
      matrixSortLabel: "价格排序",
      matrixTableAria: "代表地区套餐价格",
      matrixCountryCol: "国家 / 地区",
      matrixActionCol: "详情",
      usBadge: "基准",
      usCellSub: "美区基准",
      emptyCellAria: "没有可比价格",
      matrixRowView: "查看",
      matrixFooterNote: (shown: number, total: number) =>
        `仅展示 ${shown} / ${total} 个代表地区样本 · 完整排名、本币原价与税费快照请进入单套餐页`,
      matrixDrilldownMulti: (name: string, coverage: number) =>
        `查看 ${name} 全部 ${coverage} 个地区完整排行`,
      matrixDrilldownSingle: (name: string) => `查看 ${name} 价格详情`,
    },
    plan: {
      metaLine: (channel: string, cycleLabel: string, count: number) =>
        `${channel} · 每${cycleLabel} · ${count} 个地区`,
      collectedSuffix: "采集",
      conciseDesc: (
        lead: string | undefined,
        regionCount: number,
        channel: string,
        hasWork: boolean,
      ) =>
        `${lead ? `${lead}。` : ""}覆盖 ${regionCount} 个国家/地区的 ${channel} 核验价格，支持多币种折算、美国基准对比${hasWork ? "与当地工时负担参考" : "与原始采集快照核查"}。`,
      keycapAria: "同产品套餐切换",
      keycapOverview: "套餐总览",
      disabledPending: "待审",
      disabledUnavailable: "暂无",
      emptyTitle: "暂无已发布价格",
      emptyDesc: "当前没有可比较的地区价格。",
      lowestAria: "最低价",
      lowestKicker: "全球最低 · ",
      noUsRef: "美国基准缺失",
      sameAsUs: "与美国相同",
      localPricePrefix: "本地标价 ",
      taxAtCheckout: "结算页计税",
      usSamePlan: "美国同套餐",
      noBaseline: "暂无基准",
      annualSaved: "按 12 个月折算少付",
      periodSaved: "较美国单期少付",
      maxMultiple: "最高价倍数",
      trustVerified: "已核验",
      trustReviewed: "已审核",
      trustPending: "待复核",
      collectedLabel: "采集",
      usdOriginal: "美元原价",
      fxLabel: "汇率",
      distAria: "各地区价格分布",
      distTitle: "各地区价格分布",
      distCount: (count: number) => `已收录 ${count} 个地区`,
      distChartAria: (hasUs: boolean) =>
        `各地区价格从低到高分布${hasUs ? "，竖线为美国价格" : "，没有美国基准"}`,
      usName: "美国",
      lowestPrefix: "最低 · ",
      highestPrefix: "最贵 · ",
      usBaselineTitle: "美国基准",
      missingBaseline: "缺少基准",
      noneShort: "暂无",
      medianTitle: "中位数",
      medianSub: "半数地区更便宜",
      multipleSub: (mult: string) => `最低价的 ${mult} 倍`,
      cheaperNote: (cheaper: number, total: number) =>
        ` / ${total} 个地区比美国便宜`,
      regionsHeading: "地区价格",
      filterLabel: "地区价格筛选",
      filterCheaper: "比美国便宜",
      filterHigher: "比美国贵",
      sortToggleAria: "切换价格排序",
      searchRegionLabel: "找地区",
      searchRegionPlaceholder: "找地区，例如 日本",
      cols: ["#", "地区", "折合", "本地标价", "和美国比", "税费说明"] as const,
      usBaselineMobile: "美国基准",
      usBaselineShort: "基准",
      evidenceSource: "来源：",
      evidenceCollected: "采集：",
      evidenceFx: "汇率：",
      evidenceStatus: "状态：",
      qualityVerified: "已核验",
      qualityEstimated: "估算",
      qualityPending: "待核验",
      officialSource: "官方来源",
      viewSnapshot: "查看当时的原始套餐快照",
      noMatchingRegions: "没有符合条件的地区价格",
      tableFooter: (shown: number, total: number) =>
        `显示 ${shown} / ${total} 个地区 · 均为平台公开标价，最终税费以结算页为准`,
      collapseRegions: "收起地区",
      expandRegions: (total: number) => `展开全部 ${total} 个地区`,
      remainingHint: (remaining: number) => `还有 ${remaining} 个`,
      editorialHeading: (name: string) => `${name} 套餐定位`,
      workHeading: "为什么各地价格不同",
      workDesc:
        "价格比较和当地收入负担是两个不同的角度。较低的折算价格，不一定意味着当地收入负担更低。",
      workNote:
        "按同一套餐的美元月费与当地名义收入换算，不代表实际工资或购买资格。",
      workFootnote:
        "世界银行人均国民收入或名义人均 GDP（各行注明年份），按每月 160 工作小时换算；不使用购买力平价收入。",
      workCols: ["地区", "月费折合", "当地人要工作多久"] as const,
      hoursUnit: "小时",
      gniLabel: "人均国民收入",
      gdpLabel: "名义人均 GDP",
      workOrderNote: "按工作时长从短到长排列；灰色条不表示购买推荐。",
      sourcePrefix: "来源：",
      countryJoiner: "、",
      howToBuyHeading: "怎么买到这个价格",
      officialPricingRef: "官方定价参考：",
      beforeBuyHeading: "买之前注意",
    },
  },
  en: {
    common: {
      fxFallbackStatus: (preferred: string) =>
        `${preferred} exchange rate is unavailable. Showing USD instead; you can choose another currency.`,
      breadcrumbAria: "Breadcrumb",
      productNavAria: "Product navigation",
      all: "All",
      ai: "AI Subscriptions",
      streaming: "Streaming",
      sortAsc: "Low to high",
      sortDesc: "High to low",
      shareButton: "Share price card",
      notProvided: "Not provided",
    },
    home: {
      fixtureBanner:
        "Fictional test data · For local UI verification only, not real prices",
      heroLead: "Same subscription. ",
      heroAccent: "See what every region actually pays.",
      heroDescLead:
        "Compare real AI and streaming subscription prices across global regions, ",
      heroDescStrong: "verified daily",
      heroDescTail: ".",
      statsAria: "Coverage statistics",
      statsProducts: "products",
      statsRegions: "regions",
      statsPrices: "verified prices",
      statsUpdatedSuffix: "updated",
      mapRegionAria: "Representative plan regional prices",
      rankingHeading: "Savings Ranking",
      rankingDesc:
        "One flagship plan per product, ranked by maximum savings versus the US",
      rankingSegmentLabel: "Ranking category",
      rankingListAria: "Subscription savings ranking",
      rankingCols: ["#", "Subscription", "Cheapest region", "Monthly", "vs US"] as const,
      rankingEmpty: "No eligible flagship plans in this category.",
      rankingViewAll: "View all",
      loadMore: "Load more",
      loadMoreHint: (remaining: number) => `${remaining} more products`,
      loadMoreStatus: (shown: number, total: number) =>
        `Showing ${shown} of ${total} products`,
      categoriesHeading: "Browse by Category",
      categoryProductsCount: (count: number) => `${count} products`,
      categoryMaxSavingPrefix: "Save up to ",
      categoryViewAll: (kind: "ai" | "streaming") =>
        `View all ${kind === "ai" ? "AI subscriptions" : "streaming plans"}`,
      recentHeading: "Recent Price Changes",
      recentLink: "Price history",
      recentSrDirection: (increase: boolean) =>
        `Local list price ${increase ? "increased" : "decreased"}`,
      recentSrNote:
        "Verified local list-price changes in the last 30 days, excluding FX movement",
      countriesHeading: "Cheapest Countries Overall",
      countriesDesc:
        "Monthly App Store plans compared one-by-one against the US and ranked by median savings (0–20% scale).",
      countriesLink: "All countries",
      countriesSrSummary: (count: number, cheaper: number) =>
        `Based on ${count} subscriptions · ${cheaper} cheaper than US`,
      guidesHeading: "Read Before Subscribing",
      emptyHowToReadTitle: "How to read regional prices",
    },
    product: {
      plansCount: (count: number) => `${count} ${count === 1 ? "plan" : "plans"}`,
      regionsCount: (count: number) => `${count} ${count === 1 ? "region" : "regions"}`,
      updatedSuffix: "updated",
      conciseDesc: (planCount: number, regionCount: number) =>
        `Covers ${planCount} active subscription ${planCount === 1 ? "plan" : "plans"} across up to ${regionCount} verified regions, with live currency conversion and US baseline comparisons.`,
      kickerLow: (name: string) => `Lowest price · ${name}`,
      kickerDefault: (name: string) => `Featured plan · ${name}`,
      cheapestInPrefix: "is cheapest in",
      cheapestInSuffix: "",
      baselineSuffix: "baseline price",
      usBaselineNote: "· Same plan & channel",
      usBaselinePrefix: "US baseline",
      usOnlyNote: "Only US public pricing is currently listed",
      sameAsUsNote: "Lowest price matches the US baseline",
      viewPlanRegions: (name: string) => `View ${name} regional prices`,
      plansSectionHeading: "Plan Overview",
      planCardMeta: (channel: string, cycleLabel: string, coverage: number) =>
        `${channel} · /${cycleLabel} · ${coverage} ${coverage === 1 ? "region" : "regions"}`,
      lowestTag: " · Lowest",
      baselineTag: " · Baseline",
      usShortPrefix: "US ",
      usOnlyBadge: "US baseline only",
      sameAsUsBadge: "Same as US",
      noUsBadge: "No US baseline",
      bestForDt: "Best for",
      differenceDt: "Key difference",
      planCardCtaMulti: (name: string, coverage: number) =>
        `Compare all ${coverage} regions & local prices for ${name}`,
      planCardCtaSingle: (name: string) => `View ${name} pricing & billing notes`,
      planCardSrLink: (name: string) => `View ${name} regional prices`,
      matrixHeading: "Cross-Plan Region Comparison",
      matrixDesc: (count: number, asc: boolean, hasUs: boolean) =>
        `Top ${count} ${asc ? "lowest-priced" : "highest-priced"} regions${hasUs ? " alongside the US baseline" : ""}; click any plan header to re-sort`,
      matrixSortLabel: "Sort order",
      matrixTableAria: "Representative regional plan prices",
      matrixCountryCol: "Country / Region",
      matrixActionCol: "Details",
      usBadge: "Base",
      usCellSub: "US baseline",
      emptyCellAria: "No comparable price",
      matrixRowView: "View",
      matrixFooterNote: (shown: number, total: number) =>
        `Showing ${shown} of ${total} representative regions · Open a plan page for full rankings, local quotes, and tax snapshots`,
      matrixDrilldownMulti: (name: string, coverage: number) =>
        `View full ${coverage}-region ranking for ${name}`,
      matrixDrilldownSingle: (name: string) => `View ${name} pricing details`,
    },
    plan: {
      metaLine: (channel: string, cycleLabel: string, count: number) =>
        `${channel} · /${cycleLabel} · ${count} ${count === 1 ? "region" : "regions"}`,
      collectedSuffix: "collected",
      conciseDesc: (
        lead: string | undefined,
        regionCount: number,
        channel: string,
        hasWork: boolean,
      ) =>
        `${lead ? `${lead}. ` : ""}Compare verified ${channel} prices across ${regionCount === 1 ? "1 country" : `${regionCount} countries and regions`} with live currency conversion, US baseline diffs${hasWork ? ", and local work-hour affordability" : ", and source snapshots"}.`,
      keycapAria: "Switch plans for this product",
      keycapOverview: "All plans",
      disabledPending: "Pending",
      disabledUnavailable: "N/A",
      emptyTitle: "No published prices yet",
      emptyDesc: "No comparable regional prices are currently available.",
      lowestAria: "Lowest price",
      lowestKicker: "Global lowest · ",
      noUsRef: "No US baseline",
      sameAsUs: "Same as US",
      localPricePrefix: "Local price ",
      taxAtCheckout: "Tax at checkout",
      usSamePlan: "US same plan",
      noBaseline: "No baseline",
      annualSaved: "12-month savings vs US",
      periodSaved: "Savings per cycle vs US",
      maxMultiple: "Highest / lowest ratio",
      trustVerified: "Verified",
      trustReviewed: "Reviewed",
      trustPending: "Pending review",
      collectedLabel: "Collected",
      usdOriginal: "USD list price",
      fxLabel: "FX",
      distAria: "Regional price distribution",
      distTitle: "Regional Price Distribution",
      distCount: (count: number) => `${count} regions tracked`,
      distChartAria: (hasUs: boolean) =>
        `Regional prices from lowest to highest${hasUs ? ", vertical marker shows US price" : ", without US baseline"}`,
      usName: "US",
      lowestPrefix: "Lowest · ",
      highestPrefix: "Highest · ",
      usBaselineTitle: "US baseline",
      missingBaseline: "No baseline",
      noneShort: "N/A",
      medianTitle: "Median",
      medianSub: "Half of regions cost less",
      multipleSub: (mult: string) => `${mult}x lowest price`,
      cheaperNote: (_cheaper: number, total: number) =>
        ` / ${total} regions cheaper than US`,
      regionsHeading: "Regional Prices",
      filterLabel: "Filter regional prices",
      filterCheaper: "Cheaper than US",
      filterHigher: "Higher than US",
      sortToggleAria: "Toggle price sort order",
      searchRegionLabel: "Find region",
      searchRegionPlaceholder: "Search region...",
      cols: ["#", "Region", "Converted", "Local price", "vs US", "Tax note"] as const,
      usBaselineMobile: "US baseline",
      usBaselineShort: "Base",
      evidenceSource: "Source: ",
      evidenceCollected: "Collected: ",
      evidenceFx: "FX date: ",
      evidenceStatus: "Status: ",
      qualityVerified: "Verified",
      qualityEstimated: "Estimated",
      qualityPending: "Pending",
      officialSource: "Official source",
      viewSnapshot: "View original store snapshot",
      noMatchingRegions: "No regional prices match your filter",
      tableFooter: (shown: number, total: number) =>
        `Showing ${shown} of ${total} regions · Public store list prices; final tax applies at checkout`,
      collapseRegions: "Show fewer regions",
      expandRegions: (total: number) => `Show all ${total} regions`,
      remainingHint: (remaining: number) => `${remaining} more`,
      editorialHeading: (name: string) => `${name} Plan Overview`,
      workHeading: "Local Income & Work-Hour Context",
      workDesc:
        "Nominal converted price and local income burden measure different things. A lower USD-converted price does not automatically mean lower effort for local earners.",
      workNote:
        "Computed from nominal USD monthly price and national income benchmarks; not a wage quote or purchase-eligibility guarantee.",
      workFootnote:
        "World Bank GNI per capita (Atlas) or nominal GDP per capita (year noted per row), assuming 160 work hours/month; PPP is not used.",
      workCols: ["Region", "Converted / mo", "Local work hours needed"] as const,
      hoursUnit: "hrs",
      gniLabel: "GNI per capita",
      gdpLabel: "Nominal GDP/capita",
      workOrderNote:
        "Ordered from fewest to most work hours; bars do not imply a purchase recommendation.",
      sourcePrefix: "Source: ",
      countryJoiner: ", ",
      howToBuyHeading: "How Regional Subscription Pricing Works",
      officialPricingRef: "Official pricing reference: ",
      beforeBuyHeading: "Before You Subscribe",
    },
  },
} as const;
