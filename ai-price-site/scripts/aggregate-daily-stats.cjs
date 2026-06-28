require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));

  if (!found) {
    return fallback;
  }

  const value = found.slice(prefix.length);
  return value || fallback;
}

function toDateOnlyString(date) {
  return date.toISOString().slice(0, 10);
}

function getUtcDateOnly(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDateRange(days) {
  const todayUtc = getUtcDateOnly(new Date());

  const end = new Date(todayUtc);
  end.setUTCDate(end.getUTCDate() + 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);

  return {
    start,
    end,
  };
}

function buildDayList(start, end) {
  const days = [];
  const current = new Date(start);

  while (current < end) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

async function upsertDailyStat({
  statDate,
  metricKey,
  metricValue,
  dimensionType = "global",
  dimensionKey = "global",
  label = null,
  metadata = undefined,
}) {
  await prisma.dailyStat.upsert({
    where: {
      statDate_metricKey_dimensionType_dimensionKey: {
        statDate,
        metricKey,
        dimensionType,
        dimensionKey,
      },
    },
    update: {
      metricValue,
      label,
      metadata,
    },
    create: {
      statDate,
      metricKey,
      metricValue,
      dimensionType,
      dimensionKey,
      label,
      metadata,
    },
  });
}

async function main() {
  const daysArg = Number(getArgValue("days", "90"));
  const days = Number.isFinite(daysArg) && daysArg > 0 ? Math.min(daysArg, 730) : 90;

  const { start, end } = getDateRange(days);

  console.log("Aggregating daily stats by UTC date...");
  console.log("Days:", days);
  console.log("Start UTC:", toDateOnlyString(start));
  console.log("End exclusive UTC:", toDateOnlyString(end));

  const rows = await prisma.$queryRaw`
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS stat_date,
      COUNT(*) FILTER (WHERE event_key = 'page_view')::int AS page_views,
      COUNT(*) FILTER (WHERE event_key LIKE 'click_%')::int AS click_events,
      COUNT(*) FILTER (WHERE event_key = 'click_affiliate')::int AS click_affiliate,
      COUNT(*) FILTER (WHERE event_key = 'click_official')::int AS click_official,
      COUNT(*) FILTER (WHERE event_key = 'click_button')::int AS click_button,
      COUNT(*) FILTER (WHERE event_key = 'click_ad')::int AS click_ad,
      COUNT(*) FILTER (WHERE event_key = 'search_digital_service')::int AS search_digital_service
    FROM event_logs
    WHERE created_at >= ${start}
      AND created_at < ${end}
      AND NOT (
        page_path LIKE '/zh/tracking-test%'
        OR source IN ('manual_test', 'affiliate_test')
        OR event_key = 'test_event'
      )
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
    ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC
  `;

  const rowMap = new Map();

  for (const row of rows) {
    const key = toDateOnlyString(new Date(row.stat_date));
    rowMap.set(key, row);
  }

  const metricLabels = {
    page_views: "访问量",
    click_events: "点击事件",
    click_affiliate: "Affiliate 点击",
    click_official: "官方入口点击",
    click_button: "按钮点击",
    click_ad: "广告点击",
    search_digital_service: "数字服务搜索",
  };

  const allDays = buildDayList(start, end);
  let writeCount = 0;

  for (const day of allDays) {
    const key = toDateOnlyString(day);
    const row = rowMap.get(key);

    const metrics = {
      page_views: row ? Number(row.page_views || 0) : 0,
      click_events: row ? Number(row.click_events || 0) : 0,
      click_affiliate: row ? Number(row.click_affiliate || 0) : 0,
      click_official: row ? Number(row.click_official || 0) : 0,
      click_button: row ? Number(row.click_button || 0) : 0,
      click_ad: row ? Number(row.click_ad || 0) : 0,
      search_digital_service: row ? Number(row.search_digital_service || 0) : 0,
    };

    for (const [metricKey, metricValue] of Object.entries(metrics)) {
      await upsertDailyStat({
        statDate: day,
        metricKey,
        metricValue,
        label: metricLabels[metricKey],
        metadata: {
          generatedBy: "aggregate-daily-stats",
          sourceTable: "event_logs",
          timezone: "UTC",
          date: key,
        },
      });

      writeCount += 1;
    }
  }

  console.log("Rows from event_logs:", rows.length);
  console.log("daily_stats upserted:", writeCount);
  console.log("Aggregation completed.");
}

main()
  .catch((error) => {
    console.error("Aggregation failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
