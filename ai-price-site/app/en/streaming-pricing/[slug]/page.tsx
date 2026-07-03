import { redirect } from "next/navigation";

export default async function EnglishStreamingDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/en/ai-pricing/${slug}/`);
}
