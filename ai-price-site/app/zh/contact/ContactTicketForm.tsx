"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

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
    return <div id="contact-form" className="border border-emerald-200 bg-emerald-50 p-8 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-black">提交成功</h2><p className="mt-3 text-sm text-emerald-900">{feedback}</p>
      <button type="button" onClick={() => setStatus("idle")} className="mt-6 text-sm font-black underline">再提交一条</button>
    </div>;
  }

  return <form id="contact-form" onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-9">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-bold">联系类型<select name="category" required value={category} onChange={(event) => setCategory(event.target.value as ContactTicketCategory)} className="mt-2 w-full border border-zinc-300 bg-white px-3 py-3 font-normal outline-none focus:border-[#182230]">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-bold">称呼<input name="name" required minLength={2} maxLength={100} className="mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]" placeholder="你的姓名或称呼" /></label>
      <label className="text-sm font-bold">联系邮箱<input name="email" type="email" required maxLength={254} className="mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]" placeholder="用于接收回复" /></label>
      <label className="text-sm font-bold">组织 / 品牌（选填）<input name="organization" maxLength={160} className="mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]" placeholder="公司、机构或品牌名称" /></label>
      <label className="text-sm font-bold sm:col-span-2">主题<input key={`${initialCategory}-${initialSubject}`} name="subject" required minLength={4} maxLength={200} defaultValue={initialSubject} className="mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]" placeholder="用一句话说明你的需求" /></label>
      <label className="text-sm font-bold sm:col-span-2">相关页面（选填）<input name="pageUrl" type="url" maxLength={1000} className="mt-2 w-full border border-zinc-300 px-3 py-3 font-normal outline-none focus:border-[#182230]" placeholder="https://geosub.org/..." /></label>
      <label className="text-sm font-bold sm:col-span-2">详细说明<textarea name="message" required minLength={20} maxLength={5000} rows={7} className="mt-2 w-full resize-y border border-zinc-300 px-3 py-3 font-normal leading-6 outline-none focus:border-[#182230]" placeholder="请提供产品、地区、来源或合作目标等必要信息。" /></label>
      <label className="hidden" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    {status === "error" ? <p role="alert" className="mt-4 text-sm font-bold text-red-700">{feedback}</p> : null}
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-xs leading-5 text-zinc-500">提交即表示你同意我们仅为处理本次联系而保存并使用所填信息。请勿提交密码、付款资料或其他敏感凭据。</p>
      <button disabled={status === "sending"} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#182230] px-6 py-3 text-sm font-black text-white disabled:opacity-60">
        {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{status === "sending" ? "正在提交" : "提交工单"}
      </button>
    </div>
  </form>;
}
