"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { HomepageEvidence, HomepageProduct } from "./HomepageExperience";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepageMap from "./HomepageMap";
import HomepageProductMark from "./HomepageProductMark";
import { PublicSegments } from "./PublicControls";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import PublicPriceNumber from "./PublicPriceNumber";
import { getDisplayCurrencyFractionDigits, supportedDisplayCurrencies } from "../lib/display-currency";
import { getHomepageCopy } from "../lib/homepage-copy";
import type { HomepageRepresentative } from "../lib/homepage-summary";

const segmentOptions = [
  {value:"all",label:"All"}, {value:"ai",label:"AI subscriptions"}, {value:"streaming",label:"Streaming"},
];
const dateFormat = new Intl.DateTimeFormat("en-US", {dateStyle:"medium", timeZone:"UTC"});

export default function EnglishHomepagePricing({ products, evidence, map, rates }: {
  products: HomepageProduct[];
  evidence: HomepageEvidence;
  map: {land:string; points:Record<string,number[]>};
  rates: Record<string,number>;
}) {
  const id = useId();
  const mapPanel = useRef<HTMLElement>(null);
  const copy = getHomepageCopy("en");
  const [preferred] = usePublicCurrency("USD");
  const display = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[display] ?? 1;
  usePageDisplayRates(rates);
  const [category, setCategory] = useState("all");
  const regionNames = useMemo(()=>Object.fromEntries(
    products.flatMap(product=>product.regions.map(region=>[region.code,region.countryName])),
  ),[products]);

  const representatives = useMemo(()=>products.flatMap<HomepageRepresentative>(product=>{
    const prices = product.regions.filter(region=>Number.isFinite(region.priceUsd) && region.priceUsd > 0)
      .map(region=>({code:region.code,usd:region.priceUsd})).sort((a,b)=>a.usd-b.usd);
    const usPrice = prices.find(row=>row.code==="US")?.usd;
    if (usPrice === undefined) return [];
    const lowest = prices[0];
    return [{
      slug:product.slug, name:product.name, category:product.category,
      plan:product.planName, planDisplayName:product.planName, href:product.href, productHref:product.href,
      prices, lowest, usPrice, saving:1-lowest.usd/usPrice,
    }];
  }),[products]);
  const ranked = representatives.filter(product=>category==="all" || category===product.category)
    .sort((a,b)=>b.saving-a.saving);
  const choices = supportedDisplayCurrencies.filter(currency=>rates[currency] > 0);
  const updated = new Date(evidence.updatedAt);
  const preview = (slug: string) => {
    const panel = mapPanel.current;
    const button = [...(panel?.querySelectorAll<HTMLButtonElement>("[data-product]") ?? [])]
      .find(pill=>pill.dataset.product===slug);
    button?.focus({preventScroll:true});
    panel?.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  };

  return <>
    {evidence.prices > 0 && <p className="gs-home-statistics" aria-label="Verified price coverage">
      <span><strong>{evidence.products}</strong> products</span>
      <span><strong>{evidence.regions}</strong> regions</span>
      <span><strong>{evidence.prices.toLocaleString("en-US")}</strong> {copy.pricesVerified}</span>
      <span>App Store</span>
      {Number.isFinite(updated.getTime()) && <span>{copy.updated} <time dateTime={evidence.updatedAt}>{dateFormat.format(updated)}</time></span>}
    </p>}
    {representatives.length > 0 ? <>
      <section ref={mapPanel} className="gs-home-map-panel" aria-label="Regional subscription prices">
        <HomepageMap products={representatives} map={map} currency={display} rate={rate} englishRegionNames={regionNames}
          controls={<PublicCurrencySelect locale="en" options={choices} displayCurrency={display}/>}/>
      </section>
      <section className="gs-home-section gs-en-home-ranking" aria-labelledby={id}>
        <div className="gs-home-section-heading">
          <h2 id={id}>Savings ranking</h2>
          <PublicSegments label="Subscription category" options={segmentOptions} value={category} onChange={setCategory}/>
        </div>
        <div className="gs-home-ranking" role="table" aria-labelledby={id}>
          <div className="gs-en-rank-head" role="row">
            {["Subscription","Lowest-price region","Monthly price","vs U.S."].map(label=><span key={label} role="columnheader">{label}</span>)}
          </div>
          {ranked.map(product=><div className="gs-en-rank-row" role="row" key={product.slug} data-gs-motion-row>
            <div role="cell" className="gs-en-rank-product"><button type="button" onClick={()=>preview(product.slug)}>
              <HomepageProductMark product={product}/><span><strong>{product.name}</strong><small>{product.plan}</small></span>
            </button></div>
            <span role="cell" className="gs-en-rank-country"><HomepageCountryFlag code={product.lowest.code}/>{regionNames[product.lowest.code] ?? product.lowest.code}</span>
            <span role="cell" className="gs-en-rank-price"><PublicPriceNumber value={product.lowest.usd*rate} currency={display} locale="en-US" fractionDigits={getDisplayCurrencyFractionDigits(display)} cycle="monthly" changeKey={display}/></span>
            <strong role="cell" className="gs-en-rank-saving">{product.saving>0 ? "−" : ""}{Math.round(product.saving*100)}%</strong>
          </div>)}
          {ranked.length === 0 && <p role="status">No comparable prices for this category.</p>}
        </div>
      </section>
    </> : <p className="gs-en-home-notice">{copy.unavailable}</p>}
  </>;
}
