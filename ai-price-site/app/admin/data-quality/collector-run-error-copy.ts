export type CollectorRunErrorCopy = {
  summary: string;
  detail: string | null;
};

function readCount(detail: string, label: string) {
  const match = detail.match(new RegExp(`${label}:\\s*(\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

export function summarizeCollectorRunError(
  error: string | null,
): CollectorRunErrorCopy {
  const detail = error?.trim() || null;

  if (!detail) {
    return {
      summary: "最近一次采集失败，需要先看失败原因。",
      detail: null,
    };
  }

  if (/App Store collection incomplete/i.test(detail)) {
    const transientFailureCount = readCount(detail, "Transient failures");

    return {
      summary:
        transientFailureCount !== null
          ? `${transientFailureCount} 个 App Store 商店暂时失败，需重试。`
          : "App Store 采集未完成，需重试失败商店。",
      detail,
    };
  }

  return {
    summary: "采集失败，请进入“任务”查看完整错误。",
    detail,
  };
}
