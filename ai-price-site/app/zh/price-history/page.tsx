import { HistoryPage } from "../../../components/PriceHistoryPage";
import { evidenceMetadata } from "../../../components/PriceEvidenceShared";
export const revalidate = 1800;
export const metadata = evidenceMetadata("zh", "/price-history", "价格变化记录");
export default function Page() { return <HistoryPage locale="zh" />; }
