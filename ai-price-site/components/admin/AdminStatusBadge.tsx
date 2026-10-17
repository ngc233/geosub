import {
  adminOperationalStatusMeta,
  type AdminOperationalStatus,
} from "../../lib/admin-operational-status";

export default function AdminStatusBadge({
  status,
  title,
  dimension = "operational",
}: {
  status: AdminOperationalStatus;
  title?: string;
  dimension?: "operational" | "quality";
}) {
  const meta = adminOperationalStatusMeta[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}
      title={title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
      {dimension === "quality" && status === "published" ? "数据就绪" : meta.label}
    </span>
  );
}
