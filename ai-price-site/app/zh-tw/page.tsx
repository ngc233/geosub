import { traditionalChineseHomeMetadata } from "../../components/TraditionalChinesePages";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata = traditionalChineseHomeMetadata;

export default function Page() {
  return <LocalizedHomepagePage locale="zh-tw" />;
}
