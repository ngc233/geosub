import type { Metadata } from "next";
import "./globals.css";
import AnalyticsProvider from "../components/analytics/AnalyticsProvider";
import SiteChrome from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "GeoSub - 全球数字服务价格数据平台",
  description:
    "GeoSub 用于比较 AI 订阅、流媒体、软件、游戏、礼品卡、VPN 和支付工具在不同国家与地区的价格差异。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <AnalyticsProvider />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
