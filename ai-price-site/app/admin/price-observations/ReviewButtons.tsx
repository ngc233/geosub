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
      <form action={approveObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-full bg-lime-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-lime-700"
        >
          通过
        </button>
      </form>

      <form action={ignoreObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          忽略
        </button>
      </form>

      <form action={rejectObservation}>
        <input type="hidden" name="id" value={observationId} />
        <button
          type="submit"
          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
        >
          拒绝
        </button>
      </form>
    </div>
  );
}