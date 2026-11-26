import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("zh-tw");

export default function TraditionalChineseContactPage() {
  return <ContactPageView locale="zh-tw" />;
}
