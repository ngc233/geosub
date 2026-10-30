import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getPricingDetailProduct } from './pricing-detail-adapter';
import { assertContentTargetRuntime } from './managed-content';
import { projectClaudeFactProduct } from './managed-content-facts';
import { PUBLIC_PRICING_CACHE_TAG, getPublicPricingProductCacheTag, PUBLIC_PRICING_REVALIDATE_SECONDS } from './public-pricing-cache';
import type { SiteLocale } from './site-locale';

/** Same persistent price tags/TTL; React cache pins metadata/body to one request. */
export const getPublicPricingProduct = cache(async (slug:string,locale:SiteLocale) => {
 let factScope=false;
 if(slug==='claude' && (locale==='zh'||locale==='en')) {
  try { assertContentTargetRuntime(`overview:${locale}:claude`);factScope=true; } catch { /* Production expansion stays closed. */ }
 }
 const product=await unstable_cache(()=>getPricingDetailProduct(slug,locale,factScope),
  ['public-pricing-product',slug,locale,...(factScope?['claude-facts-v1']:[])],
  {revalidate:PUBLIC_PRICING_REVALIDATE_SECONDS,tags:[PUBLIC_PRICING_CACHE_TAG,getPublicPricingProductCacheTag(slug)]})();
 return product&&factScope?projectClaudeFactProduct(product):product;
});
