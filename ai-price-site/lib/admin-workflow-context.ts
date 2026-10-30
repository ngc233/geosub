export type AdminProductFilter = { product: string; q: string; platform: "" | "ios" | "web" };
type Value = string | string[] | undefined;
const first = (value: Value) => Array.isArray(value) ? value[0] : value;

export function parseAdminProductFilter(raw: {product?:Value;q?:Value;platform?:Value}): AdminProductFilter {
  // An explicit unknown product must yield an empty result, never the global list.
  const product = (first(raw.product) || "").trim().toLowerCase().slice(0,120);
  const q = (first(raw.q) || "").trim().slice(0,100);
  const platform = first(raw.platform);
  return {product,q,platform:platform === "ios" || platform === "web" ? platform : ""};
}

export function matchesAdminProduct(row:{slug:string;name:string}, filter:AdminProductFilter) {
  if (filter.product) return row.slug.toLowerCase() === filter.product;
  const q=filter.q.toLowerCase();
  return !q || row.slug.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
}

const returnPaths = new Set(["/admin","/admin/products","/admin/plans","/admin/articles","/admin/articles/trash","/admin/articles/taxonomy","/admin/navigation","/admin/prices","/admin/pipeline","/admin/collector-jobs","/admin/data-quality","/admin/seo","/admin/review","/admin/discovery","/admin/contact-tickets"]);

/** Only relative admin locations are accepted, including when returned by a POST. */
export function safeAdminHref(value:unknown, fallback="/admin") {
  if(typeof value!=="string" || value.length>3000 || !value.startsWith("/admin") || /[\\\r\n\u0000-\u001f]/.test(value))return fallback;
  try {
    const url=new URL(value,"http://admin.local");
    const decoded=decodeURIComponent(url.pathname);
    if(url.origin!=="http://admin.local" || !/^\/admin(?:\/|$)/.test(decoded) || /[\\\r\n]/.test(decoded) || decoded.includes(".."))return fallback;
    return url.pathname+url.search+url.hash;
  } catch { return fallback; }
}

export function safeAdminReturnTo(value:unknown,fallback="/admin/products") {
  const safe=safeAdminHref(value,"");
  if(!safe)return fallback;
  const url=new URL(safe,"http://admin.local");
  if(!returnPaths.has(url.pathname))return fallback;
  // Do not carry nested navigation contexts or transient operation receipts.
  for(const key of [...url.searchParams.keys()])if(key==="returnTo" || /(?:saved|created|error|batch|collectionRun|collectionQueued|runId)/i.test(key))url.searchParams.delete(key);
  return url.pathname+url.search+url.hash;
}

export function withAdminReturnTo(href:string,returnTo:string) {
  const url=new URL(safeAdminHref(href),"http://admin.local");
  url.searchParams.set("returnTo",safeAdminReturnTo(returnTo));
  return url.pathname+url.search+url.hash;
}


export function adminListLocation(base:string,params:Record<string,string|string[]|number|undefined>,rowId?:string){
 const url=new URL(base,"http://admin.local");
 for(const [key,value] of Object.entries(params))if(value!==undefined && value!=="")for(const part of Array.isArray(value)?value:[String(value)])url.searchParams.append(key,part);
 if(rowId)url.hash=rowId;
 return safeAdminReturnTo(url.pathname+url.search+url.hash,base);
}


/** Navigation is allowed only after an explicit successful save result. */
export function adminSaveDestination(result:unknown, values:{intent:unknown;returnTo:unknown}) {
 if(!result || typeof result!=="object" || ("error" in result && result.error) || ("ok" in result && result.ok===false))return null;
 if("redirectTo" in result && typeof result.redirectTo==="string")return safeAdminHref(result.redirectTo,"") || null;
 const confirmed=("recordVersion" in result && typeof result.recordVersion==="string") || ("message" in result && typeof result.message==="string") || ("ok" in result && result.ok===true);
 return confirmed && values.intent==="return" ? safeAdminReturnTo(values.returnTo) : null;
}
