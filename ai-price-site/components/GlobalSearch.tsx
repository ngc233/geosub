"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startRouteProgress } from "../lib/route-progress";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  Bot,
  LoaderCircle,
  MonitorPlay,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { hasAnalyticsConsent } from "../lib/analytics-consent";
import { getAnalyticsSessionId } from "../lib/client-analytics-session";
import type { PublicSearchResult, PublicSearchResultKind } from "../lib/public-search";
import type { PreparedSiteLocale } from "../lib/site-locale";
import BrandIcon from "./BrandIcon";

type SearchCopy = {
  button: string;
  title: string;
  placeholder: string;
  hint: string;
  loading: string;
  empty: string;
  unavailable: string;
  close: string;
  suggestions: string;
  popular: string;
  ai: string;
  streaming: string;
  converter: string;
  all: string;
  labels: Record<PublicSearchResultKind, string>;
};

const copyByLocale: Record<PreparedSiteLocale, SearchCopy> = {
  zh: {
    button: "搜索",
    title: "搜索 GeoSub",
    placeholder: "搜索产品、套餐、指南或工具",
    hint: "输入产品名称、套餐名称或你想解决的问题",
    loading: "正在查找",
    empty: "没有找到匹配内容",
    unavailable: "搜索暂时不可用，请稍后再试",
    close: "关闭搜索",
    suggestions: "快速入口",
    popular: "热门搜索",
    ai: "AI 订阅",
    streaming: "流媒体",
    converter: "汇率转换",
    all: "全部",
    labels: { product: "产品", plan: "套餐", article: "指南", tool: "工具" },
  },
  "zh-tw": {
    button: "搜尋",
    title: "搜尋 GeoSub",
    placeholder: "搜尋產品、方案、指南或工具",
    hint: "輸入產品名稱、方案名稱或你想解決的問題",
    loading: "正在搜尋",
    empty: "找不到相符內容",
    unavailable: "搜尋暫時無法使用，請稍後再試",
    close: "關閉搜尋",
    suggestions: "快速入口",
    popular: "熱門搜尋",
    ai: "AI 訂閱",
    streaming: "串流媒體",
    converter: "匯率換算",
    all: "全部",
    labels: { product: "產品", plan: "方案", article: "指南", tool: "工具" },
  },
  en: {
    button: "Search",
    title: "Search GeoSub",
    placeholder: "Search products, plans, guides or tools",
    hint: "Enter a product, plan or question",
    loading: "Searching",
    empty: "No matching results",
    unavailable: "Search is temporarily unavailable",
    close: "Close search",
    suggestions: "Quick links",
    popular: "Popular searches",
    ai: "AI subscriptions",
    streaming: "Streaming",
    converter: "Currency converter",
    all: "All",
    labels: { product: "Product", plan: "Plan", article: "Guide", tool: "Tool" },
  },
  ja: {
    button: "検索",
    title: "GeoSub を検索",
    placeholder: "製品、プラン、ガイド、ツールを検索",
    hint: "製品名、プラン名、知りたい内容を入力してください",
    loading: "検索中",
    empty: "一致する結果がありません",
    unavailable: "現在検索を利用できません",
    close: "検索を閉じる",
    suggestions: "クイックリンク",
    popular: "人気の検索",
    ai: "AI サブスクリプション",
    streaming: "ストリーミング",
    converter: "通貨換算",
    all: "すべて",
    labels: { product: "製品", plan: "プラン", article: "ガイド", tool: "ツール" },
  },
  ko: {
    button: "검색",
    title: "GeoSub 검색",
    placeholder: "제품, 요금제, 가이드 또는 도구 검색",
    hint: "제품명, 요금제명 또는 궁금한 내용을 입력하세요",
    loading: "검색 중",
    empty: "일치하는 결과가 없습니다",
    unavailable: "검색을 일시적으로 사용할 수 없습니다",
    close: "검색 닫기",
    suggestions: "빠른 링크",
    popular: "인기 검색어",
    ai: "AI 구독",
    streaming: "스트리밍",
    converter: "환율 계산기",
    all: "전체",
    labels: { product: "제품", plan: "요금제", article: "가이드", tool: "도구" },
  },
  es: {
    button: "Buscar",
    title: "Buscar en GeoSub",
    placeholder: "Busca productos, planes, guías o herramientas",
    hint: "Escribe un producto, un plan o una pregunta",
    loading: "Buscando",
    empty: "No hay resultados coincidentes",
    unavailable: "La búsqueda no está disponible temporalmente",
    close: "Cerrar búsqueda",
    suggestions: "Accesos rápidos",
    popular: "Búsquedas populares",
    ai: "Suscripciones de IA",
    streaming: "Streaming",
    converter: "Conversor de divisas",
    all: "Todo",
    labels: { product: "Producto", plan: "Plan", article: "Guía", tool: "Herramienta" },
  },
  tr: {
    button: "Ara",
    title: "GeoSub'da ara",
    placeholder: "Ürün, plan, rehber veya araç ara",
    hint: "Bir ürün, plan veya sorunuzu yazın",
    loading: "Aranıyor",
    empty: "Eşleşen sonuç bulunamadı",
    unavailable: "Arama geçici olarak kullanılamıyor",
    close: "Aramayı kapat",
    suggestions: "Hızlı bağlantılar",
    popular: "Popüler aramalar",
    ai: "Yapay zekâ abonelikleri",
    streaming: "Dijital yayın",
    converter: "Döviz çevirici",
    all: "Tümü",
    labels: { product: "Ürün", plan: "Plan", article: "Rehber", tool: "Araç" },
  },
  ar: {
    button: "بحث",
    title: "البحث في GeoSub",
    placeholder: "ابحث عن منتج أو باقة أو دليل أو أداة",
    hint: "اكتب اسم المنتج أو الباقة أو ما تريد معرفته",
    loading: "جارٍ البحث",
    empty: "لا توجد نتائج مطابقة",
    unavailable: "البحث غير متاح مؤقتًا",
    close: "إغلاق البحث",
    suggestions: "روابط سريعة",
    popular: "عمليات البحث الشائعة",
    ai: "اشتراكات الذكاء الاصطناعي",
    streaming: "خدمات البث",
    converter: "محول العملات",
    all: "الكل",
    labels: { product: "منتج", plan: "باقة", article: "دليل", tool: "أداة" },
  },
  fr: {
    button: "Rechercher",
    title: "Rechercher sur GeoSub",
    placeholder: "Produits, offres, guides ou outils",
    hint: "Saisissez un produit, une offre ou une question",
    loading: "Recherche en cours",
    empty: "Aucun résultat correspondant",
    unavailable: "La recherche est temporairement indisponible",
    close: "Fermer la recherche",
    suggestions: "Accès rapides",
    popular: "Recherches populaires",
    ai: "Abonnements IA",
    streaming: "Streaming",
    converter: "Convertisseur de devises",
    all: "Tout",
    labels: { product: "Produit", plan: "Offre", article: "Guide", tool: "Outil" },
  },
  it: {
    button: "Cerca",
    title: "Cerca su GeoSub",
    placeholder: "Cerca prodotti, piani, guide o strumenti",
    hint: "Inserisci un prodotto, un piano o una domanda",
    loading: "Ricerca in corso",
    empty: "Nessun risultato corrispondente",
    unavailable: "La ricerca non è temporaneamente disponibile",
    close: "Chiudi ricerca",
    suggestions: "Collegamenti rapidi",
    popular: "Ricerche popolari",
    ai: "Abbonamenti IA",
    streaming: "Streaming",
    converter: "Convertitore di valuta",
    all: "Tutti",
    labels: { product: "Prodotto", plan: "Piano", article: "Guida", tool: "Strumento" },
  },
  de: {
    button: "Suchen",
    title: "GeoSub durchsuchen",
    placeholder: "Produkte, Tarife, Ratgeber oder Tools suchen",
    hint: "Produkt, Tarif oder Frage eingeben",
    loading: "Suche läuft",
    empty: "Keine passenden Ergebnisse",
    unavailable: "Die Suche ist vorübergehend nicht verfügbar",
    close: "Suche schließen",
    suggestions: "Schnellzugriff",
    popular: "Beliebte Suchanfragen",
    ai: "KI-Abonnements",
    streaming: "Streaming",
    converter: "Währungsrechner",
    all: "Alle",
    labels: { product: "Produkt", plan: "Tarif", article: "Ratgeber", tool: "Tool" },
  },
  pt: {
    button: "Pesquisar",
    title: "Pesquisar na GeoSub",
    placeholder: "Pesquise produtos, planos, guias ou ferramentas",
    hint: "Introduza um produto, plano ou pergunta",
    loading: "A pesquisar",
    empty: "Não foram encontrados resultados",
    unavailable: "A pesquisa está temporariamente indisponível",
    close: "Fechar pesquisa",
    suggestions: "Acessos rápidos",
    popular: "Pesquisas populares",
    ai: "Assinaturas de IA",
    streaming: "Streaming",
    converter: "Conversor de moedas",
    all: "Todos",
    labels: { product: "Produto", plan: "Plano", article: "Guia", tool: "Ferramenta" },
  },
};

function ResultIcon({ result }: { result: PublicSearchResult }) {
  if (result.logoSlug) {
    return (
      <BrandIcon
        product={{
          slug: result.logoSlug,
          name: result.title,
          officialUrl: result.officialUrl,
        }}
        size="sm"
      />
    );
  }

  const Icon = result.kind === "tool" ? Wrench : BookOpen;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function trackSearch(eventKey: "search_digital_service" | "search_no_result", query: string, count: number) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  try {
    const body = JSON.stringify({
      eventKey,
      eventName: eventKey === "search_no_result" ? "Search No Result" : "Public Search",
      pagePath: window.location.pathname,
      pageTitle: document.title,
      locale: window.location.pathname.split("/")[1] || "zh",
      sessionId: getAnalyticsSessionId(),
      placement: "global_search",
      source: "frontend_search",
      metadata: { query: query.slice(0, 80), resultCount: count },
    });
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Search analytics must never interrupt search.
  }
}

function trackSearchResult(query: string, result: PublicSearchResult) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  try {
    const body = JSON.stringify({
      eventKey: "click_search_result",
      eventName: "Open Search Result",
      pagePath: window.location.pathname,
      pageTitle: document.title,
      locale: window.location.pathname.split("/")[1] || "zh",
      sessionId: getAnalyticsSessionId(),
      placement: "global_search",
      source: "frontend_search_result",
      productId: result.productId,
      planId: result.planId,
      articleId: result.articleId,
      metadata: {
        query: query.trim().slice(0, 80),
        resultKind: result.kind,
        resultTitle: result.title.slice(0, 160),
        resultHref: result.href.slice(0, 300),
      },
    });
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Search analytics must never interrupt navigation.
  }
}

export default function GlobalSearch({ locale }: { locale: PreparedSiteLocale }) {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trackedQueryRef = useRef("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultKind, setResultKind] = useState<PublicSearchResultKind | "all">("all");
  const [popularTerms, setPopularTerms] = useState<string[]>([]);
  const [popularLoaded, setPopularLoaded] = useState(false);

  const quickLinks = useMemo(() => [
    { title: copy.ai, href: `/${locale}/ai-pricing`, icon: Bot },
    { title: copy.streaming, href: `/${locale}/streaming-pricing`, icon: MonitorPlay },
    { title: copy.converter, href: `/${locale}/tools/currency-converter`, icon: BadgeDollarSign },
  ], [copy, locale]);
  const availableKinds = useMemo(
    () => [...new Set(results.map((result) => result.kind))],
    [results]
  );
  const visibleResults = useMemo(
    () => resultKind === "all"
      ? results
      : results.filter((result) => result.kind === resultKind),
    [resultKind, results]
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 20);

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || popularLoaded) return;

    const controller = new AbortController();
    fetch(
      `/api/search?popular=1&locale=${encodeURIComponent(locale)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((response) => response.json())
      .then((payload: { popular?: unknown }) => {
        if (Array.isArray(payload.popular)) {
          setPopularTerms(
            payload.popular.filter((term): term is string => typeof term === "string"),
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setPopularLoaded(true);
      });

    return () => controller.abort();
  }, [locale, open, popularLoaded]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setUnavailable(false);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${encodeURIComponent(locale)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = await response.json() as {
          results?: PublicSearchResult[];
          unavailable?: boolean;
        };
        const nextResults = Array.isArray(payload.results) ? payload.results : [];
        setResults(nextResults);
        setUnavailable(Boolean(payload.unavailable) || !response.ok);

        if (trackedQueryRef.current !== trimmedQuery) {
          trackedQueryRef.current = trimmedQuery;
          trackSearch(
            nextResults.length === 0 ? "search_no_result" : "search_digital_service",
            trimmedQuery,
            nextResults.length,
          );
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, query]);

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setResultKind("all");
    trackedQueryRef.current = "";
  }

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    setResultKind("all");
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setUnavailable(false);
    }
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (visibleResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? visibleResults.length - 1 : index - 1
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const result = visibleResults[activeIndex];
      trackSearchResult(query, result);
      closeSearch();
      startRouteProgress();
      router.push(result.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-600 shadow-sm transition-all duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white dark:active:bg-zinc-700 dark:focus-visible:ring-offset-zinc-950"
        aria-label={copy.button}
        title={copy.button}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden xl:inline">{copy.button}</span>
      </button>

      {open ? createPortal(
        <div
          data-global-search-overlay
          className="fixed inset-0 z-[100] flex min-h-dvh items-start justify-center bg-zinc-950/45 p-0 backdrop-blur-sm sm:p-6 sm:pt-[10vh]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSearch();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            className="flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl shadow-black/20 sm:h-auto sm:max-h-[76vh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-zinc-200 dark:bg-zinc-950 sm:dark:border-zinc-800"
          >
            <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <Search className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={copy.placeholder}
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-zinc-950 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:text-white"
                autoComplete="off"
                spellCheck={false}
              />
              {loading ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-lime-600" aria-label={copy.loading} />
              ) : null}
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white dark:active:bg-zinc-700"
                aria-label={copy.close}
                title={copy.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {query.trim().length < 2 ? (
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{copy.hint}</p>
                  {popularTerms.length > 0 ? (
                    <div className="mt-7">
                      <p className="mb-3 text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">
                        {copy.popular}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {popularTerms.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => updateQuery(term)}
                            className="min-h-9 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-zinc-950 active:bg-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-lime-500/10 dark:hover:text-white dark:active:bg-lime-500/15"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="mb-3 mt-7 text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">
                    {copy.suggestions}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {quickLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeSearch}
                          className="group flex min-h-14 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white dark:active:bg-zinc-800"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 transition group-hover:bg-white group-hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800 dark:group-hover:text-white">
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                          </span>
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : unavailable ? (
                <div className="py-14 text-center text-sm text-zinc-500 dark:text-zinc-400">{copy.unavailable}</div>
              ) : !loading && results.length === 0 ? (
                <div className="py-14 text-center">
                  <Search className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{copy.empty}</p>
                </div>
              ) : (
                <div>
                  {availableKinds.length > 1 ? (
                    <div
                      className="mb-3 flex gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900"
                      aria-label={copy.suggestions}
                    >
                      {(["all", ...availableKinds] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => {
                            setResultKind(kind);
                            setActiveIndex(-1);
                          }}
                          aria-pressed={resultKind === kind}
                          className={[
                            "min-h-8 shrink-0 rounded-md px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                            resultKind === kind
                              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
                          ].join(" ")}
                        >
                          {kind === "all" ? copy.all : copy.labels[kind]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-1">
                  {visibleResults.map((result, index) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        trackSearchResult(query, result);
                        closeSearch();
                      }}
                      className={[
                        "group flex min-h-16 items-center gap-3 rounded-lg px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                        activeIndex === index
                          ? "bg-lime-50 dark:bg-lime-500/10"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <ResultIcon result={result} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                            {result.title}
                          </span>
                          <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                            {copy.labels[result.kind]}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {result.subtitle}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-lime-600 rtl:rotate-180 dark:text-zinc-600 dark:group-hover:text-lime-400" aria-hidden="true" />
                    </Link>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
