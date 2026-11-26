import { SnapshotPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return evidenceMetadata("zh-tw", `/price-records/${id}`, "原始價格快照");
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SnapshotPage locale="zh-tw" id={id} />;
}
