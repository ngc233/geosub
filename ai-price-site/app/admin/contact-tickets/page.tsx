import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import AdminPagination from "@/components/admin/AdminPagination";
import { AdminPageHeader } from "@/components/admin/AdminCard";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import { adminControlClassName } from "@/components/admin/admin-control";
import { adminRecordVersion } from "../../../lib/admin-save";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { Mail, MessageSquareText } from "lucide-react";
import { prisma } from "../../../lib/prisma";
import { updateContactTicket } from "./actions";

const statusLabels: Record<string, string> = { new: "新工单", in_progress: "处理中", replied: "已回复", closed: "已关闭" };
const categoryLabels: Record<string, string> = { correction: "数据纠错", suggestion: "产品建议", data: "数据合作", advertising: "广告合作", privacy: "隐私请求", other: "其他" };

export default async function ContactTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string; updated?: string; page?: string; error?: string }> }) {
  const query = await searchParams;
  const status = ["new", "in_progress", "replied", "closed"].includes(query.status || "") ? query.status : undefined;
  const counts = await prisma.contactTicket.groupBy({ by: ["status"], _count: { _all: true } });
  const countMap = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));
  const total = status ? countMap[status] || 0 : counts.reduce((n,row)=>n+row._count._all,0);
  const pages=Math.max(1,Math.ceil(total/10));
  const requested=Number(query.page||1);
  const page=Math.min(pages,Number.isSafeInteger(requested)&&requested>0?requested:1);
  const tickets=await prisma.contactTicket.findMany({where:status?{status}:{},orderBy:[{createdAt:'desc'},{id:'desc'}],take:10,skip:(page-1)*10});
  const pageHref=(value:number)=>`/admin/contact-tickets?page=${value}${status?`&status=${status}`:''}#tickets-list`;

  return <div>
    <AdminPageHeader eyebrow="用户与商业沟通" title="联系工单箱"
      description="处理前台纠错、建议、合作与隐私请求。工单内容不会公开。"
      action={<span className="inline-flex items-center gap-2 text-sm text-admin-text-muted">
        <MessageSquareText size={16} />共 {counts.reduce((sum,item)=>sum+item._count._all,0)} 条
      </span>} />
    {query.error ? <p role="alert" className="mt-4">工单未更新，请核对输入后重试。</p> : null}
    {query.updated ? <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3
      text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      工单 {query.updated.toUpperCase()} 已更新。
    </div> : null}
    <AdminSegmentedControl ariaLabel="工单状态" value={status || "all"} items={[
      {value:"all",label:"全部",href:"/admin/contact-tickets"},
      ...Object.entries(statusLabels).map(([value,label])=>({
        value,label:`${label} ${countMap[value]||0}`,href:`/admin/contact-tickets?status=${value}`
      }))
    ]} />
    <AdminPagination id="tickets-list" page={page} totalPages={pages} total={total} pageSize={10} pageHref={pageHref} ariaLabel="工单顶部分页" className="mt-5" />
    <div className="mt-6 space-y-4">
      {tickets.length === 0 ? <div className="rounded-admin-card border border-dashed bg-admin-surface
        p-10 text-center text-sm text-admin-text-muted dark:bg-admin-surface dark:text-admin-text-muted">
        当前筛选下没有工单。
      </div> : tickets.map((ticket) => <article key={ticket.id}
        className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm
          sm:p-6 dark:border-admin-border-strong dark:bg-admin-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {categoryLabels[ticket.category] || ticket.category}
            </span>
            <span className="text-xs font-semibold text-admin-text-faint">#{ticket.id.slice(0, 8).toUpperCase()}</span>
          </div><h2 className="mt-3 text-base font-semibold text-admin-text">{ticket.subject}</h2>
          <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            {ticket.name}{ticket.organization ? ` · ${ticket.organization}` : ""} · {ticket.createdAt.toLocaleString("zh-CN")}
          </p></div>
          <a href={`mailto:${ticket.email}?subject=${
            encodeURIComponent(`回复 GeoSub 工单 ${ticket.id.slice(0, 8).toUpperCase()}：${ticket.subject}`)
          }`} className={adminButtonClassName({variant:"secondary"})}><Mail className="h-4 w-4" />邮件回复</a>
        </div>
        <p className="mt-5 whitespace-pre-wrap rounded-lg bg-admin-surface-subtle p-4 text-sm leading-6 text-admin-text-body dark:bg-admin-surface dark:text-admin-text-body">{ticket.message}</p>
        {ticket.pageUrl ? <a href={ticket.pageUrl} target="_blank" rel="noreferrer"
          className="mt-3 block break-all text-xs font-medium text-admin-accent hover:underline">
          相关页面：{ticket.pageUrl}
        </a> : null}
        <AdminActionForm action={updateContactTicket} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={ticket.id} /><input type="hidden" name="recordVersion" value={adminRecordVersion(ticket)} />
          <label className="text-xs font-semibold text-admin-text-secondary dark:text-admin-text-secondary">
            处理状态<select name="status" defaultValue={ticket.status} className={`${adminControlClassName} mt-2 w-full h-11`}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-admin-text-secondary dark:text-admin-text-secondary">
            内部备注<input name="adminNote" defaultValue={ticket.adminNote || ""} maxLength={5000}
              className={`${adminControlClassName} mt-2 w-full h-11`} placeholder="仅后台可见" />
          </label>
          <button className={adminButtonClassName({ variant: "primary", size: "md", className: "" })}>保存</button>
        </AdminActionForm>
      </article>)}
    </div>
    <AdminPagination page={page} totalPages={pages} total={total} pageSize={10} pageHref={pageHref} ariaLabel="工单底部分页" className="mt-6" />
  </div>;
}
