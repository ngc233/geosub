import { CountryIndexPage, evidenceMetadata } from "../../../components/PriceEvidencePages";
export const revalidate = 1800;
export const metadata = evidenceMetadata("zh", "/countries", "国家订阅价格");
export default function Page() { return <CountryIndexPage locale="zh" />; }
