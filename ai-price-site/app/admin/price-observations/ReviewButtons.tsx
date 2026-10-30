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

export default function ReviewButtons({ observationId }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminActionForm action={approveObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
        >
          通过
        </button>
      </AdminActionForm>

      <AdminActionForm action={ignoreObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
        >
          忽略
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
    </div>
  );
}