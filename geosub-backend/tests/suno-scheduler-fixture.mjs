import { appendFileSync } from "node:fs";
import { sunoPricingUrl } from "../scripts/lib/suno-official-web.mjs";

// Synthetic public-document structure, based on the anonymous 2026-10-30 HTML.
// No accounts, checkout sessions or historical observations are copied.
export function sunoFixture({ mutate = () => {}, country = "US", pro = 10, premier = 30 } = {}) {
  const plans = [
    { plan_key: "free", name: "Free Plan", monthly_price_usd: 0, prices: [] },
    { id: "3eaebef3-ef46-446a-931c-3d50cd1514f1", plan_key: "pro", name: "Pro Plan",
      monthly_price_usd: pro, annual_price_usd: 96,
      prices: [{ period_type: "month", currency: "USD", price: pro }, { period_type: "year", currency: "USD", price: 96 }] },
    { id: "e1235dd7-9f4d-4738-aeb2-1470466cba27", plan_key: "premier", name: "Premier Plan",
      monthly_price_usd: premier, annual_price_usd: 288,
      prices: [{ period_type: "month", currency: "USD", price: premier }, { period_type: "year", currency: "USD", price: 288 }] },
  ];
  mutate(plans);
  const rows = [
    'c8:I' + JSON.stringify([123, [], "PricingPage"]),
    '4c:' + JSON.stringify(["$", "$Lapp", null, { country, app: { geolocation: { country } } }]),
    '5a:' + JSON.stringify(["$", "$Lc8", null, { initialPlans: plans }]),
  ].join("\n") + "\n";
  return '<h2>Pro</h2><p>$8/month billed yearly</p><h2>Premier</h2><p>$24/month billed yearly</p>'
    + '<script>self.__next_f.push(' + JSON.stringify([1, rows]) + ')</script>';
}

export function assertSunoTestDatabase(value) {
  let url;
  try { url = new URL(value); } catch { throw Error("isolated_suno_database_required"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "55433"
    || !/^\/geosub_collector_test_suno_[a-z0-9_]+$/.test(url.pathname)) {
    throw Error("isolated_suno_database_required");
  }
  return url;
}

if (process.env.GEOSUB_SUNO_FIXTURE === "1") {
  assertSunoTestDatabase(process.env.DATABASE_URL);
  const mode = process.env.GEOSUB_SUNO_MODE;
  if (!["valid", "http503", "annual", "wrong-country"].includes(mode)) throw Error("invalid_suno_fixture_mode");
  const log = process.env.GEOSUB_SUNO_LOG;
  if (!log) throw Error("suno_fixture_log_required");
  globalThis.fetch = async url => {
    if (url !== sunoPricingUrl) throw Error("suno_fixture_network_request_rejected");
    appendFileSync(log, JSON.stringify({ mode }) + "\n");
    if (mode === "http503") return new Response("Unavailable fixture", { status: 503 });
    const html = sunoFixture({
      country: mode === "wrong-country" ? "CA" : "US",
      mutate: plans => { if (mode === "annual") plans[1].prices[0].period_type = "year"; },
    });
    return new Response(html, { headers: { "content-type": "text/html" } });
  };
}
