import type { ReactNode } from "react";
import { AdminCard, AdminSectionHeader } from "./AdminCard";

export default function AdminFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AdminCard>
      <AdminSectionHeader title={title} description={description} />
      {children}
    </AdminCard>
  );
}
