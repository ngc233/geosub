"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  productSlug?: string;
  buttonLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  submitUrl?: string;
};

const stages = [
  { untilSeconds: 3, progress: 16, label: "正在提交采集请求" },
  { untilSeconds: 9, progress: 34, label: "正在创建运行记录" },
  { untilSeconds: 18, progress: 56, label: "正在唤起后台采集脚本" },
  { untilSeconds: 35, progress: 78, label: "正在进入自动审核流程" },
  { untilSeconds: Infinity, progress: 92, label: "即将跳转到运行记录" },
];

const MIN_VISIBLE_MS = 4500;

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
  errorMessage,
}: {
  startedAt: number | null;
  buttonLabel: string;
  pendingLabel: string;
  disabled: boolean;
  errorMessage: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const active = startedAt !== null;

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, [active]);

  const elapsedSeconds = active && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const stage = useMemo(() => getStage(elapsedSeconds), [elapsedSeconds]);

  return (
    <div className="space-y-3" aria-live="polite">
      <button
        type="submit"
        disabled={active || disabled}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:border-blue-100 disabled:bg-blue-50 disabled:text-blue-400"
      >
        {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        {active ? pendingLabel : buttonLabel}
      </button>

      {errorMessage ? (
        <div className="w-80 max-w-[80vw] rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {active ? (
        <div className="w-80 max-w-[80vw] rounded-xl border border-blue-100 bg-white/90 p-4 text-xs text-blue-950 shadow-sm shadow-blue-200/40">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">{stage.label}</span>
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-mono font-bold tabular-nums text-blue-600">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
          <p className="mt-3 leading-5 text-blue-600">
            请求会先唤起后台脚本，然后跳转到“最近采集运行”。如果脚本还没完成，页面会继续自动刷新运行状态。
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ManualCollectionProgressForm({
  productSlug,
  buttonLabel = "立即补采并审核",
  pendingLabel = "正在采集并审核",
  disabled = false,
  submitUrl = "/admin/review/collect",
}: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={submitUrl}
      method="post"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled || startedAt !== null || !formRef.current) {
          return;
        }

        const submittedAt = Date.now();
        setErrorMessage(null);
        setStartedAt(submittedAt);

        try {
          const response = await fetch(submitUrl, {
            method: "POST",
            body: new FormData(formRef.current),
            headers: {
              Accept: "application/json",
            },
            credentials: "same-origin",
          });
          const payload = (await response.json().catch(() => null)) as {
            redirectPath?: string;
          } | null;
          const elapsed = Date.now() - submittedAt;

          if (elapsed < MIN_VISIBLE_MS) {
            await new Promise((resolve) => window.setTimeout(resolve, MIN_VISIBLE_MS - elapsed));
          }

          if (payload?.redirectPath) {
            window.location.assign(payload.redirectPath);
            return;
          }

          if (!response.ok) {
            throw new Error("采集请求失败，请查看采集任务页的运行记录。");
          }

          window.location.assign("/admin/review");
        } catch (error) {
          setStartedAt(null);
          setErrorMessage(error instanceof Error ? error.message : "采集请求失败，请稍后再试。");
        }
      }}
    >
      {productSlug ? <input type="hidden" name="productSlug" value={productSlug} /> : null}
      <ProgressContent
        startedAt={startedAt}
        buttonLabel={buttonLabel}
        pendingLabel={pendingLabel}
        disabled={disabled}
        errorMessage={errorMessage}
      />
    </form>
  );
}
