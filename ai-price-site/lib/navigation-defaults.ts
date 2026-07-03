import type { NavigationPositionValue } from "./navigation-config";

export type DefaultNavigationChild = {
  label: string;
  href: string;
};

export type DefaultNavigationGroup = {
  label: string;
  href: string;
  children?: DefaultNavigationChild[];
};

type DefaultNavigationMap = Record<
  "zh" | "en",
  Record<NavigationPositionValue, DefaultNavigationGroup[]>
>;

export const defaultNavigationItems: DefaultNavigationMap = {
  zh: {
    header: [
      { label: "首页", href: "/zh/" },
      {
        label: "数字订阅",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅", href: "/zh/ai-pricing" },
          { label: "流媒体", href: "/zh/streaming-pricing" },
        ],
      },
      { label: "订阅指南", href: "/zh/guides" },
      { label: "数据来源", href: "/zh/data-sources" },
    ],
    footer: [
      {
        label: "价格数据",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅价格", href: "/zh/ai-pricing" },
          { label: "流媒体价格", href: "/zh/streaming-pricing" },
        ],
      },
      {
        label: "指南",
        href: "/zh/guides",
        children: [
          { label: "全部指南", href: "/zh/guides" },
          { label: "价格指南", href: "/zh/guides/price-guide" },
          { label: "支付与账号", href: "/zh/guides/payment-account" },
          { label: "方法论", href: "/zh/guides/methodology" },
        ],
      },
      {
        label: "站点",
        href: "/zh/about",
        children: [
          { label: "关于 GeoSub", href: "/zh/about" },
          { label: "数据来源", href: "/zh/data-sources" },
          { label: "联系我们", href: "/zh/contact" },
        ],
      },
      {
        label: "政策",
        href: "/zh/privacy",
        children: [
          { label: "隐私政策", href: "/zh/privacy" },
          { label: "服务条款", href: "/zh/terms" },
        ],
      },
    ],
  },
  en: {
    header: [
      { label: "Home", href: "/en/" },
      {
        label: "Digital Subscriptions",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Subscriptions", href: "/en/ai-pricing" },
          { label: "Streaming", href: "/en/streaming-pricing" },
        ],
      },
      { label: "Guides", href: "/en/guides" },
      { label: "Data Sources", href: "/en/data-sources" },
    ],
    footer: [
      {
        label: "Pricing Data",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Pricing", href: "/en/ai-pricing" },
          { label: "Streaming Pricing", href: "/en/streaming-pricing" },
        ],
      },
      {
        label: "Guides",
        href: "/en/guides",
        children: [
          { label: "All Guides", href: "/en/guides" },
          { label: "Price Guide", href: "/en/guides/price-guide" },
          { label: "Payment & Account", href: "/en/guides/payment-account" },
          { label: "Methodology", href: "/en/guides/methodology" },
        ],
      },
      {
        label: "Site",
        href: "/en/about",
        children: [
          { label: "About GeoSub", href: "/en/about" },
          { label: "Data Sources", href: "/en/data-sources" },
        ],
      },
      {
        label: "Legal",
        href: "/en/privacy",
        children: [
          { label: "Privacy", href: "/en/privacy" },
          { label: "Terms", href: "/en/terms" },
        ],
      },
    ],
  },
};

export function getDefaultNavigationItems({
  locale,
  position,
}: {
  locale: string;
  position: NavigationPositionValue;
}) {
  return defaultNavigationItems[locale === "en" ? "en" : "zh"][position];
}
