import { HistoryPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("ja", `/price-history/${slug}`, "価格改定履歴");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="ja" slug={slug} />;
}
