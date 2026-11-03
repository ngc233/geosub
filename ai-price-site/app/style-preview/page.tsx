import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import GuidePriceBlockStatus from "../../components/GuidePriceBlockStatus";
import PublicStyleReview from "../../components/ui/PublicStyleReview";
import { isLocalStylePreviewAllowed } from "../../lib/local-style-preview";

export const metadata: Metadata = {
  title: "组件样式审阅（仅本地）",
  description: "GeoSub 前台组件样式审阅，不提供正式价格数据。",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null, languages: {} },
};

export default async function StylePreviewPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const host = (await headers()).get("host");
  if (!isLocalStylePreviewAllowed(process.env.GEOSUB_LOCAL_STYLE_PREVIEW, host)) notFound();
  const params=await searchParams;
  if(params.refinement!==undefined) {
    if(params.refinement!=="price-empty"&&params.refinement!=="price-error")notFound();
    return <div className="gs-public-shell gs-public-unified" data-gs-motion data-gs-public-surface><main className="gs-guide-page" data-gs-guides="article"><h1>文章价格块隔离状态验收</h1><p>仅本地样式预览；以下为界面状态，不代表当前数据源状况，不替换任何业务记录。</p><GuidePriceBlockStatus status={params.refinement==="price-empty"?"empty":"error"} href="/zh/ai-pricing/chatgpt/plus"/></main></div>;
  }
  return <PublicStyleReview />;
}
