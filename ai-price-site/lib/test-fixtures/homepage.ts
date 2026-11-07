import type { CountryHubPrice, HubRate } from "../country-hubs";
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
