import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import AnalyticsConsentButton from "../../../components/AnalyticsConsentButton";
import PrivacyDisclosure from "../../../components/PrivacyDisclosure";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Cookie,
  Database,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "This page explains how GeoSub handles identifier-free page totals, consented analytics events, and user-submitted support requests.",
};

const principles = [
  {
    title: "Browse without an account",
    desc: "Comparing regional prices never requires your name, ID document, payment details, or store credentials.",
    icon: EyeOff,
  },
  {
    title: "Analytics only by choice",
    desc: "Identifier-based analytics run only when you opt in and can be revoked at any moment.",
    icon: Cookie,
  },
  {
    title: "Private support inquiries",
    desc: "Submitted tickets are used solely to verify and reply to your request—never published or used for ad profiling.",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "Identifier-free daily totals",
    desc: "Aggregate UTC page counts run without reading or setting cookies or visitor IDs.",
    icon: BarChart3,
  },
  {
    title: "First-party diagnostics",
    desc: "Anonymous interaction and reliability events record only after required consent.",
    icon: Database,
  },
  {
    title: "Third-party measurement",
    desc: "Google Analytics or Google Tag Manager runs strictly after you choose to accept.",
    icon: Cookie,
  },
  {
    title: "Voluntary tickets",
    desc: "Contact details submitted in forms are used exclusively to process corrections or privacy requests.",
    icon: Mail,
  },
] as const;

export default function EnglishTrustPage() {
  return (
    <AuxiliaryArticle
      locale="en"
      summaryTitle="Core commitment"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Privacy & Data Minimization · Updated 22 Aug 2026
          </span>
          <h1>Data should help you compare prices, never track you across the web.</h1>
          <p>
            This policy explains in plain language what GeoSub records, why it is recorded, how long it is kept, and how you can change your analytics preference at any time.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Core commitment</p>
          <p>
            GeoSub never sells personally identifiable information and never allows commercial partnerships to influence regional price rankings or verification rules.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">Foundational rules</p>
          <h2>Three privacy-by-default principles</h2>
          <p>Public price comparisons stay accessible without accounts, login walls, or hidden profiling.</p>
        </div>
        <div className="gs-aux-stack">
          {principles.map((item) => {
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
          <p className="gs-aux-kicker">Data categories</p>
          <h2>Distinct signals kept strictly separate</h2>
          <p>Identifier-free page counts, consented analytics, and support inquiries serve separate purposes with independent boundaries.</p>
        </div>
        <div className="gs-aux-grid-2">
          {dataScopes.map((scope) => {
            const Icon = scope.icon;
            return (
              <article key={scope.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{scope.title}</h3>
                  </div>
                </div>
                <p>{scope.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <PrivacyDisclosure locale="en" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Your choices</p>
              <h2 className="!m-0">Manage analytics preferences anytime</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Reopen the analytics and cookie preference dialog directly below to accept or reject non-essential measurement. When rejected, GeoSub stops non-essential analytics and clears its analytics session immediately.
          </p>
          <div className="gs-aux-actions">
            <AnalyticsConsentButton locale="en" variant="primary" />
            <Link
              href="/en/data-sources"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Data sources & methodology</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
