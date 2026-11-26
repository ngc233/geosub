import { SnapshotPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return evidenceMetadata("ko", `/price-records/${id}`, "원본 가격 스냅샷");
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SnapshotPage locale="ko" id={id} />;
}
