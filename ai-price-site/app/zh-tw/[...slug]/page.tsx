import {
  getTraditionalChineseInfoMetadata,
  TraditionalChineseInfoPage,
} from "../../../components/TraditionalChinesePages";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props) {
  return getTraditionalChineseInfoMetadata((await params).slug);
}

export default async function Page({ params }: Props) {
  return <TraditionalChineseInfoPage segments={(await params).slug} />;
}
