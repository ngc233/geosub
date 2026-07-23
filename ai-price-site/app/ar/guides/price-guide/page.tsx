import type { Metadata } from "next";
import ArabicInfoPage from "../../../../components/ArabicInfoPage";

export const metadata: Metadata = {
  title: "دليل قراءة الأسعار الإقليمية",
  description:
    "كيف تفهم السعر المحلي والتحويل إلى الدولار والفرق الإقليمي والتواريخ المعروضة.",
};

export default function ArabicPriceGuidePage() {
  return (
    <ArabicInfoPage
      eyebrow="دليل الأسعار"
      title="كيف تقرأ مقارنة الأسعار؟"
      description="لا يكفي النظر إلى أقل رقم؛ اقرأ العملة ودورة الفوترة والتاريخ والضرائب معاً."
    >
      <div className="space-y-6 text-sm leading-8 text-zinc-600">
        <p>
          السعر المحلي هو المبلغ المنشور للمنطقة. أما قيمته بالدولار فهي وسيلة
          للمقارنة بين العملات وليست سعراً جديداً تفرضه المنصة.
        </p>
        <p>
          يوضح تاريخ جمع السعر متى شوهد المبلغ، بينما يوضح تاريخ سعر الصرف متى
          حُسبت القيمة المحوّلة. ويجب قراءة التاريخين بصورة مستقلة.
        </p>
        <p>
          قد يشير السعر المنخفض إلى استراتيجية تسعير إقليمية، لكنه لا يضمن أن
          حساباً من منطقة أخرى يستطيع إتمام الدفع بذلك السعر.
        </p>
      </div>
    </ArabicInfoPage>
  );
}
