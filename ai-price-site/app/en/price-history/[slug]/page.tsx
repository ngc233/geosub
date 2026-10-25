import { HistoryPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("en", `/price-history/${slug}`, "Price change records");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="en" slug={slug} />;
}
