import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteChrome from "../../../components/SiteChrome";
import { CodexResetResultView } from "../../../components/CodexResetPage";
import { CodexResetUnavailable } from "../../../components/CodexResetUnifiedView";
import { isLocalStylePreviewAllowed } from "../../../lib/local-style-preview";
import { parseResetQuery } from "../../../lib/codex-reset-presentation";
import { codexStyleFixture } from "./fixtures";
import PreviewError from "./PreviewError";
import styles from "../../../components/CodexResetUnified.module.css";

export const metadata:Metadata={title:"Codex 样式验收（仅本地隔离样例）",description:"不提供真实公告或账户状态。",robots:{index:false,follow:false,googleBot:{index:false,follow:false}},alternates:{canonical:null,languages:{}}};
const scenarios={confirmed:"确认",grant:"权益",rolling:"部分完成",cancelled:"取消",withdrawn:"撤回",rule:"规则/来源异常",delayed:"检查延迟",empty:"空",error:"读取失败",missing:"未开放",boundaries:"混合日期",long:"长文本"};

export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if(!isLocalStylePreviewAllowed(process.env.GEOSUB_LOCAL_STYLE_PREVIEW,(await headers()).get("host"))) notFound();
  const params=await searchParams,query=parseResetQuery(params);if(!query)notFound();
  const scenario=typeof params.scenario==="string"?params.scenario:"mixed";
  if(scenario!=="mixed"&&!Object.hasOwn(scenarios,scenario))notFound();
  const result=codexStyleFixture(scenario);
  if(query.eventId){const event=codexStyleFixture("boundaries").events.find(e=>e.id===query.eventId);if(!event)notFound();result.events=[event];result.total=1;result.requestedEventId=query.eventId;result.resolvedEventId=event.id;}
  const locale=params.locale==="en"?"en":"zh";
  return <SiteChrome><aside className={styles.previewNotice} data-codex-preview><strong>仅本地样式预览 · 隔离样例，非真实公告</strong><details><summary>切换隔离状态</summary><p>此页不读取账户、不写入事件库，也不会在公开工具中用示例回退。日期和次数仅用于验收。</p><nav aria-label="隔离状态"><a href="/style-preview/codex-reset">综合</a>{Object.entries(scenarios).map(([state,label])=><a href={`?scenario=${state}`} key={state}>{label}</a>)}</nav></details></aside>{scenario==="error"?<PreviewError/>:scenario==="missing"?<CodexResetUnavailable/>:<CodexResetResultView locale={locale} result={result} query={query} previewBase="/style-preview/codex-reset"/>}</SiteChrome>;
}
