import Link from "next/link";
import { PublicSection } from "../../../../components/ui/PublicPage";
import { resetCopy } from "../../../../lib/codex-reset-presentation";

export default function NotFound() {
  const copy = resetCopy.en;
  return <div className="mx-auto max-w-5xl px-4 py-8 text-zinc-950 dark:text-zinc-100">
    <PublicSection className="space-y-3 p-6">
      <h1 className="text-2xl font-semibold">{copy.notFound}</h1>
      <p className="text-sm leading-6">{copy.notFoundDetail}</p>
      <Link href="/en" className="inline-flex min-h-11 items-center underline underline-offset-4">GeoSub</Link>
    </PublicSection>
  </div>;
}
