import { HistoryPage } from "../../../../components/PriceHistoryPage";
import { evidenceMetadata } from "../../../../components/PriceEvidenceShared";
export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return evidenceMetadata("zh", `/price-history/${slug}`, "价格变化记录");
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <HistoryPage locale="zh" slug={slug} />;
}
