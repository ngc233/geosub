import { requireAdmin } from "../../lib/admin-auth";
import AdminVersionOverview from "../../components/admin/AdminVersionOverview";
import Workspace from "./Workspace";
import { loadWorkspaceViewModel } from "./workspace-adapter";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ permission?: string; view?: string; page?: string }>;
}) {
  const [admin, params] = await Promise.all([requireAdmin(), searchParams]);
  const initialFilter =
    params.view === "all" || params.view === "progress" ? params.view : "action";
  const viewModel = await loadWorkspaceViewModel({
    view: initialFilter,
    page: params.page,
  });

  return (
    <Workspace
      key={`${initialFilter}:${params.page ?? ""}`}
      viewModel={viewModel}
      initialFilter={initialFilter}
      initialPage={params.page}
      role={admin.role}
      denied={params.permission === "denied"}
      versionOverview={<AdminVersionOverview compact />}
    />
  );
}
