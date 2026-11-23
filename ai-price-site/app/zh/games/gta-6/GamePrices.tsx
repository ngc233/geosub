import Image from "next/image";
import { useState } from "react";
import { ChevronDown, Coins, FileText, Search } from "lucide-react";
import { PublicDialog, PublicSegments } from "@/components/PublicControls";
import {
  currencies,
  localMoney,
  markets,
  names,
  signs,
  type GameOffer,
  type Selection,
  type GameResponse,
} from "@/lib/game-offers";
import { useGameOffers } from "./use-game-offers";

export const marketLabel = { HK: "港服", US: "美服" };
export const storeNames = { ps5: "PlayStation Store", xbox: "Xbox 商店", pc: "PC" };
export function statusLabel(row?: GameOffer) {
  if (row?.status === "unavailable") return "当前网页无法购买";
  if (row?.status === "stale_expired") return "暂未获取到最新报价";
  return "待核验";
}
const words = { HK: "香港 港服 HK hong kong", US: "美国 美國 美服 US usa united states" };
const dateText = (value: string) => value.slice(0, 10).replaceAll("-", ".");
function GameSources({
  selection,
  rows,
  data,
}: {
  selection: Selection;
  rows: GameOffer[];
  data: GameResponse | null;
}) {
  const other = selection.platform === "ps5" ? "xbox" : "ps5";
  const additional = useGameOffers({ ...selection, platform: other }, null);
  return (
    <>
      <p>选择官方商店可查看对应地区和版本，核价时间见各区明细。</p>
      <div className="game-source-list">
        {(["ps5", "xbox"] as const).map((platform) => {
          const offers = platform === selection.platform ? rows : additional.data?.full_games;
          if (!offers?.length) return null;
          return markets.map((market) => (
            <div key={platform + market}>
              <strong>
                {storeNames[platform]} · {names[market]}
              </strong>
              {offers
                .filter((row) => row.market === market)
                .map((row) => (
                  <a key={row.store_product_id} href={row.store_url} target="_blank" rel="noreferrer">
                    {names[row.edition]}
                  </a>
                ))}
            </div>
          ));
        })}
      </div>
      {!additional.data && (
        <p role="status">
          {additional.error
            ? storeNames[other] + "的来源暂未获取。"
            : "正在读取" + storeNames[other] + "的来源…"}
        </p>
      )}
      <p>{data?.fx_as_of ? "汇率基准日期 " + dateText(data.fx_as_of) : "汇率暂缺"}</p>
      <a href="https://www.rockstargames.com/VI/media/artwork-wallpapers" target="_blank" rel="noreferrer">
        查看 Rockstar 官方原画
      </a>
    </>
  );
}
type Props = {
  selection: Selection;
  change: (diff: Partial<Selection>) => void;
  rows: GameOffer[];
  data: GameResponse | null;
  error: boolean;
  query: string;
  setQuery: (q: string) => void;
};

export default function GamePrices({ selection: s, change, rows, data, error, query, setQuery }: Props) {
  const [filters, setFilters] = useState(s.region !== "all");
  const [dialog, setDialog] = useState<"sources" | "currency" | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const items = rows.filter(
    (r) =>
      r.edition === s.edition &&
      (s.region === "all" || r.market === s.region) &&
      words[r.market].toLowerCase().includes(query.trim().toLowerCase()),
  );
  const valid = items.filter((r) => r.price);
  const reference = valid.find((r) => r.market === "US")?.price?.converted_public_price;
  const comparable = valid.length === 2 && valid.every((r) => r.price?.converted_public_price != null);
  if (comparable)
    items.sort((a, b) => Number(a.price!.converted_public_price) - Number(b.price!.converted_public_price));
  const min =
    comparable && items[0].price!.converted_public_price !== items[1].price!.converted_public_price
      ? items[0]
      : null;
  const amount = (value: number) => signs[s.currency] + value.toFixed(2);
  const gap = (value: string) => Math.round(Number(reference) * 100) - Math.round(Number(value) * 100);
  let summary;
  if (!data) summary = error ? "暂未获取到最新报价。" : "正在读取官方报价…";
  else if (!items.length) summary = "没有匹配的地区。";
  else if (!valid.length) summary = "暂未获取到最新报价。";
  else if (valid.length === 1) {
    const r = valid[0],
      price = r.price!;
    summary =
      names[r.market] +
      "商店的" +
      names[s.edition] +
      "售价为 " +
      localMoney(r.currency, price.public_price) +
      (price.converted_public_price != null ? "，折合 " + amount(Number(price.converted_public_price)) : "") +
      (items.length > 1
        ? "；" + names[items.find((item) => item.market !== r.market)!.market] + "商店暂缺有效报价。"
        : "。");
  } else if (!comparable) summary = "已核验 2 个地区，汇率暂缺。";
  else if (!min) summary = "已核验 2 个地区，两区折合价格相同。";
  else if (min.market === "US") summary = "已核验 2 个地区，美国最低。";
  else
    summary = (
      <>
        已核验 2 个地区，香港最低，比美国约省{" "}
        <strong>{amount(gap(min.price!.converted_public_price!) / 100)}</strong>。
      </>
    );
  const availableDates = new Set(
    items.map((r) => r.verified_at && dateText(new Date(r.verified_at).toISOString())),
  );
  const commonDate = availableDates.size === 1 && items[0]?.verified_at;
  return (
    <section id="regions" className="game-prices" aria-labelledby="plan-regions-title">
      <div className="quote-toolbar" id="prices">
        <h2 id="plan-regions-title">地区价格</h2>
        <div className="quote-actions">
          <button
            id="currency-trigger"
            data-gs-ui="button"
            aria-label="选择折算货币"
            aria-haspopup="dialog"
            onClick={() => setDialog("currency")}
          >
            <Coins size={15} />
            <b>
              {signs[s.currency]} {s.currency}
            </b>
            <ChevronDown size={14} />
          </button>
          <button
            className="quote-filter-button"
            aria-controls="quote-filters"
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
          >
            {s.region !== "all" || query ? "已筛选" : "筛选"}
          </button>
        </div>
      </div>
      <div className="gs-plan-filters" id="quote-filters" hidden={!filters}>
        <PublicSegments
          label="地区价格筛选"
          value={s.region}
          options={[
            { value: "all", label: "全部地区" },
            ...markets.map((m) => ({ value: m, label: names[m] })),
          ]}
          onChange={(v) => {
            setQuery("");
            change({ region: v as Selection["region"] });
          }}
        />
        <label className="gs-plan-search" data-gs-input>
          <Search size={16} />
          <input
            type="search"
            aria-label="找地区"
            placeholder="找地区"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="quote-summary" id="quote-summary" role="status">
        <span id="quote-selection">
          {names[s.platform]} · {names[s.edition]}
        </span>{" "}
        · <span id="quote-insight">{summary}</span>
      </p>
      <div className="quote-sheet">
        <table aria-label="各地区官方商店数字版售价">
          <thead>
            <tr>
              <th scope="col">商店地区</th>
              <th scope="col" className="quote-local-head">
                当地售价
              </th>
              <th scope="col">折合{names[s.currency]}</th>
              <th scope="col">购买渠道</th>
            </tr>
          </thead>
          {items.map((row) => {
            const { market, price } = row,
              local = price ? localMoney(row.currency, price.public_price) : statusLabel(row);
            const converted = price?.converted_public_price,
              detail = open.includes(market);
            const pct =
              comparable && reference != null && Number(reference) > 0 && converted != null
                ? Math.round((100 * gap(converted)) / Math.round(Number(reference) * 100))
                : null;
            const savings = market !== "US" && pct != null && pct > 0;
            const note =
              market === "US" && price
                ? "美国基准"
                : savings
                  ? "比美国低 " + pct + "%"
                  : pct != null && pct < 0
                    ? "比美国高 " + Math.abs(pct) + "%"
                    : "";
            return (
              <tbody key={market} data-code={market} className={min === row ? "lowest-offer" : undefined}>
                <tr className="quote-main">
                  <th scope="row">
                    <button
                      className="region-disclosure"
                      aria-label={"查看" + names[market] + "报价依据"}
                      aria-expanded={detail}
                      aria-controls={"details-" + market}
                      onClick={() =>
                        setOpen((v) => (v.includes(market) ? v.filter((m) => m !== market) : [...v, market]))
                      }
                    >
                      <Image
                        unoptimized
                        width={27}
                        height={19}
                        className="quote-flag"
                        src={"/games/gta-6/" + market.toLowerCase() + ".svg"}
                        alt=""
                      />
                      <span>
                        <strong>{names[market]}</strong>
                        <small className="region-en" lang="en">
                          {market === "HK" ? "Hong Kong" : "United States"}
                        </small>
                        <small className="mobile-local">{local}</small>
                      </span>
                      <span className="quote-caret" aria-hidden />
                    </button>
                  </th>
                  <td className="quote-local">{local}</td>
                  <td className="quote-fx">
                    <strong>{converted != null ? amount(Number(converted)) : "—"}</strong>
                    {note && <small className={savings ? "saving" : undefined}>{note}</small>}
                  </td>
                  <td>
                    <a
                      className="shop-link"
                      href={row.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={"前往" + names[market] + names[s.platform] + names[s.edition] + "官方商店"}
                    >
                      <span className="store-full">{storeNames[s.platform]}</span>
                      <span className="store-small">{s.platform === "ps5" ? "PS 商店" : "Xbox 商店"}</span>
                    </a>
                  </td>
                </tr>
                <tr className="quote-detail" id={"details-" + market} hidden={!detail}>
                  <td colSpan={4}>
                    <ul>
                      <li>
                        来源{" "}
                        <strong>
                          {storeNames[s.platform]} · {names[s.edition]}
                        </strong>
                      </li>
                      <li>
                        {row.status === "stale_grace" ? "上次核价" : "核价"}{" "}
                        {row.verified_at ? (
                          <time dateTime={row.verified_at}>
                            {dateText(new Date(row.verified_at).toISOString())}
                          </time>
                        ) : (
                          "待核验"
                        )}
                      </li>
                      {converted != null && row.currency !== s.currency && data?.fx_as_of && (
                        <li>汇率 {dateText(data.fx_as_of)}</li>
                      )}
                      {row.tax_included != null && <li>{row.tax_included ? "已含税" : "税前标价"}</li>}
                      {price?.base_price && price.base_price !== price.public_price && (
                        <li>原价 {localMoney(row.currency, price.base_price)}</li>
                      )}
                      {price?.member_price && (
                        <li>
                          {price.member_tier} 会员价 {localMoney(row.currency, price.member_price)}
                        </li>
                      )}
                    </ul>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
        {data && !items.length && (
          <p id="empty-rows">
            没有匹配的地区。{" "}
            <button
              onClick={() => {
                setQuery("");
                change({ region: "all" });
              }}
            >
              清除筛选
            </button>
          </p>
        )}
        <div className="quote-foot">
          <span>{items.length} 个地区</span>
          {items.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {commonDate ? "核价 " + dateText(new Date(commonDate).toISOString()) : "核价时间见各区明细"}
              </span>
            </>
          )}
          <button data-gs-ui="button" onClick={() => setDialog("sources")} aria-haspopup="dialog">
            <FileText size={15} />
            报价来源
          </button>
        </div>
      </div>
      {dialog === "currency" && (
        <PublicDialog label="显示货币" variant="currency" onClose={() => setDialog(null)}>
          <div className="gs-drawer-nav game-currency-options">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                data-gs-ui="button"
                data-currency={c}
                aria-pressed={s.currency === c}
                data-gs-initial-focus={s.currency === c || undefined}
                onClick={() => {
                  change({ currency: c });
                  setDialog(null);
                }}
              >
                {names[c]}　{c}
              </button>
            ))}
          </div>
        </PublicDialog>
      )}
      {dialog === "sources" && (
        <PublicDialog label="报价来源" variant="currency" onClose={() => setDialog(null)}>
          <GameSources selection={s} rows={rows} data={data} />
        </PublicDialog>
      )}
    </section>
  );
}
