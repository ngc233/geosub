import {
  appendSeoSearchPageImportBatch, parseSeoSearchPageImportState,
  type SeoSearchPageImportState, type SeoSearchPageImportBatch,
} from './seo-search-observation-import.ts';
import type { SeoSearchEngine } from './seo-search-performance-baseline.ts';

export class SeoSearchImportError extends Error {}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function strictSeoSearchImportState(value: unknown): SeoSearchPageImportState {
  const state = parseSeoSearchPageImportState(JSON.stringify(value));
  if (canonical(value) !== canonical(state)
    || new Set(state.batches.map(item => item.id)).size !== state.batches.length
    || new Set(state.batches.map(item => `${item.engine}:${item.periodStart}:${item.periodEnd}`)).size !== state.batches.length
    || state.batches.some(item => new Set(item.observations.map(row => row.path)).size !== item.observations.length)) {
    throw new SeoSearchImportError('保存的数据或审计快照不完整，已阻止修改，请检查原始审计记录。');
  }
  return state;
}
export type SeoSearchImportAudit = { id: string; oldValue: unknown; newValue: unknown };
export type SeoSearchImportRecovery = {
  target: SeoSearchPageImportBatch; restored: SeoSearchPageImportBatch | null;
  auditId: string; nextState: SeoSearchPageImportState;
};
/** Restore only the selected engine/window. Later independent windows stay intact. */
export function planSeoSearchImportRecovery(state: SeoSearchPageImportState, engine: SeoSearchEngine, audit: SeoSearchImportAudit | null): SeoSearchImportRecovery {
  const target = state.batches.findLast(item => item.engine === engine);
  if (!target || !audit) throw new SeoSearchImportError('缺少对应导入审计，无法安全恢复；未修改数据。');
  const before = strictSeoSearchImportState(audit.oldValue);
  const after = strictSeoSearchImportState(audit.newValue);
  if (before.batches.some(item => item.id === target.id)
    || canonical(after.batches.find(item => item.id === target.id)) !== canonical(target)
    || canonical(appendSeoSearchPageImportBatch(before, target)) !== canonical(after)) {
    throw new SeoSearchImportError('审计与当前批次不匹配，已阻止恢复；未修改数据。');
  }
  const restored = before.batches.find(item => item.engine === engine && item.periodStart === target.periodStart && item.periodEnd === target.periodEnd) ?? null;
  return { target, restored, auditId: audit.id, nextState: { version: 1, batches: state.batches.flatMap(item => item.id === target.id ? restored ? [restored] : [] : [item]) } };
}
