import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { normalizeOfficialWebText } from './official-web-price-parsers.mjs';

export const appleMusicRule = 'apple-music-monthly-stability-v1';
export const appleMusicParserVersion = 'apple-music-official-web-v2';
export const appleMusicRegistry=JSON.parse(readFileSync(new URL('../../data/apple-music-official-markets.json',import.meta.url),'utf8'));
const legacyMarkets = {
  US: {locale:'en-US',currency:'USD',path:'',headings:['Individual','Family','Student']},
  BR: {locale:'pt-BR',currency:'BRL',path:'br/',headings:['Individual','Família','Universitária']},
  TR: {locale:'tr-TR',currency:'TRY',path:'tr/',headings:['Bireysel','Aile','Öğrenci']},
  JP: {locale:'ja-JP',currency:'JPY',path:'jp/',headings:['個人','ファミリー','学生']},
  DE: {locale:'de-DE',currency:'EUR',path:'de/',headings:['Einzelperson','Familie','Studierende']},
};
// Preserve the original five HTML identities and their real v2 sample history.
// New countries use country-bound, anonymous Web renewal offers. They are not
// App Store in-app prices, even when the storefront charge currency is shared.
export const appleMusicMarkets={...legacyMarkets,...Object.fromEntries(appleMusicRegistry.markets
  .filter(m=>!legacyMarkets[m.country_code]).map(m=>[m.country_code,{...m,format:'storefront_offers'}]))};
const offerEndpoint='https://buy.music.apple.com/commerce/web/subscription/offers/music';
const offerIds={individual:1608220330,family:1608221109,student:1608221191};
export function parseAppleMusicOfficialOffers(payload,{countryCode,currency,finalUrl,storefront}) {
  const result={parser_key:'apple_music',parser_version:appleMusicParserVersion,complete:false,candidates:[],issues:[]};
  const market=appleMusicMarkets[countryCode];
  if(!market || market.format!=='storefront_offers' || currency!==market.currency
    || finalUrl!==offerEndpoint || storefront!==market.storefront) {
    result.issues.push('official_storefront_mismatch');return result;
  }
  if(payload?.status!==0 || !Array.isArray(payload.offers)) {result.issues.push('official_offers_unavailable');return result;}
  const actual=payload.offers.map(o=>o.subscriptionType?.toLowerCase()).sort();
  if(JSON.stringify(actual)!==JSON.stringify([...market.required_plan_slugs].sort())) {
    result.issues.push('official_offer_plan_set_mismatch');return result;
  }
  for(const slug of market.required_plan_slugs) {
    const offer=payload.offers.find(o=>o.subscriptionType?.toLowerCase()===slug);
    if(offer.adamId!==offerIds[slug] || offer.renewalPeriod!=='P1M' || offer.isBundle!==false
      || offer.isOfferable!==true || offer.isSubscriptionShareable!==(slug==='family')
      || (slug==='student' && offer.isStudent!==true)) {
      result.issues.push(`official_monthly_offer_identity_mismatch:${slug}`);continue;
    }
    // `price` is the regular renewal amount. introOfferPrice / buyParams.price
    // describe the trial and must never become a published subscription price.
    const text=String(offer.price).normalize('NFKC').replace(/[\u200e\u200f\u061c]/g,'').trim();
    const parts=text.match(/^([^\d]*)(\d[\d.,\s]*)([^\d]*)$/);
    const marker=parts ? (parts[1]+parts[3]).replace(/\s/g,'') : null;
    if(marker!==market.currency_marker || !parts) {result.issues.push(`official_offer_currency_mismatch:${slug}`);continue;}
    let amount=parts[2].replace(/\s/g,'');
    const decimal=amount.match(/[.,](\d{2})$/);
    if(decimal){const whole=amount.slice(0,-3);
      if(!/^\d+$/.test(whole) && !/^\d{1,3}(?:[.,]\d{3})+$/.test(whole)) {
        result.issues.push(`official_offer_amount_unclear:${slug}`);continue;}
      amount=whole.replace(/[.,]/g,'')+'.'+decimal[1];}
    else if(/^\d{1,3}(?:[.,]\d{3})+$/.test(amount))amount=amount.replace(/[.,]/g,'');
    else if(!/^\d+$/.test(amount)) {result.issues.push(`official_offer_amount_unclear:${slug}`);continue;}
    const price=Number(amount);
    if(!Number.isFinite(price)||price<=0) {result.issues.push(`official_offer_amount_invalid:${slug}`);continue;}
    result.candidates.push({plan_slug:slug,plan_name:`Apple Music ${offer.subscriptionType}`,raw_price:price,currency,
      billing_cycle:'monthly',price_type:'list_price',observed_price_text:offer.price,
      evidence_text:`${countryCode}; storefront ${storefront}; ${offer.adamId}; ${offer.subscriptionType}; renewal P1M; ${offer.price}`,
      availability_note:slug==='student'?'Official Web monthly student renewal price; student eligibility verification is required.':
        slug==='family'?'Official Web monthly renewal price for the whole Family plan, up to six family members.':'Official Web monthly individual renewal list price.'});
  }
  result.complete=result.issues.length===0 && result.candidates.length===market.required_plan_slugs.length;
  return result;
}
const slugs = ['individual','family','student'];
const monthlyPrices = {
  USD: /\$([0-9]+\.[0-9]{2})\s*\/month\b/gi,
  BRL: /R\$\s*([0-9]+,[0-9]{2})\s+por\s+mês/gi,
  TRY: /Ayda\s+sadece\s+([0-9]+,[0-9]{2})\s*TL/gi,
  JPY: /月額([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)円/g,
  EUR: /([0-9]+,[0-9]{2})\s*€\s*\/Monat\b/gi,
};
function plain(html) {
  return normalizeOfficialWebText(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCodePoint(parseInt(hex || dec,hex?16:10)))
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&(?:lt|gt|quot|apos);/g,' '));
}
export function parseAppleMusicOfficialHtml(html, {countryCode,currency,finalUrl}) {
  const result={parser_key:'apple_music',parser_version:appleMusicParserVersion,complete:false,candidates:[],issues:[]};
  const market=appleMusicMarkets[countryCode];
  if(!market || currency!==market.currency || finalUrl!==`https://www.apple.com/${market.path}apple-music/`) {
    result.issues.push('official_market_mismatch');return result;
  }
  const safe=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const lang=safe.match(/<html\b[^>]*\slang=["']([^"']+)["']/i)?.[1];
  if(lang!==market.locale) {result.issues.push('official_locale_mismatch');return result;}
  const sections=[...safe.matchAll(/<section\b[^>]*\bid=["']plans["'][^>]*>([\s\S]*?)<\/section>/gi)];
  if(sections.length!==1) {result.issues.push('plan_section_missing_or_duplicate');return result;}
  const section=sections[0][1];
  const starts=[...section.matchAll(/<li\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)];
  for(const [index,slug] of slugs.entries()) {
    const matches=starts.filter(m=>m[1]===slug);
    if(matches.length!==1) {result.issues.push(`plan_identity_missing_or_duplicate:${slug}`);continue;}
    const start=matches[0],next=starts.find(m=>m.index>start.index);
    const block=section.slice(start.index,next?.index ?? section.length);
    const headings=[...block.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
    const headlines=[...block.matchAll(/<p\b[^>]*class=["'][^"']*\btile-headline\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)];
    if(headings.length!==1 || plain(headings[0][1])!==market.headings[index] || headlines.length!==1) {
      result.issues.push(`plan_identity_or_price_block_mismatch:${slug}`);continue;
    }
    const text=plain(headlines[0][1]);
    const prices=[...text.matchAll(monthlyPrices[currency])];
    // Only the official plan tile's explicit regular monthly amount counts.
    // FAQ, Apple One and trial cards elsewhere on the page never enter here.
    if(prices.length!==1 || /\b(?:year|annual|Jahr|ano|yıl)\b|年額|年間/i.test(text)) {
      result.issues.push(`monthly_list_price_unclear:${slug}`);continue;
    }
    const amount=prices[0][1];
    const price=Number(currency==='JPY'?amount.replaceAll(',',''):amount.replace(',','.'));
    // Refuse contradictory amounts, currencies or introductory paid offers.
    const money=text.match(/(?:R\$|US\$|\$|€|£|₺|TL|円)/g) ?? [];
    if(!Number.isFinite(price) || price<=0 || money.length!==1) {
      result.issues.push(`ambiguous_price:${slug}`);continue;
    }
    result.candidates.push({plan_slug:slug,plan_name:`Apple Music ${slug[0].toUpperCase()+slug.slice(1)}`,
      raw_price:price,currency,billing_cycle:'monthly',price_type:'list_price',observed_price_text:prices[0][0],
      evidence_text:`${slug}; ${market.headings[index]}; ${text}`,
      availability_note:slug==='student'?'Official Web monthly student price; student eligibility verification is required.':
        slug==='family'?'Official Web monthly price for the whole Family plan, up to six family members.':'Official Web monthly individual list price.'});
  }
  result.complete=result.issues.length===0 && result.candidates.length===3;
  return result;
}
export async function fetchAppleMusicOfficialSnapshot(market,http=fetch) {
  const allowed=appleMusicMarkets[market.country_code];
  if(allowed?.format==='storefront_offers') {
    if(market.locale!==allowed.locale || market.currency!==allowed.currency || market.url!==allowed.url
      || market.evidence_url!==offerEndpoint || market.storefront!==allowed.storefront)throw Error('unsupported_official_url');
    const captured_at=new Date().toISOString(),user_agent='GeoSub/1.0 official-price-evidence';
    const response=await http(offerEndpoint,{redirect:'error',signal:AbortSignal.timeout(20_000),
      headers:{'User-Agent':user_agent,Accept:'application/json','X-Apple-Store-Front':allowed.storefront}});
    if(response.status!==200 || !response.headers.get('content-type')?.includes('json'))throw Error(`official_page_unavailable:${response.status}`);
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>256*1024)throw Error('official_page_too_large');chunks.push(Buffer.from(value));}}
    finally{await reader.cancel().catch(()=>{});}
    const body=Buffer.concat(chunks),final_url=response.url || offerEndpoint;
    let payload;try{payload=JSON.parse(body.toString('utf8'));}catch{throw Error('official_offer_json_invalid');}
    return {ok:true,render_mode:'structured_http',http_status:response.status,source_url:market.url,final_url,user_agent,captured_at,
      evidence_type:'json',request_context:{country_code:market.country_code,storefront:allowed.storefront},
      content_hash:createHash('sha256').update(body).digest('hex'),
      parser_result:parseAppleMusicOfficialOffers(payload,{countryCode:market.country_code,currency:market.currency,finalUrl:final_url,storefront:allowed.storefront})};
  }
  if(!allowed || market.locale!==allowed.locale || market.currency!==allowed.currency
    || market.url!==`https://www.apple.com/${allowed.path}apple-music/`) throw Error('unsupported_official_url');
  const captured_at=new Date().toISOString(),user_agent='GeoSub/1.0 official-price-evidence';
  const response=await http(market.url,{redirect:'error',signal:AbortSignal.timeout(20_000),
    headers:{'User-Agent':user_agent,'Accept-Language':market.locale,Accept:'text/html'}});
  if(response.status!==200 || !response.headers.get('content-type')?.includes('text/html')) throw Error(`official_page_unavailable:${response.status}`);
  const reader=response.body.getReader(),chunks=[];let size=0;
  try {while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>2*1024*1024)throw Error('official_page_too_large');chunks.push(Buffer.from(value));}}
  finally {await reader.cancel().catch(()=>{});}
  const html=Buffer.concat(chunks).toString('utf8'),final_url=response.url || market.url;
  return {ok:true,render_mode:'structured_http',http_status:response.status,source_url:market.url,final_url,user_agent,captured_at,
    content_hash:createHash('sha256').update(html).digest('hex'),
    parser_result:parseAppleMusicOfficialHtml(html,{countryCode:market.country_code,currency:market.currency,finalUrl:final_url})};
}
