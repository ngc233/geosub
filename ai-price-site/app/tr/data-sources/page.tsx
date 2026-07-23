import type { Metadata } from "next";
import TurkishInfoPage from "../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Veri kaynakları ve karşılaştırma yöntemi",
  description:
    "GeoSub'ın App Store fiyatlarını, döviz kurlarını, vergi bilgilerini ve inceleme sürecini nasıl kullandığını öğrenin.",
};

export default function TurkishDataSourcesPage() {
  return (
    <TurkishInfoPage
      eyebrow="Veri kaynakları"
      title="Veri kaynakları ve karşılaştırma yöntemi"
      description="Aynı App Store paketi ve faturalandırma dönemine ait bölgesel fiyatları; yerel para birimi, toplama tarihi ve kur tarihiyle karşılaştırırız."
    >
      <h2 className="text-xl font-black text-zinc-950">
        Fiyatları nasıl işliyoruz?
      </h2>
      <div className="mt-4 space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Ürün, paket, ülke veya bölge, para birimi ve faturalandırma dönemini
          ayrı kaydederiz. Olağandışı tutarlar ile olası para birimi, ondalık
          basamak veya dönem hataları yayımlanmaz; otomatik incelemeye alınır.
        </p>
        <p>
          Seçilen görüntüleme para birimine dönüşüm, sayfada belirtilen tarihe
          ait kurla hesaplanır. Gerekli kur eksik veya güncelliğini yitirmişse
          dönüşüm durdurulur. Vergi bilgileri açıklama amaçlıdır; GeoSub, App
          Store&apos;da gösterilen fiyata ikinci kez vergi eklemez.
        </p>
        <p className="text-zinc-500">
          Fiyatlar ve kullanılabilirlik değişebilir. Son tutar, vergiler ve
          satın alma koşulları için resmî ödeme ekranı geçerlidir.
        </p>
      </div>
    </TurkishInfoPage>
  );
}
