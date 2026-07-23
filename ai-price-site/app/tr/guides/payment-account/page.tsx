import type { Metadata } from "next";
import TurkishInfoPage from "../../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Ödeme yöntemleri ve hesap bölgesi",
  description:
    "Başka bir bölgede abonelik başlatmadan önce ödeme, faturalandırma ve hesap koşullarında neleri kontrol etmeniz gerektiğini öğrenin.",
};

export default function TurkishPaymentAccountPage() {
  return (
    <TurkishInfoPage
      eyebrow="Ödeme ve hesap"
      title="Ödeme yöntemleri ve hesap bölgesi"
      description="Fiyat farkı bulunması, her bölgede aynı koşullarla abonelik başlatılabileceği anlamına gelmez."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          App Store üzerinden yapılan bir satın alma; Apple hesabının ülkesine
          veya bölgesine, kabul edilen ödeme yöntemlerine, fatura bilgilerine,
          bakiyeye ve hizmetin kullanılabilirliğine bağlı olabilir.
        </p>
        <p>
          GeoSub herkese açık fiyatları karşılaştırır ve bölgesel kısıtlamaların
          aşılmasını önermez. Satın almadan önce resmî koşulları ve son ödeme
          tutarını kontrol edin.
        </p>
      </div>
    </TurkishInfoPage>
  );
}
