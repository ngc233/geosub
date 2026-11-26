import { HistoryPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("ko", `/price-history/${slug}`, "가격 변동 기록");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="ko" slug={slug} />;
}
