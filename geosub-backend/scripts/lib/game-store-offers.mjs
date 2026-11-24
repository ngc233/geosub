const stores = {ps5: "store.playstation.com", xbox: "www.xbox.com"};

class EvidenceError extends Error {
  constructor(reason, detail) {
    super(detail);
    this.reason = reason;
  }
}
function requireEvidence(condition, reason, detail) {
  if (!condition) throw new EvidenceError(reason, detail);
}
function checkMarket(locale, target) {
  const market = new Intl.Locale(locale || "und").region;
  requireEvidence(market, "missing_evidence", "Missing storefront market");
  requireEvidence(market === target.market, "region_mismatch", "Unexpected storefront market: " + market);
}
export function checkStoreUrl(value, target) {
  const url = new URL(value);
  requireEvidence(url.protocol === "https:" && url.host === stores[target.platform] && !url.username && !url.password,
    "region_mismatch", "Unexpected storefront origin");
  const parts = url.pathname.split("/").filter(Boolean);
  checkMarket(parts[0], target);
  const validPath = target.platform === "ps5" ? parts.length === 3 && parts[1] === "product"
    : parts.length === 5 && parts[1] === "games" && parts[2] === "store";
  requireEvidence(validPath && parts.at(-1).toUpperCase() === target.store_product_id.toUpperCase(),
    "sku_mismatch", "Unexpected product in storefront URL");
  return url;
}
function getScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .map(([, attributes, text]) => ({attributes, text}));
}
function numberValue(value, label) {
  requireEvidence(typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    Number.isSafeInteger(Math.round(value * 100)) && Number(value.toFixed(2)) === value,
    "missing_evidence", "Invalid " + label);
  return value;
}
function expiry(value, observedAt) {
  if (value == null || value === "") return null;
  const utc = value.match(/^(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d:\d\d)$/);
  if (utc && Number(utc[3]) >= 9998) return null;
  const normalized = utc ? utc[3] + "-" + utc[1] + "-" + utc[2] + "T" + utc[4] + "Z" : value;
  requireEvidence(/(?:Z|[+-]\d\d:\d\d)$/i.test(normalized) && Date.parse(normalized) > Date.parse(observedAt),
    "parse_ambiguous", "Uncertain or elapsed offer end time");
  return new Date(normalized).toISOString();
}
function priceFields(target, currency, base, price, end, observedAt) {
  requireEvidence(currency, "missing_evidence", "Missing structured currency");
  requireEvidence(currency === target.expected_currency, "currency_mismatch", "Observed currency: " + currency);
  numberValue(price, "public price");
  if (base != null) numberValue(base, "base price");
  requireEvidence(base == null || price <= base, "parse_ambiguous", "Public price exceeds list price");
  const endTime = base === price ? null : expiry(end, observedAt);
  const promotion = base == null ? (endTime ? true : null) : price < base;
  return {currency, base_price: base == null ? null : base.toFixed(2), public_price: price.toFixed(2),
    public_promotion: promotion, promo_ends_at: endTime};
}
function playStationMemberFields(items, publicPrice, observedAt) {
  if (items.length !== 1) return {};
  const {tier, price} = items[0];
  if (price.currencyCode !== publicPrice.currencyCode || !Number.isSafeInteger(price.discountedValue) ||
      price.discountedValue < 0 || price.discountedValue >= publicPrice.discountedValue) return {};
  try {
    return {member_tier:tier, member_price:(price.discountedValue / 100).toFixed(2),
      member_ends_at:expiry(price.endTime, observedAt)};
  } catch (error) {
    if (error instanceof EvidenceError) return {};
    throw error;
  }
}
function parsePlayStation(scripts, target, observedAt) {
  const nextData = scripts.find(s => /\bid=["']__NEXT_DATA__["']/.test(s.attributes));
  const page = nextData && JSON.parse(nextData.text)?.props?.pageProps;
  requireEvidence(page && page.isLoggedIn === false, "missing_evidence", "Missing anonymous PlayStation page");
  checkMarket(page.locale, target);
  const id = target.store_product_id;
  requireEvidence(page.productId === id, "sku_mismatch", "Page product differs from target");
  const main = page.batarangs?.cta;
  requireEvidence(Number(main?.statusCode) === 200, "missing_evidence", "Missing main purchase component");
  const entry = getScripts(main.text).find(s => /\bid=["']env:/.test(s.attributes));
  const env = entry && JSON.parse(entry.text);
  requireEvidence(env, "missing_evidence", "Missing purchase component data");
  checkMarket(env.overrides?.locale, target);
  const product = env.cache?.["Product:" + id];
  requireEvidence(env.args?.productId === id && product?.id === id, "sku_mismatch", "Purchase component product differs");
  const skus = new Set((product.skus || []).map(s => s.__ref));
  const refs = product.webctas;
  requireEvidence(Array.isArray(refs) && refs.length, "missing_evidence", "Missing product purchase items");
  const publicItems = [], memberItems = [], unavailable = [];
  for (const ref of refs) {
    const cta = env.cache[ref.__ref];
    requireEvidence(cta && cta.id && ref.__ref === "GameCTA:" + cta.id, "missing_evidence", "Unresolved purchase item");
    if (!["ADD_TO_CART", "UNAVAILABLE"].includes(cta.type)) continue;
    const params = Object.fromEntries((cta.action?.param || []).map(p => [p.name, p.value]));
    requireEvidence(skus.has("Sku:" + params.skuId) && params.skuId.startsWith(id + "-"), "sku_mismatch", "Mismatched cart SKU");
    if (cta.type === "UNAVAILABLE") {
      if (cta.id === product.activeCtaId && cta.action?.type === "OPEN_ERROR_DIALOG" &&
          cta.meta?.ineligibilityReasons?.some(reason => reason.type === "DONT_OWN")) unavailable.push(cta);
      continue;
    }
    if (params.rewardId !== "OUTRIGHT") continue;
    requireEvidence(cta.action.type === "ADD_TO_CART", "parse_ambiguous", "Unexpected cart action");
    const p = cta.price;
    if (p?.membershipType) {
      if (typeof p.membershipType === "string" && p.isTiedToSubscription === false) {
        memberItems.push({tier: p.membershipType, price: p});
      }
    } else if (p?.isExclusive === false && p.isTiedToSubscription === false &&
      p.applicability === "APPLICABLE" && p.qualifications?.length === 0 &&
      p.serviceBranding?.length === 1 && p.serviceBranding[0] === "NONE" && cta.meta?.exclusive === false &&
      cta.meta?.ineligibilityReasons?.length === 0 && cta.showSignInToOrderLabel === false) {
      publicItems.push(cta);
    } else if (p?.isExclusive !== true && p?.isTiedToSubscription !== true) {
      throw new EvidenceError("parse_ambiguous", "Unknown cart eligibility");
    }
  }
  if (unavailable.length === 1 && publicItems.length === 0 && refs.length === 1) {
    return {purchasable_status:"unavailable", proof:{product_id:page.productId, market_locale:page.locale, cta:unavailable[0].id, reasons:unavailable[0].meta?.ineligibilityReasons?.map(r=>r.type)}};
  }
  requireEvidence(publicItems.length === 1, "parse_ambiguous", "Expected one public outright cart item");
  const cta = publicItems[0], p = cta.price;
  requireEvidence(Number.isSafeInteger(p.discountedValue) && (p.basePriceValue == null || Number.isSafeInteger(p.basePriceValue)),
    "missing_evidence", "Missing minor-unit price");
  const result = priceFields(target, p.currencyCode, p.basePriceValue == null ? null : p.basePriceValue / 100,
    p.discountedValue / 100, p.endTime, observedAt);
  Object.assign(result, playStationMemberFields(memberItems, p, observedAt));
  return {purchasable_status:"available", ...result, proof:{product_id:page.productId, cta:cta.id, market_locale:page.locale, reward:"OUTRIGHT",
    observed_currency:p.currencyCode, public_minor:p.discountedValue, base_minor:p.basePriceValue}};
}
function xboxStructuredOffer(scripts, target, id) {
  const linked = scripts.filter(s => /application\/ld\+json/i.test(s.attributes))
    .flatMap(s => JSON.parse(s.text)["@graph"] || [])
    .filter(n => [n["@type"]].flat().includes("Product") && n.url &&
      new URL(n.url).pathname.split("/").filter(Boolean).at(-1)?.toUpperCase() === id);
  requireEvidence(linked.length === 1 && linked[0].offers?.["@type"] === "Offer",
    "missing_evidence", "Missing matching Xbox public offer");
  checkStoreUrl(linked[0].url, target);
  checkStoreUrl(linked[0].offers.url, target);
  return linked[0].offers;
}
function parseXbox(scripts, target, observedAt) {
  const source = scripts.find(s => /^\s*window\.__PRELOADED_STATE__\s*=/.test(s.text));
  const match = source?.text.match(/^\s*window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:window\.|$)/);
  requireEvidence(match, "missing_evidence", "Missing Xbox product state");
  const state = JSON.parse(match[1]);
  const market = state.appContext?.marketInfo?.market;
  requireEvidence(market && state.user?.isSignedIn === false, "missing_evidence", "Missing anonymous storefront market");
  requireEvidence(market === target.market, "region_mismatch", "Unexpected Xbox market: " + market);
  const id = target.store_product_id.toUpperCase(), products = state.core2?.products;
  const product = products?.productSummaries?.[id];
  requireEvidence(product?.productId === id, "sku_mismatch", "Target Xbox product missing");
  const skuId = product.preferredSkuId, sku = products.skuSummaries?.[id]?.[skuId];
  requireEvidence(sku?.productId === id && sku.skuId === skuId, "sku_mismatch", "Preferred Xbox SKU missing");
  requireEvidence(product.productKind === (target.offer_type === "full_game" ? "Game" : "Durable") &&
    sku.isGamesWithGoldSku === false, "parse_ambiguous", "Unexpected Xbox product or entitlement");
  const offers = products.availabilitySummaries?.[id]?.[skuId];
  const ld = xboxStructuredOffer(scripts, target, id);
  const unavailable = ["https://schema.org/OutOfStock", "https://schema.org/Discontinued", "https://schema.org/SoldOut"];
  if (unavailable.includes(ld.availability) && offers && Object.keys(offers).length > 0 &&
      Object.values(offers).every(item => Array.isArray(item.actions) && !item.actions.includes("Purchase"))) {
    return {purchasable_status:"unavailable", proof:{product_id:product.productId, sku:skuId, market, availability:ld.availability}};
  }
  requireEvidence(offers && Object.keys(offers).length, "missing_evidence", "Missing Xbox availability");
  const publicItems = [];
  for (const [key, item] of Object.entries(offers)) {
    if (!item.actions?.includes("Purchase")) continue;
    const price = item.price;
    requireEvidence(item.productId === id && item.skuId === skuId && item.availabilityId === key &&
      price?.skuId === skuId && price.availabilityId === key, "sku_mismatch", "Mismatched Xbox availability");
    requireEvidence(price.eligibilityInfo?.eligibility && typeof price.hasXPriceOffer === "boolean" &&
      price.availabilityActions?.includes("Purchase"), "parse_ambiguous", "Missing Xbox purchase eligibility");
    if (price.eligibilityInfo.eligibility === "None" && price.eligibilityInfo.type === "Unknown" && !price.hasXPriceOffer) publicItems.push(item);
  }
  requireEvidence(publicItems.length === 1, "parse_ambiguous", "Expected one unrestricted Xbox purchase item");
  const {price, availabilityId} = publicItems[0];
  const fields = priceFields(target, price.currency, price.msrp, price.listPrice, price.endDateUtc, observedAt);
  requireEvidence(ld.priceCurrency === fields.currency && typeof ld.price === "number" && ld.price === price.listPrice &&
    ld.availability === "https://schema.org/InStock", "parse_ambiguous", "Public offer disagrees with storefront availability");
  return {purchasable_status:"available", ...fields, included_in_subscription:Array.isArray(product.includedWithPassesProductIds)
    ? product.includedWithPassesProductIds.length > 0 : null,
    proof:{product_id:product.productId, sku:skuId, availability:availabilityId, market, eligibility:price.eligibilityInfo.eligibility,
      observed_currency:price.currency, list:price.listPrice, msrp:price.msrp, public_offer:ld.price}};
}
export function parseGameStorePage(target, finalUrl, html, observedAt = new Date().toISOString()) {
  try {
    checkStoreUrl(finalUrl, target);
    const parser = target.platform === "ps5" ? parsePlayStation : parseXbox;
    return {observed_at:observedAt, final_url:finalUrl, parser_version:target.platform + "-v1",
      ...parser(getScripts(html), target, observedAt)};
  } catch (error) {
    return {observed_at:observedAt, final_url:finalUrl, parser_version:target.platform + "-v1",
      failure_reason:error.reason || "parse_error", detail:error.reason ? error.message : "Invalid store page or structured data"};
  }
}
