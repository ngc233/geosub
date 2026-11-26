"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const searchCopy = {
  zh: {
    search: "搜索",
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
  en: {
    search: "Search",
    label: "Search products or countries",
    placeholder: "Search products, plans, or countries (e.g. ChatGPT, Netflix, Turkey)",
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
} as const;

const defaultPopularByLocale: Record<"zh" | "en", ChromePopularItem[]> = {
  zh: [
    { id: "pop-chatgpt", title: "ChatGPT", href: "/zh/ai-pricing/chatgpt", logoSlug: "chatgpt" },
    { id: "pop-netflix", title: "Netflix", href: "/zh/streaming-pricing/netflix", logoSlug: "netflix" },
    { id: "pop-claude", title: "Claude", href: "/zh/ai-pricing/claude", logoSlug: "claude" },
    { id: "pop-yt", title: "YouTube Premium", href: "/zh/streaming-pricing/youtube-premium", logoSlug: "youtube-premium" },
    { id: "pop-tr", title: "土耳其", href: "/zh/countries/turkey", countryCode: "TR" },
  ],
  en: [
    { id: "pop-chatgpt", title: "ChatGPT", href: "/en/ai-pricing/chatgpt", logoSlug: "chatgpt" },
    { id: "pop-netflix", title: "Netflix", href: "/en/streaming-pricing/netflix", logoSlug: "netflix" },
    { id: "pop-claude", title: "Claude", href: "/en/ai-pricing/claude", logoSlug: "claude" },
    { id: "pop-yt", title: "YouTube Premium", href: "/en/streaming-pricing/youtube-premium", logoSlug: "youtube-premium" },
    { id: "pop-tr", title: "Turkey", href: "/en/countries/turkey", countryCode: "TR" },
  ],
};

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
  locale?: "zh" | "en";
}) {
  const copy = searchCopy[locale];
  const display = useSearchDisplayCurrency(locale === "en" ? "USD" : "CNY");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popular = defaultPopularByLocale[locale];
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
    const cacheKey = `${locale}:${trimmed.toLowerCase()}`;
    (async () => {
      try {
        const response = await fetch(
          `/api/search?locale=${locale}&view=chrome&q=${encodeURIComponent(trimmed)}`,
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
  }, [query, open, retry, copy, locale]);

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
    const cached = queryResultCache.get(`${locale}:${trimmed.toLowerCase()}`);
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
              aria-label={
                locale === "en"
                  ? "Search products or countries"
                  : variant === "state"
                    ? "查找产品或国家"
                    : "首页搜索产品或国家"
              }
              placeholder={
                locale === "en"
                  ? "Search ChatGPT, Netflix, or Turkey"
                  : "搜 ChatGPT、Netflix，或者土耳其"
              }
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
            {locale === "en" ? "Search…" : "搜产品 / 地区"}
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
                            locale={locale === "en" ? "en-US" : "zh-CN"}
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
                href={locale === "zh" ? "/zh/contact" : "/en/about"}
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
