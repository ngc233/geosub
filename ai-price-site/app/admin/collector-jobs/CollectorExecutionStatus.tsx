import { AdminBadge } from "@/components/admin/AdminBadge";
import { assessCollectorExecution, type CollectorExecutionInput } from "./execution-status";

export default function CollectorExecutionStatus({ input }: { input: CollectorExecutionInput }) {
  const assessment = assessCollectorExecution(input);
  return (
    <div className="min-w-0 max-w-sm space-y-2 text-xs leading-5" aria-label="执行状态与下一步">
      <AdminBadge variant={assessment.variant}>{assessment.label}</AdminBadge>
      <p className="text-admin-text-secondary">{assessment.reason}</p>
      <p className="text-admin-text-muted">{assessment.next}</p>
      {input.collected_count !== null && input.collected_count !== undefined ? (
        <p className="text-admin-text-faint">
          新观测 {input.collected_count} · 跳过 {input.skipped_count ?? 0} · 正式更新 {input.published_count ?? 0}
        </p>
      ) : null}
    </div>
  );
}
