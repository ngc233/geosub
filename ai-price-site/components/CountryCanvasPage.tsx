import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVerifiedPriceSource } from "../lib/cached-verified-price-source";
import { getComparablePriceRows, getCountryHubRows, getPriorityCountry, priorityCountries } from "../lib/country-hubs";
import { countryCanvasRows, countrySummary } from "../lib/country-canvas";
import { homepageCountries, homepageDisplayRates } from "../lib/homepage-summary";
import { savingsPercent } from "../lib/homepage-display";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import PublicIcon from "./PublicIcon";
import CountryIdentity from "./CountryIdentity";
import { PublicComparisonBar } from "./PublicControls";
import CountryCanvasPricing from "./CountryCanvasPricing";
import CountryDataDisclosure from "./CountryDataDisclosure";

// Chinese route only. The legacy component, English routes, metadata and reader
// contracts remain untouched. No new query or cache: reuse DATA-1's source.
export default async function CountryCanvasPage({ countrySlug }: { countrySlug: string }) {
  const country = getPriorityCountry(countrySlug);
  if (!country) notFound();
  let source;
  try { source = await loadVerifiedPriceSource(); } catch (error) {
    console.error({ event: "country_canvas_read_failed", errorType: error instanceof Error ? "Error" : typeof error });
  }
  const now = new Date();
  const rows = source ? getCountryHubRows(source.prices, country.code, source.rates, now) : [];
  const summary = countrySummary(rows, country.code);
  const peers = source ? homepageCountries(getComparablePriceRows(source.prices, source.rates, now))
    .filter(row => priorityCountries.some(item => item.code === row.code)) : [];
  const title = summary ? `在${country.zh}订阅，一半比美国${summary.median >= 0 ? "便宜" : "贵"} ${savingsPercent(summary.median)}% 以上` : `${country.zh}订阅价格`;
  const guide = getCoreGuideDefinition("zh", "payment-account");
  const method = <aside className="gs-country-method"><p>仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。每个可比套餐权重相同，使用原始美元值计算节省率并取中位数，负值保留。少于 5 个可比套餐时不显示中位数结论。</p>
      <nav aria-label="价格探索"><Link href="/zh/countries">按国家找订阅</Link><Link href="/zh/price-history">价格变化记录</Link><Link href="/zh/data-sources">数据来源</Link></nav>
    </aside>;
  const support = <div className="gs-country-support">
      <section className="gs-country-panel gs-country-notes"><h2>在{country.zh}区订阅要注意</h2>
        <ol><li>当地商店列出价格不代表其他地区账号可购买。</li><li>账号、付款方式、服务覆盖与最终税费请以官方结算页为准。</li><li>折算使用 18 小时内有效汇率；税费不重复加算。缺少汇率或美国同套餐价格时不生成价差。</li></ol>
        <Link href="/zh/guides/payment-account">{guide.title}<PublicIcon name="ArrowRight" size={16}/></Link>
      </section>
      {peers.length > 1 && <section className="gs-country-panel gs-country-peers"><div><h2>和其他地区比</h2><small>各国订阅节省率的中位数</small></div>
        {peers.map(peer => {
          const target = priorityCountries.find(item => item.code === peer.code)!;
          return <Link key={peer.code} href={peer.href!} aria-current={peer.code === country.code ? "page" : undefined} data-gs-motion-card>
            <span className="gs-country-flag"><CountryIdentity code={peer.code} defer/></span><strong>{target.zh}</strong><PublicComparisonBar label="节省率中位数" value={Math.abs(peer.median)} maximum={1} tone={peer.median >= 0 ? "low" : "high"} hideValue/>
            <span data-tone={peer.median >= 0 ? "low" : "high"}>{peer.median >= 0 ? "−" : "+"}{savingsPercent(peer.median)}%</span><small>按 {peer.count} 个订阅计算</small>
          </Link>;
        })}
      </section>}
    </div>;
  return <div className="gs-public-unified gs-country-scope">
    <main className="gs-country-page">
    <nav className="gs-country-breadcrumb" aria-label="面包屑"><Link href="/zh/countries">全部国家与地区</Link><span aria-hidden="true">/</span><span>{country.zh}</span></nav>
    <header className="gs-country-intro">
      <div className="gs-country-lead"><div className="gs-country-title"><span className="gs-country-flag"><CountryIdentity code={country.code} fetchPriority="low"/></span><h1>{title}</h1></div>
        <p>按 App Store {country.zh}区的已核验月付价格，与美国同套餐逐个比较，{summary && <>按 <strong>{summary.count} 个订阅</strong>计算。</>}汇率变化会影响折算价。</p>
      </div>
      {summary && <div className="gs-country-metrics" aria-label="订阅价格统计">
        <div data-highlight={summary.median >= 0}><strong>{summary.median >= 0 ? "−" : "+"}{savingsPercent(summary.median)}%</strong><span>一半订阅至少{summary.median >= 0 ? "低" : "高"}这么多</span></div>
        <div><strong>{summary.cheaper}<small>/{summary.count}</small></strong><span>个订阅比美国便宜</span></div>
        <div><strong data-tone={summary.best >= 0 ? "low" : "high"}>{savingsPercent(summary.best)}%</strong><span>{summary.best >= 0 ? "最多能省" : "最小涨幅"}</span></div>
      </div>}
    </header>
    {!source ? <section className="gs-country-panel" role="status"><h2>价格数据暂时无法读取</h2><p>请稍后重试；当前不显示未经核实的价格结论。</p></section>
      : !rows.length ? <section className="gs-country-panel" role="status"><h2>暂无符合条件的套餐</h2><p>缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。</p></section>
      : <CountryCanvasPricing name={country.zh} rows={countryCanvasRows(rows, now)} rates={homepageDisplayRates(source.rates, now)} method={method} support={support}/>}
    {!rows.length && <>{support}<CountryDataDisclosure>{method}</CountryDataDisclosure></>}
  </main></div>;
}
