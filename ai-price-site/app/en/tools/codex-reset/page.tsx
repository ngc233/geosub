import CodexResetPage, { getCodexResetMetadata } from "../../../../components/CodexResetPage";

export const dynamic = "force-dynamic";
export const metadata = getCodexResetMetadata("en");

export default function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CodexResetPage locale="en" searchParams={searchParams}/>;
}
