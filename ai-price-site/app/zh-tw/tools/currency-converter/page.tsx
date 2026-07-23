import CurrencyConverterPage, {
  getCurrencyConverterMetadata,
} from "../../../../components/CurrencyConverterPage";

export const dynamic = "force-dynamic";
export const metadata = getCurrencyConverterMetadata("zh-tw");

export default function Page() {
  return <CurrencyConverterPage locale="zh-tw" />;
}
