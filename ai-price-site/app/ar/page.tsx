import type { Metadata } from "next";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata: Metadata = {
  title: "أسعار الاشتراكات الرقمية حول العالم",
  description: "قارن اشتراكات الذكاء الاصطناعي وخدمات البث حسب الدولة والمنطقة، مع السعر المحلي ومعلومات الضرائب وسياق القوة الشرائية.",
};

export default function ArabicPage() {
  return <LocalizedHomepagePage locale="ar" />;
}
