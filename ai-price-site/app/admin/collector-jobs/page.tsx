import CollectorJobsView from "./CollectorJobsView";
import { getCollectorJobsPageData } from "./queries";

export const dynamic = "force-dynamic";

export default async function CollectorJobsPage() {
  const [jobs, runs, availabilityChecks] = await getCollectorJobsPageData();

  return (
    <CollectorJobsView
      jobs={jobs}
      runs={runs}
      availabilityChecks={availabilityChecks}
    />
  );
}