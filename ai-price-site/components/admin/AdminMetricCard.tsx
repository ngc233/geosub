import type { LucideIcon } from "lucide-react";

type AdminMetricCardVariant = "neutral" | "success" | "warning" | "danger";

const variantStyles = {
  neutral: {

    icon: "bg-admin-chip text-admin-text-muted dark:text-admin-text-secondary",
    value: "text-admin-text",
  },
  success: {

    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {

    icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  danger: {

    icon: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
  },
};

export default function AdminMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  variant = "neutral",
}: {
  label: string;
  value: number | string;
  helper?: string;
  icon?: LucideIcon;
  variant?: AdminMetricCardVariant;
}) {
  const style = variantStyles[variant];

  return (
    <div className="relative overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-admin-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-admin-text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${style.value}`}>{value}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-admin-text-muted">{helper}</p> : null}
        </div>

        {Icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
            <Icon size={16} strokeWidth={2.2} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
