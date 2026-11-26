import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("en");

export default function EnglishContactPage() {
  return <ContactPageView locale="en" />;
}
