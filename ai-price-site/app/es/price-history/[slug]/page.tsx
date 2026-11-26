import { HistoryPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("es", `/price-history/${slug}`, "Historial de cambios de precio");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="es" slug={slug} />;
}
