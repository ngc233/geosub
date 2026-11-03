"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { PublicButton, PublicCard, PublicInput, PublicSelect, PublicTextarea } from "../../../components/ui/PublicControls";

const categories = [
  ["correction", "价格与数据纠错"], ["suggestion", "产品与功能建议"], ["data", "数据与内容合作"],
  ["advertising", "广告与品牌合作"], ["privacy", "隐私请求"], ["other", "其他问题"],
] as const;

export type ContactTicketCategory = (typeof categories)[number][0];

export default function ContactTicketForm({
  initialCategory = "correction",
  initialSubject = "",
}: {
  initialCategory?: ContactTicketCategory;
  initialSubject?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<ContactTicketCategory>(initialCategory);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/contact-tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, sourcePath: window.location.pathname }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setStatus("error");
      setFeedback(result.error || "提交失败，请稍后重试或使用页面邮箱联系我们。");
      return;
    }
    setStatus("success");
    setFeedback(`工单 ${result.ticketId} 已提交，我们会通过你填写的邮箱回复。`);
    form.reset();
  }

  if (status === "success") {
    return <PublicCard id="contact-form" className="gs-aux-contact-success" data-gs-contact-state="success">
      <CheckCircle2 aria-hidden="true"/><h2>提交成功</h2><p>{feedback}</p><PublicButton variant="secondary" onClick={()=>setStatus("idle")}>再提交一条</PublicButton>
    </PublicCard>;
  }

  return <form id="contact-form" onSubmit={submit} className="gs-aux-form" data-gs-contact-state={status}>
    <PublicCard className="gs-aux-card"><div className="gs-aux-form-fields">
      <div><PublicSelect label="联系类型" value={category} onChange={value=>setCategory(value as ContactTicketCategory)} options={categories.map(([value,label])=>({value,label}))}/><input type="hidden" name="category" value={category}/></div>
      <PublicInput label="称呼" name="name" required minLength={2} maxLength={100} placeholder="你的姓名或称呼"/>
      <PublicInput label="联系邮箱" name="email" type="email" required maxLength={254} placeholder="用于接收回复"/>
      <PublicInput label="组织 / 品牌（选填）" name="organization" maxLength={160} placeholder="公司、机构或品牌名称"/>
      <div className="gs-aux-form-wide"><PublicInput label="主题" key={`${initialCategory}-${initialSubject}`} name="subject" required minLength={4} maxLength={200} defaultValue={initialSubject} placeholder="用一句话说明你的需求"/></div>
      <div className="gs-aux-form-wide"><PublicInput label="相关页面（选填）" name="pageUrl" type="url" maxLength={1000} placeholder="https://geosub.org/..."/></div>
      <div className="gs-aux-form-wide"><PublicTextarea label="详细说明" name="message" required minLength={20} maxLength={5000} rows={7} placeholder="请提供产品、地区、来源或合作目标等必要信息。"/></div>
      <label className="gs-aux-honeypot" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off"/></label>
    </div>
    {status==="error"?<p role="alert" className="gs-aux-error">{feedback}</p>:null}
    <div className="gs-aux-form-footer"><p>提交即表示你同意我们仅为处理本次联系而保存并使用所填信息。请勿提交密码、付款资料或其他敏感凭据。</p><PublicButton type="submit" disabled={status==="sending"}>{status==="sending"?<Loader2 className="gs-aux-spinner" aria-hidden="true"/>:<Send aria-hidden="true"/>}{status==="sending"?"正在提交":"提交工单"}</PublicButton></div></PublicCard>
  </form>;
}
