"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  productSlug?: string;
  buttonLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
};

const stages = [
  { untilSeconds: 3, progress: 16, label: "正在提交补采请求" },
  { untilSeconds: 12, progress: 32, label: "正在唤起 App Store 采集器" },
  { untilSeconds: 70, progress: 68, label: "正在逐地区采集套餐和价格" },
  { untilSeconds: 115, progress: 86, label: "正在写入观测并执行稳定性审核" },
  { untilSeconds: Infinity, progress: 94, label: "正在刷新管理页结果" },
];

function getStage(elapsedSeconds: number) {
  return stages.find((stage) => elapsedSeconds < stage.untilSeconds) ?? stages[stages.length - 1];
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) return `${rest}s`;

  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function ProgressContent({
  startedAt,
  buttonLabel,
  pendingLabel,
  disabled,
}: {
  startedAt: number | null;
  buttonLabel: string;
  pendingLabel: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, [pending]);

  const elapsedSeconds = pending && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const stage = useMemo(() => getStage(elapsedSeconds), [elapsedSeconds]);

  return (
    <div className="space-y-3">
      <button
        type="submit"
        disabled={pending || disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:border-blue-100 disabled:bg-blue-50 disabled:text-blue-400"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        {pending ? pendingLabel : buttonLabel}
      </button>

      {pending ? (
        <div className="w-72 max-w-[70vw] rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{stage.label}</span>
            <span className="shrink-0 tabular-nums text-blue-500">{formatElapsed(elapsedSeconds)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
          <p className="mt-2 leading-5 text-blue-600">
            页面正在等待后台脚本返回，请不要重复点击；完成后会自动刷新本页。
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ManualCollectionProgressForm({
  action,
  productSlug,
  buttonLabel = "立即补采并审核",
  pendingLabel = "正在补采并审核",
  disabled = false,
}: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(null);

  return (
    <form
      action={action}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onSubmit={() => {
        setStartedAt(Date.now());
      }}
    >
      {productSlug ? <input type="hidden" name="productSlug" value={productSlug} /> : null}
      <ProgressContent
        startedAt={startedAt}
        buttonLabel={buttonLabel}
        pendingLabel={pendingLabel}
        disabled={disabled}
      />
    </form>
  );
}
