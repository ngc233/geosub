/** Fixed local Claude grammar. Never evaluate expressions or caller-provided paths. */
export const factPlanSlugs = ['pro', 'max-5x', 'max-20x'] as const;
export const factFields = ['name', 'price_range', 'regions', 'price_date', 'fx_date'] as const;
export const contentFactTokens: readonly string[] = Object.freeze(['product.name', ...factPlanSlugs.flatMap(plan => factFields.map(field => `${plan}.${field}`))]);
export const factTokenPattern = /\{\{([a-z0-9._-]+)\}\}/g;
export function hasContentFactTokens(content: unknown): boolean {
 if(typeof content !== 'object'||content===null)return false;
 const value=content as Record<string,unknown>;
 return JSON.stringify(['title','heading','description','sections','faqs'].map(key=>value[key])).includes('{{');
}
export function validateFactTemplate(text: string, targetId: string) {
 if(!text.includes('{{'))return text; // Preserve every pre-token plain-text revision.
 const stripped=text.replace(factTokenPattern,(_,name:string)=>{
  if(!['overview:zh:claude','overview:en:claude'].includes(targetId)||!contentFactTokens.includes(name))throw Error('未登记的动态事实 token。');
  return '';
 });
 if(stripped.includes('{{')||stripped.includes('}}'))throw Error('动态事实 token 格式无效。');
 return stripped;
}
