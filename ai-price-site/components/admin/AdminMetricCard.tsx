import type { LucideIcon } from "lucide-react";

type AdminMetricCardVariant = "neutral" | "success" | "warning" | "danger";

const variantStyles = {
  neutral: {
    accent: "bg-slate-300 dark:bg-slate-600",
    icon: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    value: "text-slate-950 dark:text-slate-50",
  },
  success: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    accent: "bg-amber-500",
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    accent: "bg-red-500",
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
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${style.value}`}>{value}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p> : null}
        </div>

        {Icon ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
            <Icon size={16} strokeWidth={2.2} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
