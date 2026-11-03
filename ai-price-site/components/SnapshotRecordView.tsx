import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, ExternalLink, FileCheck2, History, Info } from "lucide-react";
import BrandIcon from "./BrandIcon";
import { PublicCard, PublicEvidence, PublicTag } from "./ui/PublicControls";
import type { getPublicPriceSnapshot } from "../lib/price-records";

type Snapshot = NonNullable<ReturnType<typeof getPublicPriceSnapshot>>;
type Props = { snapshot:Snapshot; title:string; observedPrice:string; observedTime:string; billingLabel:string; planPath:string; children:ReactNode };

export default function SnapshotRecordView({ snapshot, title, observedPrice, observedTime, billingLabel, planPath, children }:Props) {
  const selected = snapshot.items.filter(item=>item.selected).length;
  return <main data-gs-snapshot="record">
    <nav className="gs-snapshot-navigation" aria-label="快照返回入口"><Link href={planPath}><ArrowLeft aria-hidden="true" />返回套餐价格<span>· 当前报价</span></Link><Link href={`/zh/price-history/${snapshot.productSlug}`}><History aria-hidden="true" />查看该产品价格历史</Link></nav>
    <header className="gs-snapshot-heading"><p>GEOSUB 订阅价格数据 · 原始记录</p><div><BrandIcon product={{slug:snapshot.productSlug,name:snapshot.productName}} size="lg" priority /><h1>{title}</h1></div><p>以下为采集当时保存的 App Store 套餐条目。它是历史观测，不代表当前结算价格；未采用条目不自动等于错误或不可购买。</p></header>
    <PublicCard className="gs-snapshot-notice"><Info aria-hidden="true" /><div><h2>采集当时的证据</h2><p>本页保留这一条观测记录的金额、原始条目和时间。查看现在的价格，请进入当前套餐报价页。</p></div><PublicTag>历史观测</PublicTag></PublicCard>
    <PublicCard className="gs-snapshot-summary"><div className="gs-snapshot-summary-title"><h2>归属套餐 · {snapshot.planName}</h2><PublicTag>App Store</PublicTag></div><div className="gs-snapshot-metrics">
      <div className="gs-snapshot-observed"><p>当时本币标价</p><strong data-snapshot-amount>{observedPrice}</strong><PublicTag>{snapshot.currency} · 原币记录</PublicTag></div>
      <div className="gs-snapshot-fact"><Clock3 aria-hidden="true" /><h3>采集时间</h3><time dateTime={snapshot.observedAt} data-snapshot-time>{observedTime}</time><p>时间按 UTC 展示</p></div>
      <div className="gs-snapshot-fact"><h3>计费周期</h3><p data-snapshot-cycle>{billingLabel}</p><p>{snapshot.billingCycle ? "沿用该条记录保存的周期" : "不从商品名称或价格推断周期"}</p></div>
    </div></PublicCard>
    <PublicCard className="gs-snapshot-source"><h2>来源与记录范围</h2><dl><div><dt>来源平台</dt><dd>App Store</dd></div><div><dt>地区</dt><dd>{new Intl.DisplayNames(["zh-CN"],{type:"region"}).of(snapshot.countryCode)||snapshot.countryCode} · {snapshot.countryCode}</dd></div><div><dt>保留条目</dt><dd>{snapshot.items.length} 项 · 采用条目 {selected} 项</dd></div></dl><a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">查看当前官方页面<ExternalLink aria-hidden="true" /></a><p>这是记录保存的来源地址。打开后可能是已更新的官方页面，本页条目仍保持采集时保存的内容。</p></PublicCard>
    <PublicCard className="gs-snapshot-items"><div className="gs-snapshot-items-heading"><h2>采集时的原始套餐条目</h2><PublicTag>{snapshot.items.length} 项</PublicTag></div><p>“采用条目”表示采集器保存的名称和原始价格文本均与该行一致，不意味着其他条目已被逐一核实或排除。</p>
      <div className="gs-snapshot-table-head" aria-hidden="true"><span>原始套餐名称</span><span>原始价格文本</span></div><div className="gs-snapshot-item-list">{snapshot.items.map((item,index)=><article key={index} className="gs-snapshot-item" data-snapshot-item data-selected={item.selected}><div><p data-snapshot-item-name>{item.name}</p>{item.selected&&<PublicTag>采用条目</PublicTag>}</div><p className="gs-snapshot-item-price" data-snapshot-item-price>{item.priceText}</p></article>)}</div>
      {snapshot.truncated&&<p className="gs-snapshot-truncated" role="status">条目超过展示上限，仅展示前 200 条。</p>}
    </PublicCard>
    <PublicCard className="gs-snapshot-checksum"><PublicEvidence animated title="记录标识与内容校验值"><div className="gs-snapshot-checksum-heading"><FileCheck2 aria-hidden="true" /><p>用于识别本页公开记录的内容</p></div><dl><div><dt>记录标识</dt><dd><code data-snapshot-id>{snapshot.id}</code></dd></div><div><dt>原始 UTC 采集时间</dt><dd><code data-snapshot-timestamp>{snapshot.observedAt}</code></dd></div><div><dt>SHA-256</dt><dd><code data-snapshot-hash>{snapshot.contentHash}</code></dd></div></dl><p>校验值对应公开记录及本页保留的条目，超出展示上限的条目不在此校验范围内。产品与套餐目录名称用于定位归属，采集原文以原始条目为准。</p><p>校验值用于识别本站展示记录的内容，不是 Apple 签名或第三方认证。</p></PublicEvidence></PublicCard>
    <PublicCard className="gs-snapshot-current"><div><h2>继续查看当前报价</h2><p>当前套餐页与本页承担不同任务：一个展示当前可发布的报价，一个保留采集时的原始证据。</p></div><Link href={planPath}>查看当前套餐报价<ArrowRight aria-hidden="true" /></Link></PublicCard>
    {children}
  </main>;
}

export function SnapshotUnavailable({ id, children }:{id:string;children:ReactNode}) {
  return <main data-gs-snapshot="unavailable"><header className="gs-snapshot-heading"><h1>原始价格快照</h1><p>App Store</p></header><PublicCard className="gs-snapshot-state" role="status"><h2>暂时无法读取价格记录</h2><p>请稍后刷新重试。读取失败不代表没有价格或没有变化。</p><a href={`/zh/price-records/${encodeURIComponent(id)}`}>重新读取<ArrowRight aria-hidden="true" /></a></PublicCard>{children}</main>;
}

export function SnapshotNotFound() {
  return <main data-gs-snapshot="missing"><PublicCard className="gs-snapshot-state"><h1>404</h1><h2>没有找到可公开的价格快照</h2><p>记录可能不存在或不符合公开条件，请从已有价格证据入口重新进入。</p><Link href="/zh/price-history">查看价格变化记录<ArrowRight aria-hidden="true" /></Link><Link href="/zh/countries">按国家找订阅<ArrowRight aria-hidden="true" /></Link></PublicCard></main>;
}
