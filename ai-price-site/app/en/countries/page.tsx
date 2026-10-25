import { CountryIndexPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("en", "/countries", "Subscription prices by country");
export default function Page() { return <CountryIndexPage locale="en" />; }
