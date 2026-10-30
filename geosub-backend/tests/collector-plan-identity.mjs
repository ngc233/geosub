import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export async function verifyCollectorIdentity(client, databaseUrl) {
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "55433"); assert.match(url.pathname, /^\/geosub_collector_test_identity_[a-z0-9_]+$/);
  assert.equal(client.connectionParameters.host, url.hostname);
  assert.equal(Number(client.connectionParameters.port), 55433);
  assert.equal("/" + (await client.query("SELECT current_database() AS name")).rows[0].name, url.pathname);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const source = (await client.query(`INSERT INTO price_sources
    (source_key,name,source_level,type,status,provider,base_url)
    VALUES('apple-app-store','Apple isolated fixture','A','app_store','active','Apple','https://apps.apple.com/')
    RETURNING id`)).rows[0];
  const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD') RETURNING id`)).rows[0];
  const identities = [];
  for (const [slug, name, appId, plans] of [
    ["captions", "Captions", "1541407007", [["basic", "monthly"], ["max", "monthly"]]],
    ["pollo-ai", "Pollo AI", "6740024098", [["lite", "monthly"], ["pro", "monthly"], ["weekly-premium", "weekly"]]],
  ]) {
    const product = (await client.query(`INSERT INTO products(slug,name,category,status)
      VALUES($1,$2,'ai','review') RETURNING id`, [slug, name])).rows[0];
    for (const [planSlug, cycle] of plans) {
      const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
        VALUES($1,$2,$2,$3,'review') RETURNING id`, [product.id, planSlug, cycle])).rows[0];
      identities.push({ product: slug, plan: planSlug, product_id: product.id, plan_id: plan.id, app_store_id: appId });
      for (const platform of ["web", "ios"]) await client.query(`INSERT INTO region_prices
        (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
          primary_source_id,status,data_quality,last_checked_at)
        VALUES($1,$2,$3,19,'USD',19,$4,'list_price',$5,'published','verified',NOW() - INTERVAL '2 days')`,
      [product.id, plan.id, country.id, platform, source.id]);
    }
  }
  const preserved = async () => ({
    products: (await client.query("SELECT * FROM products ORDER BY id")).rows,
    plans: (await client.query("SELECT * FROM plans ORDER BY id")).rows,
    prices: (await client.query("SELECT * FROM region_prices ORDER BY plan_id,billing_platform")).rows,
  });
  const before = await preserved();
  const root = await mkdtemp(path.join(tmpdir(), "geosub-identity-"));
  try {
    const input = path.join(root, "identities.json");
    await writeFile(input, JSON.stringify({ identities, country_id: country.id, source_id: source.id }), { mode: 0o600 });
    const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File",
      fileURLToPath(new URL("./collector-plan-identity.ps1", import.meta.url)), "-DatabaseFixturePath", input], {
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_OPTIONS: "" }, encoding: "utf8", timeout: 30_000,
    });
    assert.equal(result.status, 0, (result.stdout + result.stderr).replaceAll(databaseUrl, "[redacted]"));
    const rows = (await client.query(`SELECT p.slug AS product,pl.slug AS plan,o.raw_price,o.status,o.anomaly_flag,
      o.billing_platform,o.raw_payload->>'item_name' AS item_name,
      o.raw_payload#>>'{raw_snapshot,billingCycle}' AS cycle
      FROM price_observations o JOIN products p ON p.id=o.product_id JOIN plans pl ON pl.id=o.plan_id
      ORDER BY p.slug,pl.slug,o.raw_price`)).rows;
    assert.equal(rows.length, 5);
    assert.ok(rows.every(row => row.status === "pending" && row.billing_platform === "ios"));
    assert.equal(rows.filter(row => row.anomaly_flag).length, 2);
    assert.ok(rows.filter(row => row.product === "captions").every(row => row.item_name === "Captions Basic - monthly"));
    assert.ok(rows.filter(row => row.plan !== "weekly-premium").every(row => row.cycle === "monthly"));
    assert.equal(rows.find(row => row.plan === "weekly-premium").cycle, "weekly");
    assert.deepEqual(await preserved(), before);
    return { passed: true, observations: rows, formal_price_updates: 0, existing_price_rows_preserved: before.prices.length,
      cases: ["actual collector selection and Insert-Observation functions", "5 pending writes and exact retry deduplication",
        "weekly never becomes monthly", "2 genuine monthly price conflicts stay anomalous",
        "unchanged formal Web/iOS records, product/plan lifecycle and thresholds"],
      scope: "synthetic public IAP fixtures in disposable schema-only local database; no HTTP or scheduler acceptance" };
  } finally { assert.equal(path.dirname(root), tmpdir()); await rm(root, { recursive: true, force: true }); }
}
