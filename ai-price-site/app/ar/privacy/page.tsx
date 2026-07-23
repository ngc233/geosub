import type { Metadata } from "next";
import ArabicInfoPage from "../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "كيف يتعامل GeoSub مع بيانات الاستخدام وإحصاءات الموقع.",
};

export default function ArabicPrivacyPage() {
  return (
    <ArabicInfoPage
      eyebrow="الخصوصية"
      title="سياسة الخصوصية"
      description="نجمع الحد الأدنى من البيانات اللازمة لتشغيل الموقع وتحسينه."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          قد يسجل GeoSub أحداثاً تقنية مثل زيارة الصفحة والنقرات وأخطاء النظام
          لأغراض التشغيل والتحليل. ولا نطلب بيانات الدفع أو بيانات حساب Apple
          لإجراء مقارنة الأسعار.
        </p>
        <p>
          قد يستخدم GeoSub خدمة Google Analytics أو Google Tag Manager لقياس
          مشاهدات الصفحات والتفاعلات العامة وأداء الموقع. تساعد هذه القياسات
          على تحسين المحتوى والموثوقية، ولا تُستخدم لطلب بيانات الدفع أو معلومات
          الهوية الحساسة. وقد تعالج Google بيانات الاستخدام وفق سياساتها.
        </p>
        <p>
          للاستفسار عن الخصوصية، استخدم وسيلة التواصل المنشورة في الموقع.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
