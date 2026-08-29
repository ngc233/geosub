import type { DailyOperationState } from "../../lib/admin-daily-operations";

export function formatNumber(value: number | string) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function toCount(value: bigint | number | null | undefined) {
  return Number(value || 0);
}

export function formatConversion(current: number, previous: number) {
  if (previous <= 0) return "0%";
  return `${Math.round((current / previous) * 100)}%`;
}

export function dailyOperationPresentation(state: DailyOperationState) {
  return {
    failed: {
      label: "运行失败",
      className: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800",
    },
    action: {
      label: "需要处理",
      className: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
    },
    running: {
      label: "正在运行",
      className: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
    },
    queued: {
      label: "已排队",
      className: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
    },
    healthy: {
      label: "当前健康",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
    },
  }[state];
}
export function eventNameZh(eventKey: string) {
  const map: Record<string, string> = {
    page_view: "页面访问",
    click_digital_service_card: "服务卡片点击",
    click_digital_service_sidebar: "服务切换",
    click_internal_link: "内部链接点击",
    click_official: "官方入口点击",
    click_affiliate: "Affiliate 点击",
    click_button: "按钮点击",
    click_ad: "广告点击",
    select_plan: "套餐切换",
    click_product_overview: "返回产品套餐总览",
    click_related_pricing_product: "关联产品点击",
    click_related_plan: "关联套餐点击",
    click_country: "地区点击",
    open_share_modal: "打开分享弹窗",
    copy_link: "复制链接",
    copy_share_link: "复制分享链接",
    download_share_image: "下载分享图",
    share_to_social: "分享到社交平台",
    search_digital_service: "搜索数字服务",
  };

  return map[eventKey] || eventKey;
}

export function sourceNameZh(source?: string | null) {
  const map: Record<string, string> = {
    frontend_auto: "自动访问埋点",
    frontend_click: "前台点击埋点",
    tracked_link: "链接点击",
    tracked_button: "按钮点击",
    segmented_control: "分段选项切换",
  };

  if (!source) return "未知来源";
  return map[source] || source;
}

export function trafficSourceNameZh(source: string) {
  const map: Record<string, string> = {
    direct: "直接访问",
    internal: "站内跳转",
    search: "搜索引擎",
    social: "社交平台",
    referral: "外部引荐",
  };

  return map[source] || source;
}

export function commercialEntryNameZh(value: string) {
  const map: Record<string, string> = {
    affiliate_box: "Affiliate 推荐位",
    product_hero: "产品页主入口",
    pricing_card: "价格卡片",
    product_sidebar: "产品侧栏",
    ad_slot: "广告位",
    frontend_click: "前台点击",
    tracked_link: "追踪链接",
    tracked_button: "追踪按钮",
    unmarked: "未标记入口",
  };

  return map[value] || value;
}

export function deviceNameZh(deviceType?: string | null) {
  if (deviceType === "mobile") return "移动端";
  if (deviceType === "tablet") return "平板";
  if (deviceType === "desktop") return "桌面端";
  return "未知设备";
}

export function pageNameZh(pagePath?: string | null) {
  if (!pagePath) return "未知页面";

  const path = pagePath.split("?")[0].replace(/\/$/, "");

  if (path === "/zh" || path === "") return "中文首页";
  if (path === "/zh/ai-pricing") return "AI 定价列表页";
  if (path === "/zh/ai-pricing/chatgpt") return "ChatGPT 价格页";
  if (path === "/zh/streaming-pricing") return "流媒体定价列表页";
  if (path === "/en/ai-pricing") return "英文 AI 定价列表页";
  if (path === "/en/streaming-pricing") return "英文流媒体定价列表页";

  if (path.startsWith("/zh/ai-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "数字服务";
    return `${slug} 价格页`;
  }

  if (path.startsWith("/zh/streaming-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "流媒体服务";
    return `${slug} 流媒体价格页`;
  }

  if (path.startsWith("/en/ai-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "AI service";
    return `${slug} 英文价格页`;
  }

  if (path.startsWith("/en/streaming-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "streaming service";
    return `${slug} 英文流媒体价格页`;
  }

  if (path.startsWith("/zh/articles/")) return "文章详情页";
  if (path.startsWith("/zh/guides/")) return "教程详情页";

  return path;
}

export function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}
