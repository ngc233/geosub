import Link from "next/link";
import { getPublicPricingProduct } from "../lib/pricing-product-store";
import { minimumSearchPrice } from "../lib/public-chrome-search";
import { getLatestUsdExchangeRates } from "../lib/exchange-rates";
import { supportedDisplayCurrencies } from "../lib/display-currency";
import { homepageDisplayRates } from "../lib/homepage-summary";
import { guidePriceLinks, type GuideLink } from "../lib/guide-presentation";
import GuidePrice from "./GuidePrice";
/** Only persisted relations, at most three cached product reads; same minimum as target pages. */
async function readRelatedPrices(links: GuideLink[]) {
  const candidates = guidePriceLinks(links);
  if (!candidates.length) return null;
  try {
    const [products, snapshots] = await Promise.all([Promise.all(candidates.map(link => getPublicPricingProduct(link.productSlug, "zh"))), getLatestUsdExchangeRates(supportedDisplayCurrencies)]);
    const rows = candidates.flatMap((link, i) => {
      const product = products[i]; const price = product && minimumSearchPrice(product, link.planSlug);
      return price ? [{ link, price }] : [];
    });
    if (!rows.length) return null;
    const rates = homepageDisplayRates(snapshots);
    return { rows, rates };
  } catch (error) {
    console.error("guide_related_prices_unavailable", error instanceof Error ? "Error" : typeof error);
    return null;
  }
}
export default async function GuideRelatedPrices({ links }: { links: GuideLink[] }) {
  const result = await readRelatedPrices(links);
  if (!result) return null;
  const { rows, rates } = result;
  return <section className="gs-guide-prices p-3.5"><h2 className="mt-1 mx-2.5 mb-1.5">用得上这篇的价格</h2>{rows.map(({ link, price }) => <Link key={link.href} href={link.href} className="gs-guide-price-row flex justify-between items-center gap-2.5 p-2.5"><span className="flex flex-col gap-0.5 min-w-0"><strong className="font-semibold">{link.title}</strong><small>最低 · {price.country}</small></span><GuidePrice usd={price.usd} cycle={price.cycle} rates={rates}/></Link>)}<p className="mt-1.5 mx-2.5 mb-0.5">价格口径与对应产品或套餐页一致</p></section>;
}
