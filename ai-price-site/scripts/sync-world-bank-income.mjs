import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONTAINER = process.env.GEOSUB_DB_CONTAINER || "geosub-postgres";
const PGUSER = process.env.GEOSUB_DB_USER || "geosub_admin";
const PGDATABASE = process.env.GEOSUB_DB_NAME || "geosub_app";
const REQUEST_TIMEOUT_MS = Number(process.env.WORLD_BANK_TIMEOUT_MS || 12000);

const INDICATORS = [
  {
    metricType: "GNI_PPP",
    indicatorCode: "NY.GNP.PCAP.PP.CD",
  },
  {
    metricType: "GNI_ATLAS",
    indicatorCode: "NY.GNP.PCAP.CD",
  },
  {
    metricType: "GDP_NOMINAL",
    indicatorCode: "NY.GDP.PCAP.CD",
  },
];

const ISO2_TO_ISO3 = {
  US: "USA",
  CA: "CAN",
  MX: "MEX",
  BR: "BRA",
  AR: "ARG",
  CL: "CHL",
  CO: "COL",
  PE: "PER",

  GB: "GBR",
  UK: "GBR",
  IE: "IRL",
  FR: "FRA",
  DE: "DEU",
  ES: "ESP",
  IT: "ITA",
  NL: "NLD",
  BE: "BEL",
  CH: "CHE",
  AT: "AUT",
  DK: "DNK",
  SE: "SWE",
  NO: "NOR",
  FI: "FIN",
  PL: "POL",
  PT: "PRT",
  TR: "TUR",

  JP: "JPN",
  KR: "KOR",
  CN: "CHN",
  TW: "TWN",
  HK: "HKG",
  SG: "SGP",
  MY: "MYS",
  TH: "THA",
  VN: "VNM",
  ID: "IDN",
  PH: "PHL",
  IN: "IND",
  PK: "PAK",

  AU: "AUS",
  NZ: "NZL",

  EG: "EGY",
  ZA: "ZAF",
  NG: "NGA",
  KE: "KEN",

  SA: "SAU",
  AE: "ARE",
  IL: "ISR",
};

function runPsql(args) {
  return execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", PGUSER, "-d", PGDATABASE, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "NULL";
  return String(Math.round(value * 100) / 100);
}

async function fetchLatestIndicator({ iso3, indicatorCode }) {
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicatorCode}?format=json&per_page=80`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`World Bank API timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`World Bank API error ${response.status} for ${iso3} ${indicatorCode}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload[1] || [] : [];

  const validRows = rows
    .filter((row) => row && row.value !== null && row.value !== undefined)
    .map((row) => ({
      year: Number(row.date),
      value: Number(row.value),
      sourceUrl: url,
    }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value) && row.value > 0)
    .sort((a, b) => b.year - a.year);

  return validRows[0] || null;
}

async function fetchIndicatorSnapshot(indicatorCode) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=20000`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`World Bank bulk API timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`World Bank bulk API error ${response.status} for ${indicatorCode}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload[1] || [] : [];
  const latestByIso3 = new Map();

  for (const row of rows) {
    const iso3 = String(row?.countryiso3code || "").toUpperCase();
    const year = Number(row?.date);
    const value = Number(row?.value);
    if (!iso3 || !Number.isFinite(year) || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    const existing = latestByIso3.get(iso3);
    if (!existing || year > existing.year) {
      latestByIso3.set(iso3, {
        year,
        value,
        sourceUrl: url,
      });
    }
  }

  return latestByIso3;
}

function getCountriesFromDb() {
  const output = runPsql([
    "-At",
    "-F",
    "|",
    "-c",
    "SELECT UPPER(code), UPPER(COALESCE(iso3, '')) FROM countries WHERE code IS NOT NULL ORDER BY 1;",
  ]);

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [countryCode, existingIso3] = line.split("|");
      return {
        countryCode,
        iso3: existingIso3 || ISO2_TO_ISO3[countryCode] || null,
      };
    })
    .filter((item) => item.countryCode && item.iso3);
}

async function main() {
  mkdirSync("tmp", { recursive: true });

  const countries = getCountriesFromDb();

  if (countries.length === 0) {
    throw new Error("No countries with ISO3 mapping found. Check countries.code and countries.iso3.");
  }

  const indicatorSnapshots = new Map();
  for (const indicator of INDICATORS) {
    try {
      const snapshot = await fetchIndicatorSnapshot(indicator.indicatorCode);
      indicatorSnapshots.set(indicator.indicatorCode, snapshot);
      console.log(`[OK] ${indicator.metricType} bulk rows ${snapshot.size}`);
    } catch (error) {
      console.log(`[WARN] ${indicator.metricType} bulk fetch failed: ${error.message}`);
      indicatorSnapshots.set(indicator.indicatorCode, null);
    }
  }

  const insertRows = [];
  const iso3UpdateRows = [];
  const skipped = [];

  for (const country of countries) {
    iso3UpdateRows.push(country);

    for (const indicator of INDICATORS) {
      try {
        const snapshot = indicatorSnapshots.get(indicator.indicatorCode);
        const latest = snapshot
          ? snapshot.get(country.iso3)
          : await fetchLatestIndicator({
              iso3: country.iso3,
              indicatorCode: indicator.indicatorCode,
            });

        if (!latest) {
          skipped.push(`${country.countryCode}/${country.iso3}/${indicator.metricType}: no value`);
          continue;
        }

        insertRows.push({
          countryCode: country.countryCode,
          countryIso3: country.iso3,
          metricType: indicator.metricType,
          indicatorCode: indicator.indicatorCode,
          year: latest.year,
          annualValueUsd: latest.value,
          sourceUrl: latest.sourceUrl,
        });

        console.log(
          `[OK] ${country.countryCode} ${indicator.metricType} ${latest.year} ${Math.round(latest.value)}`
        );
      } catch (error) {
        skipped.push(`${country.countryCode}/${country.iso3}/${indicator.metricType}: ${error.message}`);
      }
    }
  }

  const updateIso3Sql = iso3UpdateRows
    .map(
      (row) =>
        `UPDATE countries SET iso3 = ${sqlString(row.iso3)} WHERE UPPER(code) = ${sqlString(row.countryCode)} AND (iso3 IS NULL OR iso3 = '');`
    )
    .join("\n");

  const valuesSql = insertRows
    .map(
      (row) =>
        `(${sqlString(row.countryCode)}, ${sqlString(row.countryIso3)}, ${sqlString(row.metricType)}, ${sqlString(row.indicatorCode)}, ${row.year}, ${sqlNumber(row.annualValueUsd)}, 'World Bank', ${sqlString(row.sourceUrl)}, NOW())`
    )
    .join(",\n");

  const insertSql = valuesSql
    ? `
INSERT INTO country_income_metrics (
  country_code,
  country_iso3,
  metric_type,
  indicator_code,
  year,
  annual_value_usd,
  source,
  source_url,
  source_updated_at
)
VALUES
${valuesSql}
ON CONFLICT (country_code, metric_type, year)
DO UPDATE SET
  country_iso3 = EXCLUDED.country_iso3,
  indicator_code = EXCLUDED.indicator_code,
  annual_value_usd = EXCLUDED.annual_value_usd,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_updated_at = NOW(),
  updated_at = NOW();
`
    : "";

  const sql = [
    "-- Generated by scripts/sync-world-bank-income.mjs",
    "BEGIN;",
    updateIso3Sql,
    insertSql,
    "COMMIT;",
  ]
    .filter(Boolean)
    .join("\n\n");

  const localSqlPath = join("tmp", "worldbank-income-upsert.sql");
  writeFileSync(localSqlPath, sql, "utf8");

  execFileSync("docker", ["cp", localSqlPath, `${CONTAINER}:/tmp/worldbank-income-upsert.sql`], {
    stdio: "inherit",
  });

  execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", PGUSER, "-d", PGDATABASE, "-f", "/tmp/worldbank-income-upsert.sql"],
    {
      stdio: "inherit",
    }
  );

  console.log("");
  console.log(`Inserted or updated ${insertRows.length} income metric rows.`);

  if (skipped.length > 0) {
    console.log("");
    console.log("Skipped:");
    skipped.forEach((item) => console.log(`- ${item}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
