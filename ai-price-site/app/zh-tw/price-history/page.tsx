import { HistoryPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("zh-tw", "/price-history", "價格變化紀錄");
export default function Page() { return <HistoryPage locale="zh-tw" />; }
