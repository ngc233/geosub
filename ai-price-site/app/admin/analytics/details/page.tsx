import { redirect } from "next/navigation";

export default async function DetailedAnalyticsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams({ tab: "details" });
  if (params.range) query.set("range", params.range);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  redirect(`/admin/analytics?${query.toString()}`);
}
