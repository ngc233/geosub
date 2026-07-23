import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dünya genelinde dijital abonelik fiyatları",
  description:
    "Yapay zekâ ve dijital yayın aboneliklerini ülke ve bölgelere göre; yerel fiyat, seçilen görüntüleme para birimi, vergi bilgisi ve satın alma gücü bağlamıyla karşılaştırın.",
};

const sections = [
  {
    title: "Yapay zekâ abonelikleri",
    description:
      "ChatGPT, Claude, Gemini, Grok ve diğer yapay zekâ hizmetlerinin ülkelere göre fiyatlarını karşılaştırın.",
    href: "/tr/ai-pricing/",
    tag: "Yapay zekâ",
  },
  {
    title: "Dijital yayın",
    description:
      "Netflix, Disney+ ve diğer dijital yayın hizmetlerinin bölgesel fiyat farklarını inceleyin.",
    href: "/tr/streaming-pricing/",
    tag: "Dijital yayın",
  },
  {
    title: "Veri kaynakları",
    description:
      "Fiyatların, döviz kurlarının ve vergi bilgilerinin nereden geldiğini ve nasıl incelendiğini öğrenin.",
    href: "/tr/data-sources/",
    tag: "Veri",
  },
  {
    title: "Rehberler",
    description:
      "Bölgesel fiyatları doğru yorumlayın; ödeme ve hesap koşullarını satın almadan önce kontrol edin.",
    href: "/tr/guides/",
    tag: "Rehber",
  },
];

export default function TurkishHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
            Dünya genelinde dijital abonelik fiyatları
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            Dünya genelindeki abonelik fiyatları tek yerde
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSub, yapay zekâ ve dijital yayın aboneliklerini ülke ve bölgelere
            göre karşılaştırır. Yerel fiyatı, seçilen para birimindeki karşılığını, vergi
            bilgisini ve satın alma gücü bağlamını birlikte inceleyin.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
            >
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 group-hover:bg-lime-100 group-hover:text-lime-700">
                {section.tag}
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">
                {section.title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {section.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">
                İncele <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
