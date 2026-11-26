import type { Metadata } from "next";
import GamesDirectoryPage, {
  getGamesDirectoryMetadata,
} from "../../../components/games/GamesDirectoryPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...getGamesDirectoryMetadata("es"),
  robots: { index: false, follow: false },
};

export default function EsGamesPage() {
  return <GamesDirectoryPage locale="es" />;
}
