import type { Metadata } from "next";
import ContactPageView, {
  getContactPageMetadata,
} from "../../../components/contact/ContactPageView";

export const metadata: Metadata = getContactPageMetadata("es");

export default function SpanishContactPage() {
  return <ContactPageView locale="es" />;
}
