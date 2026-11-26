import { SnapshotPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return evidenceMetadata("ja", `/price-records/${id}`, "取得時の元価格スナップショット");
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SnapshotPage locale="ja" id={id} />;
}
