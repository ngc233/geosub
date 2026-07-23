import type { Metadata } from "next";
import ArabicInfoPage from "../../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "دليل الدفع والحساب",
  description:
    "ما الذي يجب التحقق منه قبل محاولة الاشتراك في خدمة رقمية من منطقة مختلفة؟",
};

export default function ArabicPaymentGuidePage() {
  return (
    <ArabicInfoPage
      eyebrow="الدفع والحساب"
      title="تحقّق من شروط الدفع قبل الاشتراك"
      description="لا يعني ظهور سعر في منطقة ما أن كل حساب يستطيع استخدامه."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          قد تتحقق المنصة من بلد أو منطقة الحساب ووسيلة الدفع وعنوان الفوترة
          وتوفر الخدمة محلياً. وقد تؤثر هذه الشروط في إمكانية إتمام العملية.
        </p>
        <p>
          لا يشجع GeoSub على تجاوز قواعد المنصة. استخدم الأسعار لفهم الفروق
          الإقليمية، ثم راجع الشروط والمبلغ النهائي في شاشة الدفع الرسمية.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
