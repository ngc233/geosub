'use client';
import { useRef, useState } from 'react';
import { AdminActionForm, useAdminPermission } from '@/components/admin/AdminPermissions';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminInput, AdminTextarea } from '@/components/admin/AdminInput';
import { preflightSeoSearchPageObservationRows, seoSearchImportPreflightPayload, type SeoSearchImportPreflight, type SeoSearchImportInput } from '@/lib/seo-search-observation-import';
import type { SeoSearchEngine } from '@/lib/seo-search-performance-baseline';
import { importSeoSearchPageObservationsAction } from './actions';

export default function SeoPageImportForm({ engine, recordVersion }: { engine: SeoSearchEngine; recordVersion: string }) {
  const form = useRef<HTMLFormElement>(null);
  const generation = useRef(0);
  const [preview, setPreview] = useState<SeoSearchImportPreflight | null>(null);
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const canManage = useAdminPermission('manage');
  function invalidate() { generation.current += 1; setPreview(null); setToken(''); setAcknowledged(false); setPending(false); }
  async function previewRows() {
    if (!form.current) return;
    const data = new FormData(form.current);
    const input: SeoSearchImportInput = { engine, periodStart: String(data.get('periodStart') ?? ''), periodEnd: String(data.get('periodEnd') ?? ''), text: String(data.get('pageRows') ?? '') };
    const revision = ++generation.current;
    setPending(true); setAcknowledged(false); setToken('');
    const next = preflightSeoSearchPageObservationRows(input);
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seoSearchImportPreflightPayload(input)));
      if (revision !== generation.current) return;
      setPreview(next); setToken([...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''));
    } catch { if (revision === generation.current) setPreview({ ...next, canImport: false, errors: [...next.errors, '预检校验不可用，请刷新后重试。'] }); }
    finally { if (revision === generation.current) setPending(false); }
  }
  const ready = preview?.canImport && token && (!preview.excluded.length || acknowledged);
  return <AdminActionForm ref={form} capability="read" action={importSeoSearchPageObservationsAction}
    onChange={event => { if ((event.target instanceof HTMLInputElement ? event.target.name : '') !== 'acknowledgeExcluded') invalidate(); }}
    onSubmit={event => { if (!ready || !canManage) event.preventDefault(); }}
    className="border-t border-admin-border p-3 dark:border-admin-border-strong">
    <input type="hidden" name="engine" value={engine} />
    <input type="hidden" name="recordVersion" value={recordVersion} />
    <input type="hidden" name="preflightToken" value={token} />
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminInput label="报表开始日期" name="periodStart" type="date" required />
      <AdminInput label="报表结束日期" name="periodEnd" type="date" required />
    </div>
    <div className="mt-3"><AdminTextarea label="页面报表" name="pageRows" required maxLength={250000}
      placeholder={'Page,Clicks,Impressions,Position\n/en/ai-pricing/chatgpt,12,540,5.8'}
      helperText="粘贴页面表格，支持逗号、分号或制表符。必须包含页面、点击和展示；排名可选。最多 500 个合并后的有效页面，超限整份拒绝。" /></div>
    <div className="mt-3 flex flex-wrap gap-3">
      <AdminButton type="button" variant="secondary" disabled={pending} onClick={previewRows}>{pending ? '正在预检…' : '只读预检'}</AdminButton>
      <AdminButton type="submit" disabled={!ready || !canManage} title={!canManage ? '仅管理员可导入；当前角色可只读预检' : undefined}>确认导入</AdminButton>
    </div>
    <p className="mt-3 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">预检只在浏览器计算，不保存报表或审计。修改输入后必须重新预检；导入仍按引擎和观察窗口选择，不更改中文 Plus 实验锁。</p>
    {pending ? <p role="status" className="mt-3 text-sm">正在计算预检…</p> : null}
    {preview ? <div className="mt-4 space-y-3 rounded-lg border border-admin-border-strong p-3 text-sm dark:border-slate-600" aria-live="polite">
      <p className="font-semibold">预检：{preview.canImport ? '可导入' : '已阻止导入'}</p>
      <p>原始 {preview.inputRows} 行 · 有效 {preview.acceptedRows} 行 · 排除 {preview.excluded.length} 行 · 合并 {preview.mergedRows} 行 · 最终 {preview.observations.length} 页</p>
      {preview.errors.length ? <ul role="alert" className="list-inside list-disc space-y-2">{preview.errors.map(error => <li key={error}>{error}</li>)}</ul> : null}
      {preview.excluded.length ? <>
        <details><summary className="cursor-pointer py-3 font-semibold focus-visible:outline-2">查看排除行和原因（{preview.excluded.length}）</summary>
          <ul className="max-h-72 space-y-3 overflow-auto break-all">{preview.excluded.map(item => <li key={item.line}>第 {item.line} 行：{item.reason}<pre className="mt-1 whitespace-pre-wrap font-sans text-xs">{item.value}</pre></li>)}</ul>
        </details>
        {preview.canImport ? <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="acknowledgeExcluded" value="yes" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />我已核对并确认排除以上 {preview.excluded.length} 行</label> : null}
      </> : null}
    </div> : null}
  </AdminActionForm>;
}
