import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("ja");

export default function JapaneseContactPage() {
  return <ContactPageView locale="ja" />;
}
