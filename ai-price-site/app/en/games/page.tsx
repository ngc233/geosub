import type { Metadata } from "next";
import GamesDirectoryPage, {
  getGamesDirectoryMetadata,
} from "../../../components/games/GamesDirectoryPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...getGamesDirectoryMetadata("en"),
  robots: { index: false, follow: false },
};

export default function EnGamesPage() {
  return <GamesDirectoryPage locale="en" />;
}
