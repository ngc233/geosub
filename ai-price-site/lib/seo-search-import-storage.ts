import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { assertSettingsVersion, settingsVersion } from './admin-settings-version';
import {
  appendSeoSearchPageImportBatch, preflightSeoSearchPageObservationRows, seoSearchImportPreflightPayload,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY as key, type SeoSearchImportInput,
} from './seo-search-observation-import';
import { planSeoSearchImportRecovery, strictSeoSearchImportState, SeoSearchImportError } from './seo-search-import-recovery';
import type { SeoSearchEngine } from './seo-search-performance-baseline';

export const seoSearchImportVersion = (valueText: string | null) => settingsVersion([{ settingKey: key, valueText }], [key]);
export const seoSearchPreflightToken = (input: SeoSearchImportInput) => createHash('sha256').update(seoSearchImportPreflightPayload(input)).digest('hex');

export async function findSeoSearchImportAudit(db: Pick<Prisma.TransactionClient, 'auditLog'>, settingId: string, batchId: string) {
  return db.auditLog.findFirst({ where: {
    targetType: 'site_setting', targetId: settingId, action: 'import_seo_search_page_observations',
    newValue: { path: ['batches'], array_contains: [{ id: batchId }] },
    NOT: { oldValue: { path: ['batches'], array_contains: [{ id: batchId }] } },
  }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, oldValue: true, newValue: true } });
}

type Command = { kind: 'import'; input: SeoSearchImportInput; preflightToken: string; acknowledgeExcluded: boolean; batchId: string; importedAt: string }
  | { kind: 'restore'; engine: SeoSearchEngine; batchId: string; auditId: string };
/** Same advisory lock as the local evidence tool; state, version and audit are read/written atomically. */
export async function saveSeoSearchImport(db: PrismaClient, actor: { id: string; email: string }, version: string, command: Command) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    const setting = await tx.siteSetting.findUnique({ where: { settingKey: key }, select: { id: true, valueText: true } });
    assertSettingsVersion([{ settingKey: key, valueText: setting?.valueText ?? null }], [key], version);
    const previous = strictSeoSearchImportState(setting?.valueText == null ? { version: 1, batches: [] } : JSON.parse(setting.valueText));
    let next, action: string, note: string;
    if (command.kind === 'import') {
      const preview = preflightSeoSearchPageObservationRows(command.input);
      if (!preview.canImport || command.preflightToken !== seoSearchPreflightToken(command.input)) throw new SeoSearchImportError('预检已失效或报表无效，请重新预检；输入仍保留。');
      if (preview.excluded.length && !command.acknowledgeExcluded) throw new SeoSearchImportError('请先确认预检中列出的排除行；输入仍保留。');
      const batch = { id: command.batchId, engine: command.input.engine, periodStart: command.input.periodStart, periodEnd: command.input.periodEnd,
        importedAt: command.importedAt, actorLabel: actor.email, observations: preview.observations };
      next = appendSeoSearchPageImportBatch(previous, batch);
      action = 'import_seo_search_page_observations';
      note = `Imported ${preview.observations.length} ${batch.engine} pages for ${batch.periodStart} through ${batch.periodEnd}; input=${preview.inputRows}, excluded=${preview.excluded.length}, merged=${preview.mergedRows}; preflight=sha256:${command.preflightToken}.`;
    } else {
      const target = previous.batches.findLast(item => item.engine === command.engine);
      if (!setting || !target || target.id !== command.batchId) throw new SeoSearchImportError('最近批次已改变，请刷新后核对恢复范围。');
      const audit = await findSeoSearchImportAudit(tx, setting.id, target.id);
      if (audit?.id !== command.auditId) throw new SeoSearchImportError('恢复依据已改变或缺失，请刷新核对。');
      const plan = planSeoSearchImportRecovery(previous, command.engine, audit);
      next = plan.nextState; action = 'rollback_seo_search_page_observations';
      note = `Undid ${target.id}; sourceAudit=${plan.auditId}; restored=${plan.restored?.id ?? 'none (first import of window)'}; scope=${target.engine}/${target.periodStart}/${target.periodEnd}.`;
    }
    const valueText = JSON.stringify(next);
    const saved = await tx.siteSetting.upsert({ where: { settingKey: key }, update: { valueText },
      create: { settingKey: key, groupName: 'seo', label: 'Google and Bing page observation imports', valueText, isPublic: false,
        note: 'Audited page observations; no platform calls or URL submissions.' }, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: actor.id, action, targetType: 'site_setting', targetId: saved.id, oldValue: previous, newValue: next, note } });
    return { recordVersion: seoSearchImportVersion(valueText) };
  }, { timeout: 15_000 });
}
