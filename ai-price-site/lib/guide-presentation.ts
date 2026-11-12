/** Presentation only: preserve source prose, destinations and ordering. */
export type GuideCard = { href: string; title: string; description?: string | null; category: string; date?: string | null; minutes?: number | null };
export type GuideLink = { href: string; title: string; description?: string | null };
export function guideCategories(cards: GuideCard[]) { return [...new Set(cards.map(card => card.category))]; }
export function filterGuideCards(cards: GuideCard[], category: string) { return category === "all" ? cards : cards.filter(card => card.category === category); }
export function guideProgress(top: number, height: number, viewport: number) {
  const distance = height - viewport;
  if (distance <= 0) return top >= 0 ? 0 : 100;
  return Math.round(Math.max(0, Math.min(1, -top / distance)) * 100);
}
/** Only actual existing relation URLs qualify; never derive links from article text. */
export function guidePriceLinks(links: GuideLink[]) {
  const seen = new Set<string>();
  return links.flatMap(link => {
    const match = link.href.match(/^\/zh\/(ai-pricing|streaming-pricing)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
    if (!match || seen.has(link.href)) return [];
    seen.add(link.href);
    return [{ ...link, productSlug: match[2], planSlug: match[3] }];
  }).slice(0, 3);
}
