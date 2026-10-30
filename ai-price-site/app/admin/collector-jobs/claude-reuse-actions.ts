'use server';
import { requireAdmin } from '../../../lib/admin-auth';
import { revalidatePath } from 'next/cache';
import { runClaudeReuseCommand } from './claude-reuse-service';
import {
  canApplyClaudeReuse, claudeReuseError, isClaudeReuseOperation, isClaudeReuseMutation, type ClaudeReuseState,
} from './claude-reuse-model';

export async function claudeJobReuseAction(_previous:ClaudeReuseState, formData:FormData):Promise<ClaudeReuseState> {
  const admin=await requireAdmin('manage');
  const jobId=String(formData.get('id') || '').trim();
  const operation=String(formData.get('operation') || '');
  const fingerprint=String(formData.get('fingerprint') || '');
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(jobId)
    || !isClaudeReuseOperation(operation)) {
    return {status:'blocked',message:'任务参数无效，请刷新列表后重试。'};
  }
  const allowed=canApplyClaudeReuse(process.env.DATABASE_URL);
  const execute=isClaudeReuseMutation(operation);
  if (execute && !allowed) {
    return {status:'blocked',message:claudeReuseError('claude_job_reuse_requires_disposable_database')};
  }
  if (execute && !/^[a-f0-9]{64}$/.test(fingerprint)) {
    return {status:'blocked',message:'请先检查配置，再确认操作。'};
  }
  const response=await runClaudeReuseCommand({
    jobId,operation,fingerprint,actorId:admin.id,
  });
  if (!response.ok || !response.result) {
    return {status:'blocked',message:claudeReuseError(response.error_code || '')};
  }
  const result=response.result;
  if (result.state==='conversion_preview' && operation==='preview' && /^[a-f0-9]{64}$/.test(result.configuration_fingerprint || '')) {
    return {status:'preview',message:'配置检查通过。确认后只转换所选任务，仍保持暂停。',
      fingerprint:result.configuration_fingerprint,canApply:allowed};
  }
  if (result.state==='activation_preview' && /^[a-f0-9]{64}$/.test(result.configuration_fingerprint || '')) {
    const reviewing=result.automatic_review_after_confirmation===true;
    if (operation!==(reviewing?'review-enable-preview':'enable-preview')) {
      return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
    }
    return {status:reviewing?'review-activation-preview':'activation-preview',
      message:reviewing?'候选启用检查通过。确认后按证据门禁自动审核，尚未执行采集或更新价格。'
        :'启用条件检查通过。确认后加入周期调度，采集结果只进入待核验。',
      fingerprint:result.configuration_fingerprint,canApply:allowed};
  }
  if (['review_admission_preview','review_revocation_preview'].includes(result.state)
    && /^[a-f0-9]{64}$/.test(result.configuration_fingerprint || '')) {
    const admitting=result.state==='review_admission_preview';
    if (operation!==(admitting?'review-preview':'review-revoke-preview')) {
      return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
    }
    return {status:admitting?'review-preview':'review-revoke-preview',
      message:admitting?'准入检查通过。确认后保持暂停，不会立即更新价格。'
        :'撤销检查通过。确认后暂停并关闭后续自动审核，保留证据与最后有效价。',
      fingerprint:result.configuration_fingerprint,canApply:allowed};
  }
  const reviewChanged=result.state==='review_admitted_paused' || result.state==='review_disabled_paused';
  const reviewAlready=result.state==='already_review_admitted' || result.state==='already_review_disabled';
  if (reviewChanged || reviewAlready) {
    const admitting=result.state==='review_admitted_paused' || result.state==='already_review_admitted';
    const expected=admitting?['review-preview','review-apply']:['review-revoke-preview','review-revoke'];
    if (!expected.includes(operation) || (reviewChanged && (result.updated_jobs!==1 || result.activated_jobs!==0))) {
      return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
    }
    revalidatePath('/admin/collector-jobs');
    revalidatePath('/admin/pipeline');
    return {status:admitting?'review-admitted':'review-disabled',
      message:admitting?'已配置自动审核候选，任务仍暂停；需另行检查并启用，不会立即更新价格。'
        :'已关闭后续自动审核，任务已暂停；历史证据和最后有效价格保留。'};
  }
  if (result.state==='collection_enabled' && result.updated_jobs===1 && result.activated_jobs===1) {
    const reviewing=result.automatic_review===true;
    if (operation!==(reviewing?'review-enable':'enable')) {
      return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
    }
    revalidatePath('/admin/collector-jobs');
    revalidatePath('/admin/pipeline');
    return {status:'enabled',message:reviewing?'已启用自动审核候选，等待执行器；本次操作未采集或更新价格。'
      :'已启用，等待执行器按计划采集；尚未执行采集，没有自动审核或发布价格。'};
  }
  if (result.state==='already_enabled') {
    const reviewing=result.automatic_review===true;
    if (!(reviewing?['review-enable-preview','review-enable']:['enable-preview','enable']).includes(operation)) {
      return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
    }
    revalidatePath('/admin/collector-jobs');
    revalidatePath('/admin/pipeline');
    return {status:'enabled',message:'这个任务已启用。下次计划和真实执行结果见底层任务与最近采集运行。'};
  }
  if (result.state==='converted_paused' && result.updated_jobs===1 && result.activated_jobs===0) {
    revalidatePath('/admin/collector-jobs');
    return {status:'converted',message:'已复用这个任务，仍保持暂停；没有启动采集或发布价格。'};
  }
  if (result.state==='already_configured_paused') {
    return {status:'already',message:'这个任务已配置为 Claude 官网价格采集，当前仍保持暂停。'};
  }
  return {status:'blocked',message:claudeReuseError('reuse_result_unknown')};
}
