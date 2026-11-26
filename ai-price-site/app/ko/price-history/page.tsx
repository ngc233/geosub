import { HistoryPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("ko", "/price-history", "가격 변동 기록");
export default function Page() { return <HistoryPage locale="ko" />; }
