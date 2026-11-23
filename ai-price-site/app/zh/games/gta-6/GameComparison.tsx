"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { PublicSegments } from "@/components/PublicControls";
import {
  currentOffer,
  defaults,
  editions,
  localMoney,
  markets,
  names,
  selectionFrom,
  type GameResponse,
  type Selection,
} from "@/lib/game-offers";
import { useGameOffers } from "./use-game-offers";
import GamePrices, { marketLabel, statusLabel, storeNames } from "./GamePrices";

const platformOptions = [
  { value: "ps5", label: "PS5" },
  { value: "xbox", label: "Xbox" },
  {
    value: "pc",
    label: (
      <>
        PC<small className="pc-caption">尚未官宣</small>
      </>
    ),
  },
];
const editionOptions = editions.map((e) => ({ value: e, label: names[e] }));
function selectionUrl(state: Selection, anchor?: string) {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults) as (keyof Selection)[])
    if (state[key] !== defaults[key]) params.set(key, state[key]);
  return "/zh/games/gta-6" + (params.size ? "?" + params : "") + (anchor ? "#" + anchor : "");
}
function jump(id: string) {
  requestAnimationFrame(() => {
    const section = document.getElementById(id);
    if (!section) return;
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  });
}
export default function GameComparison({
  initial,
  initialData,
}: {
  initial: Selection;
  initialData: GameResponse | null;
}) {
  const [s, setSelection] = useState(initial),
    [query, setQuery] = useState("");
  const { data, now, error } = useGameOffers(s, initialData);
  const bar = useRef<HTMLElement>(null),
    menu = useRef<HTMLDetailsElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false),
    [section, setSection] = useState("regions");
  const pc = s.platform === "pc",
    label = names[s.platform] + (pc ? " · 尚未官宣" : " · " + names[s.edition]);
  const rows = data?.full_games.map((r) => currentOffer(r, now, data)) ?? [];
  const upgrade = data?.upgrades
    .map((r) => currentOffer(r, now, data))
    .find((r) => r.market === s.editionRegion);
  const pair = editions.map((e) => rows.find((r) => r.edition === e && r.market === s.editionRegion));
  const gap =
    pair[0]?.price && pair[1]?.price
      ? Math.round(Number(pair[1].price.public_price) * 100) -
        Math.round(Number(pair[0].price.public_price) * 100)
      : null;
  function change(diff: Partial<Selection>, anchor?: string) {
    const next = { ...s, ...diff };
    const url = selectionUrl(next, anchor ?? (diff.platform === undefined ? location.hash.slice(1) : ""));
    if (url !== location.pathname + location.search + location.hash) history.pushState(null, "", url);
    setSelection(next);
    if (anchor) jump(anchor);
  }
  function closeMenu(focus = false) {
    if (!menu.current?.open) return;
    menu.current.open = false;
    if (focus) menu.current.querySelector("summary")?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const back = () => {
      setSelection(selectionFrom(new URLSearchParams(location.search)));
      setQuery("");
    };
    const outside = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) closeMenu();
    };
    window.addEventListener("popstate", back);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("popstate", back);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  useLayoutEffect(() => {
    const header = document.querySelector("header.gs-header");
    const measure = () => {
      if (!bar.current || !frame.current) return;
      const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
      const inset = top + bar.current.offsetHeight + 8;
      frame.current.style.setProperty("--chapter-top", top + "px");
      frame.current.style.setProperty("--chapter-inset", inset + "px");
      const fixed = bar.current.getBoundingClientRect().top <= top + 1;
      setPinned(fixed);
      if (!fixed) closeMenu();
      const ids = pc ? ["pc-state", "guide"] : ["regions", "editions", "guide"];
      setSection(
        ids
          .filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= inset + 5)
          .at(-1) ?? ids[0],
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (header) ro.observe(header);
    if (bar.current) ro.observe(bar.current);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [pc]);
  function selectors(sticky: boolean) {
    function select(field: "platform" | "edition", v: string) {
      if (sticky && (field === "edition" || v === "pc")) closeMenu(true);
      const destination =
        sticky && field === "platform" && section !== "guide" && (v === "pc" || pc)
          ? v === "pc"
            ? "pc-state"
            : "regions"
          : undefined;
      change({ [field]: v }, destination);
    }
    return (
      <>
        <div className="game-field">
          <span className="field-label">游戏平台</span>
          <PublicSegments
            label="游戏平台"
            options={platformOptions}
            value={s.platform}
            onChange={(v) => select("platform", v)}
          />
        </div>
        {!pc && (
          <div className="game-field">
            <span className="field-label">游戏版本</span>
            <PublicSegments
              label="游戏版本"
              options={editionOptions}
              value={s.edition}
              onChange={(v) => select("edition", v)}
            />
          </div>
        )}
      </>
    );
  }
  return (
    <div className="gs-public-unified gs-plan-scope game-scope" ref={frame}>
      <div className="gs-plan-page game-page" id="top">
        <nav className="gs-plan-breadcrumb" aria-label="面包屑">
          <a href="/zh">首页</a>
          <span aria-hidden>/</span>
          <span>游戏比价</span>
          <span aria-hidden>/</span>
          <span>GTA 6</span>
        </nav>
        <header className="game-profile">
          <Image
            unoptimized
            className="game-cover"
            src="/games/gta-6/cover.webp"
            width={128}
            height={186}
            alt="《Grand Theft Auto VI》官方封面"
            fetchPriority="high"
          />
          <div className="game-identity">
            <h1>GTA 6</h1>
            <p className="game-english" lang="en">
              Grand Theft Auto VI
            </p>
            <p className="game-meta">
              <span>Rockstar Games</span>
              <span>
                <time dateTime="2026-11-19">2026.11.19</time> 主机发售
              </span>
            </p>
          </div>
          <div className="game-selectors">{selectors(false)}</div>
        </header>
        <nav ref={bar} className={"game-chapters" + (pinned ? " pinned" : "")} aria-label="本页内容">
          {(pc
            ? [
                ["pc-state", "平台状态"],
                ["guide", "购买前须知"],
              ]
            : [
                ["regions", "各区价格"],
                ["editions", "版本区别"],
                ["guide", "购买前须知"],
              ]
          ).map(([id, title]) => (
            <a key={id} href={"#" + id} aria-current={section === id ? "location" : undefined}>
              {title}
            </a>
          ))}
          <details
            ref={menu}
            className="chapter-context"
            id="chapter-switcher"
            onBlur={(e) => {
              if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) closeMenu();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeMenu(true);
              }
            }}
          >
            <summary aria-label={"切换平台和版本，当前 " + label}>
              <span>{label}</span>
              <i className="switch-caret" aria-hidden />
            </summary>
            <div className="switch-menu" role="group" aria-label="切换平台和版本">
              {selectors(true)}
            </div>
          </details>
        </nav>
        {pc ? (
          <section id="pc-state" className="gs-plan-panel gs-plan-fit">
            <div className="gs-plan-fit-summary">
              <h2>PC 版尚未官宣</h2>
              <p>
                截至 2026 年 11 月 23 日，Rockstar 仅公布 PS5 和 Xbox Series X|S 版。PC
                版价格与发售日期待公布。
              </p>
            </div>
            <div className="gs-plan-options">
              <a href="https://www.rockstargames.com/VI">查看 Rockstar 官网</a>
              <div className="pc-quotes">
                {(["ps5", "xbox"] as const).map((p) => (
                  <button
                    key={p}
                    data-gs-ui="button"
                    data-console={p}
                    onClick={() => {
                      setQuery("");
                      change({ platform: p, region: "all" }, "regions");
                    }}
                  >
                    查看 {names[p]} 报价
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            <GamePrices
              selection={s}
              change={change}
              rows={rows}
              data={data}
              error={error}
              query={query}
              setQuery={setQuery}
            />
            <section id="editions" className="edition-section" aria-labelledby="edition-title">
              <div className="edition-heading">
                <h2 id="edition-title">版本区别</h2>
                <div className="edition-region">
                  <span>商店地区</span>
                  <PublicSegments
                    label="版本对照地区"
                    options={markets.map((m) => ({ value: m, label: names[m] }))}
                    value={s.editionRegion}
                    onChange={(v) => change({ editionRegion: v as Selection["editionRegion"] })}
                  />
                </div>
              </div>
              <p className="edition-summary">
                <span id="edition-context">
                  {names[s.editionRegion]} {names[s.platform]} 数字版
                </span>
                {gap != null && (
                  <>
                    <i aria-hidden>·</i>
                    <span className="edition-premium">
                      {gap === 0 ? "两版同价" : gap > 0 ? "终极版贵 " : "终极版低 "}
                      {gap !== 0 && (
                        <strong>{localMoney(pair[0]!.currency, (Math.abs(gap) / 100).toFixed(2))}</strong>
                      )}
                    </span>
                  </>
                )}
              </p>
              <div className="edition-sheet">
                <div className="edition-pair">
                  {editions.map((e, index) => {
                    const row = pair[index],
                      verb = row?.price ? "买" : "查看";
                    return (
                      <article
                        key={e}
                        className="edition-option"
                        aria-current={s.edition === e ? true : undefined}
                      >
                        <h3>
                          {names[e]}
                          <span className="edition-mark">当前所选</span>
                        </h3>
                        <p className="edition-cost">
                          {row?.price
                            ? localMoney(row.currency, row.price.public_price)
                            : data
                              ? statusLabel(row)
                              : "—"}
                        </p>
                        <p className="edition-includes">
                          {e === "standard"
                            ? "游戏本体，包含杰森与露西亚的完整故事。"
                            : "完整故事，另含专属载具、服饰和额外任务。"}
                        </p>
                        <div className="edition-actions">
                          {row && (
                            <a
                              className="edition-buy"
                              data-buy={e}
                              href={row.store_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-describedby="edition-context"
                            >
                              <span className="buy-desktop">
                                {verb} {names[s.platform]} {marketLabel[s.editionRegion]}
                                {names[e]}
                              </span>
                              <span className="buy-mobile">
                                {verb}
                                {marketLabel[s.editionRegion]}
                                {names[e]}
                              </span>
                            </a>
                          )}
                          <a
                            className="edition-compare"
                            aria-label={"查看" + names[e] + "各区报价"}
                            href={selectionUrl({ ...s, edition: e, region: "all" }, "regions")}
                            onClick={(ev) => {
                              if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
                              ev.preventDefault();
                              setQuery("");
                              change({ edition: e, region: "all" }, "regions");
                            }}
                          >
                            查看各区报价
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="upgrade-note">
                  <div>
                    <h3>已有游戏本体？</h3>
                    <p>
                      {names[s.editionRegion]} {storeNames[s.platform]} 的
                      {upgrade?.price
                        ? "终极版升级包售价为 " + localMoney(upgrade.currency, upgrade.price.public_price)
                        : upgrade?.status === "unavailable"
                          ? "升级包页面显示「无法购买」"
                          : "升级包暂缺有效报价"}
                      。
                    </p>
                  </div>
                  {upgrade && (
                    <a href={upgrade.store_url} target="_blank" rel="noreferrer">
                      查看 {names[s.platform]} 升级包
                    </a>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
        <section className="game-guide" id="guide">
          <h2>购买前须知</h2>
          <div className="guide-questions">
            {[
              ["应该看哪个商店地区？", "按主机账号的商店地区查看报价，结账前核对平台是否接受你的付款方式。"],
              [
                "折算价和结账金额会有差别吗？",
                "参考价按站内最近可用汇率折算，实际金额还取决于结账税费和付款机构采用的汇率。",
              ],
              [
                "PS5 和 Xbox 的数字版可以通用吗？",
                "请购买对应主机平台的版本。PlayStation Store 的游戏适用于 PS5，Xbox 商店的游戏适用于 Xbox Series X|S。",
              ],
              [
                "PC 版什么时候发售？",
                "截至 2026 年 11 月 23 日，Rockstar 尚未公布原生 PC 版的发售日期和售价。",
              ],
            ].map(([q, answer]) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown aria-hidden />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
