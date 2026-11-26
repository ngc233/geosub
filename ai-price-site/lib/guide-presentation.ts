/** Presentation only: preserve source prose, destinations and ordering. */
export type GuideIconKey =
  | "price"
  | "payment"
  | "review"
  | "methodology"
  | "ai"
  | "streaming"
  | "game"
  | "country"
  | "converter"
  | "article";

export type GuideCard = {
  href: string;
  title: string;
  description?: string | null;
  category: string;
  date?: string | null;
  minutes?: number | null;
  sectionsCount?: number | null;
  icon?: GuideIconKey;
  badge?: string | null;
};

export type GuideLink = {
  href: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  icon?: GuideIconKey;
};

export function guideCategories(cards: GuideCard[]) {
  return [...new Set(cards.map((card) => card.category))];
}

export function filterGuideCards(cards: GuideCard[], category: string, query = "") {
  const byCategory = category === "all" ? cards : cards.filter((card) => card.category === category);
  const normalized = query.trim().toLowerCase();
  if (!normalized) return byCategory;
  return byCategory.filter((card) =>
    [card.title, card.description ?? "", card.category]
      .some((field) => field.toLowerCase().includes(normalized)),
  );
}

export function inferGuideIcon(
  card: Pick<GuideCard, "icon" | "category" | "title" | "href">,
): GuideIconKey {
  if (card.icon) return card.icon;
  const text = `${card.category} ${card.title} ${card.href}`.toLowerCase();
  if (/payment|account|billing|card|支付|付款|账号|账单|信用卡/.test(text)) return "payment";
  if (/methodology|source|verify|方法|口径|核验|数据/.test(text)) return "methodology";
  if (/netflix|spotify|youtube|disney|streaming|流媒体|影视|音乐/.test(text)) return "streaming";
  if (/steam|playstation|xbox|gta|game|游戏/.test(text)) return "game";
  if (/chatgpt|claude|gemini|cursor|midjourney|perplexity|\bai\b/.test(text)) return "ai";
  if (/review|worth|versus|vs\b|测评|对比|值得|选型/.test(text)) return "review";
  if (/price|fx|currency|tax|价格|汇率|税|省钱|低价/.test(text)) return "price";
  return "article";
}

export function guideProgress(top: number, height: number, viewport: number) {
  const distance = height - viewport;
  if (distance <= 0) return top >= 0 ? 0 : 100;
  return Math.round(Math.max(0, Math.min(1, -top / distance)) * 100);
}

/** Only actual existing relation URLs qualify; never derive links from article text. */
export function guidePriceLinks(links: GuideLink[], locale: "zh" | "en" = "zh") {
  const seen = new Set<string>();
  const pattern = new RegExp(
    `^\\/${locale}\\/(ai-pricing|streaming-pricing)\\/([a-z0-9-]+)(?:\\/([a-z0-9-]+))?$`,
  );
  return links
    .flatMap((link) => {
      const match = link.href.match(pattern);
      if (!match || seen.has(link.href)) return [];
      seen.add(link.href);
      return [{ ...link, productSlug: match[2], planSlug: match[3] }];
    })
    .slice(0, 3);
}
