import { AdminPermissionsProvider } from "../../components/admin/AdminPermissions";
import { requireAdmin } from "../../lib/admin-auth";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import { measureAdminWorkload } from "../../lib/admin-performance";
import packageJson from "../../package.json";
import AdminScrollRestoration from "../../components/admin/AdminScrollRestoration";
import AdminMeasurementExclusion from "../../components/admin/AdminMeasurementExclusion";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await measureAdminWorkload("admin.auth", () => requireAdmin());

  return (
    <AdminPermissionsProvider role={admin.role}><div data-admin-theme="system" className="min-h-screen bg-admin-canvas text-admin-text">
      <AdminScrollRestoration />
      <AdminMeasurementExclusion />
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar email={admin.email} version={packageJson.version} />

        <main className="min-w-0 flex-1 bg-admin-canvas">
          <AdminTopBar name={admin.name || admin.email.split("@")[0]} role={admin.role} />
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
            {admin.role !== "OWNER" ? <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">{admin.role === "EDITOR" ? "编辑账号：可维护独立草稿；正式数据、采集、发布及系统设置由管理员操作。旧模块写操作暂不开放。" : "只读账号：可查看后台数据；修改、采集和发布操作不开放。"}</p> : null}
            {children}
          </div>
        </main>
      </div>
    </div></AdminPermissionsProvider>
  );
}
