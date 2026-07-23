import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function readSettingsFile(fileName: string) {
  return readFileSync(resolve(currentDir, fileName), "utf8");
}

test("settings page exposes a resilient Google analytics entry", () => {
  const source = readSettingsFile("page.tsx");

  assert.match(source, /Google 统计代码/);
  assert.match(source, /GA4 Measurement ID/);
  assert.match(source, /GTM Container ID/);
  assert.match(source, /GA4 \{settings\.ga4Id \? "已配置" : "未配置"\}/);
  assert.match(source, /GTM \{settings\.gtmId \? "已配置" : "未配置"\}/);
  assert.match(source, /Google 统计设置已保存/);
  assert.match(source, /直接粘贴包含 ID 的 Google 代码也能自动识别/);
  assert.match(source, /Google 统计设置未保存/);
  assert.match(source, /analyticsError/);
  assert.match(source, /保存设置/);
});

test("analytics settings extract IDs and redirect invalid input without throwing", () => {
  const source = readSettingsFile("actions.ts");

  assert.match(source, /\\bG-\[A-Z0-9\]\{4,\}\\b/);
  assert.match(source, /\\bGTM-\[A-Z0-9\]\{4,\}\\b/);
  assert.match(source, /extractTrackingId/);
  assert.match(source, /analyticsError=/);
  assert.match(source, /ga4_id/);
  assert.match(source, /gtm_id/);
  assert.match(source, /redirect\("\/admin\/settings\?saved=1"\)/);
  assert.doesNotMatch(source, /throw new Error\("GA4/);
});

test("settings page exposes a single-admin password change flow", () => {
  const page = readSettingsFile("page.tsx");
  const actions = readSettingsFile("actions.ts");
  const auth = readFileSync(resolve(currentDir, "../../../lib/admin-auth.ts"), "utf8");

  assert.match(page, /管理员账户安全/);
  assert.match(page, /name="current_password"/);
  assert.match(page, /name="new_password"/);
  assert.match(page, /name="confirm_password"/);
  assert.match(page, /autoComplete="current-password"/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(page, /另外 \{revokedSessions\} 个登录会话已安全注销/);
  assert.match(actions, /getAdminPasswordPolicyError/);
  assert.match(actions, /changeCurrentAdminPassword/);
  assert.match(actions, /passwordChanged=1&revoked=/);
  assert.match(auth, /action: "change_password"/);
  assert.match(auth, /currentSessionRotated: true/);
  assert.match(auth, /await createAdminSession\(userId\)/);
  assert.match(auth, /otherSessionsRevoked: Math\.max\(0, revoked\.count - 1\)/);
});
