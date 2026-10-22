import { createHash } from 'node:crypto';

export const spotifyParserVersion = 'spotify-us-official-web-v1';
const officialUrl = 'https://www.spotify.com/us/premium/';
const identities = {
  individual: ['PREMIUM_INDIVIDUAL', 'premium-individual', 'Premium Individual'],
  family: ['PREMIUM_FAMILY', 'premium-family', 'Premium Family'],
};

function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// The public server response contains the same plan cards rendered to visitors.
// Read the explicit recurring price field, never an introductory-price lozenge.
export function parseSpotifyOfficialHtml(html, { countryCode, currency, finalUrl }) {
  const result = { parser_key: 'spotify_us', parser_version: spotifyParserVersion,
    complete: false, candidates: [], issues: [] };
  if (countryCode !== 'US' || currency !== 'USD' || finalUrl !== officialUrl) {
    result.issues.push('official_market_mismatch');
    return result;
  }
  try {
    const scripts = [...String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(match => /\bid=["']__NEXT_DATA__["']/.test(match[1]));
    if (scripts.length !== 1) throw Error('structured_page_missing');
    const props = JSON.parse(scripts[0][2]).props?.pageProps;
    if (props?.metadata?.country !== 'US' || props?.metadata?.market !== 'us'
      || props?.basePageProps?.country !== 'US' || props?.basePageProps?.market !== 'us') {
      throw Error('structured_country_mismatch');
    }
    const cards = (props.components ?? []).flatMap(component => component.attributes?.plans ?? []);
    for (const [slug, [id, identifier, header]] of Object.entries(identities)) {
      const matches = cards.filter(card => card.planId === id);
      if (matches.length !== 1) { result.issues.push(`plan_identity_missing_or_duplicate:${slug}`); continue; }
      const card = matches[0];
      if (card.planIdentifier !== identifier || card.header !== header
        || card.isRecurringProduct !== true || card.hasNonRecurringProduct !== false) {
        result.issues.push(`plan_identity_or_cycle_mismatch:${slug}`); continue;
      }
      // A promotion must explicitly state its later recurring monthly price.
      const regularText = plain(card.secondaryPriceDescription || card.primaryPriceDescription);
      const price = regularText.match(/^\$(\d+(?:\.\d{2})?)\s*\/\s*month(?:\s+after)?$/);
      if (!price || card.additionalPriceDescription || Number(price[1]) < 1 || Number(price[1]) > 100) {
        result.issues.push(`monthly_list_price_unclear:${slug}`); continue;
      }
      const legal = plain(card.legalDisclaimer);
      // Contradictory regular monthly amounts anywhere in this plan's legal copy
      // indicate a changed schema/offer. Introductory zeroes are not candidates.
      const legalPrices = [...legal.matchAll(/\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*month\b/gi)]
        .map(match => Number(match[1]));
      if (legalPrices.some(value => value !== Number(price[1]))) {
        result.issues.push(`conflicting_recurring_prices:${slug}`); continue;
      }
      const purchase = new URL(card.button?.href ?? '');
      if (purchase.protocol !== 'https:' || purchase.hostname !== 'www.spotify.com'
        || !purchase.pathname.startsWith('/us/') || purchase.searchParams.get('country') !== 'US') {
        result.issues.push(`purchase_market_mismatch:${slug}`); continue;
      }
      result.candidates.push({ plan_slug: slug, plan_name: `Spotify ${header}`,
        raw_price: Number(price[1]), currency: 'USD', billing_cycle: 'monthly', price_type: 'list_price',
        observed_price_text: regularText,
        evidence_text: `${id}; ${header}; ${regularText}; ${legal}`.slice(0, 1800),
        availability_note: slug === 'family'
          ? 'Official US Web monthly price. For up to 6 family members residing at the same address; eligibility and taxes are determined by Spotify at checkout.'
          : 'Official US Web regular monthly price after any introductory offer; eligibility and taxes are determined by Spotify at checkout.',
      });
    }
    result.complete = result.issues.length === 0 && result.candidates.length === 2;
  } catch (error) {
    result.issues.push(error instanceof SyntaxError ? 'invalid_structured_json' : error.message);
  }
  return result;
}

export async function fetchSpotifyOfficialSnapshot(market, http = fetch) {
  if (market.url !== officialUrl) throw Error('unsupported_official_url');
  const capturedAt = new Date().toISOString();
  const userAgent = 'GeoSub/1.0 official-price-evidence';
  // Do not follow a geo/login redirect and accidentally label another market US.
  const response = await http(market.url, { redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': userAgent, 'Accept-Language': 'en-US', Accept: 'text/html' } });
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
    throw Error(`official_page_unavailable:${response.status}`);
  }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) throw Error('official_page_too_large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  const html = Buffer.concat(chunks).toString('utf8');
  const finalUrl = response.url || market.url;
  return { ok: true, render_mode: 'structured_http', http_status: response.status,
    source_url: market.url, final_url: finalUrl, user_agent: userAgent, captured_at: capturedAt,
    content_hash: createHash('sha256').update(html).digest('hex'),
    parser_result: parseSpotifyOfficialHtml(html, { countryCode: market.country_code, currency: market.currency, finalUrl }) };
}
