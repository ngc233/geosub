import type { Metadata } from "next";
import GamesDirectoryPage, {
  getGamesDirectoryMetadata,
} from "../../../components/games/GamesDirectoryPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...getGamesDirectoryMetadata("zh"),
  robots: { index: false, follow: false },
};

export default function ZhGamesPage() {
  return <GamesDirectoryPage locale="zh" />;
}
