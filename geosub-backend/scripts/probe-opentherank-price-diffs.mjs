#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const productConfigs = [
  {
    product: "chatgpt",
    url: "https://opentherank.com/ai-pricing/chatgpt/",
    columns: [
      { index: 0, plan: "plus", label: "ChatGPT Plus" },
      { index: 1, plan: "pro", label: "ChatGPT Pro 20x" },
    ],
  },
  {
    product: "claude",
    url: "https://opentherank.com/ai-pricing/claude/",
    columns: [
      { index: 0, plan: "pro", label: "Claude Pro" },
      { index: 1, plan: "max-5x", label: "Claude Max 5x" },
    ],
  },
  {
    product: "gemini",
    url: "https://opentherank.com/ai-pricing/gemini/",
    columns: [{ index: 0, plan: "pro", label: "Google AI Pro" }],
  },
];

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const containerName = args.get("--container") ?? "geosub-postgres";
const dbName = args.get("--db") ?? "geosub_app";
const dbUser = args.get("--user") ?? "geosub_admin";
const productFilter = args.get("--product");

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  const matches = String(value ?? "")
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/g);
  return matches ? Number(matches[matches.length - 1]) : null;
}

function normalizeCountry(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^turkey$/, "turkiye")
    .replace(/^united states of america$/, "united states")
    .replace(/^czech republic$/, "czechia")
    .replace(/^uae$/, "united arab emirates");
}

function parseCompetitorRows(html) {
  const rows = [...html.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  const parsedRows = [];

  for (const row of rows) {
    if (!row.includes("ctl-td-region")) continue;

    const country = stripHtml(
      row.match(/ctl-td-region[\s\S]*?<span class="font-medium[^>]*>([\s\S]*?)<\/span>/)?.[1],
    );
    const pricePairs = [
      ...row.matchAll(
        /ctl-pill[^>]*>\s*\$([\s\S]*?)<\/span>[\s\S]*?ctl-local[^>]*>\s*≈\s*([\s\S]*?)\/mo\s*<\/span>/g,
      ),
    ].map((match) => ({
      usd: parseNumber(stripHtml(match[1])),
      localText: stripHtml(match[2]),
      local: parseNumber(stripHtml(match[2])),
    }));

    if (country && pricePairs.length > 0) {
      parsedRows.push({
        country,
        countryKey: normalizeCountry(country),
        pricePairs,
      });
    }
  }

  return parsedRows;
}

function loadPublishedPrices() {
  const sql = `
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT
        product.slug AS product,
        plan.slug AS plan,
        country.code,
        country.name_en AS country,
        region_price.currency,
        region_price.local_price::float AS local_price,
        region_price.price_usd::float AS price_usd,
        to_char(region_price.last_checked_at, 'YYYY-MM-DD HH24:MI:SS') AS checked_at,
        region_price.source_summary,
        region_price.confidence_score
      FROM region_prices region_price
      JOIN products product ON product.id = region_price.product_id
      JOIN plans plan ON plan.id = region_price.plan_id
      JOIN countries country ON country.id = region_price.country_id
      WHERE region_price.status = 'published'::publish_status
        AND product.slug IN ('chatgpt', 'claude', 'gemini')
      ORDER BY product.slug, plan.slug, country.name_en
    ) t;
  `;

  const raw = execFileSync(
    "docker",
    ["exec", containerName, "psql", "-U", dbUser, "-d", dbName, "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  ).trim();

  return JSON.parse(raw || "[]");
}

function isDifferent(competitor, ours) {
  const localDiff = competitor.local != null ? competitor.local - ours.local_price : null;
  const usdDiff = competitor.usd != null ? competitor.usd - ours.price_usd : null;
  const localBad =
    localDiff != null && Math.abs(localDiff) > Math.max(0.02, Math.abs(ours.local_price) * 0.005);
  const usdBad =
    usdDiff != null && Math.abs(usdDiff) > Math.max(0.2, Math.abs(ours.price_usd) * 0.02);

  return { localDiff, usdDiff, localBad, usdBad };
}

const publishedPrices = loadPublishedPrices();
const publishedByKey = new Map(
  publishedPrices.map((price) => [
    `${price.product}:${price.plan}:${normalizeCountry(price.country)}`,
    price,
  ]),
);

const reports = [];

for (const config of productConfigs) {
  if (productFilter && config.product !== productFilter) continue;

  const response = await fetch(config.url);
  if (!response.ok) {
    reports.push({
      product: config.product,
      issue: "competitor_fetch_failed",
      detail: `${response.status} ${response.statusText}`,
    });
    continue;
  }

  const rows = parseCompetitorRows(await response.text());

  for (const column of config.columns) {
    let matched = 0;
    const diffs = [];

    for (const row of rows) {
      const competitorPrice = row.pricePairs[column.index];
      if (!competitorPrice) continue;

      const ours = publishedByKey.get(`${config.product}:${column.plan}:${row.countryKey}`);
      if (!ours) {
        diffs.push({
          type: "missing_published_price",
          country: row.country,
          competitor: `${competitorPrice.localText} / $${competitorPrice.usd}`,
        });
        continue;
      }

      matched += 1;
      const diff = isDifferent(competitorPrice, ours);
      if (diff.localBad || diff.usdBad) {
        diffs.push({
          type: diff.localBad ? "local_price_diff" : "fx_only_diff",
          country: row.country,
          ours: `${ours.currency} ${ours.local_price} / $${ours.price_usd.toFixed(2)}`,
          competitor: `${competitorPrice.localText} / $${competitorPrice.usd}`,
          localDiff: diff.localDiff == null ? null : Number(diff.localDiff.toFixed(2)),
          usdDiff: diff.usdDiff == null ? null : Number(diff.usdDiff.toFixed(2)),
          checkedAt: ours.checked_at,
          sourceSummary: ours.source_summary,
        });
      }
    }

    reports.push({
      product: config.product,
      plan: column.plan,
      label: column.label,
      competitorUrl: config.url,
      matched,
      diffCount: diffs.length,
      warning:
        "OpenTheRank is an external probe only. Differences should trigger official-source re-collection, not direct overwrite.",
      diffs,
    });
  }
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
