import type { Metadata } from "next";
import Link from "next/link";
import ArabicInfoPage from "../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "أدلة أسعار الاشتراكات",
  description:
    "افهم الأسعار الإقليمية وأسعار الصرف والضرائب وشروط الدفع وجودة البيانات.",
};

const guides = [
  {
    title: "كيف تقرأ الأسعار الإقليمية؟",
    description:
      "افهم السعر المحلي وقيمته بالدولار والفرق مقارنة بالسعر المرجعي.",
    href: "/ar/guides/price-guide/",
  },
  {
    title: "الدفع والحساب",
    description:
      "راجع وسائل الدفع وشروط الحساب عند الاشتراك من منطقة مختلفة.",
    href: "/ar/guides/payment-account/",
  },
  {
    title: "المنهجية",
    description:
      "تعرّف إلى طريقة جمع GeoSub للأسعار ومراجعتها ونشرها.",
    href: "/ar/guides/methodology/",
  },
];

export default function ArabicGuidesPage() {
  return (
    <ArabicInfoPage
      eyebrow="الأدلة"
      title="أدلة أسعار الاشتراكات"
      description="معلومات عملية لفهم جداول الأسعار وتقييم الشروط قبل الدفع."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-lime-300 hover:bg-lime-50/40"
          >
            <h2 className="font-black text-zinc-950">{guide.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {guide.description}
            </p>
          </Link>
        ))}
      </div>
    </ArabicInfoPage>
  );
}
