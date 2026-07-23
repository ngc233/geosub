import type { Metadata } from "next";
import Link from "next/link";
import TurkishInfoPage from "../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Abonelik fiyatı rehberleri",
  description:
    "Bölgesel fiyatları, döviz kurlarını, vergileri, ödeme koşullarını ve veri kalitesini doğru yorumlayın.",
};

const guides = [
  {
    title: "Bölgesel fiyatlar nasıl okunur?",
    description:
      "Yerel fiyatı, USD karşılığını ve ABD referansına göre farkı doğru yorumlayın.",
    href: "/tr/guides/price-guide/",
  },
  {
    title: "Ödeme ve hesap",
    description:
      "Bölgeler arası aboneliklerde ödeme yöntemlerini ve hesap koşullarını kontrol edin.",
    href: "/tr/guides/payment-account/",
  },
  {
    title: "Yöntem",
    description:
      "GeoSub'ın bölgesel fiyatları nasıl topladığını, incelediğini ve yayımladığını öğrenin.",
    href: "/tr/guides/methodology/",
  },
];

export default function TurkishGuidesPage() {
  return (
    <TurkishInfoPage
      eyebrow="Rehberler"
      title="Abonelik fiyatı rehberleri"
      description="Fiyat tablolarını doğru yorumlamak ve ödeme öncesinde koşulları değerlendirmek için gerekli bilgileri bir araya getiriyoruz."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-lime-300 hover:bg-lime-50/40"
          >
            <h2 className="font-black text-zinc-950">{guide.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {guide.description}
            </p>
          </Link>
        ))}
      </div>
    </TurkishInfoPage>
  );
}
