import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "游戏区域价格",
  robots: { index: false, follow: false },
};

export default function GamingPricesPage() {
  guardUnreleasedPublicPage();
  notFound();
}
