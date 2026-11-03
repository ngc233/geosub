import type { ProductPlan, RegionPrice } from "./public-pricing-model.ts";

export type ComparisonQuote = Pick<RegionPrice,"code"|"country"|"priceUsd"|"localPrice"|"lastCheckedAt"|"fxRateDate"|"observationId"> & {tax:string};
export type ComparisonPlan = {slug:string;name:string;billing:ProductPlan["billing"];platform:string;href:string;regions:ComparisonQuote[]};
export type ComparisonRow = {code:string;country:string;quotes:Record<string,ComparisonQuote>};
export const comparisonScope = (plan:Pick<ComparisonPlan,"platform"|"billing">) => `${plan.platform}:${plan.billing}`;
export function comparisonRows(plans:readonly ComparisonPlan[],query:string,sortPlan:string,descending=false) {
  if(new Set(plans.map(comparisonScope)).size>1)throw new Error("Comparison requires one platform and billing cycle.");
  const rows=new Map<string,ComparisonRow>();
  for(const plan of plans)for(const quote of plan.regions){
    const row:ComparisonRow=rows.get(quote.code)||{code:quote.code,country:quote.country,quotes:{}};
    row.quotes[plan.slug]=quote;rows.set(quote.code,row);
  }
  const search=query.trim().toLocaleLowerCase();
  return [...rows.values()].filter(row=>`${row.code} ${row.country}`.toLocaleLowerCase().includes(search)).sort((a,b)=>{
    const left=a.quotes[sortPlan]?.priceUsd,right=b.quotes[sortPlan]?.priceUsd;
    if(left===undefined)return right===undefined?a.code.localeCompare(b.code):1;
    if(right===undefined)return -1;
    return (left-right)*(descending?-1:1)||a.code.localeCompare(b.code);
  });
}
export function quoteDifference(quote:ComparisonQuote|undefined,reference:ComparisonQuote|undefined) {
  return quote&&reference&&reference.priceUsd>0 ? Math.round((quote.priceUsd/reference.priceUsd-1)*100) : null;
}

/** Keep the chosen plan's price anchors visible without changing the active sort or search. */
export function comparisonPreview(rows:readonly ComparisonRow[],sortPlan:string,limit=4):ComparisonRow[] {
  if(rows.length<=limit)return [...rows];
  const priced=rows.filter(row=>Number.isFinite(row.quotes[sortPlan]?.priceUsd)&&row.quotes[sortPlan].priceUsd>0);
  const selected=new Set([priced[0]?.code,priced.find(row=>row.code==="US")?.code,priced.at(-1)?.code].filter((code):code is string=>Boolean(code)));
  for(const row of rows){if(selected.size>=limit)break;selected.add(row.code);}
  return rows.filter(row=>selected.has(row.code));
}
