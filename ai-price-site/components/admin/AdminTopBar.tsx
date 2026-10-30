import AdminLink from "@/components/admin/AdminLink";
import { MailOpen, Search } from "lucide-react";

const roleLabels: Record<string, string> = { OWNER: "管理员", EDITOR: "编辑", VIEWER: "只读成员" };

/** Desktop header: greeting, product search (the pipeline's existing ?q= filter), tickets, avatar. */
export default function AdminTopBar({ name, role }: { name: string; role: string }) {
  const today = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 hidden h-[72px] items-center justify-between gap-6 border-b border-admin-border bg-admin-surface/95 px-8 backdrop-blur lg:flex">
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-admin-text">你好，{name}</p>
        <p className="text-xs text-admin-text-muted">
          今天是{today} · {roleLabels[role] || "未知角色"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <form action="/admin/pipeline" method="get" role="search" className="relative">
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-faint" />
          <input
            type="search"
            name="q"
            maxLength={100}
            aria-label="搜索产品"
            placeholder="搜索产品…"
            className="h-10 w-72 rounded-full border border-admin-border-strong bg-admin-surface pl-9 pr-4 text-sm text-admin-text outline-none transition placeholder:text-admin-text-faint focus:border-admin-accent focus:ring-4 focus:ring-admin-accent-soft"
          />
        </form>
        <AdminLink
          href="/admin/contact-tickets"
          aria-label="联系工单"
          className="flex h-10 w-10 items-center justify-center rounded-full text-admin-text-secondary transition hover:bg-admin-surface-subtle hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <MailOpen size={19} strokeWidth={1.8} />
        </AdminLink>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-accent-soft text-sm font-semibold text-admin-accent"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    </header>
  );
}
