import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("ko");

export default function KoreanContactPage() {
  return <ContactPageView locale="ko" />;
}
