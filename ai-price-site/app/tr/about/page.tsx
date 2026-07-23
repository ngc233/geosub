import type { Metadata } from "next";
import TurkishInfoPage from "../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "GeoSub Hakkında",
  description:
    "GeoSub'ın dijital abonelikleri neden karşılaştırdığını ve bölgesel fiyatları nasıl düzenlediğini öğrenin.",
};

export default function TurkishAboutPage() {
  return (
    <TurkishInfoPage
      eyebrow="GeoSub Hakkında"
      title="GeoSub Hakkında"
      description="GeoSub, dünya genelindeki dijital abonelik fiyatlarını karşılaştırmayı ve anlamayı kolaylaştırır."
    >
      <h2 className="text-xl font-black text-zinc-950">Amacımız</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        Aynı hizmetin fiyatı ülkeye, para birimine, vergilere ve platforma göre
        değişebilir. GeoSub, incelenmiş bölgesel fiyatları ortak bir yöntemle
        düzenler ve farkları açık biçimde gösterir.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Her fiyatın yanında toplama ve döviz kuru tarihleri, vergi bilgileri ve
        güven durumu yer alır. Son tutarı ve kullanılabilirliği her zaman resmî
        ödeme ekranında doğrulayın.
      </p>
    </TurkishInfoPage>
  );
}
