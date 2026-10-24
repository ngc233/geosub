import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const spotifyParserVersion = 'spotify-official-web-v2';
export const spotifyRegistry = JSON.parse(readFileSync(new URL('../../data/spotify-official-markets.json', import.meta.url), 'utf8'));
export const spotifyMarkets = Object.freeze(spotifyRegistry.markets);
const identities = {
  individual: ['PREMIUM_INDIVIDUAL', 'premium-individual', 'Premium Individual'],
  family: ['PREMIUM_FAMILY', 'premium-family', 'Premium Family'],
};

function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Grammars describe an explicit monthly charge, never a numeric substring or
// an introductory offer. Currency position and separators are market scoped.
const monthlyGrammars = {
  en: 'MONEY\\s*(?:\\(incl\\. VAT\\))?\\s*(?:/\\s*month|per month)(?:\\s+after)?(?:\\. Cancel anytime\\.)?',
  sw: 'MONEY (?:kila mwezi baada ya hapo|kwa mwezi)',
  fr: 'MONEY\\s*(?:/\\s*mois|par mois)(?: ensuite)?',
  ja: '(?:キャンペーン期間終了後は)?月額MONEY',
  zh: '(?:後續)?每月(?:只要)?\\s*MONEY',
  ca: '(?:Després pagaràs )?MONEY al mes',
  de: '(?:Danach )?MONEY\\s*/\\s*Monat',
  nl: '(?:Daarna )?MONEY per maand',
  cs: '(?:Potom )?MONEY\\s*/měsíc',
  es: '(?:Después, (?:cuesta )?)?MONEY\\*{0,3}\\s*(?:/mes|al mes|por mes)',
  fi: '(?:Myöhemmin )?MONEY\\s*(?:/kk|kuukaudessa)',
  el: 'MONEY\\s*/\\s*μήνα(?: στη συνέχεια)?',
  hu: '(?:Utána )?MONEY/hó',
  it: '(?:Dopo, )?MONEY (?:al mese|/ mese)',
  pl: '(?:Po tym okresie )?MONEY(?:/miesiąc\\.?| miesięcznie)',
  sv: 'MONEY/månad(?: därefter)?',
};

function moneyPattern(market) {
  const group = escapeRegex(market.group), decimal = escapeRegex(market.decimal);
  const number = `((?:[1-9]\\d{0,2}(?:${group}\\d{3})+|0|[1-9]\\d*)(?:${decimal}\\d{2})?)(?!\\d|[.,]\\d)`;
  const symbol = escapeRegex(market.symbol);
  return market.symbol_position === 'prefix' ? `${symbol}\\s*${number}` : `${number}\\s*${symbol}`;
}
function numericPrice(value, market) {
  return Number(value.replaceAll(market.group, '').replace(market.decimal, '.'));
}
function monthlyPrice(text, market) {
  const grammar = monthlyGrammars[market.language];
  if (!grammar) return null;
  const match = plain(text).match(new RegExp(`^${grammar.replace('MONEY', moneyPattern(market))}$`, 'i'));
  if (!match) return null;
  const value = numericPrice(match[1], market);
  return Number.isFinite(value) && value > 0 && value < 1_000_000 ? value : null;
}

function legalMonthlyPrices(text, market) {
  const money = moneyPattern(market);
  const suffix = '(?:per\\s+month|/\\s*month|par mois|/\\s*mois|kwa mwezi|kila mwezi|pro Monat|/\\s*Monat|per maand|/\\s*měsíc|al mes|por mes|/\\s*mes|kuukaudessa|/kk|/\\s*μήνα|/hó|al mese|/\\s*mese|miesięcznie|/miesiąc|/månad)';
  const pattern = ['ja','zh'].includes(market.language)
    ? `(?:月額|每月(?:只要)?)\\s*${money}` : `${money}\\*{0,3}\\s*(?:\\(incl\\. VAT\\))?\\s*${suffix}`;
  return [...text.matchAll(new RegExp(pattern, 'gi'))].map(match => numericPrice(match[1], market));
}

// The public server response contains the same plan cards rendered to visitors.
// Read the explicit recurring price field, never an introductory-price lozenge.
export function parseSpotifyOfficialHtml(html, { countryCode, currency, finalUrl }) {
  const result = { parser_key: 'spotify_official_web', parser_version: spotifyParserVersion,
    complete: false, candidates: [], issues: [] };
  const market = spotifyMarkets[countryCode];
  const officialUrl = market && `https://www.spotify.com/${market.path}/premium/`;
  if (!market || currency !== market.currency || finalUrl !== officialUrl) {
    result.issues.push('official_market_mismatch');
    return result;
  }
  try {
    const scripts = [...String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(match => /\bid=["']__NEXT_DATA__["']/.test(match[1]));
    if (scripts.length !== 1) throw Error('structured_page_missing');
    const props = JSON.parse(scripts[0][2]).props?.pageProps;
    if (props?.metadata?.country !== countryCode || props?.metadata?.market !== market.path
      || props?.basePageProps?.country !== countryCode || props?.basePageProps?.market !== market.path) {
      throw Error('structured_country_mismatch');
    }
    // Spotify serves both the legacy component array and a named component
    // object. In the latter, only storefront plans are purchase cards; the
    // benefits comparison also has a plans array but is not price evidence.
    const components = props.components;
    const cards = Array.isArray(components)
      ? components.flatMap(component => component.attributes?.plans ?? [])
      : components && !Array.isArray(components) && Array.isArray(components.storefront?.plans)
        ? components.storefront.plans
        : [];
    for (const slug of market.plan_slugs) {
      const [id, identifier, header] = identities[slug];
      const allMatches = cards.filter(card => card.planId === id);
      // Family 4 and Family 6 share Spotify IDs. The canonical Family plan is
      // six accounts; require both its exact localized header and capacity.
      const matches = allMatches.length > 1 && slug === 'family'
        ? allMatches.filter(card => plain(card.header) === market.headers.family
          && card.benefits?.some(benefit => benefit.benefitType === 'ACCOUNTS_DESCRIPTION' && /\b6\b/.test(plain(benefit.children))))
        : allMatches;
      if (matches.length !== 1) { result.issues.push(`plan_identity_missing_or_duplicate:${slug}`); continue; }
      const card = matches[0];
      if (card.planIdentifier !== identifier || plain(card.header) !== market.headers[slug]
        || card.isRecurringProduct !== true || card.hasNonRecurringProduct !== false
        || (slug === 'family' && /\b6$/.test(market.headers.family)
          && !card.benefits?.some(benefit => benefit.benefitType === 'ACCOUNTS_DESCRIPTION' && /\b6\b/.test(plain(benefit.children))))) {
        result.issues.push(`plan_identity_or_cycle_mismatch:${slug}`); continue;
      }
      // A promotion must explicitly state its later recurring monthly price.
      const regularText = plain(card.secondaryPriceDescription || card.primaryPriceDescription);
      const price = monthlyPrice(regularText, market);
      if (price == null || card.additionalPriceDescription) {
        result.issues.push(`monthly_list_price_unclear:${slug}`); continue;
      }
      const legal = plain(card.legalDisclaimer);
      // Contradictory regular monthly amounts anywhere in this plan's legal copy
      // indicate a changed schema/offer. Introductory zeroes are not candidates.
      const renewalBoundary = {en:/\bthen\b/i,fr:/\bpuis\b/i,sw:/\bkisha\b/i,ja:/その後/,zh:/之後/}[market.language];
      const recurringLegal = card.secondaryPriceDescription && renewalBoundary ? legal.split(renewalBoundary).at(-1) : legal;
      const legalPrices = legalMonthlyPrices(recurringLegal, market);
      if (legalPrices.some(value => value !== price)) {
        result.issues.push(`conflicting_recurring_prices:${slug}`); continue;
      }
      const purchase = new URL(card.button?.href ?? '');
      if (purchase.protocol !== 'https:' || purchase.hostname !== 'www.spotify.com'
        || !purchase.pathname.startsWith(`/${market.path}/`)
        || (purchase.searchParams.has('country') && purchase.searchParams.get('country') !== countryCode)) {
        result.issues.push(`purchase_market_mismatch:${slug}`); continue;
      }
      result.candidates.push({ plan_slug: slug, plan_name: `Spotify ${header}`,
        raw_price: price, currency: market.currency, billing_cycle: 'monthly', price_type: 'list_price',
        observed_price_text: regularText,
        evidence_text: `${id}; ${header}; ${regularText}; ${legal}`.slice(0, 1800),
        availability_note: slug === 'family'
          ? `Official ${countryCode} Web monthly price for the whole Family plan; household eligibility and taxes are determined by Spotify at checkout.`
          : `Official ${countryCode} Web regular monthly price after any introductory offer; eligibility and taxes are determined by Spotify at checkout.`,
      });
    }
    result.complete = result.issues.length === 0 && result.candidates.length === market.plan_slugs.length;
  } catch (error) {
    result.issues.push(error instanceof SyntaxError ? 'invalid_structured_json' : error.message);
  }
  return result;
}

export async function fetchSpotifyOfficialSnapshot(market, http = fetch) {
  const allowed = spotifyMarkets[market.country_code];
  if (!allowed || market.currency !== allowed.currency || market.locale !== allowed.locale
    || market.url !== `https://www.spotify.com/${allowed.path}/premium/`) throw Error('unsupported_official_url');
  const capturedAt = new Date().toISOString();
  const userAgent = 'GeoSub/1.0 official-price-evidence';
  // Do not follow a geo/login redirect and accidentally label another market US.
  const response = await http(market.url, { redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': userAgent, 'Accept-Language': market.locale, Accept: 'text/html' } });
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
