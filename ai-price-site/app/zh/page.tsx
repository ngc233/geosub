import HomepageCountryFlag from "../../components/HomepageCountryFlag";
import PublicPriceNumber from "../../components/PublicPriceNumber";
import { savingsLabel } from "../../lib/homepage-display";
import Link from "next/link";
import HomepagePricing from "../../components/HomepagePricing";
import PublicSearch from "../../components/PublicSearch";
import PublicIcon from "../../components/PublicIcon";
import { PublicComparisonBar } from "../../components/PublicControls";
import { loadComparablePrices } from "../../lib/comparable-prices-data";
import { loadHomepageRepresentatives } from "../../lib/homepage-representatives-data";
import { loadVerifiedPriceSource } from "../../lib/cached-verified-price-source";
import { homepageStatistics, homepageCountries, homepageProducts, homepageDisplayRates } from "../../lib/homepage-summary";
import { homepageMap } from "../../lib/homepage-map";
import { getHomepageCopy } from "../../lib/homepage-copy";
import { formatPublicDate } from "../../lib/public-date";
import { loadCoreGuideHubStates } from "../../lib/core-guide-cms";
import { getCoreGuideDefinition } from "../../lib/core-guide-content";
import { isHomepageFixtureEnabled, fictionalHomepageSource } from "../../lib/test-fixtures/homepage";

export default async function ZhHomePage() {
  const [data,guides] = await Promise.all([
    Promise.all([loadComparablePrices(),loadHomepageRepresentatives(),(isHomepageFixtureEnabled()?Promise.resolve(fictionalHomepageSource()):loadVerifiedPriceSource())]).catch(()=>null),
    loadCoreGuideHubStates("zh"),
  ]);
  const rows=data?.[0]??[], products=homepageProducts(data?.[1]??[]);
  const stats=homepageStatistics(rows), countries=homepageCountries(rows);
  const updated=formatPublicDate(stats?.updatedAt), copy=getHomepageCopy("zh");
  const articles=(["price-guide","payment-account","methodology"] as const).filter(slug=>!guides.get(slug)?.managed||guides.get(slug)?.published);
  return <div className="gs-public-unified gs-home"><div className="gs-home-container">
    {isHomepageFixtureEnabled()&&<aside className="gs-home-test-data" role="note">虚构测试数据 · 仅用于本地界面验收，不代表实际价格</aside>}
    <section data-gs-enter="a" className="gs-home-intro"><p>{copy.eyebrow}</p><h1>{copy.title}</h1><p className="gs-home-description">{copy.description}</p><PublicSearch variant="hero"/>
      {stats&&<p className="gs-home-statistics" aria-label="收录统计"><span><strong><PublicPriceNumber value={stats.products} fractionDigits={0} initialValue={0} changeKey="count-in"/></strong> 个产品</span><span><strong><PublicPriceNumber value={stats.regions} fractionDigits={0} initialValue={0} changeKey="count-in"/></strong> 个地区</span><span><strong><PublicPriceNumber value={stats.prices} fractionDigits={0} initialValue={0} changeKey="count-in"/></strong> 条已核验价格</span>{updated&&<span><time dateTime={updated.dateTime}>{updated.text}</time>核验更新</span>}</p>}
    </section>
    <HomepagePricing products={products} rates={homepageDisplayRates(data?.[2].rates??{})} map={homepageMap}/>
    {!!countries.length&&<section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-countries"><div className="gs-home-section-heading"><div><h2 id="home-countries">哪些国家整体更便宜</h2><p>App Store 月付套餐逐个与美国比较，按节省率中位数排序；每个套餐权重相同。</p></div><Link href="/zh/countries">全部国家 <PublicIcon name="ArrowRight" size={16}/></Link></div>
      <div className="gs-home-countries">{countries.slice(0,6).map(country=>{const name=new Intl.DisplayNames(["zh-CN"],{type:"region"}).of(country.code);const body=<><h3 className="gs-home-country-name"><HomepageCountryFlag code={country.code}/>{name}</h3><p>{country.median>0&&country.median<0.001?"节省率中位数为正，但不足 0.1%":country.median>0?`一半的订阅${savingsLabel(country.median).replace("低 ","便宜 ")}${country.median>=0.001?" 以上":""}`:country.median===0?"订阅价格的中位水平与美国相同":`节省率中位数为负：${savingsLabel(country.median)}`}</p><small>按 {country.count} 个订阅计算 · {country.cheaper} 个比美国便宜</small><PublicComparisonBar hideValue label={savingsLabel(country.median)} value={Math.floor(Math.abs(country.median)*1000)/10} maximum={100} tone={country.median>0?"low":country.median<0?"high":"baseline"}/></>;return country.href?<Link key={country.code} href={country.href} className="gs-home-card" data-gs-motion-card>{body}</Link>:<article key={country.code} className="gs-home-card">{body}</article>;})}</div>
    </section>}
    {!!articles.length&&<section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-guides"><h2 id="home-guides">买之前先看</h2><div className="gs-home-guides">{articles.map(slug=>{const guide=getCoreGuideDefinition("zh",slug);return <Link key={slug} href={`/zh/guides/${slug}`} className="gs-home-card" data-gs-motion-card><PublicIcon name="BookOpen"/><h3>{guide.eyebrow}</h3><p>{guide.description}</p><span>查看指南 <PublicIcon name="ArrowRight" size={16}/></span></Link>;})}</div></section>}
    <nav className="gs-home-resources" aria-label="价格与数据说明"><Link href="/zh/ai-pricing/">{copy.start}</Link><Link href="/zh/data-sources/">{copy.verify}</Link><Link href="/zh/tools/currency-converter/">订阅汇率工具</Link><Link href="/zh/guides/">订阅指南</Link><Link href="/zh/ai-pricing/chatgpt/plus/">查看 ChatGPT Plus 地区成本</Link></nav>
    <p className="gs-home-disclaimer">{copy.disclaimer}</p>
  </div></div>;
}
