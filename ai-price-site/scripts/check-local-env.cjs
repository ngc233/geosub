#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const rootDir = process.cwd();

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const warnings = [];
const criticals = [];

function maskDatabaseTarget(url) {
  if (!url) return "未配置";

  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "") || "postgres";
    return `${parsed.hostname}:${parsed.port || "5432"}/${database}`;
  } catch {
    return "DATABASE_URL 格式无法解析";
  }
}

function printRow(label, value, status = "ok") {
  const marker = status === "ok" ? "OK" : status === "warning" ? "WARN" : "FAIL";
  console.log(`${marker.padEnd(5)} ${label.padEnd(16)} ${value}`);
}

async function tableExists(client, tableName) {
  const result = await client.query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

async function safeCount(client, tableName, label) {
  if (!(await tableExists(client, tableName))) {
    warnings.push(`${label} 表不存在：${tableName}`);
    printRow(label, "表不存在", "warning");
    return;
  }

  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  printRow(label, `${result.rows[0]?.count ?? 0} 条`);
}

function hoursSince(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / 36e5);
}

function formatDate(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

async function checkExchangeRates(client) {
  if (!(await tableExists(client, "exchange_rates"))) {
    warnings.push("汇率表不存在：exchange_rates");
    printRow("汇率", "表不存在", "warning");
    return;
  }

  const result = await client.query(`
    SELECT quote_currency, rate, rate_date, fetched_at
    FROM exchange_rates
    WHERE base_currency = 'USD' AND quote_currency IN ('CNY', 'USD')
    ORDER BY fetched_at DESC NULLS LAST, rate_date DESC NULLS LAST
    LIMIT 3
  `);

  if (result.rowCount === 0) {
    warnings.push("没有找到 USD 汇率记录，人民币切换会不可用或只能显示美元。");
    printRow("汇率", "没有 USD 汇率记录", "warning");
    return;
  }

  const cny = result.rows.find((row) => row.quote_currency === "CNY");
  const latest = cny || result.rows[0];
  const age = hoursSince(latest.fetched_at || latest.rate_date);
  const stale = age === null || age > 18;

  if (stale) {
    warnings.push("USD/CNY 汇率超过 18 小时没有刷新。");
  }

  printRow(
    "汇率",
    `${latest.quote_currency} ${Number(latest.rate).toFixed(4)}，更新时间 ${formatDate(
      latest.fetched_at || latest.rate_date
    )}`,
    stale ? "warning" : "ok"
  );
}

async function checkCollector(client) {
  if (!(await tableExists(client, "collector_jobs"))) {
    warnings.push("采集任务表不存在：collector_jobs");
    printRow("采集任务", "表不存在", "warning");
    return;
  }

  const jobs = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE next_run_at IS NOT NULL AND next_run_at <= now())::int AS due
    FROM collector_jobs
  `);
  const row = jobs.rows[0];
  printRow("采集任务", `总计 ${row.total}，启用 ${row.active}，到期 ${row.due}`);

  if (await tableExists(client, "collector_job_runs")) {
    const runs = await client.query(`
      SELECT status, started_at, error_message
      FROM collector_job_runs
      ORDER BY started_at DESC NULLS LAST
      LIMIT 1
    `);
    const latest = runs.rows[0];
    if (latest) {
      const status = latest.status === "succeeded" ? "ok" : "warning";
      if (status === "warning") {
        warnings.push(`最近一次采集状态为 ${latest.status || "未知"}。`);
      }
      printRow(
        "最近采集",
        `${latest.status || "未知"}，开始 ${formatDate(latest.started_at)}${
          latest.error_message ? `，错误：${latest.error_message.slice(0, 80)}` : ""
        }`,
        status
      );
    } else {
      warnings.push("还没有采集运行记录。");
      printRow("最近采集", "暂无运行记录", "warning");
    }
  } else {
    warnings.push("采集运行表不存在：collector_job_runs");
    printRow("最近采集", "运行表不存在", "warning");
  }
}

async function checkReview(client) {
  if (await tableExists(client, "price_observations")) {
    const observations = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND anomaly_flag IS NOT NULL)::int AS anomalies,
        MAX(observed_at) AS latest_observed_at
      FROM price_observations
    `);
    const row = observations.rows[0];
    printRow(
      "待审核价格",
      `待处理 ${row.pending}，异常 ${row.anomalies}，最新 ${formatDate(row.latest_observed_at)}`
    );
  } else {
    warnings.push("价格观测表不存在：price_observations");
    printRow("待审核价格", "表不存在", "warning");
  }

  if (await tableExists(client, "region_prices")) {
    const published = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        MAX(last_checked_at) AS latest_checked_at
      FROM region_prices
    `);
    const row = published.rows[0];
    printRow(
      "正式价格",
      `已上线 ${row.published}，最近核验 ${formatDate(row.latest_checked_at)}`
    );
  }
}

async function main() {
  console.log("GeoSub 本地环境检查");
  console.log(`目标数据库：${maskDatabaseTarget(databaseUrl)}`);
  console.log("");

  if (!databaseUrl) {
    criticals.push("没有配置 DATABASE_URL。");
    printRow("数据库", "DATABASE_URL 未配置", "critical");
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const ping = await client.query(
      "SELECT current_database() AS database_name, current_schema() AS schema_name, now() AS checked_at"
    );
    printRow(
      "数据库",
      `${ping.rows[0].database_name} / ${ping.rows[0].schema_name}，${formatDate(
        ping.rows[0].checked_at
      )}`
    );

    await safeCount(client, "products", "产品");
    await safeCount(client, "plans", "套餐");
    await safeCount(client, "countries", "地区");
    await checkExchangeRates(client);
    await checkCollector(client);
    await checkReview(client);
  } catch (error) {
    criticals.push(error instanceof Error ? error.message : String(error));
    printRow("数据库", "连接失败", "critical");
    console.error("");
    console.error(error);
  } finally {
    await client.end().catch(() => undefined);
  }

  console.log("");
  if (criticals.length > 0) {
    console.log(`结果：需要处理 ${criticals.length} 个严重问题。`);
    process.exitCode = 1;
  } else if (warnings.length > 0) {
    console.log(`结果：可以运行，但有 ${warnings.length} 个提醒。`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  } else {
    console.log("结果：核心环境正常。");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
