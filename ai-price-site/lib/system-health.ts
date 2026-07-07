import "server-only";

import { prisma } from "./prisma";

export type HealthStatus = "ok" | "warning" | "critical" | "unknown";

export type HealthMetric = {
  label: string;
  value: string;
  helper?: string;
  status: HealthStatus;
};

export type HealthSection = {
  title: string;
  description: string;
  status: HealthStatus;
  metrics: HealthMetric[];
};

export type SystemHealth = {
  checkedAt: string;
  summary: {
    status: HealthStatus;
    label: string;
    issueCount: number;
  };
  sections: HealthSection[];
  issues: string[];
};

type DatabasePingRow = {
  checked_at: Date | string;
  database_name: string;
  schema_name: string;
};

type ExchangeRateRow = {
  base_currency: string;
  quote_currency: string;
  rate: unknown;
  source: string | null;
  rate_date: Date | string | null;
  fetched_at: Date | string | null;
};

type CollectorJobStatsRow = {
  total_jobs: unknown;
  active_jobs: unknown;
  paused_jobs: unknown;
  due_jobs: unknown;
  app_store_jobs: unknown;
  ai_pricing_jobs: unknown;
  latest_job_updated_at: Date | string | null;
};

type CollectorRunRow = {
  status: string | null;
  collector_kind: string | null;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  error_message: string | null;
  output_excerpt: string | null;
};

type ReviewStatsRow = {
  pending_observations: unknown;
  pending_anomalies: unknown;
  latest_observed_at: Date | string | null;
  published_prices: unknown;
  latest_price_checked_at: Date | string | null;
};

type AutoReviewRunRow = {
  status: string | null;
  dry_run: boolean | null;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  checked_groups: unknown;
  auto_approved_count: unknown;
  manual_review_count: unknown;
  error_message: string | null;
};

type ContentStatsRow = {
  published_products: unknown;
  review_products: unknown;
  published_plans: unknown;
  published_articles: unknown;
  enabled_navigation_items: unknown;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString()) || 0;
  }

  return 0;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "未记录";

  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoursSince(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;

  return (Date.now() - date.getTime()) / (60 * 60 * 1000);
}

function ageLabel(value: Date | string | null | undefined) {
  const hours = hoursSince(value);
  if (hours === null) return "未记录";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} 分钟前`;
  if (hours < 48) return `${Math.round(hours)} 小时前`;

  return `${Math.round(hours / 24)} 天前`;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unknown")) return "unknown";
  return "ok";
}

function statusLabel(status: HealthStatus) {
  if (status === "ok") return "正常";
  if (status === "warning") return "需要关注";
  if (status === "critical") return "需要处理";
  return "未知";
}

function getSiteUrlStatus(siteUrl: string) {
  if (!siteUrl) return "warning";
  if (!siteUrl.includes("geosub.org")) return "warning";
  return "ok";
}

function getDatabaseTarget() {
  const value = process.env.DATABASE_URL || "";

  if (!value) {
    return "未配置";
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "已配置，但无法解析";
  }
}

async function safeQuery<T>(
  query: () => Promise<T>,
  fallback: T,
  issues: string[],
  issueMessage: string,
) {
  try {
    return await query();
  } catch {
    issues.push(issueMessage);
    return fallback;
  }
}

async function getExchangeSection(issues: string[]): Promise<HealthSection> {
  const rows = await safeQuery(
    () =>
      prisma.$queryRaw<ExchangeRateRow[]>`
        SELECT
          base_currency,
          quote_currency,
          rate,
          source,
          rate_date,
          fetched_at
        FROM exchange_rates
        WHERE base_currency = 'USD'
          AND quote_currency = 'CNY'
          AND status = 'active'
        ORDER BY rate_date DESC, fetched_at DESC
        LIMIT 1
      `,
    [] as ExchangeRateRow[],
    issues,
    "无法读取汇率表。",
  );

  const row = rows[0];

  if (!row) {
    return {
      title: "汇率同步",
      description: "检查 USD/CNY 汇率是否可用于人民币估算。",
      status: "warning",
      metrics: [
        {
          label: "USD/CNY",
          value: "无记录",
          helper: "请运行汇率同步任务。",
          status: "warning",
        },
      ],
    };
  }

  const ageHours = hoursSince(row.fetched_at);
  const freshnessStatus: HealthStatus =
    ageHours === null ? "warning" : ageHours > 48 ? "critical" : ageHours > 18 ? "warning" : "ok";
  const rate = toNumber(row.rate).toFixed(4);

  return {
    title: "汇率同步",
    description: "人民币估算依赖这里的最新汇率。超过 18 小时会提示关注。",
    status: freshnessStatus,
    metrics: [
      {
        label: "USD/CNY",
        value: rate,
        helper: `来源：${row.source || "未记录"}；基准日 ${formatDateTime(row.rate_date)}`,
        status: freshnessStatus,
      },
      {
        label: "同步时间",
        value: ageLabel(row.fetched_at),
        helper: formatDateTime(row.fetched_at),
        status: freshnessStatus,
      },
    ],
  };
}

async function getCollectorSection(issues: string[]): Promise<HealthSection> {
  const statsRows = await safeQuery(
    () =>
      prisma.$queryRaw<CollectorJobStatsRow[]>`
        SELECT
          COUNT(*)::int AS total_jobs,
          COUNT(*) FILTER (WHERE job.status = 'active')::int AS active_jobs,
          COUNT(*) FILTER (WHERE job.status = 'paused')::int AS paused_jobs,
          COUNT(*) FILTER (WHERE job.status = 'active' AND job.next_run_at IS NOT NULL AND job.next_run_at <= NOW())::int AS due_jobs,
          COUNT(*) FILTER (WHERE source.type = 'app_store'::price_source_type AND job.status <> 'archived')::int AS app_store_jobs,
          COUNT(*) FILTER (WHERE job.job_type = 'ai_pricing' AND job.status <> 'archived')::int AS ai_pricing_jobs,
          MAX(job.updated_at) AS latest_job_updated_at
        FROM collector_jobs job
        LEFT JOIN price_sources source ON source.id = job.source_id
      `,
    [] as CollectorJobStatsRow[],
    issues,
    "无法读取采集任务表。",
  );

  const runRows = await safeQuery(
    () =>
      prisma.$queryRaw<CollectorRunRow[]>`
        SELECT
          status,
          collector_kind,
          started_at,
          finished_at,
          error_message,
          output_excerpt
        FROM collector_job_runs
        ORDER BY started_at DESC
        LIMIT 1
      `,
    [] as CollectorRunRow[],
    issues,
    "无法读取采集执行历史。",
  );

  const stats = statsRows[0];
  const latestRun = runRows[0];
  const totalJobs = toNumber(stats?.total_jobs);
  const appStoreJobs = toNumber(stats?.app_store_jobs);
  const dueJobs = toNumber(stats?.due_jobs);
  const latestRunAge = hoursSince(latestRun?.started_at);
  const latestRunStatus: HealthStatus =
    latestRun?.status === "failed"
      ? "critical"
      : latestRunAge !== null && latestRunAge > 36
        ? "warning"
        : totalJobs > 0
          ? "ok"
          : "warning";
  const sectionStatus = worstStatus([
    totalJobs > 0 ? "ok" : "warning",
    appStoreJobs > 0 ? "ok" : "warning",
    latestRun ? latestRunStatus : "warning",
  ]);

  return {
    title: "采集任务",
    description: "检查 App Store 采集任务和最近一次执行记录。",
    status: sectionStatus,
    metrics: [
      {
        label: "任务总数",
        value: String(totalJobs),
        helper: `启用 ${toNumber(stats?.active_jobs)} 个，暂停 ${toNumber(stats?.paused_jobs)} 个`,
        status: totalJobs > 0 ? "ok" : "warning",
      },
      {
        label: "App Store 任务",
        value: String(appStoreJobs),
        helper: `AI 价格任务 ${toNumber(stats?.ai_pricing_jobs)} 个；到期待跑 ${dueJobs} 个`,
        status: appStoreJobs > 0 ? "ok" : "warning",
      },
      {
        label: "最近采集",
        value: latestRun ? ageLabel(latestRun.started_at) : "无执行记录",
        helper: latestRun
          ? `${latestRun.collector_kind || "collector"} · ${latestRun.status || "unknown"} · ${latestRun.error_message || latestRun.output_excerpt || "无摘要"}`
          : "请运行一次采集任务确认执行器可用。",
        status: latestRun ? latestRunStatus : "warning",
      },
    ],
  };
}

async function getReviewSection(issues: string[]): Promise<HealthSection> {
  const reviewRows = await safeQuery(
    () =>
      prisma.$queryRaw<ReviewStatsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM price_observations WHERE status = 'pending'::observation_status) AS pending_observations,
          (SELECT COUNT(*)::int FROM price_observations WHERE status = 'pending'::observation_status AND COALESCE(anomaly_flag, FALSE)) AS pending_anomalies,
          (SELECT MAX(observed_at) FROM price_observations) AS latest_observed_at,
          (SELECT COUNT(*)::int FROM region_prices WHERE status = 'published'::publish_status) AS published_prices,
          (SELECT MAX(last_checked_at) FROM region_prices WHERE status = 'published'::publish_status) AS latest_price_checked_at
      `,
    [] as ReviewStatsRow[],
    issues,
    "无法读取价格审核和正式价格状态。",
  );

  const autoReviewRows = await safeQuery(
    () =>
      prisma.$queryRaw<AutoReviewRunRow[]>`
        SELECT
          status,
          dry_run,
          started_at,
          completed_at,
          checked_groups,
          auto_approved_count,
          manual_review_count,
          error_message
        FROM price_auto_review_runs
        ORDER BY started_at DESC
        LIMIT 1
      `,
    [] as AutoReviewRunRow[],
    issues,
    "无法读取自动审核执行记录。",
  );

  const row = reviewRows[0];
  const latestAutoReview = autoReviewRows[0];
  const pendingCount = toNumber(row?.pending_observations);
  const anomalyCount = toNumber(row?.pending_anomalies);
  const publishedCount = toNumber(row?.published_prices);
  const latestPriceAge = hoursSince(row?.latest_price_checked_at);
  const autoReviewStatus: HealthStatus =
    latestAutoReview?.status === "failed"
      ? "critical"
      : latestAutoReview
        ? "ok"
        : "warning";
  const priceFreshnessStatus: HealthStatus =
    latestPriceAge === null ? "warning" : latestPriceAge > 72 ? "warning" : "ok";
  const pendingStatus: HealthStatus =
    pendingCount > 800 ? "critical" : pendingCount > 300 ? "warning" : "ok";

  return {
    title: "价格审核",
    description: "检查待审核队列、正式价新鲜度和最近一次自动审核。",
    status: worstStatus([
      pendingStatus,
      anomalyCount > 0 ? "warning" : "ok",
      publishedCount > 0 ? priceFreshnessStatus : "warning",
      autoReviewStatus,
    ]),
    metrics: [
      {
        label: "待审核观测",
        value: String(pendingCount),
        helper: `其中异常 ${anomalyCount} 条`,
        status: pendingStatus,
      },
      {
        label: "正式价格",
        value: String(publishedCount),
        helper: `最近更新：${ageLabel(row?.latest_price_checked_at)}`,
        status: publishedCount > 0 ? priceFreshnessStatus : "warning",
      },
      {
        label: "自动审核",
        value: latestAutoReview?.status || "无记录",
        helper: latestAutoReview
          ? `检查 ${toNumber(latestAutoReview.checked_groups)} 组，自动通过 ${toNumber(latestAutoReview.auto_approved_count)}，转人工 ${toNumber(latestAutoReview.manual_review_count)}`
          : "请先运行一次自动审核。",
        status: autoReviewStatus,
      },
    ],
  };
}

async function getContentSection(issues: string[]): Promise<HealthSection> {
  const rows = await safeQuery(
    () =>
      prisma.$queryRaw<ContentStatsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM products WHERE status = 'published'::publish_status) AS published_products,
          (SELECT COUNT(*)::int FROM products WHERE status = 'review'::publish_status) AS review_products,
          (SELECT COUNT(*)::int FROM plans WHERE status = 'published'::publish_status) AS published_plans,
          (SELECT COUNT(*)::int FROM articles WHERE status = 'published'::article_status AND deleted_at IS NULL) AS published_articles,
          (SELECT COUNT(*)::int FROM navigation_items WHERE status = 'published'::publish_status) AS enabled_navigation_items
      `,
    [] as ContentStatsRow[],
    issues,
    "无法读取产品、文章或导航状态。",
  );

  const row = rows[0];
  const publishedProducts = toNumber(row?.published_products);
  const publishedPlans = toNumber(row?.published_plans);
  const navItems = toNumber(row?.enabled_navigation_items);

  return {
    title: "前台内容",
    description: "检查前台可展示的产品、套餐、文章和导航基础状态。",
    status: worstStatus([
      publishedProducts > 0 ? "ok" : "warning",
      publishedPlans > 0 ? "ok" : "warning",
      navItems > 0 ? "ok" : "warning",
    ]),
    metrics: [
      {
        label: "已上架产品",
        value: String(publishedProducts),
        helper: `待审核产品 ${toNumber(row?.review_products)} 个`,
        status: publishedProducts > 0 ? "ok" : "warning",
      },
      {
        label: "已上架套餐",
        value: String(publishedPlans),
        helper: "详情页和价格页依赖套餐状态。",
        status: publishedPlans > 0 ? "ok" : "warning",
      },
      {
        label: "内容与导航",
        value: `${toNumber(row?.published_articles)} / ${navItems}`,
        helper: "已发布文章 / 已启用导航项",
        status: navItems > 0 ? "ok" : "warning",
      },
    ],
  };
}

function getEnvironmentSection(): HealthSection {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const siteUrlStatus = getSiteUrlStatus(siteUrl);
  const databaseUrlStatus: HealthStatus = process.env.DATABASE_URL ? "ok" : "critical";

  return {
    title: "运行环境",
    description: "检查部署域名、运行模式和数据库连接字符串是否符合当前站点。",
    status: worstStatus([siteUrlStatus, databaseUrlStatus]),
    metrics: [
      {
        label: "站点地址",
        value: siteUrl || "未配置",
        helper: "正式站应使用 https://geosub.org",
        status: siteUrlStatus,
      },
      {
        label: "运行模式",
        value: process.env.NODE_ENV || "development",
        helper: "本地开发通常为 development，服务器构建为 production。",
        status: "ok",
      },
      {
        label: "数据库目标",
        value: getDatabaseTarget(),
        helper: "只显示主机和库名，不展示密码。",
        status: databaseUrlStatus,
      },
    ],
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const issues: string[] = [];
  const checkedAt = new Date().toISOString();

  let databaseSection: HealthSection;

  try {
    const rows = await prisma.$queryRaw<DatabasePingRow[]>`
      SELECT
        NOW() AS checked_at,
        current_database() AS database_name,
        current_schema() AS schema_name
    `;
    const row = rows[0];

    databaseSection = {
      title: "数据库连接",
      description: "检查后台能否连接 PostgreSQL。",
      status: "ok",
      metrics: [
        {
          label: "连接状态",
          value: "已连接",
          helper: row ? `${row.database_name} · schema ${row.schema_name}` : "PostgreSQL 已响应。",
          status: "ok",
        },
        {
          label: "检查时间",
          value: formatDateTime(row?.checked_at || checkedAt),
          helper: "以上海时区显示。",
          status: "ok",
        },
      ],
    };
  } catch {
    issues.push("数据库连接失败。请检查 PostgreSQL、DATABASE_URL 和网络连通性。");

    const environmentSection = getEnvironmentSection();
    const sections = [
      {
        title: "数据库连接",
        description: "检查后台能否连接 PostgreSQL。",
        status: "critical" as const,
        metrics: [
          {
            label: "连接状态",
            value: "连接失败",
            helper: "数据库不可用时，价格页、后台列表、采集和统计都会受影响。",
            status: "critical" as const,
          },
          {
            label: "数据库目标",
            value: getDatabaseTarget(),
            helper: "请确认本地或服务器数据库已启动。",
            status: "critical" as const,
          },
        ],
      },
      environmentSection,
    ];

    return {
      checkedAt,
      summary: {
        status: "critical",
        label: statusLabel("critical"),
        issueCount: issues.length,
      },
      sections,
      issues,
    };
  }

  const environmentSection = getEnvironmentSection();
  const [exchangeSection, collectorSection, reviewSection, contentSection] = await Promise.all([
    getExchangeSection(issues),
    getCollectorSection(issues),
    getReviewSection(issues),
    getContentSection(issues),
  ]);
  const sections = [
    databaseSection,
    environmentSection,
    exchangeSection,
    collectorSection,
    reviewSection,
    contentSection,
  ];
  const summaryStatus = worstStatus(sections.map((section) => section.status));

  return {
    checkedAt,
    summary: {
      status: summaryStatus,
      label: statusLabel(summaryStatus),
      issueCount: issues.length + sections.filter((section) => section.status !== "ok").length,
    },
    sections,
    issues,
  };
}
