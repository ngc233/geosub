import Link from "next/link";
import {ArrowRight,ExternalLink} from "lucide-react";
import CountryIdentity from "./CountryIdentity";
import {PublicCard,PublicEvidence,PublicTag} from "./ui/PublicControls";
import {loadCountryHub} from "../lib/cached-country-hub";
import {priorityCountries} from "../lib/country-hubs";
import {countryDisplaySummary,countryMoney,type CountryPlanRow} from "../lib/country-hub-display";
import {dateRange} from "../lib/pricing-r2";
import {getEvidencePlanHref} from "../lib/price-evidence-preview";

function sourceDateRange(rows:readonly CountryPlanRow[]) {
  const format=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"});
  return dateRange(rows.flatMap(row=>row.checkedAt ? [format.format(new Date(row.checkedAt))] : []));
}

export default async function SourcesOverview() {
  const results=await Promise.allSettled(priorityCountries.map(country=>loadCountryHub(country.code)));
  const order=["TR","JP","IN","PH"];
  const countries=priorityCountries.map((country,index)=>{const result=results[index];return {country,rows:result.status==="fulfilled" ? result.value : null};}).sort((a,b)=>order.indexOf(a.country.code)-order.indexOf(b.country.code));
  const allRows=countries.flatMap(item=>item.rows||[]);
  const summary=countryDisplaySummary(allRows);
  const example=countries.find(item=>item.country.code==="PH")?.rows?.find(row=>row.productSlug==="chatgpt"&&row.planSlug==="plus");
  const exampleDate=example?.checkedAt ? new Intl.DateTimeFormat("zh-CN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Singapore"}).format(new Date(example.checkedAt))+"（UTC+8）" : "未提供";
  return <>
    <PublicCard className="gs-source-overview"><h2>数据来源概览</h2><p>范围为本站四个公开国家目录的 App Store 月付价格；不代表全站采集运行统计。</p>
      <div className="gs-source-group"><PublicEvidence animated title={`App Store · ${priorityCountries.length} 个公开国家目录`} defaultOpen><div className="gs-source-country-head" aria-hidden="true"><span>国家与地区</span><span>公开覆盖</span><span>价格采集范围</span><span>运行状态</span></div>{countries.map(({country,rows})=>{const coverage=rows ? countryDisplaySummary(rows) : null;return <Link className="gs-source-country-row" key={country.code} href={`/zh/countries/${country.slug}`} data-source-country={country.code}><span><CountryIdentity code={country.code} />{country.zh}</span><span>{coverage ? `${coverage.products} 个产品 · ${coverage.plans} 个套餐` : "暂时无法读取"}</span><span>{rows ? sourceDateRange(rows) : "—"}</span><span>未提供<ArrowRight aria-hidden="true" /></span></Link>;})}<p>价格日期来自原始记录，不是采集任务成功时间。当前页未提供运行健康或人工复核状态。</p></PublicEvidence></div>
      <div className="gs-source-group"><PublicEvidence animated title="汇率数据"><p>本目录价格采集范围：{sourceDateRange(allRows)}。有效折算采用原有汇率门槛，不能用固定汇率补值。</p><p>汇率基准：{summary.fx==="—" ? "本目录暂无有效汇率折算" : summary.fx}。这不代表汇率服务的运行健康状态。</p><Link href="/zh/tools/currency-converter">查看汇率换算工具<ArrowRight aria-hidden="true" /></Link></PublicEvidence></div>
      <div className="gs-source-group"><PublicEvidence animated title="税费资料"><p>国家目录未附逐项税费记录，当前页不汇总税率或人工复核结论。请查看具体套餐证据和官方结算说明。</p><Link href="/zh/guides/price-guide">了解价格与税费口径<ArrowRight aria-hidden="true" /></Link></PublicEvidence></div>
    </PublicCard>
    <PublicCard className="gs-source-process"><h2>价格如何进入公开视图</h2><ol>{[["保留来源","保留原始本地币种、套餐、地区与采集记录。"],["核对口径","同平台、同套餐、同计费周期；异常或缺失不补值。"],["公开展示","通过现有发布门槛后展示；价格采集、汇率和复核日期分开标注。"]].map(([title,body],index)=><li key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><p>以上是公开视图的规则说明，不代表单条价格已经人工复核。</p></PublicCard>
    <PublicCard className="gs-source-example"><h2>一条价格的证据</h2>{example ? <><h3>ChatGPT Plus · 菲律宾 · App Store</h3><dl><div><dt>当时采集标价</dt><dd className="gs-evidence-money" data-source-example-price>{countryMoney(example.amount,example.currency)} / 月</dd></div><div><dt>税费口径</dt><dd><PublicTag>税费待核验</PublicTag></dd></div><div><dt>价格采集</dt><dd>{exampleDate}</dd></div><div><dt>汇率基准</dt><dd>{example.fxDate||"汇率待更新"}</dd></div><div><dt>套餐复核</dt><dd>未提供逐项复核记录</dd></div><div><dt>来源</dt><dd>菲律宾 App Store</dd></div></dl><div className="gs-source-example-links"><a href={example.sourceUrl} target="_blank" rel="noreferrer">查看当前官方页面<ExternalLink aria-hidden="true" /></a>{example.observationId&&<Link href={`/zh/price-records/${example.observationId}`}>原始快照<ArrowRight aria-hidden="true" /></Link>}<a href={getEvidencePlanHref(`/zh/${example.category==="streaming"?"streaming-pricing":"ai-pricing"}/${example.productSlug}/${example.planSlug}`)}>比较所有地区<ArrowRight aria-hidden="true" /></a></div></> : <p>当前没有可展示的同口径例证。请查看国家目录或稍后重试；不使用示例金额填补。</p>}</PublicCard>
  </>;
}
