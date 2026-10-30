'use client';
import { useState } from 'react';
import { adminControlClassName } from '@/components/admin/admin-control';
import ClaudeJobReusePanel from './ClaudeJobReusePanel';
import type { ClaudeReviewMode } from './claude-reuse-model';

type Job={id:string;name:string;status:string;running:boolean;priceTask:boolean;reviewMode:ClaudeReviewMode};
export default function ClaudeJobReuseWorkbench({jobs,preferredJobId}:{jobs:Job[];preferredJobId?:string}) {
  const initial=jobs.find(job=>job.id===preferredJobId) || jobs.find(job=>job.status==='paused' && !job.running) || jobs[0];
  const [selected,setSelected]=useState(initial?.id || '');
  const job=jobs.find(row=>row.id===selected);
  return (
    <details id="claude-job-reuse" open className="mb-6 rounded-admin-card border border-admin-border bg-admin-surface">
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">Claude 官网采集配置</summary>
      <div className="space-y-4 border-t border-admin-border p-4">
        <label className="block max-w-xl text-sm font-medium text-admin-text">
          选择 Claude 官网任务
          <select aria-label="选择 Claude 官网任务" className={`${adminControlClassName} mt-2 h-11 w-full`}
            value={selected} onChange={event=>setSelected(event.target.value)}>
            {jobs.map(row=><option key={row.id} value={row.id}>
              {row.name} · {row.running?'运行中':row.status==='paused'?'暂停':row.status==='active'?'启用':'未启用'}
            </option>)}
          </select>
        </label>
        {job ? <ClaudeJobReusePanel key={job.id+':'+job.status+':'+job.reviewMode} jobId={job.id}
          sourceName={job.name} priceTask={job.priceTask} status={job.status} reviewMode={job.reviewMode} running={job.running}/> : (
          <p className="text-sm text-admin-text-muted">当前筛选中没有可查看的 Claude 官网任务。</p>
        )}
      </div>
    </details>
  );
}
