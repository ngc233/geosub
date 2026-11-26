import { HistoryPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("ja", "/price-history", "価格改定履歴");
export default function Page() { return <HistoryPage locale="ja" />; }
