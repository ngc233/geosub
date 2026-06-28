export type CmsProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  provider: string | null;
  logo_url: string | null;
  description: string | null;
  official_url: string | null;
  status: string;
};

export type CmsPlan = {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  billing_cycle: string;
  description: string | null;
  status: string;
  sort_order: number;
};

export type CmsCountry = {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  currency: string;
  region: string | null;
  is_reference: boolean;
};

export type CmsRegionPrice = {
  id: string;
  product_id: CmsProduct | string;
  plan_id: CmsPlan | string;
  country_id: CmsCountry | string;
  local_price: string;
  currency: string;
  price_usd: string;
  us_base_price: string | null;
  diff_vs_us_percent: string | null;
  billing_platform: string;
  price_type: string;
  tax_note: string | null;
  availability_note: string | null;
  source_summary: string | null;
  confidence_score: number;
  data_quality: string;
  status: string;
  last_checked_at: string | null;
  published_at: string | null;
};

export type CmsSeoMeta = {
  id: string;
  locale: string;
  title: string;
  description: string | null;
  h1: string | null;
  canonical_url: string | null;
  status: string;
};

export type CmsFaq = {
  id: string;
  locale: string;
  question: string;
  answer: string;
  sort_order: number;
  status: string;
};

export type CmsAffiliateLink = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  button_text: string | null;
  url: string;
  placement: string;
  locale: string;
  priority: number;
  status: string;
};

export type CmsProductPricingPage = {
  product: CmsProduct;
  plans: CmsPlan[];
  activePlan: CmsPlan;
  prices: CmsRegionPrice[];
  seo: CmsSeoMeta | null;
  faqs: CmsFaq[];
  affiliateLinks: CmsAffiliateLink[];
};

type DirectusListResponse<T> = {
  data: T[];
};

function getDirectusConfig() {
  const url = process.env.DIRECTUS_URL;
  const token = process.env.DIRECTUS_TOKEN;

  if (!url) {
    throw new Error('Missing DIRECTUS_URL in .env.local');
  }

  if (!token) {
    throw new Error('Missing DIRECTUS_TOKEN in .env.local');
  }

  return {
    url: url.replace(/\/$/, ''),
    token,
  };
}

async function directusGet<T>(path: string): Promise<T> {
  const { url, token } = getDirectusConfig();

  const response = await fetch(`${url}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Directus request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

export async function getCmsProductBySlug(slug: string) {
  const query = toQuery({
    'filter[slug][_eq]': slug,
    'filter[status][_eq]': 'published',
    limit: 1,
  });

  const result = await directusGet<DirectusListResponse<CmsProduct>>(
    `/items/products?${query}`,
  );

  return result.data[0] ?? null;
}

export async function getCmsProductPricingPage(
  productSlug: string,
  planSlug = 'plus',
  locale = 'zh',
): Promise<CmsProductPricingPage | null> {
  const product = await getCmsProductBySlug(productSlug);

  if (!product) {
    return null;
  }

  const plansQuery = toQuery({
    'filter[product_id][_eq]': product.id,
    'filter[status][_eq]': 'published',
    sort: 'sort_order',
  });

  const plansResult = await directusGet<DirectusListResponse<CmsPlan>>(
    `/items/plans?${plansQuery}`,
  );

  const plans = plansResult.data;
  const activePlan = plans.find((plan) => plan.slug === planSlug) ?? plans[0];

  if (!activePlan) {
    return null;
  }

  const pricesQuery = toQuery({
    'filter[product_id][_eq]': product.id,
    'filter[plan_id][_eq]': activePlan.id,
    'filter[status][_eq]': 'published',
    fields:
      '*,country_id.id,country_id.code,country_id.name_zh,country_id.name_en,country_id.currency,country_id.region,country_id.is_reference',
    sort: 'price_usd',
  });

  const pricesResult = await directusGet<DirectusListResponse<CmsRegionPrice>>(
    `/items/region_prices?${pricesQuery}`,
  );

  const seoQuery = toQuery({
    'filter[product_id][_eq]': product.id,
    'filter[locale][_eq]': locale,
    'filter[status][_eq]': 'published',
    limit: 1,
  });

  const seoResult = await directusGet<DirectusListResponse<CmsSeoMeta>>(
    `/items/seo_meta?${seoQuery}`,
  );

  const faqQuery = toQuery({
    'filter[product_id][_eq]': product.id,
    'filter[locale][_eq]': locale,
    'filter[status][_eq]': 'published',
    sort: 'sort_order',
  });

  const faqResult = await directusGet<DirectusListResponse<CmsFaq>>(
    `/items/faqs?${faqQuery}`,
  );

  const affiliateQuery = toQuery({
    'filter[product_id][_eq]': product.id,
    'filter[locale][_eq]': locale,
    'filter[status][_eq]': 'published',
    sort: 'priority',
  });

  const affiliateResult = await directusGet<
    DirectusListResponse<CmsAffiliateLink>
  >(`/items/affiliate_links?${affiliateQuery}`);

  return {
    product,
    plans,
    activePlan,
    prices: pricesResult.data,
    seo: seoResult.data[0] ?? null,
    faqs: faqResult.data,
    affiliateLinks: affiliateResult.data,
  };
}

export function getCountryName(price: CmsRegionPrice) {
  if (
    typeof price.country_id === 'object' &&
    price.country_id !== null &&
    'name_zh' in price.country_id
  ) {
    return `${price.country_id.name_zh}（${price.country_id.code}）`;
  }

  return '未知地区';
}

export function getCountryCode(price: CmsRegionPrice) {
  if (
    typeof price.country_id === 'object' &&
    price.country_id !== null &&
    'code' in price.country_id
  ) {
    return price.country_id.code;
  }

  return '--';
}