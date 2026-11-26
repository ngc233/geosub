import { getCoreGuideDefinition, type CoreGuideSlug } from "./core-guide-content";
import type { CanvasLocale } from "./canvas-ui-copy";
import type { GuideCard, GuideLink } from "./guide-presentation";

export type FoundationalGuideKey = "price-guide" | "payment-account" | "tool-review" | "methodology";

export type GuideHubCopy = {
  hubEyebrow: string;
  hubTitle: string;
  hubDescription: string;
  heroHighlights: string[];
  dynamicArticlesCount: (count: number) => string;
  backToGuides: string;
  startKicker: string;
  startTitle: string;
  startMeta: string;
  stepReadCta: string;
  minutesLabel: (minutes: number) => string;
  checkpointsLabel: (count: number) => string;
  editorialTitle: string;
  collectionTitle: string;
  articlesCountLabel: (count: number) => string;
  allFilter: string;
  filterGroupLabel: string;
  searchPlaceholder: string;
  clearSearchLabel: string;
  noFilterMatch: string;
  readArticleCta: string;
  taxonomyCategoriesLabel: string;
  taxonomyTagsLabel: string;
  bridgesKicker: string;
  bridgesTitle: string;
  bridgesSubtitle: string;
  bridges: GuideLink[];
  contactTitle: string;
  contactBody: string;
  contactPrimaryLabel: string;
  contactPrimaryHref: string;
  contactSecondaryLabel: string;
  contactSecondaryHref: string;
  toolReview: {
    eyebrow: string;
    title: string;
    cardDescription: string;
    articleDescription: string;
  };
  articleQuickToolsTitle: string;
  articleContinueTitle: string;
  coreArticleMeta: (checkpoints: number, minutes: number) => string;
};

const COPY = {
  zh: {
    hubEyebrow: "跨区订阅决策与核验手册",
    hubTitle: "GeoSub 订阅指南",
    hubDescription:
      "用公开核验数据拆解全球数字订阅价差，帮你理清本地标价、汇率换算、税费规则、账号归属与长期订阅总成本。",
    heroHighlights: [
      "4 步跨区核对路径",
      "原始标价与汇率口径",
      "账号归属与付款边界",
      "直连实时比价工具",
    ],
    dynamicArticlesCount: (count) => `${count} 篇专题文章`,
    backToGuides: "返回指南中心",
    startKicker: "新手必读基石",
    startTitle: "第一次买外区订阅？按这 4 步依次核对",
    startMeta: "全流程读完约 10 分钟 · 避开常见汇率与风控误区",
    stepReadCta: "查看核对要点",
    minutesLabel: (minutes) => `约 ${minutes} 分钟`,
    checkpointsLabel: (count) => `${count} 个核对项`,
    editorialTitle: "专题文章与实战测评",
    collectionTitle: "收录文章",
    articlesCountLabel: (count) => `共 ${count} 篇`,
    allFilter: "全部",
    filterGroupLabel: "按主题筛选指南",
    searchPlaceholder: "搜索指南标题或关键词…",
    clearSearchLabel: "清空搜索",
    noFilterMatch: "当前筛选条件下没有匹配的指南，试试切换分类或清空关键词。",
    readArticleCta: "阅读全文",
    taxonomyCategoriesLabel: "分类专栏",
    taxonomyTagsLabel: "热门话题标签",
    bridgesKicker: "边看边查 · 实时价格库",
    bridgesTitle: "看完规则，直接核对各区实时价格",
    bridgesSubtitle: "每条记录均保留平台本地原币标价、汇率基准日期与美区差额，不混用估算值。",
    bridges: [
      {
        href: "/zh/ai-pricing",
        title: "AI 订阅各区比价",
        description: "对比 ChatGPT、Claude、Gemini 等主流 AI 套餐的全球月付/年付标价与最低地区。",
        badge: "核心比价",
        icon: "ai",
      },
      {
        href: "/zh/streaming-pricing",
        title: "流媒体与内容订阅",
        description: "查看 Netflix、Spotify、YouTube Premium 等个人与家庭方案的跨区价差。",
        badge: "热门品类",
        icon: "streaming",
      },
      {
        href: "/zh/countries",
        title: "国家与地区低价榜",
        description: "按国家切入，快速检索哪些数字服务在土耳其、尼日利亚、印度或日区更划算。",
        badge: "按地区查",
        icon: "country",
      },
      {
        href: "/zh/tools/currency-converter",
        title: "订阅汇率换算器",
        description: "把里拉、日元、卢比等平台原币标价实时折算为人民币或美元，估算真实账单。",
        badge: "实用工具",
        icon: "converter",
      },
    ],
    contactTitle: "没找到你遇到的具体订阅问题？",
    contactBody: "查看完整数据采集与核验标准，或直接告诉我们你卡在哪一步。",
    contactPrimaryLabel: "联系我们",
    contactPrimaryHref: "/zh/contact",
    contactSecondaryLabel: "数据来源与口径",
    contactSecondaryHref: "/zh/data-sources",
    toolReview: {
      eyebrow: "工具测评",
      title: "怎样判断一个数字工具是否值得订阅",
      cardDescription:
        "不要只看功能清单或单次跑分。从高频任务、能力边界、持续总成本与证据日期判断工具是否值得长期付费。",
      articleDescription: "不要只看功能清单或单次跑分。先明确使用场景，再比较能力、限制和持续成本。",
    },
    articleQuickToolsTitle: "顺手查实时数据",
    articleContinueTitle: "继续阅读 · 核心必读路径",
    coreArticleMeta: (checkpoints, minutes) => `核心必读 · ${checkpoints} 个核对项 · 约 ${minutes} 分钟读完`,
  },
  en: {
    hubEyebrow: "Cross-Region Subscription Playbook",
    hubTitle: "Subscription & Pricing Guides",
    hubDescription:
      "Break down global digital subscription price gaps with verified data—covering local list prices, exchange-rate dates, tax rules, account eligibility, and ongoing cost.",
    heroHighlights: [
      "4-step starter playbook",
      "Local price & FX rules",
      "Account & payment checks",
      "Direct live-price tools",
    ],
    dynamicArticlesCount: (count) => `${count} editorial ${count === 1 ? "guide" : "guides"}`,
    backToGuides: "Back to guides",
    startKicker: "Starter Playbook",
    startTitle: "New to regional pricing? Check these 4 essentials first",
    startMeta: "~10 min end-to-end · Avoid FX, tax, and checkout surprises",
    stepReadCta: "Read checklist",
    minutesLabel: (minutes) => `${minutes} min read`,
    checkpointsLabel: (count) => `${count} checkpoints`,
    editorialTitle: "Editorial Guides & Reviews",
    collectionTitle: "Published Guides",
    articlesCountLabel: (count) => `${count} ${count === 1 ? "guide" : "guides"}`,
    allFilter: "All",
    filterGroupLabel: "Filter guides by category",
    searchPlaceholder: "Search guides by title or keyword…",
    clearSearchLabel: "Clear search",
    noFilterMatch: "No guides match the current filter. Try another topic or clear your search.",
    readArticleCta: "Read guide",
    taxonomyCategoriesLabel: "Categories",
    taxonomyTagsLabel: "Popular tags",
    bridgesKicker: "Live Data & Utilities",
    bridgesTitle: "Put the Playbook to Work: Check Live Prices",
    bridgesSubtitle:
      "Every comparison preserves local checkout currency, FX snapshot date, and US baseline spread.",
    bridges: [
      {
        href: "/en/ai-pricing",
        title: "AI Subscription Pricing",
        description: "Compare ChatGPT, Claude, Gemini, and leading AI plans across countries and billing cycles.",
        badge: "Core Index",
        icon: "ai",
      },
      {
        href: "/en/streaming-pricing",
        title: "Streaming Pricing",
        description: "Track regional monthly and family plan gaps across Netflix, Spotify, and YouTube Premium.",
        badge: "Streaming",
        icon: "streaming",
      },
      {
        href: "/en/countries",
        title: "Country Savings Index",
        description: "Browse by country to see which digital subscriptions cost significantly less locally.",
        badge: "By Country",
        icon: "country",
      },
      {
        href: "/en/tools/currency-converter",
        title: "Subscription Currency Converter",
        description: "Convert TRY, JPY, INR, and local store list prices into USD, EUR, GBP, or CNY.",
        badge: "Utility",
        icon: "converter",
      },
    ],
    contactTitle: "Want to inspect how every regional price is verified?",
    contactBody: "Review our collection sources, FX snapshot rules, and recent regional price changes.",
    contactPrimaryLabel: "Data sources & rules",
    contactPrimaryHref: "/en/data-sources",
    contactSecondaryLabel: "Price change history",
    contactSecondaryHref: "/en/price-history",
    toolReview: {
      eyebrow: "Tool Review",
      title: "How to decide whether a digital tool is worth subscribing to",
      cardDescription:
        "Go beyond feature checklists and one-off benchmarks—evaluate real tasks, capability limits, total ongoing cost, and dated evidence.",
      articleDescription:
        "Do not rely on a feature list or one benchmark. Define the use case, then compare capability, limits and ongoing cost.",
    },
    articleQuickToolsTitle: "Check Live Pricing",
    articleContinueTitle: "Continue with the Starter Playbook",
    coreArticleMeta: (checkpoints, minutes) =>
      `Core playbook · ${checkpoints} checkpoints · ~${minutes} min read`,
  },
} satisfies Record<CanvasLocale, GuideHubCopy>;

export function getGuideHubCopy(locale: CanvasLocale): GuideHubCopy {
  return COPY[locale];
}

export function buildFoundationalGuideSteps(
  locale: CanvasLocale,
  isCoreSlugPublished: (slug: CoreGuideSlug) => boolean = () => true,
): GuideCard[] {
  const copy = COPY[locale];
  const items: GuideCard[] = [];

  if (isCoreSlugPublished("price-guide")) {
    const def = getCoreGuideDefinition(locale, "price-guide");
    items.push({
      href: `/${locale}/guides/price-guide`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "price",
    });
  }

  if (isCoreSlugPublished("payment-account")) {
    const def = getCoreGuideDefinition(locale, "payment-account");
    items.push({
      href: `/${locale}/guides/payment-account`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "payment",
    });
  }

  items.push({
    href: `/${locale}/guides/tool-review`,
    title: copy.toolReview.title,
    description: copy.toolReview.cardDescription,
    category: copy.toolReview.eyebrow,
    minutes: 3,
    sectionsCount: 3,
    icon: "review",
  });

  if (isCoreSlugPublished("methodology")) {
    const def = getCoreGuideDefinition(locale, "methodology");
    items.push({
      href: `/${locale}/guides/methodology`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "methodology",
    });
  }

  return items;
}

export function getDefaultArticleQuickTools(
  locale: CanvasLocale,
  focus: FoundationalGuideKey | "general" = "general",
): GuideLink[] {
  const tools =
    locale === "zh"
      ? {
          ai: {
            href: "/zh/ai-pricing",
            title: "AI 订阅各区比价",
            description: "ChatGPT · Claude · Gemini",
            icon: "ai" as const,
          },
          streaming: {
            href: "/zh/streaming-pricing",
            title: "流媒体与内容订阅",
            description: "Netflix · Spotify · YouTube",
            icon: "streaming" as const,
          },
          countries: {
            href: "/zh/countries",
            title: "国家与地区低价榜",
            description: "覆盖 40+ 国家与地区排行",
            icon: "country" as const,
          },
          converter: {
            href: "/zh/tools/currency-converter",
            title: "订阅汇率换算器",
            description: "里拉 / 日元 / 卢比实时折算",
            icon: "converter" as const,
          },
          priceHistory: {
            href: "/zh/price-history",
            title: "全球订阅调价雷达",
            description: "近期已核验涨价与降价记录",
            icon: "price" as const,
          },
          dataSources: {
            href: "/zh/data-sources",
            title: "数据来源与核验口径",
            description: "四种日期与异常样本过滤",
            icon: "methodology" as const,
          },
        }
      : {
          ai: {
            href: "/en/ai-pricing",
            title: "AI Subscription Prices",
            description: "ChatGPT, Claude & Gemini",
            icon: "ai" as const,
          },
          streaming: {
            href: "/en/streaming-pricing",
            title: "Streaming Prices",
            description: "Netflix, Spotify & YouTube",
            icon: "streaming" as const,
          },
          countries: {
            href: "/en/countries",
            title: "Country Savings Index",
            description: "40+ regional price rankings",
            icon: "country" as const,
          },
          converter: {
            href: "/en/tools/currency-converter",
            title: "Currency Converter",
            description: "Live local store FX rates",
            icon: "converter" as const,
          },
          priceHistory: {
            href: "/en/price-history",
            title: "Price Change Radar",
            description: "Verified hikes and drops",
            icon: "price" as const,
          },
          dataSources: {
            href: "/en/data-sources",
            title: "Data Sources & Rules",
            description: "FX dates & verification",
            icon: "methodology" as const,
          },
        };

  switch (focus) {
    case "price-guide":
      return [tools.countries, tools.converter, tools.ai];
    case "payment-account":
      return [tools.ai, tools.streaming, tools.countries];
    case "tool-review":
      return [tools.ai, tools.streaming, tools.converter];
    case "methodology":
      return [tools.dataSources, tools.priceHistory, tools.countries];
    default:
      return [tools.ai, tools.countries, tools.converter];
  }
}

export function getSiblingCoreGuideLinks(
  locale: CanvasLocale,
  currentSlug: FoundationalGuideKey,
): GuideLink[] {
  const currentHref = `/${locale}/guides/${currentSlug}`;
  return buildFoundationalGuideSteps(locale)
    .filter((step) => step.href !== currentHref)
    .map((step) => ({
      href: step.href,
      title: step.title,
      description: step.description,
      badge: step.category,
      icon: step.icon,
    }));
}
