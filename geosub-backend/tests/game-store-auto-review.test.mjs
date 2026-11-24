import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {sample} from "./fixtures/game-offers/sample.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const review = read("../scripts/lib/review-game-offer.sql");
const sqlText = value => "'" + value.replaceAll("'", "''") + "'";

test("official game review uses current evidence, human baselines and atomic system audits", {
  skip: process.env.GAME_REVIEW_TEST_DB !== "1" && "requires an isolated PG database with the GTA 6 catalog"
}, () => {
  const sql = ["BEGIN;", `CREATE FUNCTION pg_temp.expect(ok boolean, why text) RETURNS void
    LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',why; END IF; END $$;`];
  sql.push(`SELECT pg_temp.expect(NOT EXISTS (SELECT FROM game_offer_attempts)
    AND (SELECT count(*)=12 FROM game_offer_jobs), 'requires an unused, isolated GTA 6 catalog');`);
  const actor = randomUUID();
  sql.push(`INSERT INTO admin_users(id,email,password_hash) VALUES ('${actor}','${actor}@test.invalid','disabled');`);
  let counter = 0;
  function capture(name, {platform="xbox", price=568, mode="regular_due", mutate, age} = {}) {
    const fixture = sample(platform);
    const target = fixture.target;
    const offer = structuredClone(fixture.result);
    if (offer.purchasable_status === "available") {
      offer.public_price = offer.base_price = price.toFixed(2);
      if (platform === "xbox") Object.assign(offer.proof,{list:price, public_offer:price, msrp:price});
      else Object.assign(offer.proof,{public_minor:price*100, base_minor:price*100});
    }
    mutate?.(offer);
    const id = randomUUID();
    const stamp = age || `now()-interval '4 hours'+interval '${++counter} seconds'`;
    sql.push(`INSERT INTO collector_job_runs(id,job_id,product_id,source_id,status,started_at,finished_at,raw_payload)
      SELECT '${id}',j.id,t.product_id,j.source_id,'${offer.failure_reason ? "failed" : "succeeded"}',
        ${stamp}-interval '1s',${stamp}+interval '1s',
        jsonb_build_object('target_id',t.id,'source_key',j.job_config->>'official_web_source_key','game_run_mode','${mode}',
          'game_offer',${sqlText(JSON.stringify(offer))}::jsonb || jsonb_build_object('observed_at',${stamp}))
      FROM game_offer_targets t JOIN game_offer_jobs b ON b.target_id=t.id JOIN collector_jobs j ON j.id=b.job_id
      JOIN products p ON p.id=t.product_id WHERE p.slug='gta-6' AND t.market='HK' AND t.store_product_id=${sqlText(target.store_product_id)};`);
    return {name,id};
  }
  function apply(run) {
    sql.push(`SET LOCAL geosub.game_review_run TO '${run.id}';`,review);
  }
  function check(query, why) { sql.push(`SELECT pg_temp.expect((${query}), ${sqlText(why)});`); }
  function state(run, expected, audits) {
    check(`SELECT review_status IS NOT DISTINCT FROM ${expected ? sqlText(expected) : "NULL"} FROM game_offer_attempts WHERE run_id='${run.id}'`,run.name);
    check(`SELECT count(*)=${audits} FROM audit_logs WHERE target_type='game_offer_attempt' AND target_id='${run.id}'`,run.name+" audit count");
  }
  function human(run, decision) {
    sql.push(`UPDATE game_offer_attempts SET review_status='${decision}',reviewed_at=clock_timestamp() WHERE run_id='${run.id}';
      INSERT INTO audit_logs(actor_id,action,target_type,target_id,note) VALUES ('${actor}','${decision}','game_offer_attempt','${run.id}','verified fixture');`);
  }
  const xbox = capture("first Xbox observation"), ps = capture("first PS5 observation",{platform:"ps5"});
  for (const r of [xbox,ps]) { apply(r); state(r,"pending",0); human(r,"approved"); }
  sql.push(`CREATE TEMP TABLE untouched AS SELECT s.* FROM game_offer_public_state s JOIN products p ON p.id=s.product_id
    WHERE p.slug='gta-6' AND NOT(s.platform='xbox' AND s.market='HK' AND s.edition='standard' AND s.offer_type='full_game');`);
  const unchanged=capture("normal renewal");
  apply(unchanged); apply(unchanged); state(unchanged,"approved",1);
  const drop=capture("verified public price change",{price:500});
  apply(drop); state(drop,"approved",1);
  check(`SELECT actor_id IS NULL AND new_value->>'rule'='gta6-official-buyout-v1'
    AND new_value->>'human_baseline_run_id'='${xbox.id}' AND old_value->>'run_id'='${unchanged.id}'
    AND new_value->>'public_price'='500.00' FROM audit_logs WHERE target_id='${drop.id}'`,"system decision provenance");
  check(`SELECT s.status='fresh' AND s.price->>'public_price'='500.00' AND s.verified_at=a.observed_at
    FROM game_offer_public_state s JOIN game_offer_attempts a ON a.target_id=s.id WHERE a.run_id='${drop.id}'`,"fresh accepted sample");
  check(`SELECT count(*)=11 AND bool_and(to_jsonb(s)=to_jsonb(u)) FROM untouched u JOIN game_offer_public_state s USING(id)`,"other seven full games and four upgrades isolated");
  for (const price of [125,750]) {
    sql.push("SAVEPOINT boundary;");
    const r=capture("inclusive threshold "+price,{price});
    apply(r); state(r,"approved",1);
    sql.push("ROLLBACK TO boundary;");
  }
  for (const [name,options] of [
    ["jump",{price:99}], ["spike",{price:751}], ["zero",{price:0}], ["targeted",{mode:"targeted"}],
    ["wrong product",{mutate:o=>{o.proof.product_id="OTHER";}}], ["wrong ISO",{mutate:o=>{o.currency="USD";}}],
    ["wrong market",{mutate:o=>{o.proof.market="US";}}], ["missing proof",{mutate:o=>{delete o.proof;}}],
    ["not a public purchase",{mutate:o=>{o.proof.eligibility="Subscriber";}}],
    ["conflicting public price",{mutate:o=>{o.proof.public_offer=38;}}],
    ["expired sale",{mutate:o=>{o.public_promotion=true; o.promo_ends_at=new Date(Date.now()-60000).toISOString();}}],
    ["sale without end",{mutate:o=>{o.public_promotion=true;}}],
    ["unavailable transition",{mutate:o=>{for(const k of ["currency","base_price","public_price","public_promotion"]) delete o[k];o.purchasable_status="unavailable";}}],
    ["late observation",{age:"now()-interval '6 hours'"}]
  ]) {
    const r=capture(name,options); apply(r); state(r,"pending",0);
  }
  const failed=capture("parse failure",{mutate:o=>{for(const k of Object.keys(o)) delete o[k];o.failure_reason="parse_ambiguous";}});
  apply(failed); state(failed,null,0);
  const rejected=capture("human rejection",{price:480});
  human(rejected,"rejected"); apply(rejected); state(rejected,"rejected",1);
  const repeated=capture("repeated rejected price",{price:480}); apply(repeated); state(repeated,"pending",0);
  const sale=capture("public promotion",{price:450,mutate:o=>{o.public_promotion=true;o.base_price="500.00";o.proof.msrp=500;
    o.promo_ends_at=new Date(Date.now()+3600000).toISOString();}});
  apply(sale); state(sale,"approved",1);
  check(`SELECT count(*)=1 FROM game_promo_rechecks q JOIN game_offer_attempts a USING(target_id) WHERE a.run_id='${sale.id}' AND q.status='queued'`,"sale expiry scheduled");
  const recovery=capture("return to base",{mode:"promo_recheck"}); apply(recovery); state(recovery,"approved",1);
  const held=capture("hold blocks automatic review");
  sql.push(`UPDATE collector_jobs SET job_config=job_config||'{"game_rollout_hold":true}'::jsonb WHERE id=(SELECT job_id FROM game_offer_attempts WHERE run_id='${held.id}');`);
  apply(held); state(held,"pending",0);
  sql.push(`UPDATE collector_jobs SET job_config=job_config-'game_rollout_hold' WHERE id=(SELECT job_id FROM game_offer_attempts WHERE run_id='${held.id}');`);
  for (const platform of ["xbox","ps5"]) {
    const r=capture(platform+" routine verification",{platform});apply(r);state(r,"approved",1);
  }
  check("SELECT count(*)=2 FROM collector_jobs j JOIN game_offer_jobs b ON j.id=b.job_id WHERE j.status='active'","review did not expand pilot");
  check("SELECT status='draft' FROM products WHERE slug='gta-6'","product draft");
  // Exercise the standalone expansion command only inside this rollback-only fixture.
  const expand = read("../sql/isolated/expand-gta6-stores.sql").replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
  const command = expand.slice(expand.indexOf("DO $$")).trim();
  sql.push("SAVEPOINT missing_anchor;",`DELETE FROM audit_logs WHERE target_id='${ps.id}';`,
    `DO $gate$ BEGIN
      BEGIN EXECUTE ${sqlText(command)};
      EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE '需要两条港服标准版%' THEN RETURN; END IF;
        RAISE;
      END;
      RAISE EXCEPTION 'Expansion accepted a missing human audit';
    END $gate$;`,"ROLLBACK TO missing_anchor;",expand);
  check("SELECT count(*)=12 FROM collector_jobs j JOIN game_offer_jobs b ON j.id=b.job_id WHERE j.status='active'","separate expansion accepts human-anchored renewals");
  const unavailable = capture("first unavailable upgrade",{platform:"upgrade"});
  apply(unavailable); state(unavailable,"pending",0); human(unavailable,"approved");
  const stillUnavailable = capture("independently verified unavailable upgrade",{platform:"upgrade"});
  apply(stillUnavailable); state(stillUnavailable,"approved",1);
  check(`SELECT s.status='unavailable' AND s.price IS NULL FROM game_offer_public_state s
    JOIN game_offer_attempts a ON a.target_id=s.id WHERE a.run_id='${stillUnavailable.id}'`,"no upgrade price invented");
  const noEvidence = capture("unavailable without storefront reason",{platform:"upgrade",mutate:o=>{o.proof.reasons=[];}});
  apply(noEvidence); state(noEvidence,"pending",0);
  sql.push("ROLLBACK;");
  const result=spawnSync("psql",["-Xq","-v","ON_ERROR_STOP=1"],{input:sql.join("\n"),encoding:"utf8"});
  assert.equal(result.status,0,result.error?.message || result.stderr);
});
