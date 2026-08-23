import { Mail, MessageSquareText } from "lucide-react";
import { prisma } from "../../../lib/prisma";
import { updateContactTicket } from "./actions";

const statusLabels: Record<string, string> = { new: "新工单", in_progress: "处理中", replied: "已回复", closed: "已关闭" };
const categoryLabels: Record<string, string> = { correction: "数据纠错", suggestion: "产品建议", data: "数据合作", advertising: "广告合作", privacy: "隐私请求", other: "其他" };

export default async function ContactTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string; updated?: string }> }) {
  const query = await searchParams;
  const status = ["new", "in_progress", "replied", "closed"].includes(query.status || "") ? query.status : undefined;
  const [tickets, counts] = await Promise.all([
    prisma.contactTicket.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.contactTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countMap = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-bold text-blue-700">用户与商业沟通</p><h1 className="mt-1 text-3xl font-black">联系工单箱</h1><p className="mt-2 text-sm text-slate-500">处理前台纠错、建议、合作与隐私请求。工单内容不会公开。</p></div>
      <div className="flex items-center gap-2 text-sm text-slate-500"><MessageSquareText className="h-4 w-4" />共 {counts.reduce((sum, item) => sum + item._count._all, 0)} 条</div>
    </div>
    {query.updated ? <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">工单 {query.updated.toUpperCase()} 已更新。</div> : null}
    <nav className="mt-6 flex flex-wrap gap-2">
      <a href="/admin/contact-tickets" className={`rounded-lg px-4 py-2 text-sm font-bold ${!status ? "bg-slate-950 text-white" : "border bg-white"}`}>全部</a>
      {Object.entries(statusLabels).map(([value, label]) => <a key={value} href={`/admin/contact-tickets?status=${value}`} className={`rounded-lg px-4 py-2 text-sm font-bold ${status === value ? "bg-slate-950 text-white" : "border bg-white"}`}>{label} {countMap[value] || 0}</a>)}
    </nav>
    <div className="mt-6 space-y-4">
      {tickets.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">当前筛选下没有工单。</div> : tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{categoryLabels[ticket.category] || ticket.category}</span><span className="text-xs font-bold text-slate-400">#{ticket.id.slice(0, 8).toUpperCase()}</span></div><h2 className="mt-3 text-lg font-black">{ticket.subject}</h2><p className="mt-1 text-xs text-slate-500">{ticket.name}{ticket.organization ? ` · ${ticket.organization}` : ""} · {ticket.createdAt.toLocaleString("zh-CN")}</p></div>
          <a href={`mailto:${ticket.email}?subject=${encodeURIComponent(`回复 GeoSub 工单 ${ticket.id.slice(0, 8).toUpperCase()}：${ticket.subject}`)}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"><Mail className="h-4 w-4" />邮件回复</a>
        </div>
        <p className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{ticket.message}</p>
        {ticket.pageUrl ? <a href={ticket.pageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs font-bold text-blue-700 hover:underline">相关页面：{ticket.pageUrl}</a> : null}
        <form action={updateContactTicket} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={ticket.id} />
          <label className="text-xs font-bold text-slate-600">处理状态<select name="status" defaultValue={ticket.status} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">内部备注<input name="adminNote" defaultValue={ticket.adminNote || ""} maxLength={5000} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" placeholder="仅后台可见" /></label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">保存</button>
        </form>
      </article>)}
    </div>
  </div>;
}
