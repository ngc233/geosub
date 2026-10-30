import { createHash } from 'node:crypto';
import { getPlanFreshness, type SubscriptionProduct, type RegionPrice } from './public-pricing-model.ts';
import type { OverviewContent } from './managed-content.ts';
import { factPlanSlugs, factTokenPattern, hasContentFactTokens } from './content-fact-tokens.ts';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function date(value:string|undefined) {
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
 const time=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?value:undefined;
}
/** The input DTO comes only from published product/plan/region_prices SQL.
 * Limit this projection to the newly registered local Claude views.
 */
export function projectClaudeFactProduct(product:SubscriptionProduct):SubscriptionProduct {
 if(product.slug!=='claude')throw Error('事实产品不匹配。');
 const plans=product.plans.filter(plan=>(factPlanSlugs as readonly string[]).includes(plan.slug)).map(plan=>{
  const eligible=plan.priceStatus==='published'&&plan.billing==='monthly'?plan.regions.filter(r=>
   r.priceType==='list_price'&&r.billingPlatform==='ios'&&r.dataQuality==='verified'&&(r.confidenceScore??0)>=80&&
   Number.isFinite(r.priceUsd)&&r.priceUsd>0&&Number.isFinite(r.localPriceValue)&&(r.localPriceValue??0)>0&&
   /^[A-Z]{2}$/.test(r.code)&&/^[A-Z]{3}$/.test(r.currencyCode??'')&&Boolean(date(r.lastCheckedAt))):[];
  const counts=new Map<string,number>();for(const r of eligible)counts.set(r.code,(counts.get(r.code)??0)+1);
  const regions=eligible.filter(r=>counts.get(r.code)===1).map(r=>({...r,fxRateDate:date(r.formalFxRateDate)})).sort((a,b)=>a.priceUsd-b.priceUsd).map((r,i)=>({...r,rank:i+1}));
  return {...plan,regions,freshness:getPlanFreshness(regions)};
 });
 return {...product,plans,updatedAt:getPlanFreshness(plans.flatMap(p=>p.regions)).priceCollectedAt??''};
}
function range(regions:RegionPrice[],field:'lastCheckedAt'|'fxRateDate',zh:boolean) {
 const dates=regions.map(r=>date(r[field]));
 if(!dates.length||dates.some(d=>!d))return zh?'日期不可用':'date unavailable';
 const sorted=dates.filter((d):d is string=>Boolean(d)).sort();
 return sorted[0]===sorted.at(-1)?sorted[0]:`${sorted[0]}${zh?' 至 ':' to '}${sorted.at(-1)}`;
}
export function claudeFactSnapshot(product:SubscriptionProduct) {
 if(product.slug!=='claude')throw Error('事实产品不匹配。');
 const rows=product.plans.map(p=>({slug:p.slug,name:p.name,billing:p.billing,regions:p.regions.map(r=>({id:r.priceRecordId,code:r.code,usd:r.priceUsd,local:r.localPriceValue,currency:r.currencyCode,platform:r.billingPlatform,type:r.priceType,date:r.lastCheckedAt,fx:r.fxRateDate})).sort((a,b)=>a.code.localeCompare(b.code))})).sort((a,b)=>a.slug.localeCompare(b.slug));
 return hash({schema:'claude-ios-monthly-list-v1',product:product.name,rows});
}
/** Returns a fresh rendering, never mutates the persisted template or price DTO. */
export function renderFactContent(content:OverviewContent,targetId:string,product:SubscriptionProduct) {
 if(!hasContentFactTokens(content))return {content,factsHash:undefined};
 if(!['overview:zh:claude','overview:en:claude'].includes(targetId)||product.slug!=='claude')throw Error('动态事实目标不匹配。');
 product=projectClaudeFactProduct(product);
 const zh=targetId==='overview:zh:claude';
 const values:Record<string,string>={'product.name':product.name};
 for(const slug of factPlanSlugs) {
  const plan=product.plans.find(p=>p.slug===slug),regions=plan?.regions??[];
  const unavailable=zh?'月付 App Store 数据不可用':'monthly App Store data unavailable';
  values[slug+'.name']=plan?.name||(zh?'套餐名称不可用':'plan name unavailable');
  values[slug+'.price_range']=!regions.length?unavailable:zh?`月付 App Store USD $${Math.min(...regions.map(r=>r.priceUsd)).toFixed(2)}–$${Math.max(...regions.map(r=>r.priceUsd)).toFixed(2)}`:`monthly App Store USD $${Math.min(...regions.map(r=>r.priceUsd)).toFixed(2)}–$${Math.max(...regions.map(r=>r.priceUsd)).toFixed(2)}`;
  values[slug+'.regions']=!regions.length?unavailable:zh?`月付 App Store ${regions.length} 个地区`:`monthly App Store ${regions.length} ${regions.length===1?'region':'regions'}`;
  values[slug+'.price_date']=zh?`价格采集：${range(regions,'lastCheckedAt',zh)}`:`price collected: ${range(regions,'lastCheckedAt',zh)}`;
  values[slug+'.fx_date']=zh?`汇率日期：${range(regions,'fxRateDate',zh)}`:`FX date: ${range(regions,'fxRateDate',zh)}`;
 }
 const resolve=(text:string,max:number)=>{
  const rendered=text.replace(factTokenPattern,(_,name:string)=>{if(!Object.hasOwn(values,name))throw Error('未登记的动态事实 token。');return values[name];});
  // Never truncate an amount, date or scope label into a misleading claim.
  return rendered.length<=max?rendered:zh?'动态事实超出显示长度，请查看正式价格表。':'Dynamic facts exceed the display limit; see the published price table.';
 };
 return {factsHash:claudeFactSnapshot(product),content:{title:resolve(content.title,80),heading:resolve(content.heading,100),description:resolve(content.description,240),sections:content.sections.map(s=>({heading:resolve(s.heading,100),body:resolve(s.body,2000)})),faqs:content.faqs.map(f=>({q:resolve(f.q,180),a:resolve(f.a,1200)})),sources:[...content.sources]}};
}
