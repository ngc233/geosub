import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseOfficialWebPriceText } from "./lib/official-web-price-parsers.mjs";
import { getOfficialWebParserVersion } from "./lib/official-web-price-parsers.mjs";

const cases = [
  {
    countryCode: "US",
    currency: "USD",
    text: "Choose the plan that’s right for you. Individual $11.99/month, first month free. Family $19.99/month, one month free. Student Extra savings at just $6.99/month. Apple One starts at $21.95/month. Questions? Answers.",
    expected: { individual: 11.99, family: 19.99, student: 6.99 }
  },
  {
    countryCode: "BR",
    currency: "BRL",
    text: "Escolha o plano ideal para você. Individual R$ 23,90 por mês. Família R$ 40,90 por mês. Universitária Descontos ainda maiores por R$ 12,90 por mês. Apple One a partir de R$ 47,90. Perguntas? Nós temos as respostas.",
    expected: { individual: 23.9, family: 40.9, student: 12.9 }
  },
  {
    countryCode: "TR",
    currency: "TRY",
    text: "Size en uygun aboneliği seçin. Bireysel Ayda sadece 89,99 TL. Öğrenci Ayda sadece 49,99 TL ile ekstra tasarruf. Aile Ayda sadece 149,99 TL. Sorularınız varsa cevaplar burada.",
    expected: { individual: 89.99, family: 149.99, student: 49.99 }
  },
  {
    countryCode: "JP",
    currency: "JPY",
    text: "あなたにぴったりのプランを選べます。 個人 月額1,180円。 ファミリー 月額1,980円。 学生 さらにお得な月額680円。 Apple One 月額1,200円。 もっと知りたいですか？",
    expected: { individual: 1180, family: 1980, student: 680 }
  },
  {
    countryCode: "DE",
    currency: "EUR",
    text: "Wähl ein Abo, das am besten zu dir passt. Einzelperson 11,99 €/Monat. Familie 19,99 €/Monat. Studie\u00adrende Noch mehr sparen bei nur 6,99 €/Monat. Apple One 19,95 €/Monat. Fragen? Antworten.",
    expected: { individual: 11.99, family: 19.99, student: 6.99 }
  }
];

for (const fixture of cases) {
  test(`Apple Music parses ${fixture.countryCode} official monthly plans`, () => {
    const result = parseOfficialWebPriceText({ parserKey: "apple_music", ...fixture });
    assert.equal(result.complete, true, result.issues.join(", "));
    assert.equal(result.candidates.length, 3);
    assert.deepEqual(
      Object.fromEntries(result.candidates.map((candidate) => [candidate.plan_slug, candidate.raw_price])),
      fixture.expected
    );
    assert.ok(result.candidates.every((candidate) => candidate.billing_cycle === "monthly"));
    assert.ok(result.candidates.every((candidate) => candidate.price_type === "list_price"));
  });
}

test("Apple Music rejects a market when a required plan is missing", () => {
  const result = parseOfficialWebPriceText({
    parserKey: "apple_music",
    countryCode: "US",
    currency: "USD",
    text: "Choose the plan that’s right for you. Individual $11.99/month. Family $19.99/month. Questions? Answers."
  });

  assert.equal(result.complete, false);
  assert.match(result.issues.join(","), /student/);
});

test("Apple Music rejects multiple distinct prices inside one plan block", () => {
  const result = parseOfficialWebPriceText({
    parserKey: "apple_music",
    countryCode: "US",
    currency: "USD",
    text: "Choose the plan that’s right for you. Individual $10.99/month then $11.99/month. Family $19.99/month. Student $6.99/month. Questions? Answers."
  });

  assert.equal(result.complete, false);
  assert.ok(result.issues.includes("ambiguous_prices:individual"));
});

test("official Web source config covers the approved global inventory and preserves the original five identities", async () => {
  const configPath = path.join(import.meta.dirname, "..", "data", "official-web-price-sources.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const source = config.sources["apple-music"];

  assert.equal(config.version, 1);
  assert.equal(source.product_slug, "apple-music");
  assert.equal(source.parser_key, "apple_music");
  assert.equal(source.parser_version, 'apple-music-official-web-v2');
  assert.equal(getOfficialWebParserVersion(source.parser_key), 'apple-music-official-web-v1');
  assert.equal(source.pilot, false);
  assert.equal(source.billing_cycle, "monthly");
  assert.match(source.evidence_note, /Apple Music/);
  assert.deepEqual(source.required_plan_slugs, ["individual", "family", "student"]);
  const inventory=JSON.parse(await readFile(path.join(import.meta.dirname,'..','data','apple-music-official-markets.json'),'utf8'));
  assert.deepEqual(source.markets.slice(0,5).map((market) => market.country_code), ["US", "BR", "TR", "JP", "DE"]);
  assert.deepEqual(source.markets.map(m=>m.country_code).sort(),inventory.markets.map(m=>m.country_code).sort());
  assert.equal(new Set(source.markets.map((market) => market.url)).size,172);
  assert.ok(source.markets.slice(5).every(m=>m.storefront && m.evidence_url==='https://buy.music.apple.com/commerce/web/subscription/offers/music'));
  assert.ok(source.markets.every((market) => !Object.hasOwn(market, "price")));
});

test("Apple Music onboarding stays review-only and paused", async () => {
  const migrationPath = path.join(
    import.meta.dirname,
    "..",
    "sql",
    "backfill",
    "053_seed_apple_music_official_web_pilot.sql"
  );
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /'apple-music'/);
  assert.match(migration, /'individual'[\s\S]*'family'[\s\S]*'student'/);
  assert.match(migration, /'apple-music-official-web'/);
  assert.match(migration, /'official_web_source_key', 'apple-music'/);
  assert.match(migration, /jsonb_build_array\('US', 'BR', 'TR', 'JP', 'DE'\)/);
  assert.match(migration, /'streaming_pricing'/);
  assert.match(migration, /'paused'/);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+region_prices/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+price_observations/i);
  assert.doesNotMatch(migration, /'published'/);
});

test("Claude US Pro uses the exact monthly marker and explicit US corroboration", async () => {
  const { parseClaudeProEvidence } = await import("./lib/claude-pro-official-web.mjs");
  const pricing = await readFile(new URL("./fixtures/claude-pro-pricing.html", import.meta.url), "utf8");
  const help = await readFile(new URL("./fixtures/claude-pro-help.html", import.meta.url), "utf8");
  const market = { country_code: "US", currency: "USD", locale: "en-US", url: "https://claude.com/pricing" };
  const changeMonthly = value => pricing.replace('data-plan="pro_monthly">$20', 'data-plan="pro_monthly">' + value);
  const result = parseClaudeProEvidence(pricing, help, market);
  assert.equal(result.complete, true, result.issues.join(","));
  assert.deepEqual(result.candidates.map(row => [row.plan_slug, row.raw_price, row.currency]), [["pro",20,"USD"]]);
  const cases = [
    [pricing.replace('pro_monthly','pro_annual'),help,market],
    [pricing+pricing,help,market],
    [pricing,help.replace('$20','$25'),market],
    [pricing,help.replace('(US)','(CA)'),market],
    [pricing.replace('if billed monthly.','if billed annually.'),help,market],
    [changeMonthly('From $20'),help,market],
    [pricing.replace('if billed monthly.','first month free, if billed monthly.'),help,market],
    [pricing,help,{...market,country_code:'CA'}],
    [pricing,help,{...market,currency:'CAD'}],
    [pricing,help,{...market,url:'https://example.invalid/'}],
    [pricing,help.replace('<h1>What is the Pro plan?</h1>','<h1>Team</h1>'),market],
  ];
  for (const args of cases) {
    const invalid = parseClaudeProEvidence(...args);
    assert.equal(invalid.complete,false);
    assert.deepEqual(invalid.candidates,[]);
  }
  assert.equal(parseClaudeProEvidence(changeMonthly('$25'),help.replace('$20','$25'),market).candidates[0].raw_price,25);
  assert.equal(parseClaudeProEvidence('<script>'+pricing+'</script>',help,market).complete,false);
});

test("Claude fetches only the two reviewed documents and refuses redirects and oversized responses", async () => {
  const { fetchClaudeProSnapshot, claudePricingUrl, claudeProHelpUrl } = await import("./lib/claude-pro-official-web.mjs");
  const pricing = await readFile(new URL("./fixtures/claude-pro-pricing.html", import.meta.url), "utf8");
  const help = await readFile(new URL("./fixtures/claude-pro-help.html", import.meta.url), "utf8");
  const market = { country_code:'US',currency:'USD',locale:'en-US',url:claudePricingUrl };
  const calls=[];
  const snapshot = await fetchClaudeProSnapshot(market,{fetchImpl:async (url,options)=>{
    calls.push(url);assert.equal(options.redirect,'manual');
    return new Response(url===claudePricingUrl?pricing:help,{headers:{'content-type':'text/html'}});
  }});
  assert.deepEqual(calls,[claudePricingUrl,claudeProHelpUrl]);
  assert.equal(snapshot.parser_result.complete,true);
  assert.match(snapshot.content_hash,/^[a-f0-9]{64}$/);
  assert.match(snapshot.support_evidence.content_hash,/^[a-f0-9]{64}$/);
  await assert.rejects(fetchClaudeProSnapshot(market,{fetchImpl:async()=>new Response('',{
    status:302,headers:{location:'https://example.invalid/redirect'},
  })}),/redirected/);
  await assert.rejects(fetchClaudeProSnapshot(market,{fetchImpl:async()=>new Response('x',{
    headers:{'content-type':'text/html','content-length':'2000001'},
  })}),/too_large/);
});