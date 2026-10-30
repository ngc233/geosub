import 'server-only';
import { getRegisteredContentTarget, assertContentTargetRuntime, type OverviewContent } from './managed-content';
import { getPublicPricingProduct } from './pricing-product-store';
import { renderFactContent } from './managed-content-facts';
/** Used only for token-bearing revisions; source templates/hashes stay immutable. */
export async function readFactContent(content:OverviewContent,targetId:string) {
 assertContentTargetRuntime(targetId);
 const target=getRegisteredContentTarget(targetId);
 const product=await getPublicPricingProduct(target.productSlug,target.locale);
 if(!product)throw Error('正式产品事实不可用。');
 return renderFactContent(content,targetId,product);
}
