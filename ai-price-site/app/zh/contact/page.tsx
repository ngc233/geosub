import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("zh");

export default function ContactPage() {
  return <ContactPageView locale="zh" />;
}
