import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { assertSamplingTestConnection } from "./collector-sampling.mjs";

const site = fileURLToPath(new URL("../../ai-price-site/", import.meta.url));
const req = createRequire(path.join(site, "package.json"));
const ts = req("typescript"), { Prisma } = req("@prisma/client");
export function qualityQueries(client) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpile(readFileSync(file, "utf8"), { module: ts.ModuleKind.CommonJS });
    vm.runInNewContext(code, { exports, require: name => {
      if (name === "@prisma/client") return { Prisma };
      if (name.endsWith("/prisma")) return { prisma: { $queryRaw: async (strings, ...values) => {
        const sql = Prisma.sql(strings, ...values); return (await client.query(sql.text, sql.values)).rows;
      } } };
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name + ".ts"));
      throw Error("Unexpected query dependency");
    } });
    return exports;
  }
  return { overview: load(path.join(site, "app/admin/data-quality/queries.ts")),
    detail: load(path.join(site, "app/admin/data-quality/[slug]/queries.ts")) };
}

export async function verifyQualityCounts(client) {
  assertSamplingTestConnection(client.connectionParameters);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const product = (await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('quality-count-fixture','Synthetic count fixture','ai','review') RETURNING id`)).rows[0].id;
  const plans = [];
  for (const slug of ['plus','pro']) plans.push((await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,$2,$2,'monthly','review') RETURNING id`, [product, slug])).rows[0].id);
  const countries = [];
  for (const code of ['US','CA']) countries.push((await client.query(`INSERT INTO countries(code,name_en,name_zh,currency)
    VALUES($1,$1,$1,'USD') RETURNING id`, [code])).rows[0].id);
  const time = new Date(Date.now() - 3_600_000);
  async function observation(plan, country, options = {}) {
    const { status = 'pending', platform = 'ios', type = 'list_price', flag = false,
      reason = 'waiting_for_more_app_store_samples', ago = 0, createdAgo = ago, id = null } = options;
    await client.query(`INSERT INTO price_observations(id,product_id,plan_id,country_id,source_level,
      raw_price,currency,converted_usd,observed_at,created_at,updated_at,billing_platform,price_type,
      status,anomaly_flag,raw_payload,confidence_score)
      VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,'A',10,'USD',10,$5,$6,NOW(),$7,$8,$9,$10,$11::jsonb,90)`,
    [id,product,plan,country,new Date(time-ago*1000),new Date(time-createdAgo*1000),platform,type,status,flag,
      JSON.stringify({auto_review_reason_code:reason})]);
  }
  // Old pending evidence cannot override a newer approved/ignored decision.
  await observation(plans[0],countries[0],{ago:200,flag:true});
  await observation(plans[0],countries[0],{status:'approved'});
  for(let n=1;n<=30;n++) await observation(plans[0],countries[1],{ago:n*10,flag:true});
  await observation(plans[0],countries[1]);
  await observation(plans[1],countries[0],{reason:'hard_price_guard'});
  await observation(plans[1],countries[1],{flag:true,reason:'app_store_observation_anomaly'});
  await observation(plans[0],countries[1],{type:'promo_price',reason:'low_confidence'});
  await observation(plans[0],countries[0],{platform:'web',flag:true});
  await observation(plans[1],countries[1],{type:'promo_price',ago:0,createdAgo:10});
  await observation(plans[1],countries[1],{type:'promo_price',status:'ignored',ago:0,createdAgo:0});
  await observation(null,countries[0],{ago:100}); await observation(null,countries[0],{status:'approved'});
  await observation(null,countries[1]);
  await observation(plans[0],countries[0],{type:'promo_price',id:'11111111-1111-4111-8111-111111111111'});
  await observation(plans[0],countries[0],{type:'promo_price',status:'approved',id:'ffffffff-ffff-4fff-8fff-ffffffffffff'});
  const { overview, detail } = qualityQueries(client);
  async function snapshot() {
    const total = (await overview.getProductQualityRows()).find(row => row.id === product);
    const summary = await detail.getProductSummary('quality-count-fixture');
    const plans = await detail.getPlanCoverageRows(product);
    const reasons = await detail.getPendingReasonRows(product);
    const gaps = await detail.getMissingCountryRows(product);
    return { total, summary, plans, reasons, gaps };
  }
  const before = await snapshot();
  assert.equal(before.total.pending_app_store_count,5);
  assert.equal(before.total.pending_observation_count,6);
  assert.equal(before.summary.pending_observation_count,5,'detail must count current iOS identities, not historical rows');
  assert.equal(before.summary.pending_anomaly_count,before.total.pending_anomaly_count);
  assert.equal(before.summary.hard_anomaly_count,before.total.hard_anomaly_count);
  assert.equal(before.summary.hard_anomaly_count,2);
  assert.equal(before.plans.reduce((n,row)=>n+row.pending_observation_count,0),4,'unbound identity stays at product scope');
  assert.equal(before.reasons.reduce((n,row)=>n+row.observation_count,0),5);
  assert.equal(before.gaps.reduce((n,row)=>n+row.pending_observation_count,0),4);
  const history = Number((await client.query("SELECT count(*) AS n FROM price_observations WHERE billing_platform='ios'")).rows[0].n);
  assert.equal(before.summary.historical_observation_count,history);
  await observation(plans[0],countries[1],{status:'approved',ago:-10});
  const after = await snapshot();
  assert.equal(after.summary.pending_observation_count,4);
  assert.equal(after.summary.pending_observation_count,after.total.pending_app_store_count);
  assert.equal(after.reasons.reduce((n,row)=>n+row.observation_count,0),4);
  assert.equal(after.summary.historical_observation_count,history+1);
  return {passed:true,synthetic_fixture:true,before:{current_ios:5,current_all_platforms:6,history},
    after:{current_ios:4,history:history+1},verified:['newest status before pending filter','created_at and UUID tie breaks',
      'nullable plans','platform and price-type isolation','plan/gap/reason counts','hard anomaly parity','history preserved']};
}
