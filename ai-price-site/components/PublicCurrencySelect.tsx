"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { canvasDefaultCurrency, canvasIntlLocale, resolveCanvasLocale, type CanvasLocale } from "../lib/canvas-ui-copy";
import { supportedDisplayCurrencies, getDisplayCurrencySymbol, isSupportedDisplayCurrency, type DisplayCurrency } from "../lib/display-currency";
import { PublicDialog } from "./PublicControls";
import PublicIcon from "./PublicIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";

const currencyFlags: Partial<Record<DisplayCurrency, string>> = {
  USD: "US", CNY: "CN", TWD: "TW", HKD: "HK", SGD: "SG",
  JPY: "JP", KRW: "KR", AUD: "AU", CAD: "CA", MYR: "MY",
  IDR: "ID", THB: "TH", PHP: "PH", VND: "VN", TRY: "TR",
  SAR: "SA", GBP: "GB", CHF: "CH", INR: "IN", BRL: "BR",
  MXN: "MX", AED: "AE", NZD: "NZ", ZAR: "ZA",
};

const currencySelectCopy: Record<
  CanvasLocale,
  { prefix: string; dialogTitle: string; closeLabel?: string; listAria: string }
> = {
  zh: { prefix: "折合为 ", dialogTitle: "选择币种", closeLabel: undefined, listAria: "显示币种" },
  "zh-tw": { prefix: "換算為 ", dialogTitle: "選擇幣別", closeLabel: "關閉幣別選擇", listAria: "顯示幣別" },
  en: { prefix: "Display in ", dialogTitle: "Display currency", closeLabel: "Close display currency", listAria: "Display currency" },
  ja: { prefix: "表示通貨 ", dialogTitle: "表示通貨を選択", closeLabel: "通貨選択を閉じる", listAria: "表示通貨" },
  ko: { prefix: "표시 통화 ", dialogTitle: "표시 통화 선택", closeLabel: "통화 선택 닫기", listAria: "표시 통화" },
  es: { prefix: "Mostrar en ", dialogTitle: "Divisa de visualización", closeLabel: "Cerrar selección de divisa", listAria: "Divisa de visualización" },
};

const key = "geosub-public-display-currency";
const eventName = "geosub-public-currency-change";
let memory: DisplayCurrency | undefined;
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(eventName, notify);
  };
};
const read = () => {
  try {
    const value = localStorage.getItem(key);
    return value && isSupportedDisplayCurrency(value) ? value : memory;
  } catch {
    return memory;
  }
};

export function usePublicCurrency(defaultCurrency: DisplayCurrency = "CNY") {
  const currency = useSyncExternalStore(subscribe, read, () => undefined) ?? defaultCurrency;
  return [
    currency,
    (value: DisplayCurrency) => {
      memory = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Private browsing still shares the in-memory preference. */
      }
      window.dispatchEvent(new Event(eventName));
    },
  ] as const;
}

export default function PublicCurrencySelect({
  onChange,
  displayCurrency,
  locale = "zh",
  options = supportedDisplayCurrencies,
}: {
  onChange?: (value: DisplayCurrency) => void;
  displayCurrency?: string;
  locale?: CanvasLocale;
  options?: readonly DisplayCurrency[];
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = currencySelectCopy[resolvedLocale];
  const [currency, select] = usePublicCurrency(canvasDefaultCurrency(resolvedLocale));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const names = new Intl.DisplayNames([canvasIntlLocale(resolvedLocale)], { type: "currency" });
  const shown = displayCurrency && isSupportedDisplayCurrency(displayCurrency) ? displayCurrency : currency;
  const selected = resolvedLocale === "zh" ? currency : shown;
  const choose = (code: DisplayCurrency) => {
    select(code);
    onChange?.(code);
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        data-gs-ui="button"
        aria-haspopup="dialog"
        onClick={() => {
          setActive(Math.max(0, options.indexOf(selected)));
          setOpen(true);
        }}
      >
        <PublicIcon name="Banknote" size={20} className="gs-currency-mark" />
        <span>
          {copy.prefix}
          <b>
            {getDisplayCurrencySymbol(shown)} {shown}
          </b>
        </span>
        <PublicIcon name="ChevronDown" size={16} />
      </button>
      {open && (
        <PublicDialog
          label={copy.dialogTitle}
          closeLabel={copy.closeLabel}
          variant="currency"
          onClose={() => setOpen(false)}
        >
          <div
            ref={list}
            id={id}
            role="listbox"
            aria-label={copy.listAria}
            className="gs-currency-options"
            onKeyDown={(event) => {
              const columns = getComputedStyle(list.current!).gridTemplateColumns.split(" ").length;
              const offset = { ArrowDown: columns, ArrowUp: -columns, ArrowRight: 1, ArrowLeft: -1 }[event.key];
              let next = active;
              if (offset !== undefined) next = Math.max(0, Math.min(options.length - 1, active + offset));
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = options.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next]?.focus();
            }}
          >
            {options.map((code, index) => {
              const flag = currencyFlags[code];
              return (
                <button
                  type="button"
                  key={code}
                  id={`${id}-${code}`}
                  role="option"
                  aria-label={`${code} · ${names.of(code)}`}
                  aria-selected={selected === code}
                  data-active={index === active}
                  data-gs-initial-focus={selected === code || undefined}
                  tabIndex={index === active ? 0 : -1}
                  onFocus={() => setActive(index)}
                  onClick={() => choose(code)}
                >
                  <span className="gs-currency-symbol" aria-hidden="true">
                    {getDisplayCurrencySymbol(code)}
                  </span>
                  <span className="gs-currency-label">
                    <strong>
                      {flag && <HomepageCountryFlag code={flag} defer />}
                      {code}
                    </strong>
                    <small>{names.of(code)}</small>
                  </span>
                  {selected === code && <PublicIcon name="Check" size={16} />}
                </button>
              );
            })}
          </div>
        </PublicDialog>
      )}
    </>
  );
}

// A page publishes only its already-read, valid DATA-1 rates. Header search
// follows that page's preference without another query or persisted rate data.
let pageRates: Readonly<Record<string, number>> | null = null;
export function usePageDisplayRates(rates: Readonly<Record<string, number>>) {
  useEffect(() => {
    pageRates = rates;
    window.dispatchEvent(new Event(eventName));
    return () => {
      if (pageRates === rates) {
        pageRates = null;
        window.dispatchEvent(new Event(eventName));
      }
    };
  }, [rates]);
}
export function useSearchDisplayCurrency(defaultCurrency: DisplayCurrency = "CNY") {
  const [preferred] = usePublicCurrency(defaultCurrency);
  const rates = useSyncExternalStore(subscribe, () => pageRates, () => null);
  const currency = rates?.[preferred] ? preferred : "USD";
  return { currency, rate: rates?.[currency] ?? 1, changeKey: preferred };
}
