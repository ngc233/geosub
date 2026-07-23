import { AdminCard, AdminPageHeader, AdminSectionHeader } from "../../../components/admin/AdminCard";
import { AdminButton } from "../../../components/admin/AdminButton";
import AdminAlert from "../../../components/admin/AdminAlert";
import { prisma } from "../../../lib/prisma";
import { updateAdminPassword, updateAnalyticsSettings } from "./actions";

type SettingsSearchParams = {
  saved?: string;
  analyticsError?: string;
  passwordChanged?: string;
  passwordError?: string;
  revoked?: string;
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
    ga4Id: byKey.get("ga4_id")?.valueText || "",
    gtmId: byKey.get("gtm_id")?.valueText || "",
  };
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<SettingsSearchParams>;
}) {
  const [settings, query] = await Promise.all([
    getAnalyticsSettings(),
    searchParams ?? Promise.resolve<SettingsSearchParams>({}),
  ]);
  const saved = query.saved === "1";
  const analyticsError = query.analyticsError
    ? analyticsErrorCopy[query.analyticsError] || "Google 统计设置未保存，请检查后重试。"
    : "";
  const passwordChanged = query.passwordChanged === "1";
  const revokedSessions = Math.max(0, Number.parseInt(query.revoked || "0", 10) || 0);
  const passwordError = query.passwordError
    ? passwordErrorCopy[query.passwordError] || "密码修改失败，请重新检查后再试。"
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

      <AdminCard className={saved || analyticsError || passwordChanged || passwordError ? "mt-5" : undefined}>
        <AdminSectionHeader
          title="Google 统计代码"
          description="填写 Google 后台给出的 ID 即可；直接粘贴包含 ID 的 Google 代码也能自动识别。前台会安全注入统计脚本。"
        />

        <div className="mt-5 flex flex-wrap gap-2 border-y border-slate-100 py-4 text-xs font-bold">
          <span
            className={
              settings.ga4Id
                ? "rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700"
                : "rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-500"
            }
          >
            GA4 {settings.ga4Id ? "已配置" : "未配置"}
          </span>
          <span
            className={
              settings.gtmId
                ? "rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-700"
                : "rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-500"
            }
          >
            GTM {settings.gtmId ? "已配置" : "未配置"}
          </span>
        </div>

        <form action={updateAnalyticsSettings} className="mt-6 space-y-6">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              GA4 Measurement ID
            </span>
            <input
              name="ga4_id"
              defaultValue={settings.ga4Id}
              placeholder="G-XXXXXXXXXX"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              在 Google Analytics 的网站数据流中可找到以 G- 开头的 Measurement ID。若同时填写 GTM，前台优先加载 GTM，避免重复统计。
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              GTM Container ID
            </span>
            <input
              name="gtm_id"
              defaultValue={settings.gtmId}
              placeholder="GTM-XXXXXXX"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              如果你使用 Google Tag Manager 统一管理 GA4、Ads 和事件，请填写以 GTM- 开头的 Container ID。
            </span>
          </label>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-500">
              保存后新页面访问会自动加载。后台、登录页和 API 不会被本站内置事件统计记录。
            </p>
            <AdminButton type="submit">
              保存设置
            </AdminButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard className="mt-5">
        <AdminSectionHeader
          title="管理员账户安全"
          description="单管理员模式下可在这里主动更换密码。修改后当前设备保持登录，其他设备上的后台会话会全部注销。"
        />

        <form action={updateAdminPassword} className="mt-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">当前密码</span>
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">新密码</span>
              <input
                name="new_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">确认新密码</span>
              <input
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-xs leading-5 text-slate-500">
              至少 14 个字符，并同时包含大小写字母、数字和符号。系统不会通过网页展示或发送现有密码。
            </p>
            <AdminButton type="submit">
              更新密码
            </AdminButton>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
