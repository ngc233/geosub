import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  Mail,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import AuxiliaryArticle from "../AuxiliaryArticle";
import ContactTicketForm from "./ContactTicketForm";
import { resolveCanvasLocale, type CanvasLocale } from "../../lib/canvas-ui-copy";
import {
  contactEmail,
  getContactCopy,
  type ContactItemIconKey,
} from "../../lib/contact-copy";
import { getLocaleRobotsPolicy } from "../../lib/seo-indexing-policy";

const iconByKey: Record<ContactItemIconKey, LucideIcon> = {
  FileSearch,
  Lightbulb,
  BarChart3,
  Megaphone,
};

function mailto(subject: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}

export function getContactPageMetadata(locale: CanvasLocale): Metadata {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = getContactCopy(resolvedLocale);
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    robots: getLocaleRobotsPolicy(resolvedLocale),
  };
}

export default function ContactPageView({ locale = "zh" }: { locale?: CanvasLocale }) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = getContactCopy(resolvedLocale);

  return (
    <AuxiliaryArticle
      contact
      locale={resolvedLocale}
      summaryTitle={copy.summaryTitle}
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            {copy.eyebrow}
          </span>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">{copy.directEmailEyebrow}</p>
          <p>
            <a href={mailto(copy.mailtoSubject)} className="gs-aux-link">
              <Mail size={16} aria-hidden="true" />
              <span>{contactEmail}</span>
            </a>
          </p>
          <ul className="gs-aux-checklist !mt-3">
            {copy.directEmailChecklist.map((line) => (
              <li key={line}>
                <CheckCircle2 aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">{copy.contactTypesKicker}</p>
          <h2>{copy.contactTypesHeading}</h2>
          <p>{copy.contactTypesDesc}</p>
        </div>
        <div className="gs-aux-grid-2">
          {copy.contactItems.map((item) => {
            const Icon = iconByKey[item.icon];
            return (
              <article key={item.title} className="gs-aux-block flex flex-col">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.desc}</p>
                <a href="#contact-form" className="gs-aux-link mt-auto pt-2">
                  <span>{item.action}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">{copy.ticketSectionKicker}</p>
          <h2>{copy.ticketSectionHeading}</h2>
          <p>{copy.ticketSectionDesc}</p>
        </div>
        <ContactTicketForm canvas locale={resolvedLocale} />
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">{copy.partnershipKicker}</p>
          <h2>{copy.partnershipHeading}</h2>
          <p>{copy.partnershipDesc}</p>
        </div>
        <div className="gs-aux-stack">
          {copy.advertisingOptions.map((option) => (
            <article key={option.number} className="gs-aux-block">
              <div className="gs-aux-card-top">
                <div className="gs-aux-card-title-group">
                  <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                    {option.number}
                  </span>
                  <h3>{option.title}</h3>
                </div>
                <span className="gs-aux-icon-chip">
                  <Building2 size={18} aria-hidden="true" />
                </span>
              </div>
              <p>{option.desc}</p>
            </article>
          ))}

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div>
                <p className="gs-aux-kicker">{copy.principlesKicker}</p>
                <h2 className="!m-0">{copy.principlesHeading}</h2>
              </div>
              <span className="gs-aux-icon-chip">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
            </div>
            <ul className="gs-aux-checklist">
              {copy.principlesList.map((rule) => (
                <li key={rule}>
                  <BadgeCheck aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">{copy.privacyKicker}</p>
              <h2 className="!m-0">{copy.privacyHeading}</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Mail size={18} aria-hidden="true" />
            </span>
          </div>
          <p>{copy.privacyDesc}</p>
          <div className="gs-aux-actions">
            <a href="#contact-form" className="gs-aux-primary-btn" data-gs-ui="button">
              <span>{copy.privacyPrimaryBtn}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </a>
            <Link
              href={`/${resolvedLocale}/privacy`}
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>{copy.privacySecondaryBtn}</span>
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
