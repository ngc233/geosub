import { hasContentFactTokens } from "../../../../lib/content-fact-tokens";
import { readFactContent } from "../../../../lib/managed-content-fact-view";
import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/admin-auth";
import { contentStore } from "../../../../lib/managed-content-store";
import PricingDetailPage from "../../../../components/PricingDetailPage";
import { AdminLinkButton } from "../../../../components/admin/AdminButton";
import { getRegisteredContentTarget, LEGACY_CONTENT_TARGET } from "../../../../lib/managed-content";
export const metadata: Metadata = { title: "内容草稿预览", robots: { index: false, follow: false } };
export default async function ContentPreview({ searchParams }: { searchParams: Promise<{ version?: string; target?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const target = getRegisteredContentTarget(query.target ?? LEGACY_CONTENT_TARGET);
  const { readContentState, readRevision } = contentStore(target.id);
  const state = await readContentState();
  const version = query.version === undefined ? null : Number(query.version);
  if (version !== null && (!Number.isSafeInteger(version) || version < 0 || version > state.version)) throw new Error("无效版本");
  const draft = version === null ? state.draft : (await readRevision(version))?.content;
  const rendered = draft && hasContentFactTokens(draft) ? await readFactContent(draft,target.id) : null;
  return <><div className="mb-5 space-y-3"><AdminLinkButton href={`/admin/content?target=${encodeURIComponent(target.id)}`} variant="secondary">返回内容编辑</AdminLinkButton><p>{target.productSlug} · {target.locale} · 仅管理员可见 · {version === null ? `草稿代次 ${state.generation} · 未发布` : `历史修订 C${version}`}</p>{draft ? <div className="break-words"><p>搜索标题：{rendered?.content.title ?? draft.title}</p><p>搜索摘要：{rendered?.content.description ?? draft.description}</p></div> : <p>{version === null ? "请先保存草稿。" : "此修订使用代码默认内容。"}</p>}</div>{draft || version !== null ? <PricingDetailPage params={Promise.resolve({ slug: target.productSlug })} locale={target.locale} routeCategory="ai" contentPreview={draft || null} /> : null}</>;
}
