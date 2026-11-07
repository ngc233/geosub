import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayCurrencySymbol, supportedDisplayCurrencies } from "./display-currency.ts";

test("all 25 selector symbols have deterministic labels independent of Intl",()=>{
  const expected=["$","¥","NT$","HK$","S$","€","¥","₩","A$","C$","RM","Rp","฿","₱","₫","₺","SAR","£","CHF","₹","R$","Mex$","AED","NZ$","R"];
  assert.equal(supportedDisplayCurrencies.length,25);
  assert.deepEqual(supportedDisplayCurrencies.map(getDisplayCurrencySymbol),expected);
});
