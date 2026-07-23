import type { Metadata } from "next";
import ArabicInfoPage from "../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "شروط الاستخدام",
  description: "شروط استخدام بيانات الأسعار والمحتوى المنشور في GeoSub.",
};

export default function ArabicTermsPage() {
  return (
    <ArabicInfoPage
      eyebrow="الشروط"
      title="شروط الاستخدام"
      description="يقدم GeoSub معلومات للمقارنة والبحث، ولا يبيع الاشتراكات أو يتولى عمليات الدفع."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          الأسعار والتحويلات وملاحظات الضرائب والقوة الشرائية معلومات إرشادية
          وقد تتغير بمرور الوقت. تحقّق من المبلغ النهائي والتوفر في شاشة الدفع
          الرسمية قبل الشراء.
        </p>
        <p>
          لا يجوز استخدام الموقع للتحايل على قواعد المنصة أو القيود القانونية.
          وقد تتأثر الاشتراكات بين المناطق بمنطقة الحساب وطريقة الدفع والفوترة
          والضرائب.
        </p>
        <p>
          عند التعارض، تكون شروط المنصة الرسمية وشاشة الدفع هي المرجع المعتمد.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
