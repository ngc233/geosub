import { notFound } from "next/navigation";

export function guardUnreleasedPublicPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}
