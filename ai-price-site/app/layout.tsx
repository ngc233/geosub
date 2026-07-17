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

const defaultSiteUrl = "https://geosub.org";

const siteMetadataCopy: Record<
  SiteLocale,
  {
    title: string;
    description: string;
    keywords: string[];
    openGraphLocale: string;
  }
> = {
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
};

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
