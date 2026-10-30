'use client';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminActionForm, useAdminActionState, useAdminPermission } from '@/components/admin/AdminPermissions';
import { claudeJobReuseAction } from './claude-reuse-actions';
import { initialClaudeReuseState, claudeReusePreview, type ClaudeReviewMode } from './claude-reuse-model';

export default function ClaudeJobReusePanel({jobId,sourceName,priceTask=false,status,reviewMode,running}:{
  jobId:string;sourceName:string;priceTask?:boolean;status:string;reviewMode:ClaudeReviewMode;running:boolean;
}) {
  const allowed=useAdminPermission('manage');
  const [state,formAction,pending]=useAdminActionState(claudeJobReuseAction,initialClaudeReuseState);
  const collection=priceTask || ['converted','already','activation-preview','enabled'].includes(state.status);
  const preview=claudeReusePreview(state.status);
  const canConfigure=status==='paused' && !running;
  const primary=collection?(reviewMode==='candidate'?'review-enable-preview':reviewMode==='unknown'?null:'enable-preview'):'preview';
  async function submit(data:FormData) {
    const result=await formAction(data);
    // There are no editable inputs to retain on a handled configuration refusal.
    return {message:result.message};
  }
  return (
    <section data-testid={`claude-reuse-${jobId}`} aria-label={`官网任务复用：${sourceName}`}
      className="min-w-0 text-sm leading-6">
      <p className="mt-2 text-admin-text-muted">
        {collection ? '采集范围：Claude Pro · 美国 · Web 月付。配置操作不会立即采集或更新价格。'
          : '先预览配置，再确认转换。保留当前任务和历史记录，转换后仍保持暂停。'}
      </p>
      {priceTask ? <>
        <p className="mt-2 font-medium text-admin-text">
          {status==='active'?'当前调度：已启用。实际执行结果以运行记录为准。'
            :status==='paused'?'当前调度：暂停，执行器不会采集这个任务。':'当前调度：未启用，请核对底层任务状态。'}
        </p>
        <p role="status" className={reviewMode==='unknown'?'mt-2 text-admin-warning':'mt-2 text-admin-text'}>
          {reviewMode==='candidate'?'审核模式：自动审核候选（仅本地验收），按证据门禁处理 Web 价格。'
            :reviewMode==='unknown'?'审核模式：无法识别策略，禁止从此处启用，请先预览撤销配置。'
              :'审核模式：待核验，不自动审核或发布价格。'}
        </p>
      </> : null}
      {!allowed ? <p className="mt-2 text-admin-warning">当前账号只能查看，不能修改采集或审核配置。</p> : null}
      <AdminActionForm capability="manage" action={submit} className="mt-3">
        <input type="hidden" name="id" value={jobId}/>
        <div className="flex flex-wrap gap-2">
          {primary ? <AdminButton type="submit" name="operation" value={primary} variant="secondary"
            disabled={!allowed || pending || running}>
            {collection?(reviewMode==='candidate'?'检查自动审核启用条件':'检查启用条件'):'预览复用配置'}
          </AdminButton> : null}
          {collection && reviewMode==='pending' ? <AdminButton type="submit" name="operation" value="review-preview"
            variant="secondary" disabled={!allowed || pending || !canConfigure}>预览自动审核准入</AdminButton> : null}
          {collection && reviewMode!=='pending' ? <AdminButton type="submit" name="operation" value="review-revoke-preview"
            variant="secondary" disabled={!allowed || pending || running}>预览撤销自动审核</AdminButton> : null}
        </div>
        {collection && reviewMode==='pending' && !canConfigure ? (
          <p className="mt-2 text-admin-text-muted">准入前请先暂停任务，并等待本轮运行结束。</p>
        ) : null}
        {running ? <p className="mt-2 text-admin-text-muted">本轮运行未结束，完成后再更改配置。</p> : null}
        {preview ? <div className="mt-3 space-y-3">
          <dl className="grid gap-3 text-admin-text-secondary md:grid-cols-2">
            <div><dt className="font-semibold">采集范围</dt><dd>Claude Pro · 美国 · Web 月付</dd></div>
            <div><dt className="font-semibold">来源校验</dt><dd>官方定价页与帮助文档交叉核对</dd></div>
            <div><dt className="font-semibold">任务与历史</dt><dd>复用当前任务，保留运行记录和累计成功数</dd></div>
            <div><dt className="font-semibold">配置与历史</dt>
              <dd>{state.status==='preview'?'重置旧来源连续错误，保留历史失败记录':'保留采集周期、错误记录及历史证据'}</dd>
            </div>
            <div><dt className="font-semibold">确认后</dt><dd>{preview.outcome}</dd></div>
            {preview.rules ? <div className="md:col-span-2">
              <dt className="font-semibold">自动审核门禁</dt><dd>{preview.rules}</dd>
            </div> : null}
          </dl>
          {!state.canApply ? <p className="text-admin-warning">当前环境不允许修改；任务配置仅在一次性本地验收库开放。</p> : null}
          {state.canApply ? <>
            <input type="hidden" name="fingerprint" value={state.fingerprint || ''}/>
            <AdminButton type="submit" name="operation" value={preview.operation}
              disabled={!allowed || pending}>
              {preview.label}
            </AdminButton>
          </> : null}
        </div> : null}
      </AdminActionForm>
    </section>
  );
}
