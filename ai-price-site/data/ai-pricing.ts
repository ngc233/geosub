export type ProductCategory = 'ai' | 'streaming';

export type RegionPrice = {
  rank: number;
  country: string;
  code: string;
  priceUsd: number;
  localPrice: string;
  tax: string;
  taxConfidence?: 'high' | 'medium' | 'low' | 'unknown';
  taxSourceKind?: 'manual' | 'official' | 'apple' | 'provider' | 'inferred';
  taxTreatment?: 'included_likely' | 'varies_by_region' | 'checkout_may_add' | 'unknown';
  taxCalculationPolicy?: 'do_not_calculate' | 'informational_only';
  taxReviewStatus?: 'verified' | 'needs_review' | 'unknown';
  taxFrontendNote?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'unknown';
  riskScore?: number;
  riskNote?: string;
  riskRequirements?: string;
  riskFactors?: string;
  billingPlatform?: string;
  billingPlatformLabel?: string;
  lastCheckedAt?: string;
  fxRateDate?: string;
  isCheap?: boolean;
  isExpensive?: boolean;
  isReference?: boolean;
};

export type ProductPlan = {
  slug: string;
  name: string;
  billing: 'monthly' | 'yearly';
  description?: string;
  priceStatus?: 'published' | 'pending' | 'empty';
  pendingObservationCount?: number;
  regions: RegionPrice[];
};

export type SubscriptionProduct = {
  slug: string;
  category: ProductCategory;
  name: string;
  brand: string;
  description: string;
  icon?: string;
  logoUrl?: string;
  accentIcon?: string;
  defaultPlan: string;
  updatedAt: string;
  sourceNote?: string;
  plans: ProductPlan[];
};

export type PlanStats = {
  minRegion: RegionPrice;
  maxRegion: RegionPrice;
  referenceRegion: RegionPrice;
  spreadPercent: number;
  savingPercent: number;
};

export function formatUsd(price: number) {
  return `$${price.toFixed(2)}`;
}

export function getProductPlan(product: SubscriptionProduct, planSlug?: string) {
  const availablePlans = product.plans.filter((plan) => plan.regions.length > 0);

  return (
    availablePlans.find((plan) => plan.slug === planSlug) ||
    availablePlans.find((plan) => plan.slug === product.defaultPlan) ||
    availablePlans[0] ||
    product.plans[0]
  );
}

export function getReferenceRegion(plan: ProductPlan) {
  return (
    plan.regions.find((region) => region.code.toUpperCase() === 'US') ||
    [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd)[0]
  );
}

export function getPlanStats(plan: ProductPlan): PlanStats {
  const sorted = [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd);
  const minRegion = sorted[0];
  const maxRegion = sorted[sorted.length - 1];
  const referenceRegion = getReferenceRegion(plan);

  const spreadPercent =
    ((maxRegion.priceUsd - minRegion.priceUsd) / minRegion.priceUsd) * 100;

  const savingPercent =
    ((maxRegion.priceUsd - minRegion.priceUsd) / maxRegion.priceUsd) * 100;

  return {
    minRegion,
    maxRegion,
    referenceRegion,
    spreadPercent: Math.round(spreadPercent),
    savingPercent: Math.round(savingPercent),
  };
}

export function getProductsByCategory(category: ProductCategory) {
  return subscriptionPricingData.filter((product) => product.category === category);
}

function roundPrice(price: number) {
  return Number(price.toFixed(2));
}

const chatgptPlusRegions: RegionPrice[] = [
  {
    rank: 1,
    country: '菲律宾',
    code: 'PH',
    priceUsd: 16.35,
    localPrice: '₱999/mo',
    tax: '含 12% VAT',
    isCheap: true,
  },
  {
    rank: 2,
    country: '巴基斯坦',
    code: 'PK',
    priceUsd: 17.61,
    localPrice: 'Rs4,900/mo',
    tax: '数字服务销售税按省份 15-16% 不同',
    isCheap: true,
  },
  {
    rank: 3,
    country: '加拿大',
    code: 'CA',
    priceUsd: 17.65,
    localPrice: 'CA$24.99/mo',
    tax: '各省 GST/HST 不同',
    isCheap: true,
  },
  {
    rank: 4,
    country: '日本',
    code: 'JP',
    priceUsd: 18.56,
    localPrice: '¥3,000/mo',
    tax: '含 10% 消费税',
  },
  {
    rank: 5,
    country: '美国',
    code: 'US',
    priceUsd: 19.99,
    localPrice: '$19.99/mo',
    tax: '美国各州税费不同，部分州可能另计',
    isReference: true,
  },
  {
    rank: 6,
    country: '土耳其',
    code: 'TR',
    priceUsd: 21.11,
    localPrice: '本地价格待核实',
    tax: '含当地税费',
  },
  {
    rank: 7,
    country: '巴西',
    code: 'BR',
    priceUsd: 21.55,
    localPrice: '本地价格待核实',
    tax: '含当地税费',
  },
  {
    rank: 8,
    country: '墨西哥',
    code: 'MX',
    priceUsd: 23.06,
    localPrice: '本地价格待核实',
    tax: '含当地税费',
  },
  {
    rank: 9,
    country: '法国',
    code: 'FR',
    priceUsd: 25.19,
    localPrice: '€22.99/mo',
    tax: '含 VAT',
  },
  {
    rank: 10,
    country: '德国',
    code: 'DE',
    priceUsd: 26.29,
    localPrice: '€23.99/mo',
    tax: '含 VAT',
    isExpensive: true,
  },
  {
    rank: 11,
    country: '英国',
    code: 'GB',
    priceUsd: 26.47,
    localPrice: '£20.99/mo',
    tax: '含 VAT',
    isExpensive: true,
  },
  {
    rank: 12,
    country: '丹麦',
    code: 'DK',
    priceUsd: 27.44,
    localPrice: '179 DKK/mo',
    tax: '含 25% VAT',
    isExpensive: true,
  },
];

const chatgptProRegions: RegionPrice[] = [
  {
    rank: 1,
    country: '菲律宾',
    code: 'PH',
    priceUsd: 164.2,
    localPrice: '本地价格待核实',
    tax: '含当地税费',
    isCheap: true,
  },
  {
    rank: 2,
    country: '巴基斯坦',
    code: 'PK',
    priceUsd: 176.5,
    localPrice: '本地价格待核实',
    tax: '税费按地区不同',
    isCheap: true,
  },
  {
    rank: 3,
    country: '加拿大',
    code: 'CA',
    priceUsd: 181.2,
    localPrice: '本地价格待核实',
    tax: '各省税率不同',
    isCheap: true,
  },
  {
    rank: 4,
    country: '日本',
    code: 'JP',
    priceUsd: 188.8,
    localPrice: '本地价格待核实',
    tax: '含消费税',
  },
  {
    rank: 5,
    country: '美国',
    code: 'US',
    priceUsd: 200,
    localPrice: '$200/mo',
    tax: '美国各州税费不同，部分州可能另计',
    isReference: true,
  },
  {
    rank: 6,
    country: '英国',
    code: 'GB',
    priceUsd: 264.7,
    localPrice: '本地价格待核实',
    tax: '含 VAT',
    isExpensive: true,
  },
  {
    rank: 7,
    country: '德国',
    code: 'DE',
    priceUsd: 262.9,
    localPrice: '本地价格待核实',
    tax: '含 VAT',
    isExpensive: true,
  },
  {
    rank: 8,
    country: '丹麦',
    code: 'DK',
    priceUsd: 274.4,
    localPrice: '本地价格待核实',
    tax: '含 VAT',
    isExpensive: true,
  },
];

const geminiAdvancedRegions: RegionPrice[] = [
  {
    rank: 1,
    country: '埃及',
    code: 'EG',
    priceUsd: 14.06,
    localPrice: '£699.99/mo',
    tax: '含当地税费',
    isCheap: true,
  },
  {
    rank: 2,
    country: '土耳其',
    code: 'TR',
    priceUsd: 15.49,
    localPrice: '₺719.99/mo',
    tax: '含当地税费',
    isCheap: true,
  },
  {
    rank: 3,
    country: '印度尼西亚',
    code: 'ID',
    priceUsd: 17.3,
    localPrice: 'Rp309,000/mo',
    tax: '含当地税费',
    isCheap: true,
  },
  {
    rank: 4,
    country: '日本',
    code: 'JP',
    priceUsd: 17.94,
    localPrice: '¥2,900/mo',
    tax: '含 10% 消费税',
  },
  {
    rank: 5,
    country: '美国',
    code: 'US',
    priceUsd: 19.99,
    localPrice: '$19.99/mo',
    tax: '美国各州税费不同，部分州可能另计',
    isReference: true,
  },
  {
    rank: 6,
    country: '加拿大',
    code: 'CA',
    priceUsd: 21.2,
    localPrice: '本地价格待核实',
    tax: '各省 GST/HST 不同',
  },
  {
    rank: 7,
    country: '英国',
    code: 'GB',
    priceUsd: 24.3,
    localPrice: '本地价格待核实',
    tax: '含 VAT',
    isExpensive: true,
  },
  {
    rank: 8,
    country: '丹麦',
    code: 'DK',
    priceUsd: 25.91,
    localPrice: 'DK169/mo',
    tax: '含 25% VAT',
    isExpensive: true,
  },
];

function genericAiRegions(basePrice: number, usPrice: number, expensivePrice: number): RegionPrice[] {
  return [
    {
      rank: 1,
      country: '菲律宾',
      code: 'PH',
      priceUsd: roundPrice(basePrice),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
      isCheap: true,
    },
    {
      rank: 2,
      country: '巴基斯坦',
      code: 'PK',
      priceUsd: roundPrice(basePrice * 1.07),
      localPrice: '本地价格待核实',
      tax: '税费按地区不同',
      isCheap: true,
    },
    {
      rank: 3,
      country: '加拿大',
      code: 'CA',
      priceUsd: roundPrice(basePrice * 1.12),
      localPrice: '本地价格待核实',
      tax: '各省税率不同',
      isCheap: true,
    },
    {
      rank: 4,
      country: '日本',
      code: 'JP',
      priceUsd: roundPrice(basePrice * 1.18),
      localPrice: '本地价格待核实',
      tax: '含消费税',
    },
    {
      rank: 5,
      country: '美国',
      code: 'US',
      priceUsd: roundPrice(usPrice),
      localPrice: `$${roundPrice(usPrice)}/mo`,
      tax: '美国各州税费不同，部分州可能另计',
      isReference: true,
    },
    {
      rank: 6,
      country: '土耳其',
      code: 'TR',
      priceUsd: roundPrice(usPrice * 1.04),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
    },
    {
      rank: 7,
      country: '巴西',
      code: 'BR',
      priceUsd: roundPrice(usPrice * 1.08),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
    },
    {
      rank: 8,
      country: '墨西哥',
      code: 'MX',
      priceUsd: roundPrice(usPrice * 1.12),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
    },
    {
      rank: 9,
      country: '英国',
      code: 'GB',
      priceUsd: roundPrice(expensivePrice * 0.95),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
    {
      rank: 10,
      country: '德国',
      code: 'DE',
      priceUsd: roundPrice(expensivePrice * 0.93),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
    {
      rank: 11,
      country: '法国',
      code: 'FR',
      priceUsd: roundPrice(expensivePrice * 0.9),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
    {
      rank: 12,
      country: '丹麦',
      code: 'DK',
      priceUsd: roundPrice(expensivePrice),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
  ];
}

function genericStreamingRegions(basePrice: number, usPrice: number, expensivePrice: number): RegionPrice[] {
  return [
    {
      rank: 1,
      country: '土耳其',
      code: 'TR',
      priceUsd: roundPrice(basePrice),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
      isCheap: true,
    },
    {
      rank: 2,
      country: '印度',
      code: 'IN',
      priceUsd: roundPrice(basePrice * 1.15),
      localPrice: '本地价格待核实',
      tax: '含 GST',
      isCheap: true,
    },
    {
      rank: 3,
      country: '巴西',
      code: 'BR',
      priceUsd: roundPrice(basePrice * 1.28),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
      isCheap: true,
    },
    {
      rank: 4,
      country: '菲律宾',
      code: 'PH',
      priceUsd: roundPrice(basePrice * 1.45),
      localPrice: '本地价格待核实',
      tax: '含当地税费',
    },
    {
      rank: 5,
      country: '日本',
      code: 'JP',
      priceUsd: roundPrice(basePrice * 1.55),
      localPrice: '本地价格待核实',
      tax: '含消费税',
    },
    {
      rank: 6,
      country: '美国',
      code: 'US',
      priceUsd: roundPrice(usPrice),
      localPrice: `$${roundPrice(usPrice)}/mo`,
      tax: '美国各州税费不同，部分州可能另计',
      isReference: true,
    },
    {
      rank: 7,
      country: '加拿大',
      code: 'CA',
      priceUsd: roundPrice(usPrice * 1.05),
      localPrice: '本地价格待核实',
      tax: '各省 GST/HST 不同',
    },
    {
      rank: 8,
      country: '英国',
      code: 'GB',
      priceUsd: roundPrice(expensivePrice * 0.9),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
    {
      rank: 9,
      country: '德国',
      code: 'DE',
      priceUsd: roundPrice(expensivePrice * 0.92),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
    {
      rank: 10,
      country: '丹麦',
      code: 'DK',
      priceUsd: roundPrice(expensivePrice),
      localPrice: '本地价格待核实',
      tax: '含 VAT',
      isExpensive: true,
    },
  ];
}

export const subscriptionPricingData: SubscriptionProduct[] = [
  {
    slug: 'chatgpt',
    category: 'ai',
    name: 'ChatGPT',
    brand: 'OpenAI',
    description: '比较各 App Store 地区的 ChatGPT Plus 和 Pro 价格。',
    accentIcon: '◎',
    defaultPlan: 'plus',
    updatedAt: '2026-06',
    sourceNote: '示例数据，后续可接入人工核验、数据库或自动采集。',
    plans: [
      {
        slug: 'plus',
        name: 'Plus',
        billing: 'monthly',
        description: '最常见的个人订阅套餐。',
        regions: chatgptPlusRegions,
      },
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        description: '更高额度的个人高级套餐。',
        regions: chatgptProRegions,
      },
    ],
  },
  {
    slug: 'claude',
    category: 'ai',
    name: 'Claude',
    brand: 'Anthropic',
    description: '比较 Claude Pro、Max 等套餐在不同地区的价格。',
    accentIcon: 'C',
    defaultPlan: 'pro',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        regions: genericAiRegions(18, 20, 27),
      },
      {
        slug: 'max',
        name: 'Max',
        billing: 'monthly',
        regions: genericAiRegions(90, 100, 135),
      },
    ],
  },
  {
    slug: 'gemini',
    category: 'ai',
    name: 'Gemini',
    brand: 'Google',
    description: '比较 Google AI Pro / Google One AI Premium 地区价格。',
    accentIcon: '✦',
    defaultPlan: 'pro',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'pro',
        name: 'Google AI Pro',
        billing: 'monthly',
        regions: geminiAdvancedRegions,
      },
    ],
  },
  {
    slug: 'grok',
    category: 'ai',
    name: 'Grok',
    brand: 'xAI',
    description: '比较 Grok / X Premium 不同地区和套餐价格。',
    accentIcon: '𝕏',
    defaultPlan: 'premium-plus',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'premium-plus',
        name: 'Premium+',
        billing: 'monthly',
        regions: genericAiRegions(8.5, 16, 24),
      },
      {
        slug: 'supergrok',
        name: 'SuperGrok',
        billing: 'monthly',
        regions: genericAiRegions(25, 30, 42),
      },
    ],
  },
  {
    slug: 'perplexity',
    category: 'ai',
    name: 'Perplexity',
    brand: 'Perplexity',
    description: '比较 Perplexity Pro 在不同地区的价格。',
    accentIcon: 'P',
    defaultPlan: 'pro',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        regions: genericAiRegions(16.99, 19.99, 27.99),
      },
    ],
  },
  {
    slug: 'deepseek',
    category: 'ai',
    name: 'DeepSeek',
    brand: 'DeepSeek',
    description: '比较 DeepSeek 相关订阅和 API 使用成本。',
    accentIcon: 'D',
    defaultPlan: 'api',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'api',
        name: 'API',
        billing: 'monthly',
        regions: genericAiRegions(5, 10, 16),
      },
    ],
  },
  {
    slug: 'microsoft-copilot',
    category: 'ai',
    name: 'Microsoft Copilot',
    brand: 'Microsoft',
    description: '比较 Copilot Pro 在不同地区的订阅价格。',
    accentIcon: 'M',
    defaultPlan: 'pro',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        regions: genericAiRegions(17, 20, 29),
      },
    ],
  },
  {
    slug: 'poe',
    category: 'ai',
    name: 'Poe',
    brand: 'Quora',
    description: '比较 Poe 订阅在不同地区的价格。',
    accentIcon: 'P',
    defaultPlan: 'subscription',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'subscription',
        name: 'Subscription',
        billing: 'monthly',
        regions: genericAiRegions(16, 20, 28),
      },
    ],
  },
  {
    slug: 'character-ai',
    category: 'ai',
    name: 'Character.AI',
    brand: 'Character.AI',
    description: '比较 Character.AI Plus 在不同地区的价格。',
    accentIcon: 'C',
    defaultPlan: 'plus',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'plus',
        name: 'Plus',
        billing: 'monthly',
        regions: genericAiRegions(8.99, 9.99, 15.99),
      },
    ],
  },
  {
    slug: 'midjourney',
    category: 'ai',
    name: 'Midjourney',
    brand: 'Midjourney',
    description: '比较 Midjourney 不同订阅套餐的价格。',
    accentIcon: 'M',
    defaultPlan: 'basic',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'basic',
        name: 'Basic',
        billing: 'monthly',
        regions: genericAiRegions(8, 10, 15),
      },
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericAiRegions(26, 30, 42),
      },
    ],
  },
  {
    slug: 'runway',
    category: 'ai',
    name: 'Runway',
    brand: 'Runway',
    description: '比较 Runway 视频生成套餐在不同地区的价格。',
    accentIcon: 'R',
    defaultPlan: 'standard',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericAiRegions(12, 15, 22),
      },
    ],
  },
  {
    slug: 'suno',
    category: 'ai',
    name: 'Suno',
    brand: 'Suno',
    description: '比较 Suno 音乐生成订阅价格。',
    accentIcon: 'S',
    defaultPlan: 'pro',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        regions: genericAiRegions(8, 10, 16),
      },
    ],
  },
  {
    slug: 'kling-ai',
    category: 'ai',
    name: 'Kling AI',
    brand: 'Kuaishou',
    description: '比较 Kling AI 视频生成订阅价格。',
    accentIcon: 'K',
    defaultPlan: 'standard',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericAiRegions(8, 10, 15),
      },
    ],
  },
  {
    slug: 'sora',
    category: 'ai',
    name: 'SORA',
    brand: 'OpenAI',
    description: '比较 Sora 相关视频生成订阅价格。',
    accentIcon: 'S',
    defaultPlan: 'plus',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'plus',
        name: 'Plus',
        billing: 'monthly',
        regions: chatgptPlusRegions,
      },
      {
        slug: 'pro',
        name: 'Pro',
        billing: 'monthly',
        regions: chatgptProRegions,
      },
    ],
  },

  {
    slug: 'netflix',
    category: 'streaming',
    name: 'Netflix',
    brand: 'Netflix',
    description: '比较 Netflix 不同地区和套餐的订阅价格。',
    accentIcon: 'N',
    defaultPlan: 'premium',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericStreamingRegions(4.99, 15.49, 22.99),
      },
      {
        slug: 'premium',
        name: 'Premium',
        billing: 'monthly',
        regions: genericStreamingRegions(6.99, 22.99, 29.99),
      },
    ],
  },
  {
    slug: 'youtube-premium',
    category: 'streaming',
    name: 'YouTube Premium',
    brand: 'Google',
    description: '比较 YouTube Premium 个人和家庭套餐价格。',
    accentIcon: '▶',
    defaultPlan: 'individual',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'individual',
        name: 'Individual',
        billing: 'monthly',
        regions: genericStreamingRegions(2.5, 13.99, 19.99),
      },
      {
        slug: 'family',
        name: 'Family',
        billing: 'monthly',
        regions: genericStreamingRegions(4.99, 22.99, 31.99),
      },
    ],
  },
  {
    slug: 'spotify',
    category: 'streaming',
    name: 'Spotify',
    brand: 'Spotify',
    description: '比较 Spotify Premium 在不同地区的价格。',
    accentIcon: 'S',
    defaultPlan: 'individual',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'individual',
        name: 'Individual',
        billing: 'monthly',
        regions: genericStreamingRegions(1.99, 11.99, 16.99),
      },
      {
        slug: 'family',
        name: 'Family',
        billing: 'monthly',
        regions: genericStreamingRegions(3.99, 19.99, 27.99),
      },
    ],
  },
  {
    slug: 'apple-music',
    category: 'streaming',
    name: 'Apple Music',
    brand: 'Apple',
    description: '比较 Apple Music 个人和家庭套餐价格。',
    accentIcon: '♪',
    defaultPlan: 'individual',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'individual',
        name: 'Individual',
        billing: 'monthly',
        regions: genericStreamingRegions(1.99, 10.99, 15.99),
      },
      {
        slug: 'family',
        name: 'Family',
        billing: 'monthly',
        regions: genericStreamingRegions(3.49, 16.99, 23.99),
      },
    ],
  },
  {
    slug: 'disney-plus',
    category: 'streaming',
    name: 'Disney+',
    brand: 'Disney',
    description: '比较 Disney+ 不同地区订阅价格。',
    accentIcon: 'D',
    defaultPlan: 'premium',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'premium',
        name: 'Premium',
        billing: 'monthly',
        regions: genericStreamingRegions(2.99, 13.99, 19.99),
      },
    ],
  },
  {
    slug: 'max',
    category: 'streaming',
    name: 'Max',
    brand: 'Warner Bros. Discovery',
    description: '比较 Max 不同地区的订阅价格。',
    accentIcon: 'M',
    defaultPlan: 'standard',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericStreamingRegions(4.99, 16.99, 22.99),
      },
    ],
  },
  {
    slug: 'prime-video',
    category: 'streaming',
    name: 'Prime Video',
    brand: 'Amazon',
    description: '比较 Amazon Prime Video 不同地区价格。',
    accentIcon: 'A',
    defaultPlan: 'monthly',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'monthly',
        name: 'Monthly',
        billing: 'monthly',
        regions: genericStreamingRegions(2.99, 8.99, 14.99),
      },
    ],
  },
  {
    slug: 'apple-tv-plus',
    category: 'streaming',
    name: 'Apple TV+',
    brand: 'Apple',
    description: '比较 Apple TV+ 不同地区价格。',
    accentIcon: 'tv',
    defaultPlan: 'monthly',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'monthly',
        name: 'Monthly',
        billing: 'monthly',
        regions: genericStreamingRegions(2.99, 9.99, 14.99),
      },
    ],
  },
  {
    slug: 'hulu',
    category: 'streaming',
    name: 'Hulu',
    brand: 'Disney',
    description: '比较 Hulu 不同套餐和地区价格。',
    accentIcon: 'H',
    defaultPlan: 'standard',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'standard',
        name: 'Standard',
        billing: 'monthly',
        regions: genericStreamingRegions(7.99, 17.99, 24.99),
      },
    ],
  },
  {
    slug: 'crunchyroll',
    category: 'streaming',
    name: 'Crunchyroll',
    brand: 'Crunchyroll',
    description: '比较 Crunchyroll 动漫订阅价格。',
    accentIcon: 'C',
    defaultPlan: 'fan',
    updatedAt: '2026-06',
    plans: [
      {
        slug: 'fan',
        name: 'Fan',
        billing: 'monthly',
        regions: genericStreamingRegions(2.49, 7.99, 11.99),
      },
    ],
  },
];
