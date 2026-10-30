import type { ReactNode } from "react";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type AdminAlertVariant = "info" | "success" | "warning" | "danger";

const variantStyles = {
  info: {
    box: "border-admin-accent/20 bg-admin-accent-soft",
    icon: "bg-admin-accent-soft text-admin-accent",
    title: "text-admin-accent",
    text: "text-admin-accent",
    Icon: Info,
  },
  success: {
    box: "border-admin-success/20 bg-admin-success-soft",
    icon: "bg-admin-success-soft text-admin-success",
    title: "text-admin-success",
    text: "text-admin-success",
    Icon: CheckCircle2,
  },
  warning: {
    box: "border-admin-warning/20 bg-admin-warning-soft",
    icon: "bg-admin-warning-soft text-admin-warning",
    title: "text-admin-warning",
    text: "text-admin-warning",
    Icon: AlertTriangle,
  },
  danger: {
    box: "border-admin-danger/20 bg-admin-danger-soft",
    icon: "bg-admin-danger-soft text-admin-danger",
    title: "text-admin-danger",
    text: "text-admin-danger",
    Icon: XCircle,
  },
};

export default function AdminAlert({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: ReactNode;
  variant?: AdminAlertVariant;
}) {
  const style = variantStyles[variant];
  const Icon = style.Icon;

  return (
    <div className={`rounded-admin-card border p-5 ${style.box}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h2 className={`text-base font-semibold ${style.title}`}>{title}</h2>
          <div className={`mt-2 text-sm leading-6 ${style.text}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
