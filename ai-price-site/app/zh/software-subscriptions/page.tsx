import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "软件订阅价格",
  robots: { index: false, follow: false },
};

export default function SoftwareSubscriptionsPage() {
  guardUnreleasedPublicPage();
  notFound();
}
