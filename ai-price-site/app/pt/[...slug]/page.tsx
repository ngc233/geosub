import { EuropeanInfoPage, getEuropeanInfoMetadata } from "../../../components/EuropeanLocalePages";
type Props = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: Props) { return getEuropeanInfoMetadata("pt", (await params).slug); }
export default async function Page({ params }: Props) { return <EuropeanInfoPage locale="pt" segments={(await params).slug} />; }
