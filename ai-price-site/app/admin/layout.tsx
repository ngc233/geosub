import { requireAdmin } from "../../lib/admin-auth";
import AdminSidebar from "../../components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <AdminSidebar email={admin.email} />

        <main className="min-w-0 flex-1 bg-slate-50">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
