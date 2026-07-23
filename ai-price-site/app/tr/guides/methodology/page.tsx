import type { Metadata } from "next";
import TurkishInfoPage from "../../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Fiyat verisi yöntemi",
  description:
    "GeoSub'ın bölgesel fiyatları nasıl topladığını, olağandışı verileri nasıl ayırdığını ve incelenmiş fiyatları nasıl yayımladığını öğrenin.",
};

export default function TurkishMethodologyPage() {
  return (
    <TurkishInfoPage
      eyebrow="Yöntem"
      title="Fiyat verisi yöntemi"
      description="Eşdeğer fiyatları karşılaştırır, olağandışı gözlemleri herkese açık sıralamalardan uzak tutarız."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Fiyatları ürün, paket, ülke veya bölge, para birimi ve faturalandırma
          dönemine göre toplarız. Tekrarlanan gözlemlerin kararlı olup olmadığını
          kontrol eder; olası para birimi, ondalık basamak ve dönem hatalarını
          ayırırız.
        </p>
        <p>
          Herkese açık sayfalarda yalnızca incelenmiş veriler gösterilir. Fiyat
          toplama tarihi, döviz kuru tarihi, paket inceleme tarihi ve sayfa
          güncelleme tarihi farklı anlamlara gelir ve ayrı ayrı sunulur.
        </p>
      </div>
    </TurkishInfoPage>
  );
}
