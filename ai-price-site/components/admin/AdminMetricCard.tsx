import type { LucideIcon } from "lucide-react";

type AdminMetricCardVariant = "neutral" | "success" | "warning" | "danger";

const variantStyles = {
  neutral: {
    accent: "bg-slate-300",
    icon: "bg-slate-100 text-slate-500",
    value: "text-slate-950",
  },
  success: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-emerald-700",
  },
  warning: {
    accent: "bg-amber-500",
    icon: "bg-amber-50 text-amber-700",
    value: "text-amber-700",
  },
  danger: {
    accent: "bg-red-500",
    icon: "bg-red-50 text-red-700",
    value: "text-red-700",
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
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${style.value}`}>{value}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}
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
