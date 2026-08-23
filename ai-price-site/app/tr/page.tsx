import type { Metadata } from "next";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata: Metadata = {
  title: "Dünya genelinde dijital abonelik fiyatları",
  description: "Yapay zekâ ve dijital yayın aboneliklerini ülke ve bölgelere göre yerel fiyat, vergi bilgisi ve satın alma gücü bağlamıyla karşılaştırın.",
};

export default function TurkishPage() {
  return <LocalizedHomepagePage locale="tr" />;
}
