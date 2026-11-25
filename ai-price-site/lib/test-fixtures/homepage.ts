import type { CountryHubPrice, HubRate } from "../country-hubs";
import type { PriceObservationRecord } from "../price-records";

/** Entirely handwritten fictional test data. No production rows or prices copied.
 * Only explicit development + loopback database can activate this fixture. */
export function isHomepageFixtureEnabled() {
  if(typeof process==="undefined"||process.env.NODE_ENV!=="development"||process.env.GEOSUB_V3_FIXTURE!=="fictional")return false;
  try{return ["localhost","127.0.0.1","[::1]"].includes(new URL(process.env.DATABASE_URL??"").hostname);}catch{return false;}
}
export function fictionalHomepageSource(now=new Date()) {
  const plans=[ ["chatgpt","ChatGPT","plus","Plus","ai",20], ["claude","Claude","pro","Pro","ai",30],
    ["gemini","Gemini","pro","Pro","ai",10], ["netflix","Netflix","standard","Standard","streaming",12],
    ["youtube-premium","YouTube Premium","individual","Individual","streaming",8], ["mubi","MUBI","monthly","Monthly","streaming",16],
    // Extra handwritten rows exercise >6 ranks and both +N badges, not canvas prices.
    ["suno","Suno","pro","Pro","ai",18], ["deezer","Deezer","premium","Premium","streaming",9] ] as const;
  const regions=[ ["US",1],["PH",0.86],["TR",0.87],["CA",0.91],["JP",0.95],["IN",0.99],["BR",1],["GB",1.04],["DE",1.1],["AU",1.2] ] as const;
  const prices:CountryHubPrice[]=plans.flatMap(([productSlug,productName,planSlug,planName,category,price],index)=>regions.map(([countryCode,factor])=>({productSlug,productName,planSlug,planName,category,countryCode,
    amount:price*(countryCode==="US"?1:factor+(index%2?0.01:-0.01)),currency:"USD",platform:"ios",billingCycle:"monthly",priceType:"list_price",quality:"verified",confidence:90,checkedAt:now.toISOString(),sourceUrl:`https://apps.apple.com/${countryCode.toLowerCase()}/app/fictional/id123456789`,observationId:null})));
  // A nonrepresentative plan and a product without a US price prove full D1/D8 scope.
  prices.push({...prices[1],planSlug:"fictional-extra",planName:"Fictional extra"});
  prices.push({...prices[1],productSlug:"fictional-no-us",productName:"Fictional no-US"});
  const rate=(value:number):HubRate=>({rate:value,source:"FICTIONAL TEST RATE",rateDate:now.toISOString().slice(0,10),fetchedAt:now.toISOString(),isFallback:false});
  return {prices,rates:{CNY:rate(7),JPY:rate(150),EUR:rate(0.9)}};
}

export function fictionalPriceRecordProducts(): Array<{ slug: string; name: string; category: "ai" | "streaming" }> {
  return [
    { slug: "chatgpt", name: "ChatGPT", category: "ai" },
    { slug: "claude", name: "Claude", category: "ai" },
    { slug: "deezer", name: "Deezer", category: "streaming" },
    { slug: "gemini", name: "Gemini", category: "ai" },
    { slug: "mubi", name: "MUBI", category: "streaming" },
    { slug: "netflix", name: "Netflix", category: "streaming" },
    { slug: "suno", name: "Suno", category: "ai" },
    { slug: "youtube-premium", name: "YouTube Premium", category: "streaming" },
  ];
}

export function fictionalPriceHistoryRecords(now = new Date()): PriceObservationRecord[] {
  const day = 86_400_000;
  let seq = 200;
  const makeObs = (
    productSlug: string,
    productName: string,
    category: "ai" | "streaming",
    planSlug: string,
    planName: string,
    countryCode: string,
    currency: string,
    amount: number,
    daysAgo: number,
  ): PriceObservationRecord => {
    seq += 1;
    const priceText = `${currency} ${amount}`;
    return {
      id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
      productSlug,
      productName,
      category,
      planSlug,
      planName,
      countryCode,
      sourceId: `fictional-${productSlug}-${planSlug}-${countryCode}`,
      sourceUrl: `https://apps.apple.com/${countryCode.toLowerCase()}/app/fictional/id123456789`,
      observedAt: new Date(+now - daysAgo * day).toISOString(),
      platform: "ios",
      priceType: "list_price",
      amount,
      currency,
      status: "approved",
      confidence: 95,
      anomaly: false,
      itemName: `${productName} ${planName}`,
      originalPriceText: priceText,
      snapshot: {
        country: countryCode,
        planSpecSlug: planSlug,
        billingCycle: "monthly",
        inAppPurchases: [
          { Name: `${productName} ${planName}`, PriceText: priceText },
        ],
      },
    };
  };

  const changeStreams: PriceObservationRecord[] = [
    // Turkey: 2 confirmed increases
    makeObs("netflix", "Netflix", "streaming", "standard", "Standard", "TR", "TRY", 149.99, 8),
    makeObs("netflix", "Netflix", "streaming", "standard", "Standard", "TR", "TRY", 229.99, 2),
    makeObs("chatgpt", "ChatGPT", "ai", "plus", "Plus", "TR", "TRY", 499.99, 17),
    makeObs("chatgpt", "ChatGPT", "ai", "plus", "Plus", "TR", "TRY", 649.99, 10),
    // Philippines: 2 confirmed decreases (one within 30d, one at 44d inside 120d window)
    makeObs("youtube-premium", "YouTube Premium", "streaming", "individual", "Individual", "PH", "PHP", 189, 9),
    makeObs("youtube-premium", "YouTube Premium", "streaming", "individual", "Individual", "PH", "PHP", 159, 3),
    makeObs("gemini", "Gemini", "ai", "pro", "Pro", "PH", "PHP", 1190, 51),
    makeObs("gemini", "Gemini", "ai", "pro", "Pro", "PH", "PHP", 990, 44),
    // Japan: 1 confirmed decrease
    makeObs("claude", "Claude", "ai", "pro", "Pro", "JP", "JPY", 3400, 12),
    makeObs("claude", "Claude", "ai", "pro", "Pro", "JP", "JPY", 3000, 5),
    // India: 1 confirmed decrease
    makeObs("suno", "Suno", "ai", "pro", "Pro", "IN", "INR", 999, 15),
    makeObs("suno", "Suno", "ai", "pro", "Pro", "IN", "INR", 799, 7),
    // Brazil: 1 confirmed increase
    makeObs("deezer", "Deezer", "streaming", "premium", "Premium", "BR", "BRL", 24.9, 21),
    makeObs("deezer", "Deezer", "streaming", "premium", "Premium", "BR", "BRL", 29.9, 13),
  ];

  const stableRegions: ReadonlyArray<readonly [string, string, number]> = [
    ["US", "USD", 20],
    ["CA", "CAD", 27.99],
    ["GB", "GBP", 19.99],
    ["DE", "EUR", 22.99],
    ["FR", "EUR", 22.99],
    ["AU", "AUD", 29.99],
    ["SG", "SGD", 28.98],
    ["HK", "HKD", 158],
    ["KR", "KRW", 29000],
    ["MX", "MXN", 399],
    ["AR", "USD", 19.99],
    ["EG", "EGP", 699.99],
    ["NG", "NGN", 19900],
    ["ZA", "ZAR", 369.99],
    ["ID", "IDR", 329000],
    ["TH", "THB", 699],
    ["VN", "VND", 499000],
    ["MY", "MYR", 94.9],
  ];

  const stableRecords = stableRegions.map(([code, currency, amount]) =>
    makeObs("mubi", "MUBI", "streaming", "monthly", "Monthly", code, currency, amount, 4),
  );

  return [...changeStreams, ...stableRecords];
}
