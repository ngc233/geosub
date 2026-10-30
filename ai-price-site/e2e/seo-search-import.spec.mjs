import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client } = require('pg');
const fixture = require('../scripts/e2e-fixture.cjs');
const { loadSafeE2eEnvironment } = require('../scripts/e2e-environment.cjs');
const key = 'seo.search_page_observation_imports.v1';
const db = new Client({ connectionString: loadSafeE2eEnvironment().DATABASE_URL });
async function saved() {
  const { rows } = await db.query('SELECT value_text FROM site_settings WHERE setting_key=$1', [key]);
  const audit = await db.query("SELECT id,old_value,new_value,note FROM audit_logs WHERE action IN ('import_seo_search_page_observations','rollback_seo_search_page_observations') ORDER BY created_at,id");
  return { state: rows[0] ? JSON.parse(rows[0].value_text) : { version: 1, batches: [] }, audits: audit.rows };
}
function source(page, engine = 'Google Search Console') { return page.getByRole('heading', { name: engine, exact: true }).locator('xpath=ancestor::section[1]'); }
async function openForm(page, clicks = 1, engine, start = '2026-09-24', rows) {
  const section = source(page, engine);
  const details = section.locator('details').filter({ has: page.getByText('导入新的完整页面报表', { exact: true }) });
  if ((await details.getAttribute('open')) === null) {
    const summary = details.locator('summary').first();
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.click();
  }
  await expect(details).toHaveAttribute('open', '');
  const form = details.locator('form');
  await form.getByLabel('报表开始日期').fill(start);
  await form.getByLabel('报表结束日期').fill('2026-10-21');
  await form.locator('textarea[name=pageRows]').fill(rows ?? `Page,Clicks,Impressions,Position\n/en/ai-pricing/chatgpt,${clicks},100,5`);
  await form.getByRole('button', { name: '只读预检', exact: true }).click();
  await expect(form.getByText('预检：可导入', { exact: true })).toBeVisible();
  return form;
}
async function commit(page, clicks, engine, start) {
  const form = await openForm(page, clicks, engine, start);
  await form.getByRole('button', { name: '确认导入', exact: true }).click();
  await expect(source(page, engine)).toContainText('当前使用数据库导入');
  await expect.poll(async () => (await saved()).state.batches.filter(b => b.engine === (engine ? 'bing' : 'google')).at(-1)?.observations[0].clicks).toBe(clicks);
  await page.reload();
}
async function undo(page, engine, first = false) {
  const section = source(page, engine);
  await section.getByText('撤销最近导入与同窗口恢复', { exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await section.getByRole('button', { name: first ? '撤销此窗口首次导入' : '恢复同窗口原批次', exact: true }).click();
}
test.beforeAll(async () => {
  await db.connect();
  // Standard migrations must supply audit support, without fixture repair SQL.
  const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name IN ('actor','actor_id')");
  expect(columns.rows.map(row => row.column_name).sort()).toEqual(['actor','actor_id']);
  await db.query('DELETE FROM site_settings WHERE setting_key=$1', [key]);
  await db.query("DELETE FROM audit_logs WHERE action IN ('import_seo_search_page_observations','rollback_seo_search_page_observations')");
});
test.afterAll(async () => {
  await db.query('DELETE FROM site_settings WHERE setting_key=$1', [key]);
  await db.query("DELETE FROM audit_logs WHERE action IN ('import_seo_search_page_observations','rollback_seo_search_page_observations')");
  await db.end();
});
test('owner preflight is read-only; same-window recovery and concurrent stale forms preserve audited data', async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto('/admin-login');
  await page.locator('input[name="email"]').fill(fixture.adminEmail);
  await page.locator('input[name="password"]').fill(fixture.adminPassword);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/seo');
  const empty = await saved();
  const preview = await openForm(page, 1, undefined, undefined, 'Page,Clicks,Impressions,Position\n/en,1,100,5\n/reports/en/fixture.pdf,1,10,2');
  await expect(preview).toContainText('原始 2 行 · 有效 1 行 · 排除 1 行 · 合并 0 行 · 最终 1 页');
  await expect(preview.getByRole('button', { name: '确认导入' })).toBeDisabled();
  await preview.getByLabel('我已核对并确认排除以上 1 行').check();
  await expect(preview.getByRole('button', { name: '确认导入' })).toBeEnabled();
  expect(await saved()).toEqual(empty);
  await preview.locator('textarea[name=pageRows]').fill('Query,Clicks,Impressions\nchatgpt,1,10');
  await expect(preview.getByRole('button', { name: '确认导入' })).toBeDisabled();
  await preview.getByRole('button', { name: '只读预检', exact: true }).click();
  await expect(preview).toContainText('这是查询/关键词报表');
  await commit(page, 1); const a = (await saved()).state.batches[0];
  await commit(page, 2); const abAudits = (await saved()).audits;
  await commit(page, 7, 'Bing Webmaster'); const bing = (await saved()).state.batches.find(b => b.engine === 'bing');
  await commit(page, 3);
  await undo(page);
  await expect.poll(async () => (await saved()).state.batches.find(b => b.engine === 'google')?.observations[0].clicks).toBe(2);
  await page.reload();
  await undo(page);
  await expect.poll(async () => (await saved()).state.batches.find(b => b.engine === 'google')?.id).toBe(a.id);
  await page.reload();
  expect((await saved()).state.batches.find(b => b.engine === 'bing')).toEqual(bing);
  expect((await saved()).audits.slice(0, 2)).toEqual(abAudits);
  expect((await saved()).audits.at(-1).note).toContain('sourceAudit=');
  // Two requests use the same rendered version. The advisory lock permits one commit only.
  const other = await context.newPage(); await other.goto('/admin/seo');
  const f1 = await openForm(page, 4); const f2 = await openForm(other, 5);
  const count = (await saved()).audits.length;
  await Promise.all([f1.getByRole('button', { name: '确认导入' }).click(), f2.getByRole('button', { name: '确认导入' }).click()]);
  await expect.poll(async () => (await saved()).audits.length).toBe(count + 1);
  // Check each tab separately; locator.or cannot cross page contexts.
  const error = await Promise.race([source(page).getByRole('alert').waitFor().then(() => page), source(other).getByRole('alert').waitFor().then(() => other)]);
  await expect(source(error).getByRole('alert')).toContainText('设置已被其他操作修改');
  expect(await source(error).locator('textarea[name=pageRows]').inputValue()).toMatch(/,[45],100,5/);
  await other.close();
});
