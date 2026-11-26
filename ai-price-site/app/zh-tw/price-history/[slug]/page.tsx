import { HistoryPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("zh-tw", `/price-history/${slug}`, "價格變化紀錄");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="zh-tw" slug={slug} />;
}
