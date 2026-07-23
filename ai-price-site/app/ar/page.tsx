import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "أسعار الاشتراكات الرقمية حول العالم",
  description:
    "قارن اشتراكات الذكاء الاصطناعي وخدمات البث حسب الدولة والمنطقة، مع السعر المحلي والقيمة بعملة العرض المختارة ومعلومات الضرائب وسياق القوة الشرائية.",
};

const sections = [
  {
    title: "اشتراكات الذكاء الاصطناعي",
    description:
      "قارن أسعار ChatGPT وClaude وGemini وGrok وغيرها من خدمات الذكاء الاصطناعي بين الدول.",
    href: "/ar/ai-pricing/",
    tag: "ذكاء اصطناعي",
  },
  {
    title: "خدمات البث",
    description:
      "استعرض فروق الأسعار الإقليمية لخدمات Netflix وDisney+ وغيرها من منصات البث.",
    href: "/ar/streaming-pricing/",
    tag: "بث",
  },
  {
    title: "مصادر البيانات",
    description:
      "تعرّف إلى مصادر الأسعار وأسعار الصرف والمعلومات الضريبية وطريقة مراجعتها.",
    href: "/ar/data-sources/",
    tag: "بيانات",
  },
  {
    title: "الأدلة",
    description:
      "افهم الأسعار الإقليمية بدقة وراجع شروط الدفع والحساب قبل الاشتراك.",
    href: "/ar/guides/",
    tag: "دليل",
  },
];

export default function ArabicHomePage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-lime-600">
            أسعار الاشتراكات الرقمية حول العالم
          </p>
          <h1 className="mt-5 text-4xl font-black text-zinc-950 md:text-6xl">
            أسعار الاشتراكات العالمية في مكان واحد
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            يقارن GeoSub اشتراكات الذكاء الاصطناعي وخدمات البث بين الدول
            والمناطق، ويعرض السعر المحلي وقيمته بعملة العرض المختارة والمعلومات الضريبية
            وسياق القوة الشرائية معاً.
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
              <h2 className="mt-5 text-2xl font-black text-zinc-950">
                {section.title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {section.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">
                استعرض <span aria-hidden="true">←</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
