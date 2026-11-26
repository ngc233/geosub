import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms for using GeoSub, including the scope of its subscription price comparisons, information limitations, external links, and checkout disclaimers.",
};

const termsSections = [
  {
    number: "01",
    kicker: "Service nature",
    title: "Independent pricing reference, not advice or affiliation",
    icon: Scale,
    body: "GeoSub provides public pricing references, regional comparisons, and subscription information. It does not provide legal, financial, or purchasing advice, and is an independent comparison service not affiliated with, sponsored by, or endorsed by the brands shown.",
    points: [
      "Displayed prices, FX conversions, and percentage spreads are for informational comparison only",
      "Commercial or editorial partnerships are explicitly labelled and never alter rankings or verification checks",
    ],
  },
  {
    number: "02",
    kicker: "Checkout precedence",
    title: "Official checkout pages and platform rules govern billing",
    icon: Landmark,
    body: "By using GeoSub, you understand that the data is a public pricing reference. Cross-region subscriptions, account region, payment method, taxes and platform risk controls can affect availability. Final checkout pages and official platform rules remain authoritative.",
    points: [
      "Exchange-rate movements, local tax rules, or unannounced store repricing can change the final charge",
      "GeoSub never sells shared accounts, top-ups, or tools to bypass platform terms—always follow official subscriber rules",
    ],
  },
  {
    number: "03",
    kicker: "Acceptable use",
    title: "Fair citation and service integrity",
    icon: ShieldCheck,
    body: "Individual readers, journalists, and researchers are welcome to consult and cite GeoSub comparisons with clear attribution and collection dates.",
    points: [
      "Automated abusive scraping, denial-of-service probing, or disrupting site availability is prohibited",
      "When citing regional figures, preserve the local currency, billing cycle, and observation date for accuracy",
    ],
  },
] as const;

export default function EnglishTrustPage() {
  return (
    <AuxiliaryArticle
      locale="en"
      summaryTitle="Authoritative source"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Terms & Information Boundaries
          </span>
          <h1>Terms of Service</h1>
          <p>
            This page explains the service scope, information boundaries, acceptable use rules, and checkout disclaimers that apply when using GeoSub.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Authoritative source</p>
          <p>
            All regional price comparisons, currency conversions, and tax notes are informational references. Official store checkout pages and platform terms govern actual billing and eligibility.
          </p>
        </div>
      </section>

      {termsSections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.number}>
            <article className="gs-aux-block">
              <div className="gs-aux-card-top">
                <div className="gs-aux-card-title-group">
                  <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                    {section.number}
                  </span>
                  <div>
                    <p className="gs-aux-kicker">{section.kicker}</p>
                    <h2 className="!m-0">{section.title}</h2>
                  </div>
                </div>
                <span className="gs-aux-icon-chip">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p>{section.body}</p>
              <ul className="gs-aux-checklist">
                {section.points.map((point) => (
                  <li key={point}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        );
      })}

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div className="gs-aux-card-title-group">
              <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                04
              </span>
              <div>
                <p className="gs-aux-kicker">External links & updates</p>
                <h2 className="!m-0">Third-party platforms and policy updates</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            GeoSub links to official product websites and app storefronts for verification convenience; external services operate under their own terms and privacy policies. Updates to these terms take effect upon publication on this page.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/en/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>Review data sources & methodology</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/en/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Read Privacy Policy</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>Important:</strong> Using GeoSub signifies your understanding of these informational boundaries. Always confirm final pricing, tax, and eligibility on the official checkout screen before subscribing.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
