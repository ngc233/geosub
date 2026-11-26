import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileSearch,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Data Sources and Pricing Methodology",
  description:
    "Learn how GeoSub compares reviewed App Store regional subscription prices and presents exchange-rate dates, tax notes and data confidence.",
};

const sourceLayers = [
  {
    number: "01",
    title: "Price data",
    badge: "App Store",
    icon: Database,
    items: [
      "Public App Store subscription prices across supported regions",
      "Regular official Web prices for supported products, shown separately from App Store prices",
      "Structured product, plan, country and currency records",
      "Only reviewed observations are published to public rankings",
    ],
  },
  {
    number: "02",
    title: "Conversion and comparison",
    badge: "Regularly updated",
    icon: CircleDollarSign,
    items: [
      "Regional prices converted into the selected display currency",
      "Regional tax notes and data-confidence status",
      "US baseline comparison, price spread and subscription risk notes",
    ],
  },
  {
    number: "03",
    title: "Reading the figures",
    badge: "Checkout prevails",
    icon: Scale,
    items: [
      "Local list prices and converted prices are shown separately",
      "Collection, exchange-rate and plan-review dates are labelled separately",
      "Account region, payment method and tax may affect the final charge",
    ],
  },
] as const;

const qualityRules = [
  "Each plan is checked by original currency, billing cycle, region and USD equivalent.",
  "Prices far outside the usual range, with suspected currency errors or mismatched billing cycles, are withheld and checked again.",
  "Regional rankings use only prices that pass checks and can be compared with the same plan.",
  "Tax notes are informational and are not added again to ranking prices. Final checkout prices remain the source of truth.",
] as const;

export default function EnglishDataSourcesPage() {
  return (
    <AuxiliaryArticle
      locale="en"
      summaryTitle="Source policy"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Data Transparency & Verification
          </span>
          <h1>Data Sources and Pricing Methodology</h1>
          <p>
            GeoSub compares public App Store regional subscription prices for the same plan and billing cycle, while preserving the local currency, collection date and exchange-rate basis.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Source policy</p>
          <p>
            We would rather withhold a row temporarily than fill gaps with stale FX snapshots, mismatched billing cycles, or unverified quotes.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">Data architecture</p>
          <h2>Sources, conversions, and checkout boundaries kept distinct</h2>
          <p>
            Every displayed figure shows not only the converted price, but also the underlying store quote and conditions required for that comparison to hold.
          </p>
        </div>
        <div className="gs-aux-stack">
          {sourceLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      {layer.number}
                    </span>
                    <h3>{layer.title}</h3>
                    <span className="gs-aux-badge">{layer.badge}</span>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <ul className="gs-aux-checklist">
                  {layer.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">How to read the data</p>
          <h2>Exchange rates and tax treatment</h2>
          <p>
            Exchange rates convert local prices into the display currency selected by the reader. Reference rates normally synchronize every 12 hours. The applicable rate date is shown, and conversion pauses when a required rate is missing or stale.
          </p>
        </div>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <h3>Separate timestamps for every signal</h3>
              </div>
            </div>
            <p>
              Price collection dates, plan review dates, and FX snapshot dates carry distinct meanings and are never collapsed into a vague timestamp.
            </p>
          </article>
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <h3>Taxes are never double-counted</h3>
              </div>
            </div>
            <p>
              Tax notes come from regional tax rules collected for GeoSub. We do not add tax again on top of App Store ranking prices, because platform prices often already reflect local pricing rules. Final checkout pages remain authoritative.
            </p>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Quality controls</p>
              <h2 className="!m-0">Anomalies are quarantined before publication</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <ul className="gs-aux-checklist">
            {qualityRules.map((rule) => (
              <li key={rule}>
                <BadgeCheck aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Audit & verification</p>
              <h2 className="!m-0">Inspect live price changes and methodology</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <FileSearch size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Every published regional price change is logged with before-and-after local currency figures, collection timestamps, and plan scope so readers can audit movements directly.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/en/price-history"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>Inspect price change history</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/en/guides/methodology"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Read verification checklist</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>Note:</strong> GeoSub shows public price differences for comparison. It does not encourage bypassing platform rules. Cross-region subscriptions may be affected by account region, payment method, billing information, tax and platform risk controls.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
