import { adminButtonClassName } from "@/components/admin/AdminButton";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import {
  approveObservation,
  ignoreObservation,
  rejectObservation,
} from "./actions";

type Props = {
  observationId: string;
};

export default function ObservationReviewActions({ observationId }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminActionForm action={ignoreObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
        >
          暂不处理
        </button>
      </AdminActionForm>

      <AdminActionForm action={rejectObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className={adminButtonClassName({ variant: "danger", size: "sm", className: "" })}
        >
          拒绝
        </button>
      </AdminActionForm>

      <details className="basis-full">
        <summary className="cursor-pointer list-none rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950">
          人工覆盖
        </summary>
        <div className="mt-2 rounded-admin-card border border-amber-200 bg-admin-surface p-3 text-xs
          leading-5 text-admin-text-secondary dark:border-amber-800 dark:bg-admin-surface
          dark:text-admin-text-secondary">
          <p>
            仅在已有独立结算证据时使用。不要把逐国打开 App Store 当作日常审核流程；常规异常应继续补采或修规则。
          </p>
          <AdminActionForm action={approveObservation} className="mt-3">
            <input type="hidden" name="id" value={observationId} />
            <button
              type="submit"
              className={adminButtonClassName({ variant: "warning", size: "sm", className: "" })}
            >
              覆盖入库
            </button>
          </AdminActionForm>
        </div>
      </details>
    </div>
  );
}
