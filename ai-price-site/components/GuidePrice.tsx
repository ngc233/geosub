"use client";
import { usePublicCurrency } from "./PublicCurrencySelect";
import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
export default function GuidePrice({ usd, cycle, rates }: { usd: number; cycle: string; rates: Record<string, number> }) {
  const [preferred] = usePublicCurrency();
  const currency = rates[preferred] > 0 ? preferred : "USD";
  return <span className="gs-guide-price flex flex-col gap-0.5 min-w-0 text-right"><span data-gs-number>{formatPublicPrice(usd * (rates[currency] ?? 1), currency)} <small>/ {publicBillingLabel(cycle)}</small></span>{currency !== preferred && <small>汇率暂不可用，显示美元</small>}</span>;
}
