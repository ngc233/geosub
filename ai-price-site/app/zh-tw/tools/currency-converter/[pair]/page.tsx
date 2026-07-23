import CurrencyPairRoutePage, {
  getCurrencyPairRouteMetadata,
} from "../../../../../components/CurrencyPairRoutePage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }) {
  return getCurrencyPairRouteMetadata("zh-tw", (await params).pair);
}

export default async function Page({ params }: { params: Promise<{ pair: string }> }) {
  return <CurrencyPairRoutePage locale="zh-tw" pairSlug={(await params).pair} />;
}
