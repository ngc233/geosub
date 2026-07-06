export const REVIEW_REASON_COPY = {
  incomplete_observation: {
    label: "采集记录不完整",
    action: "缺少产品、套餐、地区、原始价格、币种或美元折算信息；系统会等待重新采集，不进入正式价格库。",
  },
  app_store_three_sample_consensus: {
    label: "三次稳定样本一致",
    action: "已满足自动入库条件，系统会把稳定价格写入正式库。",
  },
  app_store_clean_pair_after_rule_fix: {
    label: "规则修正后已稳定",
    action: "最新 2 次干净 App Store 样本一致，系统会采用新样本并忽略旧的冲突样本。",
  },
  app_store_modal_price_consensus: {
    label: "页面多数价格一致",
    action: "同一 App Store 页面出现多个价格时，系统采用出现次数更多的套餐价格，并忽略旧冲突样本。",
  },
  waiting_for_more_app_store_samples: {
    label: "等待自动补采",
    action: "样本数量还不够，系统会继续补采；连续稳定后会自动发布，不需要人工逐条处理。",
  },
  app_store_samples_too_old: {
    label: "样本已过期",
    action: "最近样本不够新，系统会等待下一轮采集，用新样本重新判断。",
  },
  app_store_observation_anomaly: {
    label: "系统自动隔离",
    action:
      "这是系统判定的硬异常，通常来自币种、小数点、周期或同套餐离群；不会自动上线，也不需要人工逐国打开 App Store。",
  },
  app_store_price_changed: {
    label: "等待价格稳定",
    action: "最近几次采集的原币价格不一致，系统会继续观察；稳定前不会进入正式榜单。",
  },
  low_confidence: {
    label: "可信度不足",
    action: "采集证据分不足，系统会继续补采或等待更强证据。",
  },
  app_store_currency_mismatch: {
    label: "币种解析冲突",
    action: "原始价格文本和解析出的币种不一致，系统会隔离并等待重新解析，不进入正式库。",
  },
  app_store_local_dollar_parsed_as_usd: {
    label: "本地 dollar 误判风险",
    action: "非美元地区的本地 dollar 可能被误解析为 USD，系统会隔离并等待下一轮解析修正。",
  },
  app_store_price_suspiciously_low: {
    label: "折算低价异常",
    action: "折算后低于 1 美元，极可能是币种、小数点或价格文本解析问题；系统会隔离，不会自动上线。",
  },
  app_store_global_price_outlier: {
    label: "全球价格离群",
    action: "价格与同套餐其他地区中位数偏离过大，系统会自动挡住，等待重新采集或规则修正。",
  },
  app_store_plan_order_conflict: {
    label: "套餐阶梯冲突",
    action: "同地区套餐价格顺序不合理，系统会用套餐阶梯继续校验，恢复合理后再自动发布。",
  },
  suspicious_low_converted_usd: {
    label: "折算价格异常偏低",
    action: "系统会自动隔离，优先防止币种、小数点或价格文本解析错误进入正式榜单。",
  },
  suspicious_plan_order: {
    label: "套餐价格顺序异常",
    action: "系统会用同地区套餐阶梯继续校验；阶梯恢复合理后自动发布。",
  },
  superseded_by_published_price: {
    label: "已被正式价格覆盖",
    action: "无需处理，系统会隐藏或忽略旧样本。",
  },
  superseded_by_app_store_consensus: {
    label: "已被新共识覆盖",
    action: "更新的 App Store 共识样本已经取代旧样本，无需人工处理。",
  },
} as const;

export type ReviewReasonCode = keyof typeof REVIEW_REASON_COPY;

export const REQUIRED_REVIEW_REASON_CODES = Object.keys(REVIEW_REASON_COPY) as ReviewReasonCode[];

export function reviewReasonLabel(reasonCode: string | null) {
  if (!reasonCode) return "未记录原因";
  return REVIEW_REASON_COPY[reasonCode as ReviewReasonCode]?.label ?? reasonCode;
}

export function reviewReasonAction(reasonCode: string | null) {
  if (!reasonCode) return "查看具体记录的审核说明。";
  return REVIEW_REASON_COPY[reasonCode as ReviewReasonCode]?.action ?? "查看具体记录的审核说明。";
}
