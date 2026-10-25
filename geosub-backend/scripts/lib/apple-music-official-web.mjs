import { createHash } from 'node:crypto';
import { normalizeOfficialWebText } from './official-web-price-parsers.mjs';

export const appleMusicRule = 'apple-music-monthly-stability-v1';
export const appleMusicParserVersion = 'apple-music-official-web-v2';
export const appleMusicMarkets = {
  US: {locale:'en-US',currency:'USD',path:'',headings:['Individual','Family','Student']},
  BR: {locale:'pt-BR',currency:'BRL',path:'br/',headings:['Individual','Família','Universitária']},
  TR: {locale:'tr-TR',currency:'TRY',path:'tr/',headings:['Bireysel','Aile','Öğrenci']},
  JP: {locale:'ja-JP',currency:'JPY',path:'jp/',headings:['個人','ファミリー','学生']},
  DE: {locale:'de-DE',currency:'EUR',path:'de/',headings:['Einzelperson','Familie','Studierende']},
};
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
