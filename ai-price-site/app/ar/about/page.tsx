import type { Metadata } from "next";
import ArabicInfoPage from "../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "عن GeoSub",
  description:
    "تعرّف إلى هدف GeoSub وطريقته في تنظيم أسعار الاشتراكات الرقمية بين المناطق.",
};

export default function ArabicAboutPage() {
  return (
    <ArabicInfoPage
      eyebrow="عن GeoSub"
      title="عن GeoSub"
      description="يسهّل GeoSub مقارنة أسعار الاشتراكات الرقمية وفهمها حول العالم."
    >
      <h2 className="text-xl font-black text-zinc-950">هدفنا</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        قد يختلف سعر الخدمة نفسها حسب الدولة والعملة والضرائب والمنصة. ينظم
        GeoSub الأسعار الإقليمية التي خضعت للمراجعة وفق منهج موحّد، ويعرض
        الفروق بصورة واضحة.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        نعرض مع كل سعر تاريخ جمعه وتاريخ سعر الصرف والمعلومات الضريبية وحالة
        الموثوقية. ويبقى المبلغ وشروط التوفر في شاشة الدفع الرسمية هما المرجع
        النهائي.
      </p>
    </ArabicInfoPage>
  );
}
