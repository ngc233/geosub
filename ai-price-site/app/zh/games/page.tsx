import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandIcon from "../../../components/BrandIcon";
import PublicIcon from "../../../components/PublicIcon";
import { localMoney, names } from "../../../lib/game-offers";
import { savingsPercent } from "../../../lib/homepage-display";
import { readGta6OfferSummary } from "../../../lib/read-game-offers";
import { isGta6NavigationPublished } from "../../../lib/site-navigation";
import "../../public-listing.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "游戏比价", robots: { index: false, follow: false } };

const gta6 = { slug: "gta-6", name: "GTA 6" };
const gamePath = `/zh/games/${gta6.slug}`;

export default async function GamesPage() {
  if (!(await isGta6NavigationPublished())) notFound();
  const { comparisons } = await readGta6OfferSummary();

  return (
    <main className="gs-public-unified gs-listing gs-game-listing">
      <div className="gs-listing-intro">
        <h1>游戏比价</h1>
        <p>查看 PS5 和 Xbox 的港服、美服公开售价。</p>
      </div>
      <div className="gs-listing-grid">
        <article className="gs-listing-card" aria-labelledby="game-title" data-gs-motion-card>
          <header className="gs-listing-card-head">
            <div className="gs-listing-brandline">
              <BrandIcon product={gta6} className="gs-listing-brand" decorative />
              <div className="gs-listing-description-wrap">
                <div className="gs-listing-card-name"><h2 id="game-title">{gta6.name}</h2></div>
                <p className="gs-listing-card-description" lang="en">Grand Theft Auto VI</p>
              </div>
            </div>
          </header>
          <div className="gs-listing-tablewrap">
            <table className="gs-listing-table" aria-label="GTA 6 各版本价格">
              <thead><tr><th scope="col">平台 / 版本</th><th scope="col">港服</th><th scope="col">美服</th><th scope="col">比美服</th></tr></thead>
              <tbody>
                {comparisons.map(({ platform, edition, hongKong, us, ratio }) => {
                  const comparison = ratio === null ? "—" : ratio === 0 ? "持平" : `${ratio > 0 ? "低" : "高"} ${savingsPercent(ratio)}%`;
                  return (
                    <tr key={`${platform}:${edition}`}>
                      <td><Link href={`${gamePath}?platform=${platform}&edition=${edition}#regions`} className="gs-game-listing-version" prefetch={false}>
                        <strong>{names[platform]}</strong><span>{names[edition]}</span>
                      </Link></td>
                      <td>{hongKong ? <span className="gs-listing-value">{localMoney("HKD", hongKong)}</span> : "待核验"}</td>
                      <td>{us ? <span className="gs-listing-value">{localMoney("USD", us)}</span> : "待核验"}</td>
                      <td className="gs-listing-comparison"><span className={ratio === null || ratio === 0 ? undefined : ratio > 0 ? "is-low" : "is-high"}>{comparison}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="gs-listing-card-foot">
            <span className="gs-listing-updated">同平台、同版本，按汇率折算比较</span>
            <Link href={gamePath} className="gs-listing-detail" prefetch={false}>地区价格 <PublicIcon name="ArrowRight" size={16} /></Link>
          </div>
        </article>
      </div>
    </main>
  );
}
