import { HistoryPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("es", "/price-history", "Historial de cambios de precio");
export default function Page() { return <HistoryPage locale="es" />; }
