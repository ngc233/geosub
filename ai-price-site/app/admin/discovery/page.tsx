import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DiscoveryRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams({ tab: "discovery" });

  for (const [key, rawValue] of Object.entries(params)) {
    if (key === "tab") continue;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (typeof value === "string" && value.trim()) {
      query.set(key, value);
    }
  }

  redirect(`/admin/pipeline?${query.toString()}`);
}
