import Link from "next/link";
import PublicIcon from "./PublicIcon";
import HomepageProductMark from "./HomepageProductMark";
import { formatPublicDate } from "../lib/public-date";
import { getCanvasPlanDisplayName } from "../lib/homepage-display";
import { getLocalizedRegionName } from "../lib/locale-format";
import { canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";
import type { HomepagePriceChange } from "../lib/homepage-price-changes";

export default function HomepageRecentChanges({
  events,
  locale = "zh",
}: {
  events: HomepagePriceChange[];
  locale?: CanvasLocale;
}) {
  if (!events.length) return null;
  const copy = canvasUiCopy[locale];
  return (
    <section className="gs-home-recent" aria-labelledby="home-recent-changes">
      <div className="gs-home-section-heading">
        <h2 id="home-recent-changes">{copy.home.recentHeading}</h2>
        <Link href={`/${locale}/price-history`}>
          {copy.home.recentLink} <PublicIcon name="ArrowRight" size={16} />
        </Link>
      </div>
      <ul className="gs-home-change-list">
        {events.map((event) => {
          const date = formatPublicDate(event.observedAt, new Date(), locale);
          const label = getCanvasPlanDisplayName(event.productName, event.planName, locale);
          const increase = event.direction === "increase";
          const country = getLocalizedRegionName(event.countryCode, locale) ?? event.countryCode;
          return (
            <li key={event.id}>
              <Link
                className="gs-home-change-row"
                href={`/${locale}/price-history/${event.productSlug}`}
                data-direction={event.direction}
                data-gs-motion-row
              >
                <HomepageProductMark
                  product={{ slug: event.productSlug, name: event.productName }}
                  className="gs-home-change-mark"
                />
                <span className="gs-home-change-copy">
                  <span>
                    {label} · {country}
                  </span>
                  {date && <time dateTime={date.dateTime}>{date.text}</time>}
                </span>
                <span className="gs-home-change-percent">
                  <PublicIcon name={increase ? "TrendingUp" : "TrendingDown"} size={16} />
                  <span className="gs-sr-only">{copy.home.recentSrDirection(increase)}</span>
                  {increase ? "+" : "−"}
                  {Math.abs(event.percent)}%
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="gs-home-change-note gs-sr-only">{copy.home.recentSrNote}</p>
    </section>
  );
}
