require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const apply = process.argv.includes("--apply");
const configuredDays = Number(process.env.GEOSUB_EVENT_RETENTION_DAYS || "180");
const retentionDays = Number.isFinite(configuredDays)
  ? Math.min(Math.max(Math.trunc(configuredDays), 30), 730)
  : 180;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function getSummary() {
  const rows = await prisma.$queryRawUnsafe(`
    WITH event_days AS (
      SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS event_date
      FROM event_logs
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    ),
    covered_days AS (
      SELECT stat_date
      FROM daily_stats
      WHERE metric_key IN ('page_views', 'click_events')
        AND metadata ->> 'generatedBy' = 'aggregate-daily-stats'
      GROUP BY stat_date
      HAVING COUNT(DISTINCT metric_key) = 2
    )
    SELECT
      (SELECT COUNT(*)::int FROM event_logs WHERE created_at < NOW() - INTERVAL '${retentionDays} days') AS expired_events,
      (SELECT COUNT(*)::int FROM event_days) AS expired_days,
      (SELECT COUNT(*)::int FROM event_days JOIN covered_days ON covered_days.stat_date = event_days.event_date) AS covered_days
  `);

  return rows[0] || {
    expired_events: 0,
    expired_days: 0,
    covered_days: 0,
  };
}

async function main() {
  const before = await getSummary();
  console.log(`Retention window: ${retentionDays} days`);
  console.log(`Expired raw events: ${Number(before.expired_events || 0)}`);
  console.log(
    `Aggregated expired days: ${Number(before.covered_days || 0)}/${Number(before.expired_days || 0)}`
  );

  if (!apply) {
    console.log("Dry run only. Pass --apply to delete events on aggregated days.");
    return;
  }

  const deleted = await prisma.$executeRawUnsafe(`
    DELETE FROM event_logs event
    WHERE event.created_at < NOW() - INTERVAL '${retentionDays} days'
      AND EXISTS (
        SELECT 1
        FROM daily_stats page_views
        WHERE page_views.stat_date = (event.created_at AT TIME ZONE 'UTC')::date
          AND page_views.metric_key = 'page_views'
          AND page_views.metadata ->> 'generatedBy' = 'aggregate-daily-stats'
      )
      AND EXISTS (
        SELECT 1
        FROM daily_stats click_events
        WHERE click_events.stat_date = (event.created_at AT TIME ZONE 'UTC')::date
          AND click_events.metric_key = 'click_events'
          AND click_events.metadata ->> 'generatedBy' = 'aggregate-daily-stats'
      )
  `);

  await prisma.adminSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  await prisma.adminLoginAttempt.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  console.log(`Deleted raw events: ${deleted}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
