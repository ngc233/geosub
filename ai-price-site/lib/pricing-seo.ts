import type {
  ProductPlan,
  SubscriptionProduct,
} from "./public-pricing-model";
import {
  getSiteLocaleDefinition,
  type SiteLocale,
} from "./site-locale";

export type PricingFaq = {
  q: string;
  a: string;
};

const regionalPricePropertyLabels: Record<SiteLocale, string> =
  {
  zh: "App Store 地区订阅价格",
  "zh-tw": "App Store 地區訂閱價格",
  en: "Regional App Store subscription price",
  ja: "App Store の地域別サブスクリプション価格",
  ko: "App Store 지역별 구독 가격",
  es: "Precio regional de la suscripción en App Store",
  tr: "Bölgesel App Store abonelik fiyatı",
  ar: "سعر اشتراك App Store حسب المنطقة",
  fr: "Prix régional de l’abonnement sur l’App Store",
  it: "Prezzo regionale dell’abbonamento su App Store",
  de: "Regionaler App-Store-Abonnementpreis",
  pt: "Preço regional da subscrição na App Store",
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
  const language = getSiteLocaleDefinition(locale).htmlLang;
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
            name: regionalPricePropertyLabels[locale],
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

export function buildProductOverviewStructuredData({
  locale,
  path,
  title,
  description,
  product,
  faqs = [],
}: {
  locale: SiteLocale;
  path: string;
  title: string;
  description: string;
  product: SubscriptionProduct;
  faqs?: PricingFaq[];
}) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org"
  ).replace(/\/$/, "");
  const pageUrl = new URL(path, siteUrl).toString();
  const language = getSiteLocaleDefinition(locale).htmlLang;
  const plans = product.plans.filter((plan) => plan.regions.length > 0);

  const graph = [
    {
      "@type": "CollectionPage",
      "@id": `${pageUrl}#page`,
      name: title,
      description,
      url: pageUrl,
      inLanguage: language,
      dateModified: product.updatedAt,
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@type": "SoftwareApplication",
        name: product.name,
        applicationCategory:
          product.category === "streaming"
            ? "MultimediaApplication"
            : "ProductivityApplication",
      },
    },
    {
      "@type": "ItemList",
      "@id": `${pageUrl}#plans`,
      name: `${product.name} plans`,
      numberOfItems: plans.length,
      itemListElement: plans.map((plan, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: plan.name,
        url: new URL(`${path}/${plan.slug}`, siteUrl).toString(),
      })),
    },
    ...(faqs.length > 0
      ? [
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
        ]
      : []),
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
