import {COUNTRY_PAGE_MAX_PRICE_AGE_DAYS,COUNTRY_PAGE_MIN_PRICE_CONFIDENCE} from "./country-page-readiness.ts";
import {getDefaultPlanRegions,type ProductCategory,type ProductPlan,type RegionPrice} from "./public-pricing-model.ts";
export type GuidePriceContext={category:ProductCategory;productSlug:string;planSlug?:string};
/** A read-only regional quote view using the existing published-price freshness boundary. */
export function selectGuideQuotes(plan:ProductPlan,now=new Date()):RegionPrice[] {
  const rows=getDefaultPlanRegions(plan).filter(row=>{
    const age=now.getTime()-Date.parse(row.lastCheckedAt||"");
    return row.dataQuality==="verified"&&(row.confidenceScore??0)>=COUNTRY_PAGE_MIN_PRICE_CONFIDENCE
      &&row.priceType==="list_price"&&Number.isFinite(row.priceUsd)&&row.priceUsd>0
      &&Number.isFinite(age)&&age>=0&&age<=COUNTRY_PAGE_MAX_PRICE_AGE_DAYS*86_400_000;
  }).toSorted((a,b)=>a.priceUsd-b.priceUsd);
  const us=rows.find(row=>row.code==="US");
  if(!us||new Set(rows.map(row=>row.code)).size<3)return rows.slice(0,1);
  const result=[rows[0],us,rows.at(-1)!].filter((row,index,array)=>array.findIndex(item=>item.code===row.code)===index);
  for(const row of rows)if(result.length<3&&!result.some(item=>item.code===row.code))result.push(row);
  return result;
}
export function guidePriceContextFromLinks(links:readonly {href:string}[]):GuidePriceContext|undefined {
  for(const link of links){const match=link.href.match(/^\/zh\/(ai|streaming)-pricing\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);if(match)return{category:match[1]==="ai"?"ai":"streaming",productSlug:match[2],planSlug:match[3]};}
}
