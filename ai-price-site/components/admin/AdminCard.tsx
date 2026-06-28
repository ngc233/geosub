import Link from "next/link";
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
        "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60",
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
        "h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 transition",
        href
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-slate-200/80"
          : ""
      )}
    >
      <div className="flex h-full items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p>
          ) : null}
        </div>

        {href ? (
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
            <ArrowRight size={16} strokeWidth={2} />
          </span>
        ) : (
          <span className="mt-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400">
            统计
          </span>
        )}
      </div>
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="group block h-full">
      {card}
    </Link>
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
    <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-sm font-bold tracking-tight text-blue-700">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
