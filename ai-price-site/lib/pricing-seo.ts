import type {
  ProductPlan,
  SubscriptionProduct,
} from "./public-pricing-model";
import type { SiteLocale } from "./site-locale";

export type PricingFaq = {
  q: string;
  a: string;
};

export function buildPricingStructuredData({
  locale,
  path,
  title,
  description,
  product,
  plan,
  faqs,
}: {
  locale: SiteLocale;
  path: string;
  title: string;
  description: string;
  product: SubscriptionProduct;
  plan: ProductPlan;
  faqs: PricingFaq[];
}) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org"
  ).replace(/\/$/, "");
  const pageUrl = new URL(path, siteUrl).toString();
  const language = locale === "zh" ? "zh-CN" : "en";
  const dateModified = plan.freshness?.pageUpdatedAt || product.updatedAt;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        "@id": `${pageUrl}#dataset`,
        name: title,
        description,
        url: pageUrl,
        inLanguage: language,
        dateModified,
        creator: {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: "GeoSub",
          url: siteUrl,
        },
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        variableMeasured: [
          {
            "@type": "PropertyValue",
            name:
              locale === "zh"
                ? "App Store 地区订阅价格"
                : "Regional App Store subscription price",
            unitText: "USD",
          },
        ],
        spatialCoverage: plan.regions.map((region) => ({
          "@type": "Place",
          name: region.country,
          identifier: region.code,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        inLanguage: language,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  };
}
