import type { Metadata } from "next";
import ArabicInfoPage from "../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "مصادر البيانات",
  description:
    "تعرّف إلى مصادر أسعار GeoSub وأسعار الصرف والمعلومات الضريبية وطريقة التحقق منها.",
};

export default function ArabicDataSourcesPage() {
  return (
    <ArabicInfoPage
      eyebrow="مصادر البيانات"
      title="من أين تأتي الأسعار؟"
      description="نوضح مصدر كل قيمة مع تاريخ جمعها ودرجة موثوقيتها حتى تكون المقارنة قابلة للفهم والتحقق."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          تعتمد المقارنات العامة حالياً على أسعار الاشتراكات الإقليمية المنشورة
          في App Store بعد مراجعتها. ولا تُدمج أسعار الموقع الرسمي أو Google
          Play في ترتيب App Store.
        </p>
        <p>
          نحتفظ بالمبلغ والعملة والمنطقة والباقة وتاريخ الجمع كلٌ على حدة.
          وتُعزل القيم غير المعتادة أو أخطاء العملة والفاصلة العشرية ودورة
          الفوترة للمراجعة التلقائية بدلاً من نشرها.
        </p>
        <p>
          تُحسب قيم USD وCNY بسعر الصرف المؤرخ في الصفحة. والمعلومات الضريبية
          إرشادية؛ لا يضيف GeoSub ضريبة أخرى إلى السعر الظاهر في App Store.
        </p>
        <p className="text-zinc-500">
          قد تتغير الأسعار والتوفر. ويظل المبلغ النهائي والضرائب وشروط الشراء
          في شاشة الدفع الرسمية هي المرجع المعتمد.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
