"use client";

import { Fragment, createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { supportedDisplayCurrencies, type DisplayCurrency } from "../lib/display-currency";
import { formatPublicPrice, PUBLIC_CURRENCY_STORAGE_KEY, publicCurrencyPreference, resolvePublicCurrency, usableDisplayCurrency, type PublicDisplayRates } from "../lib/public-display-currency";
import { PublicSelect } from "./ui/PublicControls";

export type PricingDisplaySettings = {
  currency: DisplayCurrency;
  currencies: { code: DisplayCurrency; disabled: boolean }[];
  change: (currency: DisplayCurrency) => void;
};
const Settings = createContext<PricingDisplaySettings | null>(null);
const Register = createContext<Dispatch<SetStateAction<PricingDisplaySettings | null>>>(() => undefined);
const currencyChangeEvent = "geosub:display-currency";
let memoryPreference: string | null = null;
function subscribePreference(change: () => void) {
  window.addEventListener("storage", change);
  window.addEventListener(currencyChangeEvent, change);
  return () => { window.removeEventListener("storage", change); window.removeEventListener(currencyChangeEvent, change); };
}
function readPreference() {
  try { return localStorage.getItem(PUBLIC_CURRENCY_STORAGE_KEY) ?? memoryPreference; } catch { return memoryPreference; }
}
function serverPreference() { return null; }
type PublicDisplay = PricingDisplaySettings & { preference: DisplayCurrency; rate: number; rates: PublicDisplayRates; format: (value: number) => string };
const PublicDisplayContext = createContext<PublicDisplay | null>(null);

export function usePublicPricingDisplay() {
  const display = useContext(PublicDisplayContext);
  if (!display) throw new Error("Public pricing display requires the site chrome");
  return display;
}

export function PublicMoney({ value }: { value: number }) {
  const display = usePublicPricingDisplay();
  return <span data-display-price data-price-usd={value} data-display-currency={display.currency}>{display.format(value)}</span>;
}
export function PublicCurrencyLabel() { return <>{usePublicPricingDisplay().currency}</>; }
export function PublicPriceCopy({ text, value }: { text: string; value?: number }) {
  if (value === undefined) return <>{text}</>;
  const price = new RegExp(`(?:US)?\\$${value.toFixed(2).replace(".", "\\.")}(?![\\d.])`);
  const parts = text.split(price);
  return <>{parts.map((part, index) => <Fragment key={index}>{index > 0 && <PublicMoney value={value} />}{part}</Fragment>)}</>;
}

export function PublicFxNote() {
  const { currency, preference, rates } = usePublicPricingDisplay();
  const rate = rates[currency];
  return <p className="gs-public-fx-note" data-public-fx-note>{currency !== preference ? `${preference} 展示汇率缺失或已过期，当前显示已发布美元折算价。` : currency === "USD" ? "美元参考沿用正式价格记录。" : `展示汇率 ${rate?.rateDate || "—"} · 来源 ${rate?.source || "未提供"} · 1 USD = ${rate?.rate.toLocaleString("zh-CN", { maximumFractionDigits: 4 })} ${currency}${rate?.isStale ? " · 当前使用最近一次可用汇率，可能与实时汇率有偏差" : ""}`}</p>;
}

export function PricingDisplayProvider({ children, rates = {}, unified = false, pathname = "" }: { children: ReactNode; rates?: PublicDisplayRates; unified?: boolean; pathname?: string }) {
  const [settings, register] = useState<PricingDisplaySettings | null>(null);
  const saved = useSyncExternalStore(subscribePreference, readPreference, serverPreference);
  const preference = publicCurrencyPreference(saved);
  const currency = resolvePublicCurrency(preference, rates);
  const rate = currency === "USD" ? 1 : rates[currency]!.rate;
  const change = useCallback((value: DisplayCurrency) => {
    if (!usableDisplayCurrency(value, rates)) return;
    memoryPreference = value;
    try { localStorage.setItem(PUBLIC_CURRENCY_STORAGE_KEY, value); } catch { /* Private browsing still keeps the choice during navigation. */ }
    window.dispatchEvent(new Event(currencyChangeEvent));
  }, [rates]);
  const display = useMemo<PublicDisplay>(() => ({ preference, currency, rate, rates, change,
    currencies: supportedDisplayCurrencies.map(code => ({ code, disabled: !usableDisplayCurrency(code, rates) })),
    format: value => formatPublicPrice(value, currency, rate),
  }), [preference, currency, rate, rates, change]);
  // Historical evidence and the currency calculator retain their original currency and units.
  const pricePage = /^\/zh(?:\/?$|\/(?:ai-pricing|streaming-pricing|countries)(?:\/|$))/.test(pathname);
  return <PublicDisplayContext.Provider value={display}><Register.Provider value={register}><Settings.Provider value={unified ? (pricePage ? display : null) : settings}>{children}</Settings.Provider></Register.Provider></PublicDisplayContext.Provider>;
}
export function useRegisterPricingDisplay() { return useContext(Register); }

export function HeaderCurrencyControl({ english, mobile = false, appearance }: { english: boolean; mobile?: boolean; appearance?: "public" }) {
  const settings = useContext(Settings);
  if (!settings) return null;
  if (appearance === "public") return <div className={mobile ? "gs-header-currency-mobile" : "gs-header-currency"}>
    <PublicSelect label="展示币种" hideLabel={!mobile} value={settings.currency} options={settings.currencies.map(item => ({value:item.code,label:item.code,disabled:item.disabled}))} onChange={value => settings.change(value as DisplayCurrency)} />
  </div>;
  return <label className={mobile ? "gs-header-currency-mobile" : "gs-header-currency"}>
    <span className={mobile ? "" : "sr-only"}>{english ? "Display currency" : "展示币种"}</span>
    <select aria-label={english ? "Display currency" : "展示币种"} value={settings.currency} onChange={e => settings.change(e.target.value as DisplayCurrency)}>
      {settings.currencies.map(item => <option key={item.code} value={item.code} disabled={item.disabled}>{item.code}</option>)}
    </select>
  </label>;
}
