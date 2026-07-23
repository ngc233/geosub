import { EuropeanInfoPage, getEuropeanInfoMetadata } from "../../../components/EuropeanLocalePages";
type Props = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: Props) { return getEuropeanInfoMetadata("de", (await params).slug); }
export default async function Page({ params }: Props) { return <EuropeanInfoPage locale="de" segments={(await params).slug} />; }
