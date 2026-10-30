export type ClaudeReuseState = {
  status: 'idle' | 'preview' | 'blocked' | 'converted' | 'already' | 'activation-preview' | 'enabled'
    | 'review-preview' | 'review-activation-preview' | 'review-revoke-preview' | 'review-admitted' | 'review-disabled';
  message: string;
  fingerprint?: string;
  canApply?: boolean;
};

export const initialClaudeReuseState: ClaudeReuseState = { status:'idle',message:'' };

export function canApplyClaudeReuse(databaseUrl: string | undefined) {
  try {
    const url=new URL(databaseUrl || '');
    return ['postgres:','postgresql:'].includes(url.protocol)
      && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.port==='55433'
      && /^\/geosub_collector_test_claude_scheduler_[a-z0-9_]+$/.test(url.pathname);
  } catch { return false; }
}

export function claudeReuseError(code: string) {
  const messages: Record<string,string> = {
    pause_target_job_before_conversion:'请先暂停这个任务，再检查配置。',
    target_job_still_running:'这个任务仍有运行记录未结束，请等待完成后重新预览。',
    another_price_job_already_exists:'Claude 已有其他价格任务，请先检查该任务，避免重复配置。',
    job_configuration_changed:'配置在预览后发生了变化。请重新检查，再确认操作。',
    claude_job_reuse_requires_disposable_database:'当前环境不允许修改；任务配置仅在一次性本地验收库开放。',
    claude_review_admission_requires_disposable_database:'自动审核候选仅在一次性本地验收库开放，未修改任务。',
    review_actor_not_authorized:'当前管理员状态或权限已变化，请刷新登录状态后再操作。',
    review_policy_requires_explicit_control:'该任务已有审核候选配置，请使用自动审核启用检查。',
    unknown_claude_review_admission_policy:'审核策略无法识别，请先预览撤销配置，不要直接启用。',
    claude_review_source_replacement_not_allowed:'现有正式 Web 价格属于其他来源，不能自动替换，请先核对数据诊断。',
    claude_review_archived_price:'对应 Web 价格已归档，请先核对数据诊断。',
    claude_review_price_identity_ambiguous:'对应 Web 价格身份不唯一，请先核对数据诊断。',
    local_preflight_database_required:'当前连接不支持本地复用操作，未修改任务。',
    one_off_repair_job_not_reusable:'一次性修复任务不能用作周期价格采集，请选择普通官网巡检任务。',
    configure_price_task_before_enabling:'请先将这个巡检任务复用为 Claude 官网价格采集，再检查启用条件。',
    target_must_be_existing_snapshot_job:'这个任务不是可复用的官网巡检任务，请刷新列表核对配置。',
    target_job_not_found_for_claude:'找不到对应的 Claude 任务，请刷新列表。',
    reuse_result_unknown:'未能确认操作结果。请先刷新并预览核对当前配置，不要重复提交。',
  };
  if (messages[code]) return messages[code];
  if (/^canonical_|^missing_canonical_/.test(code)) return '产品、Pro 月付套餐或美国币种配置未通过检查，请先核对数据诊断。';
  return '本次配置检查未完成，未能确认操作结果。请重新检查任务。';
}


export const claudeReuseOperations=[
  'preview','apply','enable-preview','enable','review-preview','review-apply',
  'review-enable-preview','review-enable','review-revoke-preview','review-revoke',
] as const;
export type ClaudeReuseOperation=typeof claudeReuseOperations[number];
export function isClaudeReuseOperation(value:string):value is ClaudeReuseOperation {
  return (claudeReuseOperations as readonly string[]).includes(value);
}
export function isClaudeReuseMutation(value:ClaudeReuseOperation) {
  return ['apply','enable','review-apply','review-enable','review-revoke'].includes(value);
}

export const claudeReviewPolicyId='claude-us-pro-local-review-v1';
export type ClaudeReviewMode='pending'|'candidate'|'unknown';
export function claudeReviewMode(value:unknown):ClaudeReviewMode {
  if (value===undefined || value===null) return 'pending';
  return value===claudeReviewPolicyId?'candidate':'unknown';
}

type Preview={operation:ClaudeReuseOperation;label:string;outcome:string;rules?:string};
const reviewRules='三份独立同价证据至少跨24小时；变价超过30%需五份跨72小时，双官方证据和新鲜度同时通过。';
const previews:Partial<Record<ClaudeReuseState['status'],Preview>>={
  preview:{operation:'apply',label:'确认转换，保持暂停',outcome:'保持暂停，不启动采集，不发布价格'},
  'activation-preview':{operation:'enable',label:'确认启用待核验采集',outcome:'加入下一轮，等待执行器；只采集待核验价格'},
  'review-preview':{operation:'review-apply',label:'确认准入，保持暂停',
    outcome:'配置本地自动审核候选，保持暂停；不立即采集、审核或发布',rules:reviewRules},
  'review-activation-preview':{operation:'review-enable',label:'确认启用自动审核候选',
    outcome:'加入周期调度；证据不足会等待，异常保留旧价，合格后只更新 Web 价格',rules:reviewRules},
  'review-revoke-preview':{operation:'review-revoke',label:'确认撤销并暂停',
    outcome:'暂停任务并关闭后续自动审核，保留历史证据和最后有效价格；不会回退已核验价格'},
};
export function claudeReusePreview(status:ClaudeReuseState['status']) { return previews[status]; }
