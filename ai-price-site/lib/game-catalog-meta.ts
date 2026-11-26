import type { Edition, Platform } from "./game-offers";

export type GameFaqItem = {
  question: string;
  answer: string;
};

export type GameEditionMeta = {
  label: string;
  summary: string;
  badge?: string;
};

export type UnannouncedPlatformMeta = {
  badge: string;
  title: string;
  description: string;
};

export type GameCatalogMeta = {
  slug: string;
  title: string;
  englishTitle: string | null;
  publisher: string;
  releaseDate: string | null;
  releaseLabel: string | null;
  coverSrc: string | null;
  coverAlt: string;
  officialUrl: string | null;
  searchAliases: string[];
  supportedPlatforms: Platform[];
  unannouncedPlatforms: Partial<Record<Platform, UnannouncedPlatformMeta>>;
  editions: Record<Edition, GameEditionMeta>;
  faqs: GameFaqItem[];
};

type GameProductInput = {
  slug: string;
  name: string;
  provider?: string | null;
  description?: string | null;
  officialUrl?: string | null;
};

const sharedConsoleFaqs: GameFaqItem[] = [
  {
    question: "应该看哪个商店地区的价格？",
    answer:
      "数字版主机游戏绑定购买时使用的账号区服。请按你持有支付方式或礼品卡的主机账号地区查看对应商店报价，结账前确认该区服支持你的付款渠道。",
  },
  {
    question: "页面上的折合价格与最终扣款金额会有差别吗？",
    answer:
      "折合价按站内最近一次有效美元基准汇率换算，便于横向对比各区服高低。实际扣款还取决于对应商店是否含税（如美服通常在结账时按州计税，港服标价一般即结算价）以及发卡机构的实时购汇汇率。",
  },
  {
    question: "PS5 和 Xbox 的数字版购买后可以跨平台互通吗？",
    answer:
      "不能互通。PlayStation Store 购买的数字版仅限 PlayStation 主机账号游玩，Xbox 商店购买的数字版适用于 Xbox Series X|S，下单前请先核对顶部选中的主机平台。",
  },
];

const curatedGames: Record<string, Omit<GameCatalogMeta, "slug">> = {
  "gta-6": {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 主机发售",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "《Grand Theft Auto VI》官方封面",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: [
      "GTA",
      "GTA6",
      "GTA 6",
      "GTA VI",
      "Grand Theft Auto VI",
      "Grand Theft Auto 6",
      "侠盗猎车手6",
      "侠盗猎车手VI",
      "Rockstar",
    ],
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "待官宣",
        title: "PC 版尚未官宣",
        description:
          "Rockstar Games 目前仅公布 PS5 与 Xbox Series X|S 主机版本，原生 PC 版的发售日期与各区售价待官方公布。",
      },
    },
    editions: {
      standard: {
        label: "标准版",
        summary: "数字标准版游戏本体，包含雷奥奈达州与罪恶都市完整单人故事模式。",
      },
      ultimate: {
        label: "终极版",
        badge: "含附加内容",
        summary: "包含完整游戏本体，另附专属载具、服饰外观与额外数字奖励内容。",
      },
    },
    faqs: [
      ...sharedConsoleFaqs,
      {
        question: "PC 版什么时候公布售价与发售日？",
        answer:
          "Rockstar Games 目前尚未公布原生 PC 版本的发售时间与商店页面。待 Steam、Epic 或 Rockstar Launcher 公开上架后，GeoSub 会在核验后同步收录。",
      },
    ],
  },
};

export function getGameCatalogMeta(product: GameProductInput): GameCatalogMeta {
  const curated = curatedGames[product.slug];
  if (curated) {
    return {
      slug: product.slug,
      ...curated,
      publisher: product.provider?.trim() || curated.publisher,
      officialUrl: product.officialUrl?.trim() || curated.officialUrl,
    };
  }

  const cleanName = product.name.trim();
  return {
    slug: product.slug,
    title: cleanName,
    englishTitle: null,
    publisher: product.provider?.trim() || "官方数字商店",
    releaseDate: null,
    releaseLabel: null,
    coverSrc: null,
    coverAlt: `${cleanName} 封面`,
    officialUrl: product.officialUrl?.trim() || null,
    searchAliases: [cleanName, product.slug],
    supportedPlatforms: ["ps5", "xbox"],
    unannouncedPlatforms: {},
    editions: {
      standard: {
        label: "标准版",
        summary: product.description?.trim() || "数字标准版游戏本体。",
      },
      ultimate: {
        label: "终极版",
        badge: "含附加内容",
        summary: "包含游戏本体及终极版数字附加内容。",
      },
    },
    faqs: sharedConsoleFaqs,
  };
}

const regionDisplayNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });

const storeRegionLabels: Record<string, string> = {
  HK: "港服",
  US: "美服",
  JP: "日服",
  TR: "土服",
  BR: "巴服",
  GB: "英服",
  SG: "新服",
  TW: "台服",
  KR: "韩服",
  AR: "阿服",
  IN: "印服",
};

const marketSearchWords: Record<string, string> = {
  HK: "香港 港服 HK hong kong hkd",
  US: "美国 美國 美服 US usa united states usd",
  JP: "日本 日服 JP japan jpy",
  TR: "土耳其 土服 TR turkey try",
  BR: "巴西 巴服 BR brazil brl",
  GB: "英国 英服 GB uk united kingdom gbp",
  TW: "台湾 台灣 台服 TW taiwan twd",
  KR: "韩国 韓國 韩服 KR korea krw",
  SG: "新加坡 新服 SG singapore sgd",
};

export function getGameMarketName(code: string): string {
  if (code === "HK") return "香港";
  if (code === "US") return "美国";
  if (code === "TW") return "中国台湾";
  try {
    return regionDisplayNames.of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function getGameMarketStoreTag(code: string): string {
  const upper = code.toUpperCase();
  return storeRegionLabels[upper] ?? `${getGameMarketName(upper)}区`;
}

export function getGameMarketSearchTerms(code: string): string {
  const upper = code.toUpperCase();
  return marketSearchWords[upper] ?? `${getGameMarketName(upper)} ${getGameMarketStoreTag(upper)} ${upper}`;
}

export function getGameStoreName(platform: Platform, compact = false): string {
  if (platform === "ps5") return compact ? "PS Store" : "PlayStation Store";
  if (platform === "xbox") return "Xbox 商店";
  return "PC 商店";
}
