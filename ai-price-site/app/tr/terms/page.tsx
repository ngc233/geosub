import type { Metadata } from "next";
import TurkishInfoPage from "../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description:
    "GeoSub fiyat verilerini kullanırken geçerli olan temel koşullar, bilgi kapsamı ve sınırlamalar.",
};

export default function TurkishTermsPage() {
  return (
    <TurkishInfoPage
      eyebrow="Kullanım Koşulları"
      title="Kullanım Koşulları"
      description="GeoSub verileri için geçerli temel koşulları, bilgi kapsamını ve sınırlamaları burada açıklıyoruz."
    >
      <h2 className="text-xl font-black text-zinc-950">Bilginin niteliği</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub; herkese açık fiyatları, bölgesel karşılaştırmaları ve abonelik
        bilgilerini sunar. Bu içerikler hukuk, finans veya satın alma danışmanlığı
        değildir.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Bölgeler arası abonelikler hesap bölgesine, ödeme yöntemine, vergilere
        ve platform kurallarına bağlı olabilir. Her hizmetin resmî ödeme
        ekranını ve koşullarını kontrol edin.
      </p>
    </TurkishInfoPage>
  );
}
