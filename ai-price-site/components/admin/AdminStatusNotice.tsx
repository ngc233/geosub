import type { ReactNode } from "react";
import AdminAlert from "./AdminAlert";

export type AdminStatusNoticeVariant = "info" | "success" | "warning" | "danger";

/** Status notices and alerts share the same title, surface and theme tokens. */
export default function AdminStatusNotice({ title, children, variant = "info" }: {
  title: string;
  children: ReactNode;
  variant?: AdminStatusNoticeVariant;
}) {
  return <AdminAlert title={title} variant={variant}>{children}</AdminAlert>;
}
