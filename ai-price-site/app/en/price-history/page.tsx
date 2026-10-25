import { HistoryPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("en", "/price-history", "Price change records");
export default function Page() { return <HistoryPage locale="en" />; }
