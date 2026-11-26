import AdminLink from "@/components/admin/AdminLink";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "min-w-0 rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-admin-card sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: number | string;
  helper?: string;
  href?: string;
}) {
  const card = (
    <div
      className={joinClasses(
        "h-full min-w-0 rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-admin-card sm:p-6 transition",
        href
          ? "cursor-pointer hover:border-admin-accent/30 hover:shadow-md motion-reduce:transition-none"
          : ""
      )}
    >
      <div className="flex h-full items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-admin-text-muted">{label}</p>
          <p className="mt-2 text-[28px] font-semibold tracking-tight text-admin-text tabular-nums">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-admin-text-faint">{helper}</p>
          ) : null}
        </div>

        {href ? (
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-admin-control border border-admin-border bg-admin-surface-subtle text-admin-text-secondary transition group-hover:border-admin-primary group-hover:bg-admin-primary group-hover:text-admin-on-primary">
            <ArrowRight size={14} strokeWidth={1.8} />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <AdminLink href={href} className="group block h-full min-w-0">
      {card}
    </AdminLink>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium tracking-wide text-admin-text-muted">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-1 text-xl font-semibold tracking-tight text-admin-text sm:text-2xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-admin-text-secondary">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-admin-text">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
