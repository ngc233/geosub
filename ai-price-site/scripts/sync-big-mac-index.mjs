import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { selectLatestBigMacRows } from "./big-mac-index-core.mjs";

const SOURCE_URL = "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv";
const SOURCE_NAME = "The Economist Big Mac Index";
const SOURCE_LICENSE = "CC BY 4.0";
const REQUEST_TIMEOUT_MS = Number(process.env.BIG_MAC_INDEX_TIMEOUT_MS || 15000);
const appDir = path.resolve(import.meta.dirname, "..");
const ISO2_TO_ISO3 = {
  AR: "ARG", AU: "AUS", BR: "BRA", CA: "CAN", CN: "CHN",
  DE: "DEU", ES: "ESP", FR: "FRA", GB: "GBR", IN: "IND",
  IT: "ITA", JP: "JPN", KR: "KOR", MX: "MEX", NZ: "NZL",
  SG: "SGP", TR: "TUR", TW: "TWN", US: "USA", ZA: "ZAF",
};
const EURO_AREA_COUNTRIES = new Set(["DE", "ES", "FR", "IT"]);

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

async function fetchDataset() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: "text/csv" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Big Mac Index returned HTTP ${response.status}.`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");

  const dataset = await fetchDataset();
  const latestByIso3 = selectLatestBigMacRows(dataset);
  if (latestByIso3.size === 0) throw new Error("Big Mac Index contained no usable rows.");

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const countries = await client.query(`
      SELECT UPPER(code) AS country_code, UPPER(COALESCE(iso3, '')) AS country_iso3
      FROM countries
      ORDER BY code
    `);
    const normalizedCountries = countries.rows
      .map((country) => ({
        ...country,
        country_iso3: country.country_iso3 || ISO2_TO_ISO3[country.country_code] || "",
      }))
      .filter((country) => country.country_iso3);
    const matched = normalizedCountries
      .map((country) => {
        const referenceIso3 = EURO_AREA_COUNTRIES.has(country.country_code)
          ? "EUZ"
          : country.country_iso3;
        return {
          ...country,
          referenceIso3,
          benchmark: latestByIso3.get(referenceIso3),
        };
      })
      .filter((country) => country.benchmark);

    await client.query("BEGIN");
    for (const country of normalizedCountries) {
      await client.query(
        "UPDATE countries SET iso3 = $1 WHERE UPPER(code) = $2 AND COALESCE(iso3, '') <> $1",
        [country.country_iso3, country.country_code],
      );
    }
    for (const country of matched) {
      const benchmark = country.benchmark;
      await client.query(
        `INSERT INTO country_consumer_benchmarks (
          benchmark_type, country_code, country_iso3, currency, local_price,
          price_usd, observed_on, source_name, source_url, license, source_updated_at
        ) VALUES ('BIG_MAC', $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (benchmark_type, country_iso3, observed_on)
        DO UPDATE SET
          country_code = EXCLUDED.country_code,
          currency = EXCLUDED.currency,
          local_price = EXCLUDED.local_price,
          price_usd = EXCLUDED.price_usd,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url,
          license = EXCLUDED.license,
          source_updated_at = NOW(),
          updated_at = NOW()`,
        [
          country.country_code,
          country.country_iso3,
          benchmark.currency,
          benchmark.localPrice,
          benchmark.priceUsd,
          benchmark.observedOn,
          country.referenceIso3 === "EUZ" ? `${SOURCE_NAME} — Euro area` : SOURCE_NAME,
          SOURCE_URL,
          SOURCE_LICENSE,
        ],
      );
    }
    await client.query("COMMIT");

    const newest = matched.reduce(
      (date, country) => country.benchmark.observedOn > date ? country.benchmark.observedOn : date,
      "",
    );
    console.log(`Big Mac benchmark synced: ${matched.length}/${countries.rowCount} regions, newest observation ${newest}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
