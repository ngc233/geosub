import { cookies } from "next/headers";
import { AdminPermissionsProvider } from "../../components/admin/AdminPermissions";
import { requireAdmin } from "../../lib/admin-auth";
import AdminCommandPalette from "../../components/admin/AdminCommandPalette";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import { measureAdminWorkload } from "../../lib/admin-performance";
import packageJson from "../../package.json";
import AdminScrollRestoration from "../../components/admin/AdminScrollRestoration";
import AdminMeasurementExclusion from "../../components/admin/AdminMeasurementExclusion";
import { ADMIN_THEME_STORAGE_KEY } from "../../components/admin/admin-nav-config";

type AdminThemePreference = "light" | "dark" | "system";

function parseThemePreference(raw: string | undefined): AdminThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, cookieStore] = await Promise.all([
    measureAdminWorkload("admin.auth", () => requireAdmin()),
    cookies(),
  ]);
  const theme = parseThemePreference(cookieStore.get(ADMIN_THEME_STORAGE_KEY)?.value);

  return (
    <AdminPermissionsProvider role={admin.role}>
      <div
        data-admin-theme={theme}
        className="min-h-screen bg-admin-canvas text-admin-text antialiased"
      >
        <AdminScrollRestoration />
        <AdminMeasurementExclusion />
        <AdminCommandPalette />
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AdminSidebar email={admin.email} version={packageJson.version} />

          <main className="min-w-0 flex-1 bg-admin-canvas">
            <AdminTopBar
              name={admin.name || admin.email.split("@")[0]}
              role={admin.role}
            />
            <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              {admin.role !== "OWNER" ? (
                <p
                  role="status"
                  className="mb-4 rounded-admin-control border border-admin-border bg-admin-surface-subtle px-3.5 py-2.5 text-xs text-admin-text-secondary"
                >
                  {admin.role === "EDITOR"
                    ? "编辑账号：可维护独立草稿；正式数据、采集、发布及系统设置由管理员操作。"
                    : "只读账号：仅可查看后台数据；修改、采集与发布操作不开放。"}
                </p>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminPermissionsProvider>
  );
}
