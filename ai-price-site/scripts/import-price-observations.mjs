import fs from "node:fs";
import path from "node:path";

const csvPath = path.join(
  process.cwd(),
  "data",
  "observations",
  "chatgpt-ios-observations.csv",
);

const outputSqlPath = path.join(
  process.cwd(),
  "tmp",
  "import-price-observations.sql",
);

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cells[index]?.trim() ?? "";
    });

    return row;
  });
}

function nullableText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function nullableNumber(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const number = Number(text.replaceAll(",", ""));

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function requiredText(row, field) {
  const value = nullableText(row[field]);

  if (!value) {
    throw new Error(`Missing required field: ${field}`);
  }

  return value;
}

function sqlText(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "NULL";
  }

  return String(value);
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function makeObservationKey({
  productSlug,
  planSlug,
  countryCode,
  billingPlatform,
  sourceLevel,
  rawPrice,
  currency,
  convertedUsd,
  observedPriceText,
  priceType,
}) {
  return [
    productSlug,
    planSlug,
    countryCode,
    billingPlatform,
    sourceLevel,
    rawPrice ?? "",
    currency ?? "",
    convertedUsd ?? "",
    observedPriceText ?? "",
    priceType,
  ].join("|");
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  fs.mkdirSync(path.dirname(outputSqlPath), { recursive: true });

  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));

  let candidateRows = 0;
  let skippedEmptyRows = 0;

  const statements = [
    "BEGIN;",
  ];

  for (const row of rows) {
    const rawPrice = nullableNumber(row.raw_price);
    const currency = nullableText(row.currency);
    const convertedUsd = nullableNumber(row.converted_usd);
    const observedPriceText = nullableText(row.observed_price_text);

    if (!rawPrice && !currency && !convertedUsd && !observedPriceText) {
      skippedEmptyRows += 1;
      continue;
    }

    const productSlug = requiredText(row, "product_slug");
    const planSlug = requiredText(row, "plan_slug");
    const countryCode = requiredText(row, "country_code").toUpperCase();

    const billingPlatform = requiredText(row, "billing_platform");
    const sourceLevel = nullableText(row.source_level) || "A";
    const priceType = nullableText(row.price_type) || "list_price";
    const taxIncluded = nullableText(row.tax_included) || "unknown";
    const confidenceScore = nullableNumber(row.confidence_score) ?? 80;
    const sourceUrl = nullableText(row.source_url);

    const observationKey = makeObservationKey({
      productSlug,
      planSlug,
      countryCode,
      billingPlatform,
      sourceLevel,
      rawPrice,
      currency,
      convertedUsd,
      observedPriceText,
      priceType,
    });

    const rawPayload = {
      importer: "import-price-observations.mjs",
      observation_key: observationKey,
      observed_price_text: observedPriceText,
      review_note: nullableText(row.review_note),
      screenshot_url: nullableText(row.screenshot_url),
    };

    statements.push(`
WITH resolved AS (
  SELECT
    (SELECT id FROM products WHERE slug = ${sqlText(productSlug)} LIMIT 1) AS product_id,
    (
      SELECT pl.id
      FROM plans pl
      JOIN products p ON p.id = pl.product_id
      WHERE p.slug = ${sqlText(productSlug)}
        AND pl.slug = ${sqlText(planSlug)}
      LIMIT 1
    ) AS plan_id,
    (SELECT id FROM countries WHERE UPPER(code) = ${sqlText(countryCode)} LIMIT 1) AS country_id
)
INSERT INTO price_observations (
  id,
  product_id,
  plan_id,
  country_id,
  source_level,
  raw_price,
  currency,
  converted_usd,
  observed_at,
  source_url,
  locale,
  ip_country,
  billing_platform,
  price_type,
  tax_included,
  raw_payload,
  parser_version,
  confidence_score,
  anomaly_flag,
  anomaly_reason,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  resolved.product_id,
  resolved.plan_id,
  resolved.country_id,
  ${sqlText(sourceLevel)}::source_level,
  ${sqlNumber(rawPrice)},
  ${sqlText(currency)},
  ${sqlNumber(convertedUsd)},
  NOW(),
  ${sqlText(sourceUrl)},
  ${sqlText(countryCode.toLowerCase())},
  ${sqlText(countryCode)},
  ${sqlText(billingPlatform)}::billing_platform,
  ${sqlText(priceType)}::price_type,
  ${sqlText(taxIncluded)}::tax_included,
  ${sqlJson(rawPayload)},
  'manual-app-store-v1',
  ${sqlNumber(confidenceScore)},
  FALSE,
  NULL,
  'pending'::observation_status,
  NOW(),
  NOW()
FROM resolved
WHERE resolved.product_id IS NOT NULL
  AND resolved.plan_id IS NOT NULL
  AND resolved.country_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM price_observations po
    WHERE po.product_id = resolved.product_id
      AND po.plan_id = resolved.plan_id
      AND po.country_id = resolved.country_id
      AND po.billing_platform = ${sqlText(billingPlatform)}::billing_platform
      AND po.price_type = ${sqlText(priceType)}::price_type
      AND po.source_level = ${sqlText(sourceLevel)}::source_level
      AND po.raw_price IS NOT DISTINCT FROM ${sqlNumber(rawPrice)}
      AND po.currency IS NOT DISTINCT FROM ${sqlText(currency)}
      AND po.converted_usd IS NOT DISTINCT FROM ${sqlNumber(convertedUsd)}
      AND COALESCE(po.raw_payload ->> 'observed_price_text', '') = COALESCE(${sqlText(observedPriceText)}, '')
  );
`.trim());

    candidateRows += 1;
    console.log(`[SQL] candidate ${productSlug}/${planSlug} ${countryCode} ${observedPriceText || rawPrice || ""}`);
  }

  statements.push("COMMIT;");

  fs.writeFileSync(outputSqlPath, statements.join("\n\n"), "utf8");

  console.log("");
  console.log(`[OK] SQL generated: ${outputSqlPath}`);
  console.log(`Candidate rows: ${candidateRows}`);
  console.log(`Skipped empty rows: ${skippedEmptyRows}`);
  console.log("");
  console.log("Duplicate rows will be ignored by SQL NOT EXISTS.");
  console.log("");
  console.log("Next:");
  console.log("docker cp .\\tmp\\import-price-observations.sql geosub-postgres:/tmp/import-price-observations.sql");
  console.log("docker exec -it geosub-postgres psql -U geosub_admin -d geosub_app -f /tmp/import-price-observations.sql");
}

main();