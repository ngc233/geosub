import { adminControlClassName } from "./admin-control";
import AdminLink from "@/components/admin/AdminLink";
import { Search, X } from "lucide-react";
import { adminButtonClassName } from "./AdminButton";

export type AdminFilterOption = { value: string; label: string };

export type AdminFilterField = {
  name: string;
  label: string;
  value: string;
  options: AdminFilterOption[];
};

const controlClassName = `${adminControlClassName} h-11`;

/**
 * GET form: every filter is a URL parameter, so results survive refresh and back/forward.
 * `preserve` carries params that are not edited here (for example the current sort).
 */
export default function AdminFilterBar({
  action,
  q,
  searchLabel = "搜索",
  searchPlaceholder = "搜索…",
  filters = [],
  preserve = {},
  clearHref,
}: {
  action: string;
  q?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  filters?: AdminFilterField[];
  preserve?: Record<string, string | undefined>;
  clearHref: string;
}) {
  const activeCount = (q ? 1 : 0) + filters.filter((filter) => filter.value).length;

  return (
    <form key={JSON.stringify([q, filters.map(field => [field.name, field.value]), preserve])} action={action} method="get" role="search" className="mb-4 flex flex-wrap items-end gap-3">
      {Object.entries(preserve).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}

      <label className="min-w-[220px] flex-1">
        <span className="mb-1.5 block text-xs font-medium text-admin-text-muted">{searchLabel}</span>
        <span className="relative block">
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-faint" />
          <input
            aria-label={searchLabel}
            type="search"
            name="q"
            defaultValue={q}
            placeholder={searchPlaceholder}
            maxLength={100}
            className={`${controlClassName} w-full pl-9`}
          />
        </span>
      </label>

      {filters.map((filter) => (
        <label key={filter.name}>
          <span className="mb-1.5 block text-xs font-medium text-admin-text-muted">{filter.label}</span>
          <select aria-label={filter.label} name={filter.name} defaultValue={filter.value} className={controlClassName}>
            <option value="">全部</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <button type="submit" className={adminButtonClassName({ variant: "primary" })}>
        筛选
      </button>

      {activeCount > 0 ? (
        <AdminLink href={clearHref} scroll={clearHref.includes("#") ? true : undefined} className={adminButtonClassName({ variant: "ghost" })}>
          <X aria-hidden="true" size={15} />
          清除 {activeCount} 项筛选
        </AdminLink>
      ) : null}
    </form>
  );
}
