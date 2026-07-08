import type { PendingRow } from "./types";

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatUsd(value: unknown) {
  const number = toNumber(value);
  return number === null ? "-" : `$${number.toFixed(2)}`;
}

export function formatLocal(value: unknown, currency: string | null) {
  const number = toNumber(value);

  if (number === null) return "-";

  return `${number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency ?? ""}`.trim();
}

export function formatDate(value: Date | string | null) {
  if (!value) return "未安排";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function platformLabel(platform: string) {
  const labels: Record<string, string> = {
    ios: "App Store",
    android: "Android",
    web: "Web",
    steam: "Steam",
    gift_card: "Gift Card",
    unknown: "Unknown",
  };

  return labels[platform] ?? platform;
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ignored: "bg-slate-50 text-slate-600 ring-slate-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  return map[status] ?? "bg-slate-50 text-slate-600 ring-slate-200";
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    approved: "已通过",
    ignored: "已忽略",
    rejected: "已拒绝",
    pending: "待审核",
  };

  return map[status] ?? status;
}

export function reviewReasonLabel(reasonCode: string | null) {
  const map: Record<string, string> = {
    app_store_three_sample_consensus: "三次稳定样本一致",
    app_store_clean_pair_after_rule_fix: "规则修正后稳定",
    waiting_for_more_app_store_samples: "等待自动补采",
    app_store_observation_anomaly: "系统隔离异常",
    app_store_price_changed: "等待价格稳定",
    low_confidence: "可信度不足",
    suspicious_low_converted_usd: "折算价格异常偏低",
    suspicious_plan_order: "套餐价格顺序异常",
    superseded_by_published_price: "已被正式价格覆盖",
  };

  return reasonCode ? map[reasonCode] ?? reasonCode : "未记录原因";
}

export function reviewReasonAction(reasonCode: string | null) {
  const map: Record<string, string> = {
    app_store_three_sample_consensus: "已满足自动入库条件。",
    app_store_clean_pair_after_rule_fix:
      "最新 2 次干净 App Store 样本一致，系统会自动采用新样本并忽略旧的冲突样本。",
    waiting_for_more_app_store_samples:
      "系统会继续补采；最近 3 次 App Store 样本一致后自动发布。",
    app_store_observation_anomaly:
      "系统已自动隔离这类价格，不进入正式库；等待下一轮采集或解析规则修正，不要求人工逐国打开 App Store。",
    app_store_price_changed:
      "系统会等待连续样本稳定；稳定后自动发布，未稳定前不进入正式榜单。",
    low_confidence:
      "系统会继续补采提高可信度；达到阈值后自动进入稳定性审核。",
    suspicious_low_converted_usd:
      "系统会自动隔离，优先防止币种、小数点或价格文本解析错误进入正式榜单。",
    suspicious_plan_order:
      "系统会用同地区套餐阶梯继续校验；阶梯恢复合理后自动发布。",
    superseded_by_published_price: "无需处理，系统会隐藏或忽略旧样本。",
  };

  return reasonCode ? map[reasonCode] ?? "查看具体记录的审核说明。" : "查看具体记录的审核说明。";
}

export function evidenceTierLabel(tier: string | null) {
  const map: Record<string, string> = {
    official_app_store_rendered: "官方 App Store 渲染页",
    official_app_store_static: "官方 App Store 静态页",
    official_site: "官方网页",
    official_page: "官方网页",
    google_play_evidence: "Google Play 旁证",
    manual: "人工录入",
    unknown: "未知来源",
  };

  return tier ? map[tier] ?? tier : "未记录";
}

export function evidenceStatusLabel(status: string | null) {
  const map: Record<string, string> = {
    blocked_anomaly: "系统隔离，不能自动上线",
    modal_price_consensus: "页面多数票",
    old_sample: "旧样本，已被更新价格覆盖",
    strong_official_sample: "强官方样本",
    usable_context: "可作参考",
    weak_evidence: "证据较弱",
  };

  return status ? map[status] ?? status : "未评估";
}

function publishedComparisonLabel(value: string | null) {
  const map: Record<string, string> = {
    no_published_price: "暂无正式价",
    superseded_by_newer_published_price: "已被更新正式价覆盖",
    matches_published_price: "与正式价一致",
    conflicts_with_published_price: "与正式价冲突",
  };

  return value ? map[value] ?? value : "未对比";
}

export function evidenceBadgeClass(status: string | null) {
  if (status === "modal_price_consensus" || status === "strong_official_sample") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "blocked_anomaly") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (status === "old_sample") {
    return "bg-slate-50 text-slate-600 ring-slate-200";
  }
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export function PriceEvidencePanel({ row }: { row: PendingRow }) {
  const publishedLocal =
    row.published_local_price === null || row.published_local_price === undefined
      ? null
      : formatLocal(row.published_local_price, row.published_currency);

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-4 text-slate-600">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={[
            "inline-flex rounded-full px-2 py-0.5 font-semibold ring-1",
            evidenceBadgeClass(row.evidence_status),
          ].join(" ")}
        >
          {evidenceStatusLabel(row.evidence_status)}
        </span>
        <span>证据分 {row.evidence_score ?? "-"}</span>
        <span>{evidenceTierLabel(row.evidence_tier)}</span>
      </div>

      <div className="mt-1 grid gap-1 text-slate-500">
        {row.has_modal_consensus ? (
          <div>
            页面多数票：{row.modal_selected_count ?? "-"} : {row.modal_runner_up_count ?? 0}
            {row.modal_variant_count ? `，共 ${row.modal_variant_count} 组价格` : ""}
          </div>
        ) : null}
        <div>
          汇率日期：{row.fx_rate_date_text || "未记录"}
          {row.fx_rate_age_days !== null && row.fx_rate_age_days !== undefined
            ? `，${row.fx_rate_age_days} 天前`
            : ""}
        </div>
        <div>
          正式价对比：{publishedComparisonLabel(row.published_comparison)}
          {publishedLocal ? `，当前正式价 ${publishedLocal} / ${formatUsd(row.published_price_usd)}` : ""}
        </div>
      </div>

      {row.evidence_note ? (
        <div className="mt-1 line-clamp-2 text-slate-400">证据说明：{row.evidence_note}</div>
      ) : null}
    </div>
  );
}
