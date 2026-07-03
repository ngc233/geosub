import { redirect } from "next/navigation";

export default async function StreamingDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/zh/ai-pricing/${slug}/`);
}
