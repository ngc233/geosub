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

test("official Web source config contains only the five approved pilot markets", async () => {
  const configPath = path.join(import.meta.dirname, "..", "data", "official-web-price-sources.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const source = config.sources["apple-music"];

  assert.equal(config.version, 1);
  assert.equal(source.product_slug, "apple-music");
  assert.equal(source.parser_key, "apple_music");
  assert.equal(source.parser_version, getOfficialWebParserVersion(source.parser_key));
  assert.equal(source.pilot, true);
  assert.equal(source.billing_cycle, "monthly");
  assert.match(source.evidence_note, /Apple Music/);
  assert.deepEqual(source.required_plan_slugs, ["individual", "family", "student"]);
  assert.deepEqual(source.markets.map((market) => market.country_code), ["US", "BR", "TR", "JP", "DE"]);
  assert.equal(new Set(source.markets.map((market) => market.url)).size, 5);
  assert.ok(source.markets.every((market) => !Object.hasOwn(market, "price")));
});
