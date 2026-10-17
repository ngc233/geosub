import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';

/** Compare scalar record values, not joined UI relations or millisecond-only timestamps. */
export function adminRecordVersion(record: object | null): string {
  const values = Object.entries(record || {}).filter(([, value]) => value === null || typeof value !== 'object' || value instanceof Date).sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}
export class AdminSaveConflict extends Error {}
export function assertAdminVersion(record: object | null, version: FormDataEntryValue | null) {
  if (!record || typeof version !== 'string' || version !== adminRecordVersion(record)) {
    throw new AdminSaveConflict('该记录已被其他操作修改，或页面版本已过期。本次输入仍保留，请先复制需要的内容，再重新打开页面核对。');
  }
}
export async function attemptAdminSave<T>(db: PrismaClient, save: (tx: Prisma.TransactionClient) => Promise<T>) {
  try {
    return { ok: true as const, value: await db.$transaction(save) };
  } catch (error) {
    if (error instanceof AdminSaveConflict) return { ok: false as const, error: error.message };
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (code === 'P2002') return { ok: false as const, error: '名称或网址标识已被使用，请修改后重试。输入仍保留。' };
    if (code === 'P2003' || code === 'P2025') return { ok: false as const, error: '关联记录已变化，本次保存已撤销。请核对关联对象后重试，输入仍保留。' };
    throw error;
  }
}
