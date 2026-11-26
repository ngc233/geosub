import type { Metadata } from "next";
import GuideCollection from "../../../components/GuideCollection";
import { loadCoreGuideHubStates } from "../../../lib/core-guide-cms";
import {
  buildFoundationalGuideSteps,
  getGuideHubCopy,
} from "../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "訂閱與地區價格指南",
  description:
    "閱讀數位訂閱、地區定價、匯率基準、稅費規則、付款條件與工具比較的實用指南。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

export default async function TraditionalChineseGuidesPage() {
  const states = await loadCoreGuideHubStates("zh-tw");
  const copy = getGuideHubCopy("zh-tw");
  const core = buildFoundationalGuideSteps("zh-tw", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  return (
    <GuideCollection
      locale="zh-tw"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={[]}
      steps={core}
      emptyText="目前尚無其他繁體中文專題文章。"
      showBack={false}
    />
  );
}
