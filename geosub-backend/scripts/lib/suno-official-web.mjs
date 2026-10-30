import { createHash } from "node:crypto";

export const sunoPricingUrl = "https://suno.com/pricing";
export const sunoParserVersion = "suno-us-monthly-web-v1";
const identities = [
  { key: "pro", id: "3eaebef3-ef46-446a-931c-3d50cd1514f1", name: "Pro Plan", slug: "pro" },
  { key: "premier", id: "e1235dd7-9f4d-4738-aeb2-1470466cba27", name: "Premier Plan", slug: "premier-plan" },
];

export function assertSunoSource(source) {
  if (source.product_slug !== "suno" || source.source_key !== "suno-us-monthly-official-web"
    || source.parser_key !== "suno_us_monthly" || source.parser_version !== sunoParserVersion
    || source.billing_cycle !== "monthly" || source.source_level !== "A" || source.pilot !== true
    || source.fetch_mode !== "structured_http" || source.base_url !== sunoPricingUrl
    || source.auto_review !== undefined || source.required_plan_slugs?.join(",") !== "pro,premier-plan"
    || source.markets?.length !== 1 || !supportedMarket(source.markets[0])
    || source.markets[0].required_plan_slugs?.join(",") !== "pro,premier-plan") {
    throw Error("suno_source_not_allowlisted");
  }
}

function supportedMarket(market) {
  return market?.country_code === "US" && market.currency === "USD"
    && market.locale === "en-US" && market.url === sunoPricingUrl;
}

// Decode only JSON data carried by Next's public HTML. Never evaluate source scripts.
function flightRecords(html) {
  const chunks = [];
  const markup = String(html).replace(/<!--[\s\S]*?-->/g, "");
  for (const script of markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(script[1])) continue;
    const body = script[2].trim();
    if (!body.startsWith("self.__next_f.push(")) continue;
    const call = /^self\.__next_f\.push\(([\s\S]*)\);?$/.exec(body);
    if (!call) throw Error("invalid_suno_flight_chunk");
    const value = JSON.parse(call[1]);
    if (value[0] === 1 && typeof value[1] === "string") chunks.push(value[1]);
  }
  const records = [];
  for (const line of chunks.join("").split("\n")) {
    const row = /^([a-f0-9]+):(I?)([\s\S]*)$/.exec(line);
    if (!row || !/^[\[{]/.test(row[3])) continue;
    try { records.push({ id: row[1], module: row[2] === "I", value: JSON.parse(row[3]) }); }
    catch { /* Non-JSON Flight rows cannot supply pricing or country evidence. */ }
  }
  return records;
}

export function parseSunoEvidence(html, market) {
  const issues = [];
  if (!supportedMarket(market)) issues.push("unsupported_suno_market");
  let records = [];
  try { records = flightRecords(html); }
  catch { issues.push("invalid_suno_flight_data"); }
  const pricingModules = records.filter(row => row.module && row.value?.at(-1) === "PricingPage");
  const pages = records.filter(row => !row.module && Array.isArray(row.value)
    && pricingModules.some(module => row.value[1] === "$L" + module.id));
  if (pricingModules.length !== 1 || pages.length !== 1) issues.push("unique_suno_pricing_page_missing");
  const countries = [];
  const geolocations = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "country")) countries.push(value.country);
    if (Object.hasOwn(value, "geolocation")) geolocations.push(value.geolocation?.country);
    for (const child of Object.values(value)) visit(child);
  }
  for (const row of records.filter(row => !row.module)) visit(row.value);
  if (countries.length < 1 || countries.some(country => country !== "US")
    || geolocations.length !== 1 || geolocations[0] !== "US") issues.push("explicit_us_context_missing");
  const plans = pages[0]?.value[3]?.initialPlans;
  if (!Array.isArray(plans) || plans.length !== 3
    || plans.map(plan => plan.plan_key).sort().join(",") !== "free,premier,pro") {
    issues.push("suno_plan_set_mismatch");
  }
  const candidates = [];
  for (const identity of identities) {
    const matches = Array.isArray(plans) ? plans.filter(plan => plan.plan_key === identity.key) : [];
    const plan = matches[0];
    if (matches.length !== 1 || plan.id !== identity.id || plan.name !== identity.name) {
      issues.push("suno_plan_identity_mismatch:" + identity.key);
      continue;
    }
    const prices = Array.isArray(plan.prices)
      ? plan.prices.filter(price => price.period_type === "month" && price.currency === "USD") : [];
    const price = prices[0]?.price;
    if (prices.length !== 1 || typeof price !== "number" || !Number.isFinite(price)
      || price <= 0 || price >= 1_000_000 || price !== plan.monthly_price_usd) {
      issues.push("explicit_usd_monthly_price_missing:" + identity.key);
      continue;
    }
    candidates.push({
      plan_slug: identity.slug, plan_name: "Suno " + identity.name, raw_price: price, currency: "USD",
      billing_cycle: "monthly", price_type: "list_price", observed_price_text: "USD " + price + "/month",
      evidence_text: "PricingPage initialPlans " + identity.key + ": prices[USD,month] = monthly_price_usd",
      availability_note: "Official US Web monthly list price. Taxes calculated at checkout; purchase eligibility unverified.",
    });
  }
  return {
    parser_key: "suno_us_monthly", parser_version: sunoParserVersion,
    complete: issues.length === 0, candidates: issues.length ? [] : candidates, issues,
  };
}

export function validateSunoSnapshot(snapshot) {
  if (snapshot.final_url !== sunoPricingUrl || snapshot.render_mode !== "structured_http"
    || snapshot.evidence_type !== "html" || !/^[a-f0-9]{64}$/.test(snapshot.content_hash ?? "")
    || snapshot.request_context?.country_code !== "US"
    || snapshot.request_context?.basis !== "official_pricing_country_and_usd_monthly_fields") {
    return ["suno_evidence_context_mismatch"];
  }
  return [];
}

export async function fetchSunoSnapshot(market, { fetchImpl = fetch, now = () => new Date() } = {}) {
  if (!supportedMarket(market)) throw Error("unsupported_suno_market");
  const response = await fetchImpl(sunoPricingUrl, {
    redirect: "manual", signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "GeoSubResearchBot/2.21 (+https://geosub.org/data-sources)", "Accept-Language": "en-US,en;q=0.9" },
  });
  if (response.status !== 200 || (response.url && response.url !== sunoPricingUrl)) {
    throw Error("suno_document_unavailable_or_redirected");
  }
  if (!/text\/html/i.test(response.headers.get("content-type") ?? "")) throw Error("suno_document_not_html");
  if (Number(response.headers.get("content-length")) > 2_000_000) throw Error("suno_document_too_large");
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) throw Error("suno_document_too_large");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  const html = Buffer.concat(chunks).toString("utf8");
  return {
    ok: true, http_status: 200, final_url: sunoPricingUrl, captured_at: now().toISOString(),
    content_hash: createHash("sha256").update(html).digest("hex"), user_agent: "GeoSubResearchBot/2.21",
    render_mode: "structured_http", evidence_type: "html",
    request_context: { country_code: "US", basis: "official_pricing_country_and_usd_monthly_fields" },
    parser_result: parseSunoEvidence(html, market),
  };
}
