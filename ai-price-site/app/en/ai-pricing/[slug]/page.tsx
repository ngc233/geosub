import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DbPricingDetailView from "../../../../components/DbPricingDetailView";
import { getDbPricingProductDetail } from "../../../../lib/db-pricing-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getDbPricingProductDetail({
    slug,
    locale: "en",
  });

  if (!product) {
    return {
      title: "Pricing Detail - GeoSub",
    };
  }

  return {
    title: `${product.name} Regional Pricing - GeoSub`,
    description: product.description,
  };
}

export default async function EnPricingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getDbPricingProductDetail({
    slug,
    locale: "en",
  });

  if (!product) {
    notFound();
  }

  return <DbPricingDetailView product={product} locale="en" />;
}