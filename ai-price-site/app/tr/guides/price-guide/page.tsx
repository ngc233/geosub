import type { Metadata } from "next";
import TurkishInfoPage from "../../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Bölgesel fiyatlar nasıl okunur?",
  description:
    "Bir aboneliğin bölgesel fiyatlarını doğru biçimde karşılaştırmayı öğrenin.",
};

export default function TurkishPriceGuidePage() {
  return (
    <TurkishInfoPage
      eyebrow="Fiyat rehberi"
      title="Bölgesel fiyatlar nasıl okunur?"
      description="Yerel fiyatı, döviz karşılığını, vergileri ve ABD referansına göre farkı birlikte değerlendirin."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          Önce yerel para birimindeki tutarı ve faturalandırma dönemini kontrol
          edin. Ardından aynı tarihli döviz kuru ile hesaplanan dolar karşılığını
          karşılaştırın. Aylık ve yıllık paketleri ya da bireysel ve aile
          paketlerini birbirine karıştırmayın.
        </p>
        <p>
          Yalnızca en ucuz bölgeye bakmayın; vergileri, fiyat tarihini ve veri
          güvenini de inceleyin. Düşük fiyat, paketin her hesap veya ödeme
          yöntemiyle satın alınabileceği anlamına gelmez.
        </p>
      </div>
    </TurkishInfoPage>
  );
}
