import { SnapshotPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return evidenceMetadata("es", `/price-records/${id}`, "Captura original de precios");
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SnapshotPage locale="es" id={id} />;
}
