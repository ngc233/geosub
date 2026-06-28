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
    <div className="flex items-center gap-2">
      <form action={approveObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          通过
        </button>
      </form>

      <form action={ignoreObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          忽略
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
    </div>
  );
}