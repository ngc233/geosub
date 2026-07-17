import { AdminCard, AdminPageHeader, AdminSectionHeader } from "../../../components/admin/AdminCard";
import AdminAlert from "../../../components/admin/AdminAlert";
import { prisma } from "../../../lib/prisma";
import { updateAnalyticsSettings } from "./actions";

type SettingsSearchParams = {
  saved?: string;
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

      <AdminCard className={saved ? "mt-5" : undefined}>
        <AdminSectionHeader
          title="Google 统计代码"
          description="填写 Google 后台给出的 ID 即可，前台会自动注入统计代码。不要粘贴完整 script 代码。"
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
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              适用于 Google Analytics 4。若同时填写 GTM，前台优先加载 GTM，避免重复统计。
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
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              如果你更习惯在 Google Tag Manager 里统一管理 GA4、Ads 和事件，填这里即可。
            </span>
          </label>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-500">
              保存后新页面访问会自动加载。后台、登录页和 API 不会被本站内置事件统计记录。
            </p>
            <button
              type="submit"
              className="h-11 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              保存设置
            </button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
