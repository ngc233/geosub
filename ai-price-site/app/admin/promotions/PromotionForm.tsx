"use client";
import { AdminActionForm, useAdminActionState } from "@/components/admin/AdminPermissions";

import { promotionAction } from "./actions";
import { PLACEMENTS, type Draft } from "../../../lib/first-party-promotion";
import { AdminButton } from "../../../components/admin/AdminButton";
import styles from "../../../components/ManagedContent.module.css";
const input = "mt-1 block min-h-11 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";
export default function PromotionForm({ generation, operation, revision, draft, campaign }: { generation: number; operation: "draft" | "review" | "enable" | "pause" | "off"; revision?: string; draft?: Draft; campaign?: string }) {
  const [, action, pending] = useAdminActionState(promotionAction, { message: "" });
  return <AdminActionForm capability={operation === "draft" ? "draft" : "manage"} action={action} className={`${styles.scope} space-y-4`}>
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="generation" value={generation} /><input type="hidden" name="revision" value={revision || ""} /><input type="hidden" name="campaign" value={campaign || ""} />
    {operation === "draft" ? <>
      <label className="block">推广位置<select className={input} name="placement" defaultValue={draft?.placement}>{PLACEMENTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      {([['merchant','商店名称',60],['title','标题',80],['description','介绍',300],['cta','按钮文字',24],['destination','候选落地页（可留空，保存不代表核准）',500],['evidence','受控证据引用（不填写账号、密码或证件）',160],['startsAt','开始时间 UTC，例如 2026-11-01T00:00:00Z',30],['endsAt','结束时间 UTC，必须填写',30]] as const).map(([name,label,max]) => <label className="block" key={name}>{label}<textarea className={input} name={name} rows={name === 'description' ? 3 : 2} maxLength={max} required={!['destination','evidence'].includes(name)} defaultValue={draft?.[name]} /></label>)}
      <p className="text-sm">保存将生成不可覆盖的新版本，并暂停当前首页推广，等待重新审核。</p>
    </> : operation === "review" ? <>
      <label className="block">审核结论<select name="status" className={input}><option value="rejected">拒绝</option><option value="revoked">撤销</option><option value="approved">批准（须另一位审核者及已核准链接）</option></select></label>
      {([['reviewEvidence','审核证据引用',160],['termsDate','条款核对日期（UTC，以 Z 结尾）',30],['expiresAt','审核到期时间（UTC，以 Z 结尾）',30],['scope','允许范围',300],['limitations','适用限制',300]] as const).map(([name,label,max]) => <label className="block" key={name}>{label}<textarea className={input} name={name} required maxLength={max} rows={2} /></label>)}
    </> : null}
    <label className="block">操作理由<textarea name="reason" className={input} required maxLength={300} rows={2} /></label>
    <AdminButton type="submit" disabled={pending}>{pending ? "正在保存…" : { draft: "保存新草稿版本", review: "记录审核结论", enable: "启用已审核首页版本", pause: "暂停首页位置", off: "紧急关闭全部推广" }[operation]}</AdminButton>
  </AdminActionForm>;
}
