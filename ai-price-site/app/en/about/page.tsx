import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Scale,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About GeoSub",
  description:
    "GeoSub compares public AI and streaming subscription prices across countries, with exchange rates, tax notes, update dates and affordability context.",
};

const valueCards = [
  {
    title: "Comparable across regions",
    desc: "Retains original local currencies while applying a consistent FX reference so cross-market differences are transparent.",
    icon: Globe2,
  },
  {
    title: "Traceable evidence",
    desc: "Published prices retain their store source, collection date, and eligibility notes—never presenting unverified guesses as facts.",
    icon: SearchCheck,
  },
  {
    title: "Clear purchase boundaries",
    desc: "Highlights tax rules, account region locks, payment restrictions, and plan availability alongside every price comparison.",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "Collect public store prices",
    desc: "Track official App Store subscription listings and supported direct Web pricing across global regions.",
    icon: Database,
  },
  {
    title: "Run consistency checks",
    desc: "Verify currency codes, billing periods, region scopes, and dates—withholding anomalous or conflicting observations.",
    icon: BookOpenCheck,
  },
  {
    title: "Publish explainable comparisons",
    desc: "Present local list prices, USD references, work-hour affordability, and checkout conditions side by side.",
    icon: Scale,
  },
] as const;

export default function EnglishTrustPage() {
  return (
    <AuxiliaryArticle
      locale="en"
      summaryTitle="Editorial standard"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            About GeoSub · Independent Price Intelligence
          </span>
          <h1>Turning global subscription prices into clear, verifiable context.</h1>
          <p>
            GeoSub compares public AI and streaming subscription prices across countries, with exchange rates, tax notes, update dates and affordability context.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Editorial standard</p>
          <p>
            A regional price is only worth comparing when its source, collection date, currency, and checkout conditions can all be explained.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">The problem we solve</p>
          <h2>Prices are scattered across markets; comparison shouldn&apos;t rely on guesswork</h2>
          <p>
            We organize App Store subscription prices across countries and currencies so regional differences, plan changes and subscription choices are easier to compare and understand.
          </p>
        </div>
        <div className="gs-aux-stack">
          {valueCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">Verification workflow</p>
          <h2>From public figures to trustworthy comparisons</h2>
          <p>
            Each price keeps its local currency, collection date and exchange-rate basis. Pages use regional prices that pass consistency checks and remind readers to confirm account region, payment method, tax and the official checkout amount.
          </p>
        </div>
        <div className="gs-aux-stack">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <BadgeDollarSign size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">Independence first</h2>
              </div>
            </div>
            <p>
              Sponsored placements or partnerships are always explicitly labelled. Payment never changes regional price rankings, verification gates, or editorial conclusions.
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">Who GeoSub serves</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Individuals comparing AI and streaming plan costs across markets</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Journalists and researchers studying digital pricing strategy</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Product and growth teams benchmarking global subscription tiers</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Continuous verification</p>
              <h2 className="!m-0">Prices move; methodology stays transparent</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Explore how regional store quotes, FX snapshots, and historical price movements are verified across countries.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/en/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>Data sources & methodology</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/en/price-history"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Inspect price history</span>
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
