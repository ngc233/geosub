import { CountryHubPage, evidenceMetadata } from "../../../../components/PriceEvidencePages";
export const revalidate = 1800;
type Props = { params: Promise<{ country: string }> };
export async function generateMetadata({ params }: Props) {
  const { country } = await params;
  return evidenceMetadata("zh", `/countries/${country}`, "地区订阅价格");
}
export default async function Page({ params }: Props) {
  const { country } = await params;
  return <CountryHubPage locale="zh" countrySlug={country} />;
}
