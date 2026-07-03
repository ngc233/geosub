import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AnalyticsProvider from "../components/analytics/AnalyticsProvider";
import GoogleAnalyticsScripts from "../components/analytics/GoogleAnalyticsScripts";
import SiteChrome from "../components/SiteChrome";

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
  const title = isEnglish
    ? "GeoSub - Global Digital Subscription Pricing Data"
    : "GeoSub - 全球数字服务价格数据平台";
  const description = isEnglish
    ? "Compare AI subscriptions, streaming services and other digital subscriptions across countries and regions."
    : "GeoSub 用于比较 AI 订阅、流媒体、软件、游戏、礼品卡、VPN 和支付工具在不同国家与地区的价格差异。";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.com"),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "GeoSub",
      locale: isEnglish ? "en_US" : "zh_CN",
      type: "website",
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

  return (
    <html lang={locale === "en" ? "en" : "zh-CN"} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <GoogleAnalyticsScripts />
        <AnalyticsProvider />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
