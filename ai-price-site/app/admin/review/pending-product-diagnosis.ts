import type { PendingProductGroup } from "./types";

export type PendingProductDiagnosisLevel = "danger" | "warning" | "info" | "good";

export type PendingProductDiagnosis = {
  level: PendingProductDiagnosisLevel;
  label: string;
  title: string;
  detail: string;
  nextAction: string;
};

function count(value: number | null | undefined) {
  return Number(value || 0);
}

export function diagnosePendingProductGroup(group: PendingProductGroup): PendingProductDiagnosis {
  const pending = count(group.pendingCount ?? group.rows.length);
  const blocked = count(group.blockedCount);
  const rejected = count(group.rejectedCount);
  const waiting = count(group.waitingCount);
  const changed = count(group.changedCount);
  const lowConfidence = count(group.lowConfidenceCount);
  const ignored = count(group.ignoredCount);
  const hasFreshSuccess = Boolean(group.hasFreshSuccess);

  if (blocked + rejected > 0) {
    return {
      level: "danger",
      label: "硬异常",
      title: "系统已隔离高风险价格",
      detail: "这些记录通常涉及币种、小数点、周期或套餐匹配风险；不要人工强行通过。",
      nextAction: "先修采集/解析规则，再只补采这个产品。",
    };
  }

  if (changed > 0) {
    return {
      level: "warning",
      label: "价格变化",
      title: "等待新价格稳定",
      detail: "最近采到的原币价格不一致，系统会等连续稳定样本再自动入库。",
      nextAction: "只补采这个产品，或等待定时采集形成稳定样本。",
    };
  }

  if (lowConfidence > 0) {
    return {
      level: "warning",
      label: "证据不足",
      title: "采集证据还不够强",
      detail: "当前证据分偏低，直接上线会增加误判风险。",
      nextAction: "继续补采，优先提升 App Store 稳定样本数量。",
    };
  }

  if (hasFreshSuccess && pending > 0) {
    return {
      level: "info",
      label: "已补采",
      title: "已有新采集，等待审核收敛",
      detail: "12 小时内已经成功采集过，旧样本会被新共识覆盖或留在异常池。",
      nextAction: "先观察自动审核结果，不要反复点采集。",
    };
  }

  if (waiting > 0 && waiting >= Math.max(1, pending - ignored)) {
    return {
      level: "info",
      label: "样本不足",
      title: "等待更多 App Store 样本",
      detail: "这些记录不是人工核验问题，而是样本数还没达到自动上线阈值。",
      nextAction: "交给下一轮采集；急用时只补采这个产品。",
    };
  }

  if (pending >= 80) {
    return {
      level: "warning",
      label: "积压较多",
      title: "这个产品的待处理记录偏多",
      detail: "建议先按产品重采，让自动审核用最新样本重新归并，而不是逐条点按钮。",
      nextAction: "只补采这个产品，然后回到本页看结论是否下降。",
    };
  }

  if (pending <= 0) {
    return {
      level: "good",
      label: "无待处理",
      title: "这个产品没有异常待决价格",
      detail: "当前不需要人工介入。",
      nextAction: "保持定时采集即可。",
    };
  }

  return {
    level: "info",
    label: "待收敛",
    title: "等待自动审核继续归并",
    detail: "这些记录需要继续用稳定样本、正式价或规则解释来收敛。",
    nextAction: "优先查看数据诊断；必要时只补采这个产品。",
  };
}
