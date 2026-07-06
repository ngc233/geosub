import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type AdminStatusNoticeVariant = "info" | "success" | "warning" | "danger";

const variantStyles = {
  info: {
    box: "border-blue-200 bg-blue-50 text-blue-900",
    icon: "bg-blue-600 text-white",
    title: "text-blue-950",
    Icon: Info,
  },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "bg-emerald-600 text-white",
    title: "text-emerald-950",
    Icon: CheckCircle2,
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "bg-amber-500 text-white",
    title: "text-amber-950",
    Icon: AlertTriangle,
  },
  danger: {
    box: "border-red-200 bg-red-50 text-red-900",
    icon: "bg-red-600 text-white",
    title: "text-red-950",
    Icon: XCircle,
  },
};

export default function AdminStatusNotice({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: ReactNode;
  variant?: AdminStatusNoticeVariant;
}) {
  const style = variantStyles[variant];
  const Icon = style.Icon;

  return (
    <section className={`rounded-xl border px-4 py-3 shadow-sm ${style.box}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className={`text-sm font-semibold ${style.title}`}>{title}</h2>
          <div className="mt-1 text-sm leading-6 opacity-90">{children}</div>
        </div>
      </div>
    </section>
  );
}
