import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/admin-auth";
import { readContentState, readRevision } from "../../../../lib/managed-content-store";
import PricingDetailPage from "../../../../components/PricingDetailPage";
import { AdminLinkButton } from "../../../../components/admin/AdminButton";
export const metadata: Metadata = { title: "内容草稿预览", robots: { index: false, follow: false } };
export default async function ContentPreview({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  await requireAdmin();
  const state = await readContentState();
  const query = await searchParams;
  const version = query.version === undefined ? null : Number(query.version);
  if (version !== null && (!Number.isSafeInteger(version) || version < 0 || version > state.version)) throw new Error("无效版本");
  const draft = version === null ? state.draft : (await readRevision(version))?.content;
  return <><div className="mb-5 space-y-3"><AdminLinkButton href="/admin/content" variant="secondary">返回内容编辑</AdminLinkButton><p>仅管理员可见 · {version === null ? `草稿代次 ${state.generation} · 未发布` : `历史修订 C${version}`}</p>{draft ? <div className="break-words"><p>搜索标题：{draft.title}</p><p>搜索摘要：{draft.description}</p></div> : <p>{version === null ? "请先保存草稿。" : "此修订使用代码默认内容。"}</p>}</div>{draft || version !== null ? <PricingDetailPage params={Promise.resolve({ slug: "chatgpt" })} locale="en" routeCategory="ai" contentPreview={draft || null} /> : null}</>;
}
