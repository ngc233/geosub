import CodexResetPage, { getCodexResetMetadata } from "../../../../components/CodexResetPage";

export const dynamic = "force-dynamic";
export const metadata = getCodexResetMetadata("zh");

export default function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CodexResetPage locale="zh" searchParams={searchParams}/>;
}
