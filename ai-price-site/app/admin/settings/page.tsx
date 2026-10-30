import { adminControlClassName } from "@/components/admin/admin-control";
import { ANALYTICS_KEYS, NOTIFICATION_KEYS, settingsVersion } from "../../../lib/admin-settings-version";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { AdminCard, AdminPageHeader, AdminSectionHeader } from "../../../components/admin/AdminCard";
import { AdminButton } from "../../../components/admin/AdminButton";
import AdminAlert from "../../../components/admin/AdminAlert";
import { prisma } from "../../../lib/prisma";
import {
  getOperationsNotificationConfig,
  getOperationsNotificationHistory,
  type OperationsNotificationStatus,
} from "../../../lib/operations-notification";
import {
  updateAdminPassword,
  updateAnalyticsSettings,
  updateOperationsNotificationSettings,
} from "./actions";

type SettingsSearchParams = {
  saved?: string;
  analyticsError?: string;
  passwordChanged?: string;
  passwordError?: string;
  revoked?: string;
  notificationSaved?: string;
  notificationError?: string;
};

const analyticsErrorCopy: Record<string, string> = {
  ga4: "没有识别到有效的 GA4 Measurement ID。请在 Google Analytics 的网站数据流中查找以 G- 开头的 ID。",
  gtm: "没有识别到有效的 GTM Container ID。请在 Google Tag Manager 中查找以 GTM- 开头的 ID。",
  both: "GA4 与 GTM 输入都无法识别。请填写对应的 G- 或 GTM- ID，也可以直接粘贴包含这些 ID 的 Google 代码。",
};

const passwordErrorCopy: Record<string, string> = {
  missing: "请完整填写当前密码、新密码和确认密码。",
  mismatch: "两次输入的新密码不一致。",
  policy: "新密码至少 14 个字符，并同时包含大小写字母、数字和符号。",
  current: "当前密码不正确。",
  unchanged: "新密码不能与当前密码相同。",
};

const notificationStatusCopy: Record<OperationsNotificationStatus, {
  label: string;
  className: string;
}> = {
  sent: { label: "已发送", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  suppressed: { label: "重复已抑制", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  no_action: { label: "无需通知", className: "bg-admin-chip text-admin-text-secondary ring-admin-border dark:bg-admin-chip dark:text-admin-text-secondary" },
  disabled: { label: "外发已关闭", className: "bg-admin-chip text-admin-text-secondary ring-admin-border dark:bg-admin-chip dark:text-admin-text-secondary" },
  misconfigured: { label: "渠道未就绪", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  failed: { label: "发送失败", className: "bg-red-50 text-red-700 ring-red-200" },
};

function formatNotificationTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).format(value);
}

async function getAnalyticsSettings() {
  const rows = await prisma.siteSetting.findMany({
    where: {
      settingKey: {
        in: ["ga4_id", "gtm_id"],
      },
    },
    select: {
      settingKey: true,
      valueText: true,
      note: true,
    },
  });

  const byKey = new Map(rows.map((row) => [row.settingKey, row]));

  return {
    recordVersion: settingsVersion(rows,ANALYTICS_KEYS),
    ga4Id: byKey.get("ga4_id")?.valueText || "",
    gtmId: byKey.get("gtm_id")?.valueText || "",
  };
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<SettingsSearchParams>;
}) {
  const [settings, notificationConfig, notificationHistory, query] = await Promise.all([
    getAnalyticsSettings(),
    getOperationsNotificationConfig(),
    getOperationsNotificationHistory(),
    searchParams ?? Promise.resolve<SettingsSearchParams>({}),
  ]);
  const notificationRows=await prisma.siteSetting.findMany({where:{settingKey:{in:NOTIFICATION_KEYS}}});
  const notification = {...notificationConfig, enabled: notificationRows.find(row => row.settingKey === "operations_brief_enabled")?.valueText === "true"};
  const saved = query.saved === "1";
  const analyticsError = query.analyticsError
    ? analyticsErrorCopy[query.analyticsError] || "Google 统计设置未保存，请检查后重试。"
    : "";
  const passwordChanged = query.passwordChanged === "1";
  const revokedSessions = Math.max(0, Number.parseInt(query.revoked || "0", 10) || 0);
  const passwordError = query.passwordError
    ? passwordErrorCopy[query.passwordError] || "密码修改失败，请重新检查后再试。"
    : "";
  const notificationSaved = query.notificationSaved === "1";
  const notificationError = query.notificationError === "channel"
    ? "服务器尚未配置安全通知渠道，因此不能启用外发。站内每日简报不受影响。"
    : "";

  return (
    <>
      <AdminPageHeader
        eyebrow="Settings"
        title="系统设置"
        description="管理站点级配置。当前已开放 Google Analytics / Tag Manager 入口，后续再扩展广告、合规和全局开关。"
      />

      {saved ? (
        <AdminAlert title="Google 统计设置已保存" variant="success">
          新访问页面会自动读取最新配置；无需重启前端服务，也不要重复粘贴完整脚本。
        </AdminAlert>
      ) : null}

      {analyticsError ? (
        <AdminAlert title="Google 统计设置未保存" variant="danger">
          {analyticsError}
        </AdminAlert>
      ) : null}

      {passwordChanged ? (
        <AdminAlert title="管理员密码已更新" variant="success">
          当前设备保持登录，另外 {revokedSessions} 个登录会话已安全注销。
        </AdminAlert>
      ) : null}

      {passwordError ? (
        <AdminAlert title="密码未修改" variant="danger">
          {passwordError}
        </AdminAlert>
      ) : null}

      {notificationSaved ? (
        <AdminAlert title="每日异常通知设置已保存" variant="success">
          {notification.enabled
            ? "系统只会在采集失败或产品确实需要人工处理时发送简报。"
            : "外部通知已关闭，后台首页仍会继续生成每日产品简报。"}
        </AdminAlert>
      ) : null}

      {notificationError ? (
        <AdminAlert title="异常通知未启用" variant="warning">
          {notificationError}
        </AdminAlert>
      ) : null}

      <AdminCard className={saved || analyticsError || passwordChanged || passwordError ? "mt-5" : undefined}>
        <AdminSectionHeader
          title="Google 统计代码"
          description="填写 Google 后台给出的 ID 即可；直接粘贴包含 ID 的 Google 代码也能自动识别。前台会安全注入统计脚本。"
        />

        <div className="mt-5 flex flex-wrap gap-2 border-y border-admin-border py-4 text-xs font-semibold dark:border-admin-border">
          <span
            className={
              settings.ga4Id
                ? "rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700"
                : "rounded-md bg-admin-chip px-2.5 py-1.5 text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted"
            }
          >
            GA4 {settings.ga4Id ? "已配置" : "未配置"}
          </span>
          <span
            className={
              settings.gtmId
                ? "rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700"
                : "rounded-md bg-admin-chip px-2.5 py-1.5 text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted"
            }
          >
            GTM {settings.gtmId ? "已配置" : "未配置"}
          </span>
        </div>

        <AdminActionForm action={updateAnalyticsSettings} className="mt-6 space-y-6"><input type="hidden" name="recordVersion" value={settings.recordVersion} />
          <label className="block">
            <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
              GA4 Measurement ID
            </span>
            <input
              name="ga4_id"
              defaultValue={settings.ga4Id}
              placeholder="G-XXXXXXXXXX"
              className={`${adminControlClassName} mt-2 h-12 w-full`}
            />
            <span className="mt-2 block text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              在 Google Analytics 的网站数据流中可找到以 G- 开头的 Measurement ID。若同时填写 GTM，前台优先加载 GTM，避免重复统计。
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
              GTM Container ID
            </span>
            <input
              name="gtm_id"
              defaultValue={settings.gtmId}
              placeholder="GTM-XXXXXXX"
              className={`${adminControlClassName} mt-2 h-12 w-full`}
            />
            <span className="mt-2 block text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              如果你使用 Google Tag Manager 统一管理 GA4、Ads 和事件，请填写以 GTM- 开头的 Container ID。
            </span>
          </label>

          <div className="flex items-center justify-between gap-4 rounded-admin-card bg-admin-surface-subtle px-4 py-3 dark:bg-admin-chip">
            <p className="text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              保存后新页面访问会自动加载。后台、登录页和 API 不会被本站内置事件统计记录。
            </p>
            <AdminButton type="submit">
              保存设置
            </AdminButton>
          </div>
        </AdminActionForm>
      </AdminCard>

      <AdminCard className="mt-5">
        <AdminSectionHeader
          title="每日异常通知"
          description="后台首页始终生成产品简报；外部通知只发送真正需要介入的采集失败和产品待办，不会发送健康状态或重复排队提醒。"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-admin-border bg-admin-surface-subtle p-4 dark:border-admin-border-strong dark:bg-admin-chip">
            <p className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">站内简报</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">始终启用</p>
            <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">进入后台首页即可查看，无需配置。</p>
          </div>
          <div className="rounded-lg border border-admin-border bg-admin-surface-subtle p-4 dark:border-admin-border-strong dark:bg-admin-chip">
            <p className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">安全通知渠道</p>
            <p className={`mt-1 text-sm font-semibold ${notification.channelConfigured ? "text-emerald-700" : "text-amber-700"}`}>
              {notification.channelConfigured ? `已配置 · ${notification.endpointHost}` : "服务器未配置"}
            </p>
            <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">地址和密钥仅保存在服务器环境中，后台不会显示敏感信息。</p>
          </div>
        </div>

        <AdminActionForm action={updateOperationsNotificationSettings} className="mt-5"><input type="hidden" name="recordVersion" value={settingsVersion(notificationRows,NOTIFICATION_KEYS)} />
          <label className="flex items-start gap-3 rounded-lg border border-admin-border bg-admin-surface p-4 dark:border-admin-border-strong dark:bg-admin-surface">
            <input
              name="operations_brief_enabled"
              type="checkbox"
              defaultChecked={notification.enabled}
              disabled={!notification.channelConfigured}
              className="mt-0.5 h-4 w-4 rounded border-admin-border-strong text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed dark:border-admin-border-strong"
            />
            <span>
              <span className="block text-sm font-semibold text-admin-text dark:text-admin-text-body">启用外部异常简报</span>
              <span className="mt-1 block text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                每次运行只汇总需要人工处理的产品；全部健康、运行中或已排队时不会打扰你。
              </span>
            </span>
          </label>
          <div className="mt-4 flex justify-end">
            <AdminButton type="submit">保存通知设置</AdminButton>
          </div>
        </AdminActionForm>

        <div className="mt-6 border-t border-admin-border pt-5 dark:border-admin-border">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-admin-text dark:text-admin-text">最近通知记录</h3>
              <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">时间按新加坡时间显示；重复异常只记录，不再次外发。</p>
            </div>
            <span className="text-xs font-semibold text-admin-text-faint">最近 {notificationHistory.length} 次</span>
          </div>

          {notificationHistory.length > 0 ? (
            <div className="mt-4 divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border dark:border-admin-border-strong">
              {notificationHistory.map((delivery) => {
                const status = notificationStatusCopy[delivery.status];
                return (
                  <div key={delivery.id} className="grid gap-3 bg-admin-surface p-4 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:items-center dark:bg-admin-surface">
                    <div>
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}>
                        {status.label}
                      </span>
                      <p className="mt-2 text-xs tabular-nums text-admin-text-faint">
                        {formatNotificationTime(delivery.createdAt)} SGT
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-admin-text dark:text-admin-text">{delivery.title}</p>
                      <p className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                        {delivery.errorMessage || delivery.summary}
                      </p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-admin-text-muted sm:text-right dark:text-admin-text-muted">
                      涉及 {delivery.interventionCount} 个产品
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-admin-border px-4 py-6 text-center text-sm text-admin-text-faint dark:border-admin-border-strong">
              定时简报首次运行后，这里会显示送达结果。
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard className="mt-5">
        <AdminSectionHeader
          title="管理员账户安全"
          description="单管理员模式下可在这里主动更换密码。修改后当前设备保持登录，其他设备上的后台会话会全部注销。"
        />

        <AdminActionForm capability="account" action={updateAdminPassword} className="mt-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">当前密码</span>
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                className={`${adminControlClassName} mt-2 h-12 w-full`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">新密码</span>
              <input
                name="new_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
                className={`${adminControlClassName} mt-2 h-12 w-full`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">确认新密码</span>
              <input
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
                className={`${adminControlClassName} mt-2 h-12 w-full`}
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 border-t border-admin-border pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-admin-border">
            <p className="max-w-3xl text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
              至少 14 个字符，并同时包含大小写字母、数字和符号。系统不会通过网页展示或发送现有密码。
            </p>
            <AdminButton type="submit">
              更新密码
            </AdminButton>
          </div>
        </AdminActionForm>
      </AdminCard>
    </>
  );
}
