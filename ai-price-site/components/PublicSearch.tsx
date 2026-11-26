"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  resolveCanvasLocale,
  type CanvasLocale,
} from "../lib/canvas-ui-copy";
import {
  type ChromePopularItem,
  type ChromeSearchResult,
} from "../lib/public-chrome-search";
import { PublicDialog } from "./PublicControls";
import PublicIcon from "./PublicIcon";
import { useSearchDisplayCurrency } from "./PublicCurrencySelect";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageProductMark from "./HomepageProductMark";
import HomepageCountryFlag from "./HomepageCountryFlag";

type FallbackSuggestion =
  | { term: string; logoSlug: string }
  | { term: string; countryCode: string };

const searchCopy: Record<
  CanvasLocale,
  {
    search: string;
    triggerPlaceholder: string;
    heroAria: string;
    stateAria: string;
    heroPlaceholder: string;
    label: string;
    placeholder: string;
    clear: string;
    close?: string;
    pending: string;
    empty: string;
    failed: string;
    results: string;
    groups: { product: string; plan: string; country: string };
    retry: string;
    popularTitle: string;
    suggestions: string;
    fallbackSuggestions: readonly FallbackSuggestion[];
    contact: string;
    helpSelect: string;
    helpOpen: string;
    helpClose: string;
  }
> = {
  zh: {
    search: "搜索",
    triggerPlaceholder: "搜产品 / 地区",
    heroAria: "首页搜索产品或国家",
    stateAria: "查找产品或国家",
    heroPlaceholder: "搜 ChatGPT、Netflix，或者土耳其",
    label: "搜索产品或国家",
    placeholder: "搜索产品、游戏或国家（如 ChatGPT、GTA 6、土耳其）",
    clear: "清空输入",
    close: undefined,
    pending: "正在搜索…",
    empty: "没有找到可显示最低价的结果，试试其他产品或国家名称",
    failed: "搜索暂时不可用，请重试",
    results: "搜索结果",
    groups: { product: "产品", plan: "套餐", country: "国家" },
    retry: "重试",
    popularTitle: "热门浏览",
    suggestions: "搜索建议",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "印度", countryCode: "IN" },
    ],
    contact: "联系我们",
    helpSelect: "选择",
    helpOpen: "打开",
    helpClose: "关闭",
  },
  "zh-tw": {
    search: "搜尋",
    triggerPlaceholder: "搜產品 / 地區",
    heroAria: "首頁搜尋產品或國家",
    stateAria: "搜尋產品或國家",
    heroPlaceholder: "搜 ChatGPT、Netflix 或土耳其",
    label: "搜尋產品或國家",
    placeholder: "搜尋產品、遊戲或國家（如 ChatGPT、GTA 6、土耳其）",
    clear: "清除輸入",
    close: "關閉搜尋",
    pending: "正在搜尋…",
    empty: "找不到可顯示最低價的結果，請試試其他產品或國家名稱",
    failed: "搜尋暫時無法使用，請重試",
    results: "搜尋結果",
    groups: { product: "產品", plan: "方案", country: "國家" },
    retry: "重試",
    popularTitle: "熱門瀏覽",
    suggestions: "搜尋建議",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "印度", countryCode: "IN" },
    ],
    contact: "聯絡我們",
    helpSelect: "選擇",
    helpOpen: "開啟",
    helpClose: "關閉",
  },
  en: {
    search: "Search",
    triggerPlaceholder: "Search…",
    heroAria: "Search products or countries",
    stateAria: "Search products or countries",
    heroPlaceholder: "Search ChatGPT, Netflix, or Turkey",
    label: "Search products or countries",
    placeholder: "Search products, games, or countries (e.g. ChatGPT, GTA 6, Turkey)",
    clear: "Clear query",
    close: "Close search",
    pending: "Searching…",
    empty: "No results with a price. Try another product or country name.",
    failed: "Search is temporarily unavailable. Please try again.",
    results: "Search results",
    groups: { product: "Products", plan: "Plans", country: "Countries" },
    retry: "Try again",
    popularTitle: "Popular",
    suggestions: "Search suggestions",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "India", countryCode: "IN" },
    ],
    contact: "Contact us",
    helpSelect: "Select",
    helpOpen: "Open",
    helpClose: "Close",
  },
  ja: {
    search: "検索",
    triggerPlaceholder: "検索…",
    heroAria: "サービスや国・地域を検索",
    stateAria: "サービスや国・地域を検索",
    heroPlaceholder: "ChatGPT、Netflix、トルコなどを検索",
    label: "サービスや国・地域を検索",
    placeholder: "サービス、ゲーム、国名で検索（例：ChatGPT、GTA 6、トルコ）",
    clear: "入力をクリア",
    close: "検索を閉じる",
    pending: "検索中…",
    empty: "該当する価格データが見つかりませんでした。別の名称でお試しください。",
    failed: "検索が一時的に利用できません。再度お試しください。",
    results: "検索結果",
    groups: { product: "サービス", plan: "プラン", country: "国・地域" },
    retry: "再試行",
    popularTitle: "人気の検索",
    suggestions: "検索候補",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "インド", countryCode: "IN" },
    ],
    contact: "お問い合わせ",
    helpSelect: "選択",
    helpOpen: "開く",
    helpClose: "閉じる",
  },
  ko: {
    search: "검색",
    triggerPlaceholder: "검색…",
    heroAria: "서비스 또는 국가 검색",
    stateAria: "서비스 또는 국가 검색",
    heroPlaceholder: "ChatGPT, Netflix 또는 튀르키예 검색",
    label: "서비스 또는 국가 검색",
    placeholder: "서비스, 게임 또는 국가 검색 (예: ChatGPT, GTA 6, 튀르키예)",
    clear: "입력 지우기",
    close: "검색 닫기",
    pending: "검색 중…",
    empty: "가격이 있는 결과를 찾지 못했습니다. 다른 서비스나 국가명을 입력해 보세요.",
    failed: "검색을 일시적으로 사용할 수 없습니다. 다시 시도해 주세요.",
    results: "검색 결과",
    groups: { product: "서비스", plan: "요금제", country: "국가" },
    retry: "다시 시도",
    popularTitle: "인기 탐색",
    suggestions: "추천 검색어",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "인도", countryCode: "IN" },
    ],
    contact: "문의하기",
    helpSelect: "선택",
    helpOpen: "열기",
    helpClose: "닫기",
  },
  es: {
    search: "Buscar",
    triggerPlaceholder: "Buscar…",
    heroAria: "Buscar servicios o países",
    stateAria: "Buscar servicios o países",
    heroPlaceholder: "Busca ChatGPT, Netflix o Turquía",
    label: "Buscar servicios o países",
    placeholder: "Busca servicios, juegos o países (ej. ChatGPT, GTA 6, Turquía)",
    clear: "Borrar búsqueda",
    close: "Cerrar búsqueda",
    pending: "Buscando…",
    empty: "No hay resultados con precio disponible. Prueba con otro servicio o país.",
    failed: "La búsqueda no está disponible temporalmente. Inténtalo de nuevo.",
    results: "Resultados de búsqueda",
    groups: { product: "Servicios", plan: "Planes", country: "Países" },
    retry: "Reintentar",
    popularTitle: "Populares",
    suggestions: "Sugerencias",
    fallbackSuggestions: [
      { term: "ChatGPT", logoSlug: "chatgpt" },
      { term: "Claude", logoSlug: "claude" },
      { term: "Netflix", logoSlug: "netflix" },
      { term: "India", countryCode: "IN" },
    ],
    contact: "Contacto",
    helpSelect: "Elegir",
    helpOpen: "Abrir",
    helpClose: "Cerrar",
  },
};

const turkeyNameByLocale: Record<CanvasLocale, string> = {
  zh: "土耳其",
  "zh-tw": "土耳其",
  en: "Turkey",
  ja: "トルコ",
  ko: "튀르키예",
  es: "Turquía",
};

function getDefaultPopularForLocale(locale: CanvasLocale): ChromePopularItem[] {
  return [
    { id: "pop-chatgpt", title: "ChatGPT", href: `/${locale}/ai-pricing/chatgpt`, logoSlug: "chatgpt" },
    { id: "pop-netflix", title: "Netflix", href: `/${locale}/streaming-pricing/netflix`, logoSlug: "netflix" },
    { id: "pop-claude", title: "Claude", href: `/${locale}/ai-pricing/claude`, logoSlug: "claude" },
    { id: "pop-yt", title: "YouTube Premium", href: `/${locale}/streaming-pricing/youtube-premium`, logoSlug: "youtube-premium" },
    { id: "pop-tr", title: turkeyNameByLocale[locale], href: `/${locale}/countries/turkey`, countryCode: "TR" },
  ];
}

// Module-level result cache for 0ms repeat-query feedback while still revalidating against /api/search.
const queryResultCache = new Map<string, ChromeSearchResult[]>();
let pendingSlashShortcut = false;
let activeHeaderShortcutCount = 0;

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (
      activeHeaderShortcutCount === 0 &&
      e.key === "/" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !(
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
      )
    ) {
      e.preventDefault();
      pendingSlashShortcut = true;
    }
  });
}

export default function PublicSearch({
  variant = "header",
  locale = "zh",
}: {
  variant?: "header" | "hero" | "state";
  locale?: CanvasLocale;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = searchCopy[resolvedLocale];
  const display = useSearchDisplayCurrency(canvasDefaultCurrency(resolvedLocale));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popular = getDefaultPopularForLocale(resolvedLocale);
  const [results, setResults] = useState<ChromeSearchResult[]>([]);
  const [status, setStatus] = useState<string>("");
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const router = useRouter();

  useEffect(() => {
    if (variant !== "header") return;
    activeHeaderShortcutCount += 1;
    if (pendingSlashShortcut) {
      pendingSlashShortcut = false;
      queueMicrotask(() => setOpen(true));
    }
    const shortcut = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(
          e.target instanceof HTMLElement &&
          (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
        )
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => {
      activeHeaderShortcutCount = Math.max(0, activeHeaderShortcutCount - 1);
      document.removeEventListener("keydown", shortcut);
    };
  }, [variant]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 1) return;
    const controller = new AbortController();
    const cacheKey = `${resolvedLocale}:${trimmed.toLowerCase()}`;
    (async () => {
      try {
        const response = await fetch(
          `/api/search?locale=${resolvedLocale}&view=chrome&q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        if (controller.signal.aborted) return;
        const nextResults: ChromeSearchResult[] = Array.isArray(data.results) ? data.results : [];
        if (nextResults.length > 0) queryResultCache.set(cacheKey, nextResults);
        else queryResultCache.delete(cacheKey);
        setResults(nextResults);
        setActive((prev) => (nextResults.length ? Math.min(prev, nextResults.length - 1) : 0));
        setStatus(nextResults.length ? "" : copy.empty);
      } catch {
        if (!controller.signal.aborted) {
          queryResultCache.delete(cacheKey);
          setResults([]);
          setStatus(copy.failed);
        }
      }
    })();
    return () => controller.abort();
  }, [query, open, retry, copy, resolvedLocale]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  const search = (value: string) => {
    setQuery(value);
    setActive(0);
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("");
      input.current?.focus();
      return;
    }
    const cached = queryResultCache.get(`${resolvedLocale}:${trimmed.toLowerCase()}`);
    if (cached && cached.length > 0) {
      setResults(cached);
      setStatus("");
    } else {
      setResults([]);
      setStatus(copy.pending);
    }
    setRetry((old) => old + 1);
    input.current?.focus();
  };

  const chooseHref = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const choose = (result: ChromeSearchResult) => chooseHref(result.href);

  return (
    <>
      {variant !== "header" ? (
        <form
          className="gs-home-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(true);
            search(query);
          }}
        >
          <label
            className="gs-field gs-home-search-field"
            onClick={() => setOpen(true)}
          >
            <PublicIcon name="Search" />
            <input
              aria-label={variant === "state" ? copy.stateAria : copy.heroAria}
              placeholder={copy.heroPlaceholder}
              value={query}
              maxLength={80}
              onChange={(e) => {
                const next = e.target.value;
                setOpen(true);
                search(next);
              }}
            />
            <kbd className="gs-home-search-kbd" aria-hidden="true">/</kbd>
          </label>
          <button type="submit" data-gs-ui="button">
            {copy.search}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="gs-search-trigger"
          aria-label={copy.label}
          onClick={() => setOpen(true)}
        >
          <PublicIcon name="Search" size={16} />
          <span className="gs-search-trigger-placeholder">
            {copy.triggerPlaceholder}
          </span>
          <kbd aria-hidden="true">/</kbd>
        </button>
      )}

      {open && (
        <PublicDialog label={copy.search} closeLabel={copy.close} variant="search" onClose={() => setOpen(false)}>
          <div className="gs-field gs-search-modal-field">
            <PublicIcon name="Search" size={20} />
            <input
              ref={input}
              data-gs-initial-focus
              data-gs-ui="input"
              aria-label={copy.label}
              placeholder={copy.placeholder}
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${id}-results`}
              aria-activedescendant={results[active] ? `${id}-${active}` : undefined}
              value={query}
              maxLength={80}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                  e.preventDefault();
                  if (results.length) {
                    setActive((old) => (old + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
                  }
                }
                if (e.key === "Enter" && results[active]) {
                  e.preventDefault();
                  choose(results[active]);
                }
              }}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="gs-search-clear"
                aria-label={copy.clear}
                onClick={() => search("")}
              >
                <PublicIcon name="X" size={16} />
              </button>
            )}
          </div>

          <div id={`${id}-results`} role="listbox" aria-label={copy.results} className="gs-search-results">
            {(["product", "plan", "country"] as const).map((kind) => {
              const group = results.filter((result) => result.kind === kind);
              return group.length ? (
                <div key={kind} role="group" aria-label={copy.groups[kind]}>
                  <strong className="gs-search-group-title">{copy.groups[kind]}</strong>
                  {group.map((result) => {
                    const index = results.indexOf(result);
                    return (
                      <div
                        key={result.id}
                        id={`${id}-${index}`}
                        role="option"
                        aria-selected={active === index}
                        onMouseMove={() => setActive(index)}
                        onClick={() => choose(result)}
                      >
                        <div className="gs-search-option-main">
                          {result.logoSlug ? (
                            <HomepageProductMark
                              product={{ slug: result.logoSlug, name: result.title }}
                              className="gs-search-mark"
                            />
                          ) : result.countryCode ? (
                            <HomepageCountryFlag code={result.countryCode} />
                          ) : null}
                          <div>
                            <strong>{result.title}</strong>
                            <small>{result.subtitle}</small>
                          </div>
                        </div>
                        <span className="gs-search-price">
                          <PublicPriceNumber
                            value={result.minimumUsd * display.rate}
                            currency={display.currency}
                            cycle={result.cycle}
                            changeKey={display.changeKey}
                            locale={canvasIntlLocale(resolvedLocale)}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })}
          </div>

          {status && (
            <p className="gs-search-status" role="status">
              {status}
            </p>
          )}

          {status === copy.failed && (
            <button
              data-gs-ui="button"
              onClick={() => {
                setStatus(copy.pending);
                setRetry((x) => x + 1);
              }}
            >
              {copy.retry}
            </button>
          )}

          {!query.trim().length && popular.length > 0 && (
            <div className="gs-search-popular" aria-label={copy.popularTitle}>
              <span className="gs-search-section-label">{copy.popularTitle}</span>
              <div className="gs-search-suggestions">
                {popular.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="gs-search-pill"
                    onClick={() => chooseHref(item.href)}
                  >
                    {item.logoSlug ? (
                      <HomepageProductMark
                        product={{ slug: item.logoSlug, name: item.title }}
                        className="gs-search-pill-mark"
                      />
                    ) : item.countryCode ? (
                      <HomepageCountryFlag code={item.countryCode} defer={false} />
                    ) : null}
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === copy.empty && query.trim().length > 0 && (
            <div className="gs-search-empty-actions" aria-label={copy.suggestions}>
              <div className="gs-search-suggestions">
                {copy.fallbackSuggestions.map((item) => (
                  <button
                    type="button"
                    key={item.term}
                    data-gs-ui="button"
                    className="gs-search-pill"
                    onClick={() => search(item.term)}
                  >
                    {"logoSlug" in item ? (
                      <HomepageProductMark
                        product={{ slug: item.logoSlug, name: item.term }}
                        className="gs-search-pill-mark"
                      />
                    ) : (
                      <HomepageCountryFlag code={item.countryCode} defer={false} />
                    )}
                    <span>{item.term}</span>
                  </button>
                ))}
              </div>
              <Link
                className="gs-search-contact"
                href={`/${resolvedLocale}/contact`}
                onClick={() => setOpen(false)}
              >
                {copy.contact}
              </Link>
            </div>
          )}

          <p className="gs-search-help">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> {copy.helpSelect}
            </span>
            <span>
              <kbd>Enter</kbd> {copy.helpOpen}
            </span>
            <span>
              <kbd>Esc</kbd> {copy.helpClose}
            </span>
          </p>
        </PublicDialog>
      )}
    </>
  );
}
