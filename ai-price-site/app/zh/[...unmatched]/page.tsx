import { notFound } from "next/navigation";

// An unmatched Chinese URL remains a real 404, with no content or indexable fallback.
export default function UnmatchedChinesePage() {
  notFound();
}
