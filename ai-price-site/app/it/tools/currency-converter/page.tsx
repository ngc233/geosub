import CurrencyConverterPage, {
  getCurrencyConverterMetadata,
} from "../../../../components/CurrencyConverterPage";

export const dynamic = "force-dynamic";
export const metadata = getCurrencyConverterMetadata("it");

export default function Page() {
  return <CurrencyConverterPage locale="it" />;
}
