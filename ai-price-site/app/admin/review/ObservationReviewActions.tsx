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
      <form action={ignoreObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          暂不处理
        </button>
      </form>

      <form action={rejectObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          拒绝
        </button>
      </form>

      <details className="basis-full">
        <summary className="cursor-pointer list-none rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
          人工覆盖
        </summary>
        <div className="mt-2 rounded-xl border border-amber-200 bg-white p-3 text-xs leading-5 text-slate-600">
          <p>
            仅在已有独立结算证据时使用。不要把逐国打开 App Store 当作日常审核流程；常规异常应继续补采或修规则。
          </p>
          <form action={approveObservation} className="mt-3">
            <input type="hidden" name="id" value={observationId} />
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              覆盖入库
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
