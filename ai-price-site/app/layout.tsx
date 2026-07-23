import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AnalyticsProvider from "../components/analytics/AnalyticsProvider";
import DocumentLocaleSync from "../components/DocumentLocaleSync";
import GoogleAnalyticsScripts from "../components/analytics/GoogleAnalyticsScripts";
import SiteChrome from "../components/SiteChrome";
import { launchedMirroredStaticPaths } from "../lib/public-launch-routes";
import {
  getSiteLocaleDefinition,
  getSiteLocaleFromPath,
  normalizeSiteLocale,
  siteLocaleDefinitions,
  supportedSiteLocales,
  withSiteLocale,
  type SiteLocale,
} from "../lib/site-locale";
import { withTraditionalChinese } from "../lib/traditional-chinese";

const defaultSiteUrl = "https://geosub.org";

const siteMetadataCopy: Record<
  SiteLocale,
  {
    title: string;
    description: string;
    keywords: string[];
    openGraphLocale: string;
  }
> = withTraditionalChinese({
  zh: {
    title: "GeoSub - 全球数字订阅价格数据平台",
    description:
      "GeoSub 用于比较 AI 订阅、流媒体和其他数字订阅在不同国家和地区的价格差异、税费说明和购买力视角。",
    keywords: [
      "订阅价格",
      "AI 订阅价格",
      "流媒体价格",
      "App Store 价格",
      "地区价格对比",
    ],
    openGraphLocale: "zh_CN",
  },
  en: {
    title: "GeoSub - Global Digital Subscription Pricing Data",
    description:
      "Compare AI subscriptions, streaming services and other digital subscriptions across countries and regions.",
    keywords: [
      "subscription pricing",
      "AI subscription prices",
      "streaming prices",
      "App Store prices",
      "regional pricing",
    ],
    openGraphLocale: "en_US",
  },
  ja: {
    title: "GeoSub - 世界のデジタルサブスクリプション価格",
    description:
      "AIやストリーミングなどのデジタルサービスについて、国・地域別の価格差、税情報、購買力の目安を比較できます。",
    keywords: [
      "サブスクリプション価格",
      "AI サブスクリプション",
      "ストリーミング 料金",
      "App Store 価格",
      "海外 価格比較",
    ],
    openGraphLocale: "ja_JP",
  },
  ko: {
    title: "GeoSub - 전 세계 디지털 구독 가격",
    description:
      "AI와 스트리밍 등 디지털 서비스의 국가·지역별 가격 차이, 세금 정보와 구매력 지표를 비교해 보세요.",
    keywords: [
      "구독 가격",
      "AI 구독 가격",
      "스트리밍 요금",
      "App Store 가격",
      "국가별 가격 비교",
    ],
    openGraphLocale: "ko_KR",
  },
  es: {
    title: "GeoSub - Precios mundiales de suscripciones digitales",
    description:
      "Compara los precios de servicios de IA y streaming entre países y regiones, con información fiscal y contexto de poder adquisitivo.",
    keywords: [
      "precios de suscripciones",
      "precios de suscripciones de IA",
      "precios de streaming",
      "precios de App Store",
      "comparación de precios por país",
    ],
    openGraphLocale: "es_ES",
  },
  tr: {
    title: "GeoSub - Dünya Genelinde Dijital Abonelik Fiyatları",
    description:
      "Yapay zekâ ve dijital yayın aboneliklerinin ülke ve bölgelere göre fiyatlarını, vergi bilgilerini ve satın alma gücü bağlamını karşılaştırın.",
    keywords: [
      "abonelik fiyatları",
      "yapay zekâ abonelik fiyatları",
      "dijital yayın fiyatları",
      "App Store fiyatları",
      "ülkelere göre fiyat karşılaştırması",
    ],
    openGraphLocale: "tr_TR",
  },
  ar: {
    title: "GeoSub - أسعار الاشتراكات الرقمية حول العالم",
    description:
      "قارن أسعار اشتراكات الذكاء الاصطناعي وخدمات البث بين الدول والمناطق، مع معلومات الضرائب وسياق القوة الشرائية.",
    keywords: [
      "أسعار الاشتراكات",
      "أسعار اشتراكات الذكاء الاصطناعي",
      "أسعار خدمات البث",
      "أسعار App Store",
      "مقارنة الأسعار حسب الدولة",
    ],
    openGraphLocale: "ar_AR",
  },
  fr: {
    title: "GeoSub - Prix des abonnements numériques dans le monde",
    description:
      "Comparez les prix des abonnements d’IA et de streaming selon les pays, avec les taxes et le pouvoir d’achat local.",
    keywords: ["prix des abonnements", "abonnements IA", "prix du streaming", "prix App Store", "comparatif par pays"],
    openGraphLocale: "fr_FR",
  },
  it: {
    title: "GeoSub - Prezzi degli abbonamenti digitali nel mondo",
    description:
      "Confronta i prezzi degli abbonamenti IA e streaming tra paesi, con informazioni fiscali e potere d’acquisto locale.",
    keywords: ["prezzi abbonamenti", "abbonamenti IA", "prezzi streaming", "prezzi App Store", "confronto prezzi per paese"],
    openGraphLocale: "it_IT",
  },
  de: {
    title: "GeoSub - Digitale Abonnementpreise weltweit",
    description:
      "Vergleichen Sie Preise für KI- und Streaming-Abonnements nach Land, einschließlich Steuern und lokaler Kaufkraft.",
    keywords: ["Abonnementpreise", "KI-Abonnements", "Streaming-Preise", "App-Store-Preise", "Ländervergleich"],
    openGraphLocale: "de_DE",
  },
  pt: {
    title: "GeoSub - Preços de assinaturas digitais no mundo",
    description:
      "Compare preços de assinaturas de IA e streaming entre países, incluindo impostos e poder de compra local.",
    keywords: ["preços de assinaturas", "assinaturas de IA", "preços de streaming", "preços da App Store", "comparação por país"],
    openGraphLocale: "pt_PT",
  },
});

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, "");
}

function normalizePathname(pathname: string | null, locale: SiteLocale) {
  if (!pathname || pathname === "/") {
    return `/${siteLocaleDefinitions[locale].path}`;
  }

  const normalized = pathname.replace(/\/+$/, "");
  return normalized || `/${siteLocaleDefinitions[locale].path}`;
}

function getLanguageAlternates(pathname: string) {
  const localePathPattern = supportedSiteLocales
    .map((locale) => siteLocaleDefinitions[locale].path)
    .join("|");
  const relativePath =
    pathname.replace(new RegExp(`^/(?:${localePathPattern})(?=/|$)`), "") ||
    "/";
  const isProductDetail = /^\/(?:ai-pricing|streaming-pricing)\/[^/]+$/.test(
    relativePath,
  );

  if (!launchedMirroredStaticPaths.has(relativePath) && !isProductDetail) {
    return undefined;
  }

  return {
    ...Object.fromEntries(
      supportedSiteLocales.map((locale) => [
        siteLocaleDefinitions[locale].htmlLang,
        withSiteLocale(relativePath, locale),
      ]),
    ),
    "x-default": withSiteLocale(relativePath, "en"),
  };
}

async function getCurrentLocale() {
  const headerList = await headers();
  const localeHeader = headerList.get("x-geosub-locale");

  if (localeHeader) {
    return normalizeSiteLocale(localeHeader);
  }

  return getSiteLocaleFromPath(headerList.get("x-pathname"));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const copy = siteMetadataCopy[locale];
  const siteUrl = getSiteUrl();
  const headerList = await headers();
  const canonicalPath = normalizePathname(
    headerList.get("x-pathname"),
    locale,
  );
  const languageAlternates = getLanguageAlternates(canonicalPath);

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "GeoSub",
    title: {
      default: copy.title,
      template: "%s - GeoSub",
    },
    description: copy.description,
    keywords: copy.keywords,
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: "GeoSub",
      locale: copy.openGraphLocale,
      type: "website",
      url: `${siteUrl}${canonicalPath}`,
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const localeDefinition = getSiteLocaleDefinition(locale);
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "GeoSub",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "GeoSub",
        url: siteUrl,
        inLanguage: localeDefinition.htmlLang,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <html
      lang={localeDefinition.htmlLang}
      dir={localeDefinition.direction}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <DocumentLocaleSync />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <GoogleAnalyticsScripts />
        <AnalyticsProvider />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
