export type CollectorExecutionFields = {
  collection_outcome?: string | null;
  collected_count?: number | null;
  skipped_count?: number | null;
  has_automatic_review?: boolean | null;
  failure_reason?: string | null;
  repair_state?: string | null;
  operational_state?: string | null;
};

export type CollectorExecutionInput = CollectorExecutionFields & {
  status: string | null;
  job_status?: string | null;
  collector_kind?: string | null;
  next_run_at?: Date | string | null;
  is_due?: boolean;
  error_message?: string | null;
  published_count?: number;
  pending_count?: number;
  isolated_count?: number;
};

type Assessment = {
  label: string;
  variant: 'neutral' | 'review' | 'published' | 'danger';
  reason: string;
  next: string;
};

function failureReason(input: CollectorExecutionInput) {
  const text = input.failure_reason || input.error_message || '';
  if (/missing_canonical_|canonical_.*_mismatch|missing (app_store_id|google_play_package)|identity mismatch/i.test(text)) {
    return '来源配置与产品、套餐或地区身份不匹配。';
  }
  if (/official_sources_disagree|currency_mismatch|unsupported.*market|corroborating_evidence_missing/i.test(text)) {
    return '官方证据的价格、币种或地区不一致，已阻止写入不合格价格。';
  }
  if (/parser_|required_plan_set|monthly_|card_identity|document_not_html/i.test(text)) {
    return '来源页面未通过解析校验，需要检查套餐标识和计费周期。';
  }
  if (/timeout|timed out|document_unavailable|fetch failed|HTTP|ECONN|ENOTFOUND|blocked|429|403|503/i.test(text)) {
    return '来源访问失败、超时或受限，本轮未能取得完整证据。';
  }
  if (/auto.*review.*fail/i.test(text)) return '采集后的自动审核未完成，尚不能确认价格已更新。';
  return '本轮执行失败，请结合下方运行摘要定位原因。';
}

export function assessCollectorExecution(input: CollectorExecutionInput): Assessment {
  if (input.status === 'running') {
    return { label: '正在执行', variant: 'neutral', reason: '后台已有本轮运行记录。', next: '等待执行器写回本轮结果。' };
  }
  if (input.repair_state === 'unresolved' && input.status === 'skipped') {
    return { label: '需要处理规则', variant: 'review', reason: '本轮问题无法通过重复采集解决。',
      next: '在数据诊断中检查套餐映射、币种或价格范围。' };
  }
  if (input.job_status === 'paused' || input.job_status === 'archived') {
    return { label: '已暂停', variant: 'neutral', reason: '当前任务不参与自动调度。', next: '需要继续时再加入下一轮。' };
  }
  if (input.status === 'failed' || input.job_status === 'failed') {
    const blocked = input.operational_state === 'permanent_failure' || input.operational_state === 'retry_exhausted';
    const retry = input.job_status === 'active' && Boolean(input.next_run_at) && !blocked;
    return {
      label: retry ? '等待自动重试' : input.job_status ? '需要排查' : '本轮失败',
      variant: retry ? 'review' : 'danger', reason: failureReason(input),
      next: retry ? (input.is_due ? '重试已到期，等待执行器。' : '系统将在下次计划时间重试，无需重复点击。')
        : input.job_status ? '检查来源配置和运行摘要，修正后再加入下一轮。'
          : '当前重试安排见产品任务；历史失败记录会保留。',
    };
  }
  if (input.status === 'skipped') {
    return { label: '本轮跳过', variant: 'neutral', reason: '执行器没有采集新的价格。', next: '查看本轮跳过原因。' };
  }
  if (input.status === 'succeeded') {
    if (input.collection_outcome === 'source_monitoring_only'
      || input.collector_kind === 'official_site') {
      return { label: '巡检完成', variant: 'neutral', reason: '只检查了来源网页，没有采集或更新价格。',
        next: '如需采价，为此任务配置已验证的价格解析器。' };
    }
    if (input.repair_state === 'unresolved') {
      return { label: '仍有未解决问题', variant: 'review', reason: '本轮执行完成，但原待修目标尚未全部获得有效替代证据。',
        next: '在数据诊断中查看未解决项；不能把执行成功当作修复成功。' };
    }
    if ((input.published_count ?? 0) > 0) {
      return { label: '正式价格已更新', variant: 'published', reason: `本轮更新 ${input.published_count} 条正式价格。`,
        next: '后续采集继续核对变化。' };
    }
    if ((input.isolated_count ?? 0) > 0) {
      return { label: '异常已隔离', variant: 'review', reason: '本轮仍有异常证据，尚不能确认问题已解决。',
        next: '在数据诊断中查看仍未解决的原因。' };
    }
    if ((input.collected_count ?? 0) > 0 || (input.pending_count ?? 0) > 0) {
      const automatic = input.has_automatic_review === true;
      return { label: automatic ? '等待稳定证据' : '已采集，待核验', variant: 'review',
        reason: automatic ? '本轮已有观测，尚未形成新的正式价格。' : '本轮已有观测，当前记录未确认自动审核或发布结果。',
        next: automatic ? '系统继续按来源规则核验；不影响其他任务继续运行。' : '查看来源审核配置和本轮证据。' };
    }
    if ((input.skipped_count ?? 0) > 0) {
      return { label: '本轮无新增', variant: 'neutral', reason: '重复观测已跳过，没有增加稳定样本或更新价格。',
        next: '等待下一次正常采集，无需反复加入队列。' };
    }
    return { label: '执行完成', variant: 'neutral', reason: '脚本已完成，当前记录没有可确认的价格更新。',
      next: '查看本轮产出和运行摘要。' };
  }
  return { label: input.is_due ? '等待执行' : '按计划采集', variant: 'neutral', reason: '尚无本轮采集结果。',
    next: input.is_due ? '已到期，等待执行器接管。' : '系统按已配置的计划运行。' };
}
