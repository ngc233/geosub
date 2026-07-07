import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AnalyticsProvider from "../components/analytics/AnalyticsProvider";
import GoogleAnalyticsScripts from "../components/analytics/GoogleAnalyticsScripts";
import SiteChrome from "../components/SiteChrome";

const defaultSiteUrl = "https://geosub.org";

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, "");
}

function getLocaleFromPath(pathname?: string | null) {
  return pathname === "/en" || pathname?.startsWith("/en/") ? "en" : "zh";
}

async function getCurrentLocale() {
  const headerList = await headers();
  const localeHeader = headerList.get("x-geosub-locale");

  if (localeHeader === "en") {
    return "en";
  }

  return getLocaleFromPath(headerList.get("x-pathname"));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const isEnglish = locale === "en";
  const siteUrl = getSiteUrl();
  const title = isEnglish
    ? "GeoSub - Global Digital Subscription Pricing Data"
    : "GeoSub - 全球数字订阅价格数据平台";
  const description = isEnglish
    ? "Compare AI subscriptions, streaming services and other digital subscriptions across countries and regions."
    : "GeoSub 用于比较 AI 订阅、流媒体和其他数字订阅在不同国家和地区的价格差异、税费说明和购买力视角。";

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "GeoSub",
    title: {
      default: title,
      template: "%s - GeoSub",
    },
    description,
    keywords: isEnglish
      ? [
          "subscription pricing",
          "AI subscription prices",
          "streaming prices",
          "App Store prices",
          "regional pricing",
        ]
      : [
          "订阅价格",
          "AI 订阅价格",
          "流媒体价格",
          "App Store 价格",
          "地区价格对比",
        ],
    alternates: {
      canonical: isEnglish ? "/en" : "/zh",
      languages: {
        "zh-CN": "/zh",
        en: "/en",
      },
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
      title,
      description,
      siteName: "GeoSub",
      locale: isEnglish ? "en_US" : "zh_CN",
      type: "website",
      url: siteUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
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
        inLanguage: locale === "en" ? "en" : "zh-CN",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <html lang={locale === "en" ? "en" : "zh-CN"} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
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
