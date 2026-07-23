import CurrencyPairRoutePage, {
  getCurrencyPairRouteMetadata,
} from "../../../../../components/CurrencyPairRoutePage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  return getCurrencyPairRouteMetadata("zh", pair);
}

export default async function Page({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  return <CurrencyPairRoutePage locale="zh" pairSlug={pair} />;
}
