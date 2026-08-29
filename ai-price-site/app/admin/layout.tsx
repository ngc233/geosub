import { requireAdmin } from "../../lib/admin-auth";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { measureAdminWorkload } from "../../lib/admin-performance";
import packageJson from "../../package.json";
import AdminScrollRestoration from "../../components/admin/AdminScrollRestoration";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await measureAdminWorkload("admin.auth", () => requireAdmin());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <AdminScrollRestoration />
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar email={admin.email} version={packageJson.version} />

        <main className="min-w-0 flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
