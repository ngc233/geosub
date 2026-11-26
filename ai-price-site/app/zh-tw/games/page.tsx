import type { Metadata } from "next";
import GamesDirectoryPage, {
  getGamesDirectoryMetadata,
} from "../../../components/games/GamesDirectoryPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...getGamesDirectoryMetadata("zh-tw"),
  robots: { index: false, follow: false },
};

export default function ZhTwGamesPage() {
  return <GamesDirectoryPage locale="zh-tw" />;
}
