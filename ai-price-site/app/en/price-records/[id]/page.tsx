import { SnapshotPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return evidenceMetadata("en", `/price-records/${id}`, "Original price snapshot");
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SnapshotPage locale="en" id={id} />;
}
