import CollectorJobsView from "./CollectorJobsView";
import { getCollectorJobsPageData } from "./queries";

export const dynamic = "force-dynamic";

export default async function CollectorJobsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const [jobs, runs, availabilityChecks] = await getCollectorJobsPageData(params);

  return (
    <CollectorJobsView
      listParams={params}
      jobs={jobs}
      runs={runs}
      availabilityChecks={availabilityChecks}
    />
  );
}