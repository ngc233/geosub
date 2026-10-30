import { createHash } from "node:crypto";

export const claudeProParserVersion = "claude-us-pro-web-v1";
export const claudeProRule = "claude-us-pro-monthly-isolated-v1";
export const claudePricingUrl = "https://claude.com/pricing";
export const claudeProHelpUrl = "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan";
const hash = text => createHash("sha256").update(text).digest("hex");

export function assertClaudeProSource(source) {
  if (source.product_slug !== "claude" || source.source_key !== "claude-us-pro-official-web"
    || source.parser_key !== "claude_us_pro" || source.parser_version !== claudeProParserVersion
    || source.billing_cycle !== "monthly" || source.source_level !== "A"
    || source.fetch_mode !== "structured_http" || source.base_url !== claudePricingUrl
    || source.pilot !== true || source.required_plan_slugs?.join(",") !== "pro"
    || source.markets?.length !== 1 || source.markets[0].country_code !== "US"
    || source.markets[0].currency !== "USD" || source.markets[0].locale !== "en-US"
    || source.markets[0].url !== claudePricingUrl
    || source.markets[0].required_plan_slugs?.join(",") !== "pro") {
    throw Error("claude_pro_source_not_allowlisted");
  }
  if (source.auto_review && (source.auto_review.rule_id !== claudeProRule
    || source.auto_review.publish_product !== false)) throw Error("claude_pro_review_policy_mismatch");
}

function visibleHtml(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}
function text(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function parseClaudeProEvidence(pricingHtml, helpHtml, market) {
  const issues = [];
  if (market.country_code !== "US" || market.currency !== "USD" || market.locale !== "en-US"
    || market.url !== claudePricingUrl) issues.push("unsupported_claude_market");
  const pricing = visibleHtml(pricingHtml);
  const matches = [...pricing.matchAll(/<span\b[^>]*\bdata-plan=["']pro_monthly["'][^>]*>([\s\S]*?)<\/span>/gi)];
  if (matches.length !== 1) issues.push("unique_pro_monthly_identity_missing");
  const match = matches[0];
  const amount = match && /^\$\s*(\d+(?:\.\d{1,2})?)$/.exec(text(match[1]));
  if (!amount) issues.push("explicit_monthly_dollar_amount_missing");
  if (match) {
    const preceding = pricing.slice(0, match.index);
    const headings = [...preceding.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
    if (text(headings.at(-1)?.[1] ?? "") !== "Pro") issues.push("pro_card_identity_missing");
    const paragraphStart = preceding.lastIndexOf("<p");
    const paragraphEnd = pricing.indexOf("</p>", match.index);
    const note = paragraphStart >= 0 && paragraphEnd >= 0
      ? text(pricing.slice(paragraphStart, paragraphEnd)) : "";
    if (!/if billed monthly\./i.test(note) || /first month|introductory|free trial/i.test(note)) {
      issues.push("regular_monthly_billing_context_missing");
    }
  }
  const supportMarkup = visibleHtml(helpHtml);
  const supportTitles = [...supportMarkup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const help = text(supportMarkup);
  if (supportTitles.length !== 1 || text(supportTitles[0][1]) !== "What is the Pro plan?") {
    issues.push("support_article_identity_missing");
  }
  const us = [...help.matchAll(/The Pro plan is available for \$\s*(\d+(?:\.\d{1,2})?) per month \(US\)/g)];
  if (us.length !== 1) issues.push("explicit_us_monthly_context_missing");
  const price = Number(amount?.[1]);
  if (!Number.isFinite(price) || price <= 0 || price >= 1_000_000) issues.push("invalid_price");
  if (us.length === 1 && price !== Number(us[0][1])) issues.push("official_sources_disagree");
  return {
    parser_key: "claude_us_pro", parser_version: claudeProParserVersion,
    complete: issues.length === 0,
    candidates: issues.length ? [] : [{
      plan_slug: "pro", plan_name: "Claude Pro", raw_price: price, currency: "USD",
      billing_cycle: "monthly", price_type: "list_price", observed_price_text: text(match[1]),
      evidence_text: us[0][0],
      availability_note: "Official US Web monthly list price; regional checkout prices and taxes may differ.",
    }],
    issues,
  };
}

async function readOfficialDocument(url, fetchImpl) {
  const response = await fetchImpl(url, {
    redirect: "manual", signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "GeoSubResearchBot/2.21 (+https://geosub.org/data-sources)", "Accept-Language": "en-US,en;q=0.9" },
  });
  if (response.status !== 200 || (response.url && response.url !== url)) throw Error("claude_document_unavailable_or_redirected");
  if (!/text\/html/i.test(response.headers.get("content-type") ?? "")) throw Error("claude_document_not_html");
  if (Number(response.headers.get("content-length")) > 2_000_000) throw Error("claude_document_too_large");
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) throw Error("claude_document_too_large");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  const html = Buffer.concat(chunks).toString("utf8");
  return { html, content_hash: hash(html), url, http_status: response.status };
}

export async function fetchClaudeProSnapshot(market, { fetchImpl = fetch, now = () => new Date() } = {}) {
  if (market.country_code !== "US" || market.currency !== "USD" || market.locale !== "en-US"
    || market.url !== claudePricingUrl) throw Error("unsupported_claude_market");
  const pricing = await readOfficialDocument(claudePricingUrl, fetchImpl);
  const support = await readOfficialDocument(claudeProHelpUrl, fetchImpl);
  return {
    ok: true, http_status: 200, final_url: claudePricingUrl, captured_at: now().toISOString(),
    content_hash: pricing.content_hash, user_agent: "GeoSubResearchBot/2.21",
    render_mode: "structured_http", evidence_type: "html",
    support_evidence: { url: support.url, content_hash: support.content_hash, http_status: 200 },
    request_context: { country_code: "US", basis: "official_support_explicit_US_monthly_price" },
    parser_result: parseClaudeProEvidence(pricing.html, support.html, market),
  };
}