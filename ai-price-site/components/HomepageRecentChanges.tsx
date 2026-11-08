import Link from "next/link";
import PublicIcon from "./PublicIcon";
import { formatPublicDate } from "../lib/public-date";
import { getChinesePlanDisplayName } from "../lib/pricing-labels";
import type { HomepagePriceChange } from "../lib/homepage-price-changes";

const countries = new Intl.DisplayNames(["zh-CN"], { type: "region" });
export default function HomepageRecentChanges({ events }: { events: HomepagePriceChange[] }) {
  if (!events.length) return null;
  return <section className="gs-home-recent" aria-labelledby="home-recent-changes">
    <div className="gs-home-section-heading"><h2 id="home-recent-changes">最近变价</h2>
      <Link href="/zh/price-history">价格历史 <PublicIcon name="ArrowRight" size={16}/></Link></div>
    <ul className="gs-home-change-list">{events.map(event => {
      const date = formatPublicDate(event.observedAt);
      const label = getChinesePlanDisplayName(event.productName, event.planName);
      const increase = event.direction === "increase";
      return <li key={event.id}><Link className="gs-home-change-row" href={event.href} data-direction={event.direction} data-gs-motion-row>
        <span className="gs-home-change-icon" aria-hidden="true"><PublicIcon name={increase ? "TrendingUp" : "TrendingDown"} size={16}/></span>
        <span className="gs-home-change-copy"><span>{label} · {countries.of(event.countryCode)}</span>
          {date && <time dateTime={date.dateTime}>{date.text}</time>}</span>
        <span className="gs-home-change-percent"><span className="gs-sr-only">本币标价{increase ? "上涨" : "下降"}</span>{increase ? "+" : "−"}{Math.abs(event.percent)}%</span>
      </Link></li>;
    })}</ul>
    <p className="gs-home-change-note gs-sr-only">最近 30 天已核验的本币标价变化，不含汇率波动</p>
  </section>;
}
