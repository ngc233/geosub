import type { Metadata } from "next";
import TurkishInfoPage from "../../../components/TurkishInfoPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "GeoSub'ın analiz araçlarını ve site kullanım verilerini nasıl işlediğini öğrenin.",
};

export default function TurkishPrivacyPage() {
  return (
    <TurkishInfoPage
      eyebrow="Gizlilik Politikası"
      title="Gizlilik Politikası"
      description="GeoSub'ın analiz araçlarını nasıl kullandığını ve site kullanım verilerini nasıl işlediğini açıklıyoruz."
    >
      <h2 className="text-xl font-black text-zinc-950">Temel ilkeler</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub fiyat bilgileri yayımlar. Siteyi incelemek için ad, kimlik
        belgesi veya benzeri hassas kişisel bilgiler vermeniz gerekmez.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Yönetici tarafından etkinleştirildiğinde ziyaretleri ve genel
        etkileşimleri ölçmek için Google Analytics veya Google Tag Manager
        kullanılabilir. Fiyat karşılaştırması için gerekli olmayan hassas
        bilgileri toplamayız.
      </p>
    </TurkishInfoPage>
  );
}
