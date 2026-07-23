import type { Metadata } from "next";
import ArabicInfoPage from "../../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "منهجية GeoSub",
  description:
    "كيف يجمع GeoSub أسعار الاشتراكات ويحوّل العملات ويراجع القيم غير المعتادة؟",
};

export default function ArabicMethodologyPage() {
  return (
    <ArabicInfoPage
      eyebrow="المنهجية"
      title="كيف نراجع بيانات الأسعار؟"
      description="تمر الأسعار عبر الجمع والتحقق والاستقرار قبل أن تدخل المقارنة العامة."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          يربط النظام كل قيمة بالمنتج والباقة والمنطقة والعملة ودورة الفوترة
          والمصدر. ولا تُنشر القيم التي لا تطابق تعريف الباقة المعتمد مباشرة.
        </p>
        <p>
          تقارن المراجعة التلقائية العينات المتكررة وتتحقق من نطاق السعر
          والعملات والفواصل العشرية. وتُعزل القيم الشاذة إلى أن تُجمع أدلة
          كافية.
        </p>
        <p>
          تُحدّث أسعار الصرف بصورة مستقلة، وتظل الأسعار المحلية الأصلية محفوظة
          حتى لا يؤدي تغير سعر الصرف وحده إلى تغيير السعر الذي جُمع من المتجر.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
